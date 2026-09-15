import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ChevronLeft } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  const pathname =
    headerList.get("x-pathname") || headerList.get("next-url") || headerList.get("referer") || "";

  // If path is /admin/login, bypass strict guard so admin can log in
  if (pathname.includes("/admin/login") || pathname.endsWith("/login")) {
    return <>{children}</>;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is not logged in, redirect to admin login
  if (!user) {
    if (pathname.includes("/login")) {
      return <>{children}</>;
    }
    redirect("/admin/login");
  }

  // Check admin role in admin_profiles
  const { data: adminProfile } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const userPhone = user.phone || "";
  const userEmail = user.email || "";
  const isAdminContact =
    userPhone.includes("9491501919") ||
    userPhone.includes("9390817811") ||
    userEmail.toLowerCase().includes("gullyunitedxlv");

  if (!adminProfile && !isAdminContact) {
    return (
      <div className="min-h-screen bg-black text-white grid place-items-center p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-6 bg-neutral-900/80 border border-red-900/50 p-8 rounded-3xl backdrop-blur-xl">
          <div className="w-16 h-16 bg-red-950/80 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">403 Forbidden</h1>
            <p className="mt-2 text-sm text-neutral-400">
              Access restricted. Your account (
              <span className="text-neutral-200">{user.email || user.phone}</span>) does not have
              administrative privileges.
            </p>
          </div>
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Link
              href="/"
              className="flex-1 py-3 px-4 rounded-xl border border-neutral-700 text-xs font-extrabold uppercase tracking-widest hover:bg-neutral-800 transition-colors inline-flex items-center justify-center gap-2"
            >
              <ChevronLeft size={16} /> Return to Site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
