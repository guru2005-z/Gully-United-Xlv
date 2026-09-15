import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  WHATSAPP_API_TOKEN: z.string().optional(),
  WHATSAPP_ADMIN_PHONE: z.string().optional(),
});

export function getValidatedEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Environment Validation Warning:", result.error.format());
  }
  return result.data ?? process.env;
}

export function requireSupabaseAdminEnv() {
  const url =
    process.env["NEXT_PUBLIC_SUPABASE_URL"] ||
    process.env["SUPABASE_URL"] ||
    "https://wyrnexoaygoebrkgnrtv.supabase.co";
  const serviceRoleKey =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] || process.env["SUPABASE_SECRET_KEY"] || "";
  return { url, serviceRoleKey };
}
