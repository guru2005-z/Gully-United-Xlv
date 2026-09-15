import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

interface AnnouncementStore {
  id: string;
  title: string;
  message: string;
  type: string;
  link_url: string | null;
  image_url: string | null;
  cta_text: string | null;
  is_active: boolean;
  created_at: string;
}

const memoryAnnouncements: AnnouncementStore[] = [
  {
    id: "ann-1",
    title: "10% OFF Night Slots (8 PM - 11 PM)",
    message: "Use code GULLY10 at checkout for instant ₹50 discount on prime floodlit hours.",
    type: "OFFER",
    link_url: "/book",
    image_url: null,
    cta_text: "BOOK NOW",
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

function getAdminClient(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  try {
    return getSupabaseAdmin();
  } catch {
    return supabase;
  }
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const db = getAdminClient(supabase);

    const { data, error } = await db
      .from("site_announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ announcements: memoryAnnouncements });
    }

    return NextResponse.json({
      announcements: data && data.length > 0 ? data : memoryAnnouncements,
    });
  } catch {
    return NextResponse.json({ announcements: memoryAnnouncements });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const db = getAdminClient(supabase);

    const { data: authData } = await supabase.auth.getUser();

    const body = await request.json();
    const { title, message, type, link_url, image_url, cta_text, is_active } = body;

    const { data, error } = await db
      .from("site_announcements")
      .insert({
        title: title || "Gully United Special Announcement",
        message: message || "",
        type: type || "OFFER",
        link_url: link_url || null,
        image_url: image_url || null,
        cta_text: cta_text || null,
        is_active: is_active !== undefined ? is_active : true,
        created_by: authData?.user?.id || null,
      })
      .select()
      .single();

    if (error) {
      const newAnn: AnnouncementStore = {
        id: `ann-${Date.now()}`,
        title: title || "Gully United Special Announcement",
        message: message || "",
        type: type || "OFFER",
        link_url: link_url || null,
        image_url: image_url || null,
        cta_text: cta_text || null,
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString(),
      };
      memoryAnnouncements.unshift(newAnn);
      return NextResponse.json({
        announcement: newAnn,
        message: "Announcement published successfully.",
      });
    }

    return NextResponse.json({
      announcement: data,
      message: "Announcement published successfully.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: { message: "Failed to create announcement." } },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
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

    const { error } = await db.from("site_announcements").update(updates).eq("id", id);

    const memoryItem = memoryAnnouncements.find((a) => a.id === id);
    if (memoryItem) {
      if (updates.title !== undefined) memoryItem.title = updates.title;
      if (updates.message !== undefined) memoryItem.message = updates.message;
      if (updates.type !== undefined) memoryItem.type = updates.type;
      if (updates.link_url !== undefined) memoryItem.link_url = updates.link_url;
      if (updates.cta_text !== undefined) memoryItem.cta_text = updates.cta_text;
      if (updates.is_active !== undefined) memoryItem.is_active = updates.is_active;
    }

    if (error && !memoryItem) {
      return NextResponse.json({ error: { message: error.message } }, { status: 400 });
    }

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

    const { error } = await db.from("site_announcements").delete().eq("id", id);

    const memIdx = memoryAnnouncements.findIndex((a) => a.id === id);
    if (memIdx !== -1) {
      memoryAnnouncements.splice(memIdx, 1);
    }

    if (error && memIdx === -1) {
      return NextResponse.json({ error: { message: error.message } }, { status: 400 });
    }

    return NextResponse.json({ message: "Announcement deleted successfully." });
  } catch {
    return NextResponse.json(
      { error: { message: "Failed to delete announcement." } },
      { status: 500 },
    );
  }
}
