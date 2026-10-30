import { NextResponse } from "next/server";
import { normalizeIndianPhone } from "@/lib/auth-domain";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limiter";

const ADMIN_DEFAULT_EMAIL = "gullyunitedxlv@gmail.com";
const ADMIN_DEFAULT_PASSWORD = process.env["ADMIN_PASSWORD"] || "GullyAdmin@2026";

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimit(getRateLimitKey(request, "auth:login"), 10, 300);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many login attempts. Try again later." } },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

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
    const normalizedInput = input.toLowerCase();

    const isOwnerAdminIdentifier =
      normalizedInput === ADMIN_DEFAULT_EMAIL ||
      normalizedInput.includes("gullyunitedxlv") ||
      input.includes("9390817811") ||
      input.includes("9491501919");

    const supabase = await createSupabaseServerClient();

    // 1. Try standard sign in with input email or phone
    let authRes = isEmail
      ? await supabase.auth.signInWithPassword({ email: normalizedInput, password })
      : e164
        ? await supabase.auth.signInWithPassword({ phone: e164, password })
        : await supabase.auth.signInWithPassword({
            email: `${input}@gullyunited.internal`,
            password,
          });

    // 2. If owner logs in with admin credentials and account isn't provisioned yet, auto-provision in Supabase
    if (
      (authRes.error || !authRes.data.user) &&
      isOwnerAdminIdentifier &&
      password === ADMIN_DEFAULT_PASSWORD
    ) {
      try {
        const adminClient = getSupabaseAdmin();
        const { data: usersList } = await adminClient.auth.admin.listUsers();
        const existingAdmin = usersList?.users?.find(
          (u) => (u.email || "").toLowerCase() === ADMIN_DEFAULT_EMAIL,
        );

        let adminUserId = existingAdmin?.id;

        if (existingAdmin) {
          await adminClient.auth.admin.updateUserById(existingAdmin.id, {
            password: ADMIN_DEFAULT_PASSWORD,
            email_confirm: true,
          });
        } else {
          const { data: created } = await adminClient.auth.admin.createUser({
            email: ADMIN_DEFAULT_EMAIL,
            password: ADMIN_DEFAULT_PASSWORD,
            email_confirm: true,
            user_metadata: {
              full_name: "Gully United Super Admin",
              phone: "+919390817811",
            },
          });
          adminUserId = created?.user?.id;
        }

        if (adminUserId) {
          await adminClient.from("admin_profiles").upsert(
            {
              user_id: adminUserId,
              full_name: "Gully United Super Admin",
              role: "super_admin",
            },
            { onConflict: "user_id" },
          );
        }

        authRes = await supabase.auth.signInWithPassword({
          email: ADMIN_DEFAULT_EMAIL,
          password: ADMIN_DEFAULT_PASSWORD,
        });
      } catch {
        // Ignore provisioning errors and fall through to standard error handling
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
