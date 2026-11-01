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

const DISMISS_STORAGE_KEY = "guxlv_dismissed_announcement";

export function FloatingAnnouncementBanner() {
  const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_STORAGE_KEY) === "1") {
        setDismissed(true);
        return;
      }
    } catch {
      // Ignore storage access errors
    }

    async function fetchAnnouncements() {
      try {
        const res = await fetch("/api/admin/announcements", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const list = (data.announcements || []).filter((a: Announcement) => a.is_active);
          if (list.length > 0) {
            setActiveAnnouncement(list[0]);
          } else {
            setActiveAnnouncement(null);
          }
        }
      } catch {
        // Ignore fetch errors
      }
    }
    fetchAnnouncements();
  }, []);

  function handleDismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_STORAGE_KEY, "1");
    } catch {
      // Ignore storage access errors
    }
  }

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
      className={`relative z-[60] px-3 py-1.5 sm:px-4 sm:py-2 text-[0.7rem] sm:text-xs leading-snug shadow-md flex items-center justify-between gap-2 ${styleMap[activeAnnouncement.type]}`}
    >
      <div className="mx-auto flex items-center gap-1.5 sm:gap-2 text-left sm:text-center flex-wrap sm:justify-center pr-1">
        <Icon size={14} className="shrink-0" />
        <span>
          <strong className="uppercase tracking-wider">{activeAnnouncement.title}:</strong>{" "}
          {activeAnnouncement.message}
        </span>
        {activeAnnouncement.link_url && (
          <Link
            href={activeAnnouncement.link_url as never}
            className="underline underline-offset-4 font-black hover:opacity-80 transition-opacity ml-1 shrink-0"
          >
            {activeAnnouncement.cta_text || "Learn More →"}
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        className="relative z-10 cursor-pointer grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-full hover:bg-black/20 active:scale-95 transition-all shrink-0"
      >
        <X size={15} />
      </button>
    </aside>
  );
}
