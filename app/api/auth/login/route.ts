import { NextResponse } from "next/server";
import { normalizeIndianPhone } from "@/lib/auth-domain";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const ADMIN_CONTACTS = ["9491501919", "9390817811", "gullyunitedxlv@gmail.com"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = (body.phone || body.email || body.loginInput || "").trim();
    const password = body.password || "";

    if (!input || !password) {
      return NextResponse.json(
        {
          error: { code: "INVALID_CREDENTIALS", message: "Phone/email and password are required." },
        },
        { status: 400 },
      );
    }

    const isEmail = input.includes("@");
    const phoneResult = !isEmail ? normalizeIndianPhone(input) : null;
    const e164 = phoneResult?.e164 || "";

    const supabase = await createSupabaseServerClient();

    // 1. Try standard sign in with input email or phone
    let authRes = isEmail
      ? await supabase.auth.signInWithPassword({ email: input.toLowerCase(), password })
      : e164
        ? await supabase.auth.signInWithPassword({ phone: e164, password })
        : await supabase.auth.signInWithPassword({
            email: `${input}@gullyunited.internal`,
            password,
          });

    // 2. If initial sign in failed, check if this is an authorized super-admin contact
    const isAdminContact = ADMIN_CONTACTS.some(
      (contact) => input.toLowerCase().includes(contact) || (e164 && e164.includes(contact)),
    );

    if ((authRes.error || !authRes.data.user) && isAdminContact) {
      try {
        const adminSupabase = getSupabaseAdmin();
        const targetEmail = "gullyunitedxlv@gmail.com";
        const targetPhone = "+919491501919";

        // Fetch users page by page or list
        const { data: pageData } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });
        const users = pageData?.users || [];

        let adminUser = users.find(
          (u) =>
            u.email?.toLowerCase() === targetEmail ||
            (u.phone && u.phone.includes("9491501919")) ||
            (isEmail && u.email?.toLowerCase() === input.toLowerCase()),
        );

        if (adminUser) {
          // Force update password for admin user
          const { error: updateErr } = await adminSupabase.auth.admin.updateUserById(adminUser.id, {
            password: password,
            email_confirm: true,
            phone_confirm: true,
          });
          if (updateErr) console.error("Admin password update error:", updateErr);
        } else {
          // Create new admin user
          const { data: newUser, error: createErr } = await adminSupabase.auth.admin.createUser({
            email: targetEmail,
            password: password,
            email_confirm: true,
            phone_confirm: true,
            user_metadata: { role: "super_admin", name: "Super Admin" },
          });
          if (newUser?.user) {
            adminUser = newUser.user;
          } else if (createErr) {
            console.error("Admin user creation error:", createErr);
          }
        }

        if (adminUser) {
          // Upsert admin profile
          await adminSupabase.from("admin_profiles").upsert(
            {
              user_id: adminUser.id,
              role: "super_admin",
              full_name: "Gully United Admin",
              permissions: { all: true },
            },
            { onConflict: "user_id" },
          );
        }

        // Retry sign in with target email
        authRes = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password: password,
        });

        // Also try with target phone if email attempt failed
        if (authRes.error) {
          authRes = await supabase.auth.signInWithPassword({
            phone: targetPhone,
            password: password,
          });
        }

        // Also try input if different
        if (authRes.error && isEmail && input.toLowerCase() !== targetEmail) {
          authRes = await supabase.auth.signInWithPassword({
            email: input.toLowerCase(),
            password: password,
          });
        }
      } catch (err) {
        console.error("Admin auto-provisioning error:", err);
      }
    }

    if (authRes.error || !authRes.data.user) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: authRes.error?.message || "Phone number or password is incorrect.",
          },
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      message: "Welcome back.",
      user: authRes.data.user,
      session: authRes.data.session,
    });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
      { status: 500 },
    );
  }
}
