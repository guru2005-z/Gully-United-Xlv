import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isAdminAuthorizationFailure, requireAdminUser } from "@/lib/admin-auth";
import {
  filterAnnouncementsByActiveCoupons,
  getStoredAnnouncements,
  getStoredCoupons,
  saveStoredAnnouncements,
  type AnnouncementRecord,
} from "@/lib/promo-store";

export const dynamic = "force-dynamic";

function getAdminClient(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  try {
    return getSupabaseAdmin();
  } catch {
    return supabase;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdminView = searchParams.get("admin") === "1";

    const [announcements, coupons] = await Promise.all([
      getStoredAnnouncements(),
      getStoredCoupons(),
    ]);

    if (isAdminView) {
      return NextResponse.json({ announcements });
    }

    // For public pages, hide any offer banner whose promo code was paused or deleted
    const effectiveAnnouncements = filterAnnouncementsByActiveCoupons(announcements, coupons);
    return NextResponse.json({ announcements: effectiveAnnouncements });
  } catch {
    return NextResponse.json({ announcements: [] });
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await requireAdminUser();
    if (isAdminAuthorizationFailure(authorization)) return authorization;
    const supabase = await createSupabaseServerClient();
    const db = getAdminClient(supabase);

    const { data: authData } = await supabase.auth.getUser();

    const body = await request.json();
    const { title, message, type, link_url, image_url, cta_text, is_active } = body;

    const newAnn: AnnouncementRecord = {
      id: `ann-${Date.now()}`,
      title: title || "Gully United Special Announcement",
      message: message || "",
      type: type || "OFFER",
      link_url: link_url || null,
      image_url: image_url || null,
      cta_text: cta_text || null,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await db
      .from("site_announcements")
      .insert({
        title: newAnn.title,
        message: newAnn.message,
        type: newAnn.type,
        link_url: newAnn.link_url,
        image_url: newAnn.image_url,
        cta_text: newAnn.cta_text,
        is_active: newAnn.is_active,
        created_by: authData?.user?.id || null,
      })
      .select()
      .single();

    const savedAnn = !error && data ? (data as AnnouncementRecord) : newAnn;
    const announcements = await getStoredAnnouncements();
    await saveStoredAnnouncements([savedAnn, ...announcements]);

    return NextResponse.json({
      announcement: savedAnn,
      message: "Announcement published successfully.",
    });
  } catch {
    return NextResponse.json(
      { error: { message: "Failed to create announcement." } },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const authorization = await requireAdminUser();
    if (isAdminAuthorizationFailure(authorization)) return authorization;
    const supabase = await createSupabaseServerClient();
    const db = getAdminClient(supabase);

    const body = await request.json();
    const { id, title, message, type, link_url, cta_text, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { error: { message: "Announcement ID required." } },
        { status: 400 },
      );
    }

    const updates: {
      title?: string;
      message?: string;
      type?: string;
      link_url?: string | null;
      cta_text?: string | null;
      is_active?: boolean;
      updated_at?: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title;
    if (message !== undefined) updates.message = message;
    if (type !== undefined) updates.type = type;
    if (link_url !== undefined) updates.link_url = link_url || null;
    if (cta_text !== undefined) updates.cta_text = cta_text || null;
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    await db.from("site_announcements").update(updates).eq("id", id);

    const announcements = await getStoredAnnouncements();
    const updatedAnnouncements = announcements.map((a) => {
      if (a.id === id) {
        return {
          ...a,
          ...(updates.title !== undefined ? { title: updates.title } : {}),
          ...(updates.message !== undefined ? { message: updates.message } : {}),
          ...(updates.type !== undefined ? { type: updates.type } : {}),
          ...(updates.link_url !== undefined ? { link_url: updates.link_url } : {}),
          ...(updates.cta_text !== undefined ? { cta_text: updates.cta_text } : {}),
          ...(updates.is_active !== undefined ? { is_active: updates.is_active } : {}),
        };
      }
      return a;
    });

    await saveStoredAnnouncements(updatedAnnouncements);

    return NextResponse.json({ message: "Announcement updated successfully." });
  } catch {
    return NextResponse.json(
      { error: { message: "Failed to update announcement." } },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const authorization = await requireAdminUser();
    if (isAdminAuthorizationFailure(authorization)) return authorization;
    const supabase = await createSupabaseServerClient();
    const db = getAdminClient(supabase);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: { message: "Announcement ID required." } },
        { status: 400 },
      );
    }

    await db.from("site_announcements").delete().eq("id", id);

    const announcements = await getStoredAnnouncements();
    const updatedAnnouncements = announcements.filter((a) => a.id !== id);
    await saveStoredAnnouncements(updatedAnnouncements);

    return NextResponse.json({ message: "Announcement deleted successfully." });
  } catch {
    return NextResponse.json(
      { error: { message: "Failed to delete announcement." } },
      { status: 500 },
    );
  }
}
