import { getSupabaseAdmin } from "./supabase-admin";

export interface CouponRecord {
  id: string;
  code: string;
  description: string | null;
  discount_type: "PERCENTAGE" | "FIXED" | string;
  discount_value: number;
  min_booking_amount: number;
  max_discount_paise: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  message: string;
  type: "OFFER" | "ALERT" | "INFO" | "MAINTENANCE" | string;
  link_url: string | null;
  image_url: string | null;
  cta_text: string | null;
  is_active: boolean;
  created_at: string;
}

const COUPONS_EVENT_KEY = "__system_store:coupons__";
const ANNOUNCEMENTS_EVENT_KEY = "__system_store:announcements__";

const DEFAULT_SEED_COUPONS: CouponRecord[] = [
  {
    id: "cpn-1",
    code: "GULLY10",
    description: "10% OFF on all day/night slots",
    discount_type: "PERCENTAGE",
    discount_value: 10,
    min_booking_amount: 0,
    max_discount_paise: 50000,
    usage_limit: 100,
    used_count: 12,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "cpn-2",
    code: "GULLY20",
    description: "20% OFF for weekend matches",
    discount_type: "PERCENTAGE",
    discount_value: 20,
    min_booking_amount: 500,
    max_discount_paise: 100000,
    usage_limit: 50,
    used_count: 5,
    is_active: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "cpn-3",
    code: "WELCOME",
    description: "Flat ₹50 OFF for first time players",
    discount_type: "FIXED",
    discount_value: 50,
    min_booking_amount: 0,
    max_discount_paise: null,
    usage_limit: 500,
    used_count: 89,
    is_active: true,
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

const DEFAULT_SEED_ANNOUNCEMENTS: AnnouncementRecord[] = [
  {
    id: "ann-1",
    title: "10% OFF Night Slots (8 PM - 11 PM)",
    message: "Use code GULLY10 at checkout for instant ₹50 discount on prime floodlit hours.",
    type: "OFFER",
    link_url: "/book",
    image_url: null,
    cta_text: "BOOK NOW",
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

let fallbackCoupons: CouponRecord[] = [...DEFAULT_SEED_COUPONS];
let fallbackAnnouncements: AnnouncementRecord[] = [...DEFAULT_SEED_ANNOUNCEMENTS];

async function readEventStore<T>(eventKey: string, defaultSeed: T): Promise<T> {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("booking_events")
      .select("id, payload")
      .eq("event_key", eventKey)
      .maybeSingle();

    if (!error && data && data.payload && typeof data.payload === "object") {
      const items = (data.payload as { items?: T }).items;
      if (items !== undefined) {
        return items;
      }
    }

    if (!error && !data) {
      await db.from("booking_events").upsert(
        {
          provider: "system_store",
          event_key: eventKey,
          event_type: "ADMIN_STORE",
          payload: { items: defaultSeed, updatedAt: new Date().toISOString() },
        },
        { onConflict: "event_key" },
      );
      return defaultSeed;
    }
  } catch {
    // Ignore DB errors and fall back
  }
  return defaultSeed;
}

async function writeEventStore<T>(eventKey: string, items: T): Promise<void> {
  try {
    const db = getSupabaseAdmin();
    await db.from("booking_events").upsert(
      {
        provider: "system_store",
        event_key: eventKey,
        event_type: "ADMIN_STORE",
        payload: { items, updatedAt: new Date().toISOString() },
      },
      { onConflict: "event_key" },
    );
  } catch {
    // Ignore DB errors
  }
}

export async function getStoredCoupons(): Promise<CouponRecord[]> {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("discount_coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data as CouponRecord[];
    }
  } catch {
    // discount_coupons table may not exist; use booking_events store
  }

  const stored = await readEventStore<CouponRecord[]>(COUPONS_EVENT_KEY, fallbackCoupons);
  fallbackCoupons = Array.isArray(stored) ? stored : [];
  return fallbackCoupons;
}

export async function saveStoredCoupons(coupons: CouponRecord[]): Promise<void> {
  fallbackCoupons = coupons;
  await writeEventStore(COUPONS_EVENT_KEY, coupons);
}

export async function getStoredAnnouncements(): Promise<AnnouncementRecord[]> {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("site_announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data as AnnouncementRecord[];
    }
  } catch {
    // site_announcements table may not exist; use booking_events store
  }

  const stored = await readEventStore<AnnouncementRecord[]>(
    ANNOUNCEMENTS_EVENT_KEY,
    fallbackAnnouncements,
  );
  fallbackAnnouncements = Array.isArray(stored) ? stored : [];
  return fallbackAnnouncements;
}

export async function saveStoredAnnouncements(announcements: AnnouncementRecord[]): Promise<void> {
  fallbackAnnouncements = announcements;
  await writeEventStore(ANNOUNCEMENTS_EVENT_KEY, announcements);
}

/**
 * Filter announcements so that any offer banner referencing a promo code
 * (e.g. "Use code GULLY10") is automatically hidden if that promo code is
 * paused, deleted, or has reached its usage limit.
 */
export function filterAnnouncementsByActiveCoupons(
  announcements: AnnouncementRecord[],
  coupons: CouponRecord[],
): AnnouncementRecord[] {
  const activeCoupons = coupons.filter(
    (c) =>
      c.is_active &&
      (c.usage_limit === null ||
        c.usage_limit === undefined ||
        (c.used_count || 0) < c.usage_limit),
  );
  const activeCodes = new Set(activeCoupons.map((c) => c.code.toUpperCase().trim()));
  const allKnownCodes = new Set(coupons.map((c) => c.code.toUpperCase().trim()));

  return announcements.map((ann) => {
    if (!ann.is_active) return ann;

    const combinedText = `${ann.title} ${ann.message}`;
    const codeMatch = combinedText.match(/\buse\s+code\s+([A-Za-z0-9_-]+)\b/i);

    if (codeMatch && codeMatch[1]) {
      const referencedCode = codeMatch[1].toUpperCase().trim();
      // If the referenced coupon is not in the active coupons list, hide this banner
      if (!activeCodes.has(referencedCode)) {
        return { ...ann, is_active: false };
      }
    } else {
      // Also check if any known paused/inactive coupon code is explicitly mentioned
      for (const code of allKnownCodes) {
        const regex = new RegExp(`\\b${code}\\b`, "i");
        if (regex.test(combinedText) && !activeCodes.has(code)) {
          return { ...ann, is_active: false };
        }
      }
    }

    return ann;
  });
}
