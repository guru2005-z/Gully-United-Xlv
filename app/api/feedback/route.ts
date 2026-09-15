import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("customer_feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ feedback: [] });
    }

    return NextResponse.json({ feedback: data || [] });
  } catch {
    return NextResponse.json({ feedback: [] });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { customerName, customerPhone, rating, category, comment } = body;

    if (!customerName || !rating || !comment) {
      return NextResponse.json(
        { error: { message: "Name, rating, and comment are required." } },
        { status: 400 },
      );
    }

    const { data: authData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("customer_feedback")
      .insert({
        user_id: authData?.user?.id || null,
        customer_name: customerName,
        customer_phone: customerPhone || null,
        rating: Number(rating),
        category: category || "TURF_QUALITY",
        comment,
        is_published: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: { message: error.message } }, { status: 400 });
    }

    return NextResponse.json({ feedback: data, message: "Thank you for your feedback!" });
  } catch (err) {
    return NextResponse.json({ error: { message: "Failed to submit feedback." } }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData?.user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const body = (await request.json()) as {
      id?: string;
      is_featured?: boolean;
      is_published?: boolean;
    };
    const { id, is_featured, is_published } = body;

    const updates: Record<string, unknown> = {};
    if (is_featured !== undefined) updates["is_featured"] = is_featured;
    if (is_published !== undefined) updates["is_published"] = is_published;

    const { error } = await supabase.from("customer_feedback").update(updates).eq("id", id);

    if (error) {
      return NextResponse.json({ error: { message: error.message } }, { status: 400 });
    }

    return NextResponse.json({ message: "Feedback updated." });
  } catch {
    return NextResponse.json({ error: { message: "Failed to update feedback." } }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData?.user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: { message: "Feedback ID is required." } }, { status: 400 });
    }

    const { error } = await supabase.from("customer_feedback").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: { message: error.message } }, { status: 400 });
    }

    return NextResponse.json({ message: "Feedback deleted successfully." });
  } catch {
    return NextResponse.json({ error: { message: "Failed to delete feedback." } }, { status: 500 });
  }
}
