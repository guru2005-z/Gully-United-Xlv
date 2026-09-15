"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, AlertCircle, Info, Wrench, X } from "lucide-react";

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: "OFFER" | "ALERT" | "INFO" | "MAINTENANCE";
  link_url?: string;
  cta_text?: string;
  is_active: boolean;
}

export function FloatingAnnouncementBanner() {
  const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const res = await fetch("/api/admin/announcements");
        if (res.ok) {
          const data = await res.json();
          const list = (data.announcements || []).filter((a: Announcement) => a.is_active);
          if (list.length > 0) {
            setActiveAnnouncement(list[0]);
          }
        }
      } catch {
        // Ignore fetch errors
      }
    }
    fetchAnnouncements();
  }, []);

  if (!activeAnnouncement || dismissed) return null;

  const styleMap = {
    OFFER: "bg-gradient-to-r from-[#CCFF00] via-lime-400 to-emerald-400 text-black font-extrabold",
    ALERT: "bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold",
    INFO: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold",
    MAINTENANCE: "bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold",
  };

  const IconMap = {
    OFFER: Sparkles,
    ALERT: AlertCircle,
    INFO: Info,
    MAINTENANCE: Wrench,
  };

  const Icon = IconMap[activeAnnouncement.type] || Sparkles;

  return (
    <aside
      aria-label="Site announcement"
      className={`relative z-50 px-4 py-2.5 text-xs sm:text-sm shadow-xl flex items-center justify-between gap-3 ${styleMap[activeAnnouncement.type]}`}
    >
      <div className="mx-auto flex items-center gap-2 text-center flex-wrap justify-center">
        <Icon size={16} className="shrink-0" />
        <span>
          <strong className="uppercase tracking-wider">{activeAnnouncement.title}:</strong>{" "}
          {activeAnnouncement.message}
        </span>
        {activeAnnouncement.link_url && (
          <Link
            href={activeAnnouncement.link_url as never}
            className="underline underline-offset-4 font-black hover:opacity-80 transition-opacity ml-1"
          >
            {activeAnnouncement.cta_text || "Learn More →"}
          </Link>
        )}
      </div>

      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss banner"
        className="p-1 rounded-full hover:bg-black/20 transition-colors shrink-0"
      >
        <X size={16} />
      </button>
    </aside>
  );
}
