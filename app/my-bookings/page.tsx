"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock, ShieldCheck, Ticket, User, LogOut, ArrowRight } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase-auth-client";

export interface UserBooking {
  id: string;
  ref: string;
  booking_date: string;
  start_hour: number;
  players: number;
  amount: number;
  status: string;
  payment_status: string;
  created_at: string;
}

export default function MyBookingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuthAndLoadBookings() {
      const supabase = createSupabaseBrowserClient();
      const { data: authData } = await supabase.auth.getUser();

      if (!authData?.user) {
        router.push("/auth");
        return;
      }

      setUser(authData.user);

      // Fetch user's bookings
      const { data: dbBookings } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", authData.user.id)
        .order("created_at", { ascending: false });

      if (dbBookings) {
        setBookings(dbBookings as UserBooking[]);
      }
      setLoading(false);
    }

    checkAuthAndLoadBookings();
  }, [router]);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 pt-28 pb-16">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-neutral-900 w-48 rounded-xl" />
          <div className="h-40 bg-neutral-900 rounded-2xl" />
          <div className="h-40 bg-neutral-900 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-28 pb-16 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <span className="text-[0.65rem] font-extrabold uppercase tracking-widest text-[#CCFF00]">
            Authenticated Account Portal
          </span>
          <h1 className="text-3xl font-black tracking-tight text-white mt-1">My Turf Bookings</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Logged in as <span className="text-white font-bold">{user?.email || user?.phone}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/book"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#CCFF00] text-black text-xs font-black uppercase tracking-wider hover:bg-[#b8e600] transition-all shadow-lg shadow-[#CCFF00]/10"
          >
            Book New Slot <ArrowRight size={14} />
          </Link>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/30 text-red-400 text-xs font-bold uppercase hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {bookings.length === 0 ? (
          <div className="panel p-8 text-center space-y-4">
            <Ticket size={40} className="mx-auto text-neutral-600" />
            <h3 className="text-xl font-bold">No Bookings Found</h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              You haven&apos;t booked any turf slots yet. Choose an available slot and start
              playing!
            </p>
            <Link href="/book" className="btn-neon inline-flex items-center gap-2">
              Book a Slot Now <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          bookings.map((b) => {
            const hourStr = `${b.start_hour % 12 || 12}:00 ${b.start_hour >= 12 ? "PM" : "AM"}`;
            return (
              <div
                key={b.id}
                className="panel p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-neutral-800 hover:border-[#CCFF00]/40 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-black text-[#CCFF00]">
                      {b.ref || "GU-SLOT"}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[0.6rem] font-bold uppercase tracking-wider ${
                        b.status === "confirmed" || b.status === "CONFIRMED"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : b.status === "pending" || b.status === "HOLD"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                            : "bg-red-500/20 text-red-400 border border-red-500/40"
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-300">
                    <span className="flex items-center gap-1.5 font-bold">
                      <CalendarDays size={14} className="text-[#CCFF00]" /> {b.booking_date}
                    </span>
                    <span className="flex items-center gap-1.5 font-bold">
                      <Clock size={14} className="text-[#CCFF00]" /> {hourStr}
                    </span>
                    <span className="flex items-center gap-1.5 text-neutral-400">
                      <User size={14} /> {b.players} Players
                    </span>
                  </div>
                </div>

                <div className="text-right sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-800">
                  <div className="text-2xl font-black text-[#CCFF00]">₹{b.amount}</div>
                  <div className="text-[0.65rem] font-mono uppercase text-neutral-500">
                    Payment: {b.payment_status || "UNPAID"}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
