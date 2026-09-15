"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-auth-client";
import { calculateSlotPrice, VENUE_RULES } from "@/lib/domain/venue";

export interface SlotState {
  startHour: number;
  endHour: number;
  amountPaise: number;
  formattedPrice: string;
  isAvailable: boolean;
  status?: string;
}

interface RealtimeSlotGridProps {
  selectedDate: string;
  onSelectSlot: (startHour: number) => void;
  selectedStartHour?: number;
}

export function RealtimeSlotGrid({
  selectedDate,
  onSelectSlot,
  selectedStartHour,
}: RealtimeSlotGridProps) {
  const [slots, setSlots] = useState<SlotState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const supabase = createSupabaseBrowserClient();

    async function fetchAvailability() {
      setLoading(true);
      const { data: bookings } = await supabase
        .from("bookings")
        .select("start_hour, status")
        .or(`booking_date.eq.${selectedDate},date_key.eq.${selectedDate}`)
        .in("status", ["HOLD", "PAYMENT_PENDING", "PAID", "CONFIRMED", "BLOCKED", "PENDING"]);

      const unavailableHours = new Set(bookings?.map((b) => b.start_hour) ?? []);

      const grid: SlotState[] = [];
      for (let hour = VENUE_RULES.openHour; hour < VENUE_RULES.closeHour; hour++) {
        const priceInfo = calculateSlotPrice(hour);
        const isAvailable = !unavailableHours.has(hour);
        grid.push({
          startHour: hour,
          endHour: hour + 1,
          amountPaise: priceInfo.amountPaise,
          formattedPrice: priceInfo.formattedPrice,
          isAvailable,
        });
      }

      setSlots(grid);
      setLoading(false);
    }

    fetchAvailability();

    // Subscribe to Supabase Realtime changes on bookings
    channel = supabase
      .channel(`realtime-slots-${selectedDate}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        fetchAvailability();
      })
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-16 bg-neutral-900 animate-pulse rounded-xl border border-neutral-800"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-4"
      role="radiogroup"
      aria-label="Available Turf Slots"
    >
      {slots.map((slot) => {
        const isSelected = selectedStartHour === slot.startHour;
        const hourLabel = `${slot.startHour % 12 || 12}:00 ${slot.startHour >= 12 ? "PM" : "AM"}`;

        return (
          <button
            key={slot.startHour}
            type="button"
            disabled={!slot.isAvailable}
            onClick={() => slot.isAvailable && onSelectSlot(slot.startHour)}
            aria-checked={isSelected}
            role="radio"
            className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
              !slot.isAvailable
                ? "border-red-900/50 bg-red-950/20 text-neutral-500 cursor-not-allowed opacity-60"
                : isSelected
                  ? "border-[#CCFF00] bg-[#CCFF00]/10 text-white shadow-[0_0_15px_rgba(204,255,0,0.2)]"
                  : "border-neutral-800 bg-neutral-900/80 hover:border-neutral-700 text-neutral-200"
            }`}
          >
            <span className="font-bold text-sm">{hourLabel}</span>
            <span className="text-xs text-neutral-400 font-mono mt-1">{slot.formattedPrice}</span>
            {!slot.isAvailable && (
              <span className="text-[10px] text-red-400 font-semibold uppercase mt-1">Booked</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
