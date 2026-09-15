import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

interface GalleryItemStore {
  id: string;
  title: string;
  media_type: string;
  url: string;
  thumbnail_url: string | null;
  category: string;
  caption: string | null;
  alt_text: string | null;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
}

const memoryGallery: GalleryItemStore[] = [
  {
    id: "gal-1",
    title: "Floodlit Night Turf Arena",
    media_type: "IMAGE",
    url: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200",
    thumbnail_url: null,
    category: "TURF",
    caption: "High intensity LED lighting for prime night matches",
    alt_text: "Gully United XLV Floodlit Turf Arena",
    is_featured: true,
    is_published: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "gal-2",
    title: "Best Play: Sixer Over Mid-Wicket",
    media_type: "VIDEO",
    url: "https://assets.mixkit.co/videos/preview/mixkit-stadium-lights-shining-at-night-42845-large.mp4",
    thumbnail_url:
      "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=1200",
    category: "BEST_PLAYS",
    caption: "Unbelievable last-ball match winning sixer!",
    alt_text: "Best Play Highlight Reel",
    is_featured: true,
    is_published: true,
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "gal-3",
    title: "Premium Player Dugout & Lounge",
    media_type: "IMAGE",
    url: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&q=80&w=1200",
    thumbnail_url: null,
    category: "FACILITIES",
    caption: "Shaded dugout seating for 16 players & spectator zone",
    alt_text: "Gully United Player Dugout",
    is_featured: false,
    is_published: true,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "gal-4",
    title: "Night Match Atmosphere",
    media_type: "IMAGE",
    url: "https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&q=80&w=1200",
    thumbnail_url: null,
    category: "FLOODLIGHTS",
    caption: "14 Floodlight poles illuminating evening box cricket",
    alt_text: "Night Match Lighting Setup",
    is_featured: true,
    is_published: true,
    created_at: new Date(Date.now() - 7200000).toISOString(),
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
      .from("gallery_items")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ items: memoryGallery });
    }

    return NextResponse.json({ items: data && data.length > 0 ? data : memoryGallery });
  } catch {
    return NextResponse.json({ items: memoryGallery });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const db = getAdminClient(supabase);

    const { data: authData } = await supabase.auth.getUser();
    const body = await request.json();
    const { title, media_type, url, thumbnail_url, category, caption, alt_text, is_featured } =
      body;

    if (!url || !title) {
      return NextResponse.json(
        { error: { message: "Title and URL/File are required." } },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("gallery_items")
      .insert({
        title,
        media_type: media_type || "IMAGE",
        url,
        thumbnail_url: thumbnail_url || null,
        category: category || "TURF",
        caption: caption || null,
        alt_text: alt_text || title,
        is_featured: is_featured || false,
        is_published: true,
        uploaded_by: authData?.user?.id || null,
      })
      .select()
      .single();

    if (error) {
      const newItem: GalleryItemStore = {
        id: `gal-${Date.now()}`,
        title,
        media_type: media_type || "IMAGE",
        url,
        thumbnail_url: thumbnail_url || null,
        category: category || "TURF",
        caption: caption || null,
        alt_text: alt_text || title,
        is_featured: is_featured || false,
        is_published: true,
        created_at: new Date().toISOString(),
      };
      memoryGallery.unshift(newItem);
      return NextResponse.json({ item: newItem, message: "Gallery media uploaded successfully." });
    }

    return NextResponse.json({ item: data, message: "Gallery media uploaded successfully." });
  } catch (err) {
    return NextResponse.json(
      { error: { message: "Failed to upload gallery media." } },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const db = getAdminClient(supabase);

    const body = await request.json();
    const {
      id,
      title,
      media_type,
      url,
      thumbnail_url,
      category,
      caption,
      is_featured,
      is_published,
    } = body;

    if (!id) {
      return NextResponse.json({ error: { message: "Media ID required." } }, { status: 400 });
    }

    const updates: {
      title?: string;
      media_type?: string;
      url?: string;
      thumbnail_url?: string | null;
      category?: string;
      caption?: string | null;
      is_featured?: boolean;
      is_published?: boolean;
    } = {};

    if (title !== undefined) updates.title = title;
    if (media_type !== undefined) updates.media_type = media_type;
    if (url !== undefined) updates.url = url;
    if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url || null;
    if (category !== undefined) updates.category = category;
    if (caption !== undefined) updates.caption = caption || null;
    if (is_featured !== undefined) updates.is_featured = Boolean(is_featured);
    if (is_published !== undefined) updates.is_published = Boolean(is_published);

    const { error } = await db.from("gallery_items").update(updates).eq("id", id);

    const memoryItem = memoryGallery.find((g) => g.id === id);
    if (memoryItem) {
      if (updates.title !== undefined) memoryItem.title = updates.title;
      if (updates.media_type !== undefined) memoryItem.media_type = updates.media_type;
      if (updates.url !== undefined) memoryItem.url = updates.url;
      if (updates.thumbnail_url !== undefined) memoryItem.thumbnail_url = updates.thumbnail_url;
      if (updates.category !== undefined) memoryItem.category = updates.category;
      if (updates.caption !== undefined) memoryItem.caption = updates.caption;
      if (updates.is_featured !== undefined) memoryItem.is_featured = updates.is_featured;
      if (updates.is_published !== undefined) memoryItem.is_published = updates.is_published;
    }

    if (error && !memoryItem) {
      return NextResponse.json({ error: { message: error.message } }, { status: 400 });
    }

    return NextResponse.json({ message: "Gallery media updated successfully." });
  } catch {
    return NextResponse.json(
      { error: { message: "Failed to update gallery media." } },
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
      return NextResponse.json({ error: { message: "Media ID required." } }, { status: 400 });
    }

    const { error } = await db.from("gallery_items").delete().eq("id", id);

    const idx = memoryGallery.findIndex((g) => g.id === id);
    if (idx !== -1) {
      memoryGallery.splice(idx, 1);
    }

    if (error && idx === -1) {
      return NextResponse.json({ error: { message: error.message } }, { status: 400 });
    }

    return NextResponse.json({ message: "Gallery media deleted." });
  } catch {
    return NextResponse.json({ error: { message: "Failed to delete media." } }, { status: 500 });
  }
}
