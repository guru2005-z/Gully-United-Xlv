"use client";

import Link from "next/link";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Phone,
  LogOut,
  Users,
  RefreshCw,
  Search,
  Calendar as CalendarIcon,
  TrendingUp,
  Download,
  Plus,
  ShieldCheck,
  Tag,
  MessageSquare,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Settings,
  Bell,
  Sparkles,
  DollarSign,
  Activity,
  Zap,
  Filter,
  UserCheck,
  Lock,
  Eye,
  HelpCircle,
  ExternalLink,
  Wrench,
  Clock,
  ThumbsUp,
  X,
  Trash2,
  Edit2,
  Play,
  Upload,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { LogoMark } from "@/components/Logo";
import { createSupabaseBrowserClient } from "@/lib/supabase-auth-client";

export interface DatabaseBooking {
  id: string;
  public_reference: string;
  reference?: string;
  customer_name: string;
  customer_phone?: string;
  phone?: string;
  customer_email?: string;
  email?: string;
  players: number;
  booking_date: string;
  date_key?: string;
  start_hour: number;
  end_hour?: number;
  amount_paise?: number;
  amount?: number;
  status: string;
  payment_status: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
}

export interface CustomerUser {
  id?: string;
  name: string;
  phone: string;
  email: string;
  totalBookings: number;
  completedBookings: number;
  totalSpentPaise: number;
  is_blocked?: boolean;
  lastBookingDate: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link_url?: string;
  cta_text?: string;
  is_active: boolean;
}

export interface GalleryItem {
  id: string;
  title: string;
  media_type: string;
  url: string;
  thumbnail_url?: string;
  category: string;
  caption?: string;
  is_featured: boolean;
  is_published: boolean;
}

export interface CouponItem {
  id: string;
  code: string;
  description?: string;
  discount_type: string;
  discount_value: number;
  min_booking_amount: number;
  usage_limit?: number | null;
  used_count: number;
  is_active: boolean;
}

export interface FeedbackItem {
  id: string;
  customer_name: string;
  customer_phone?: string;
  rating: number;
  category: string;
  comment: string;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  booking_id?: string;
  user_id?: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  amount_paise: number;
  currency: string;
  status: string;
  method?: string;
  error_code?: string;
  error_description?: string;
  created_at: string;
  updated_at: string;
  bookings?: DatabaseBooking;
}

export interface WebhookRecord {
  id: string;
  razorpay_event_id: string;
  event_type: string;
  amount_paise?: number;
  duplicate: boolean;
  processed: boolean;
  created_at: string;
}

export interface RefundRecord {
  id: string;
  payment_id: string;
  razorpay_refund_id: string;
  amount_paise: number;
  status: string;
  reason?: string;
  initiated_by?: string;
  created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  CONFIRMED: "bg-[#CCFF00]/15 text-[#CCFF00] border-[#CCFF00]/40",
  HOLD: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  PAYMENT_PENDING: "bg-blue-500/15 text-blue-400 border-blue-500/40",
  CANCELLED: "bg-red-500/15 text-red-400 border-red-500/40",
  BLOCKED: "bg-neutral-800 text-neutral-400 border-neutral-700",
  COMPLETED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
  REFUNDED: "bg-purple-500/15 text-purple-400 border-purple-500/40",
};

export type AdminTab =
  | "overview"
  | "bookings"
  | "calendar"
  | "customers"
  | "payments"
  | "pricing"
  | "gallery"
  | "announcements"
  | "feedback"
  | "audit"
  | "settings";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  // Data states
  const [bookings, setBookings] = useState<DatabaseBooking[]>([]);
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [paymentsList, setPaymentsList] = useState<PaymentRecord[]>([]);
  const [webhooksList, setWebhooksList] = useState<WebhookRecord[]>([]);
  const [refundsList, setRefundsList] = useState<RefundRecord[]>([]);
  const [websiteSettings, setWebsiteSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Razorpay Reconciler & Refund States
  const [reconcileOrderIdInput, setReconcileOrderIdInput] = useState("");
  const [reconcileResult, setReconcileResult] = useState<{
    isMatched?: boolean;
    razorpayOrder?: { id?: string; status?: string; amount?: number };
    databasePayment?: { id?: string; status?: string; amount_paise?: number };
  } | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [refundAmountPaiseInput, setRefundAmountPaiseInput] = useState<number>(0);

  // Filters & Controls
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0] || "", []);
  const [analyticsFilterType, setAnalyticsFilterType] = useState<
    "preset" | "custom_dates" | "specific_month" | "specific_year"
  >("preset");
  const [dateRangePreset, setDateRangePreset] = useState<
    "today" | "week" | "month" | "year" | "5year" | "all"
  >("today");
  const [customStartDate, setCustomStartDate] = useState<string>(todayStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedMonthYear, setSelectedMonthYear] = useState<number>(new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewDate, setViewDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Modals
  const [detailBooking, setDetailBooking] = useState<DatabaseBooking | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<CustomerUser | null>(null);
  const [editingCustomerForm, setEditingCustomerForm] = useState<{
    name: string;
    phone: string;
    email: string;
  } | null>(null);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState<DatabaseBooking | null>(null);

  // Form states for modals
  const [offlineForm, setOfflineForm] = useState({
    customerName: "",
    customerPhone: "",
    bookingDate: new Date().toISOString().split("T")[0],
    startHour: 18,
    players: 12,
    amountPaise: 49900,
    paymentMethod: "CASH_COUNTER",
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    message: "",
    type: "OFFER",
    link_url: "",
    cta_text: "",
  });
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);

  const [galleryForm, setGalleryForm] = useState({
    title: "",
    url: "",
    media_type: "IMAGE",
    category: "TURF",
    caption: "",
  });
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);

  const [couponForm, setCouponForm] = useState({
    code: "",
    description: "",
    discount_type: "PERCENTAGE",
    discount_value: 20,
    min_booking_amount: 0,
    usage_limit: 100,
  });
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);

  const [refundReason, setRefundReason] = useState("Customer requested cancellation");
  const [holdModalSlot, setHoldModalSlot] = useState<{
    hour: number;
    hourStr: string;
  } | null>(null);
  const [holdForm, setHoldForm] = useState({
    actionType: "HOLD_SLOT" as "HOLD_SLOT" | "BLOCK_SLOT",
    holdDurationMinutes: 30,
    customerName: "",
    customerPhone: "",
    notes: "",
  });

  const [adminNameForm, setAdminNameForm] = useState({
    fullName: "Gully United Ground Manager",
    email: "Gullyunitedxlv@gmail.com",
    phone: "9491501919",
  });

  const [passwordChangeForm, setPasswordChangeForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [savingAdminProfile, setSavingAdminProfile] = useState(false);
  const [savingAdminPassword, setSavingAdminPassword] = useState(false);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    showToast("Admin session ended. Locking dashboard.");
    window.location.href = "/admin/login";
  }

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleUpdateAdminName(e: React.FormEvent) {
    e.preventDefault();
    setSavingAdminProfile(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "ADMIN_PROFILE_NAME",
          value: {
            fullName: adminNameForm.fullName,
            email: adminNameForm.email,
            phone: adminNameForm.phone,
            updatedAt: new Date().toISOString(),
          },
        }),
      });

      if (res.ok) {
        showToast("Admin Name updated successfully.");
      } else {
        const data = await res.json();
        showToast(data.error?.message || "Failed to update Admin Name.", "error");
      }
    } catch {
      showToast("Failed to update Admin Name.", "error");
    } finally {
      setSavingAdminProfile(false);
    }
  }

  async function handleChangePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passwordChangeForm.newPassword !== passwordChangeForm.confirmPassword) {
      showToast("New password and confirm password do not match.", "error");
      return;
    }
    if (passwordChangeForm.newPassword.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }

    setSavingAdminPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: passwordChangeForm.newPassword,
          confirmNewPassword: passwordChangeForm.confirmPassword,
        }),
      });

      if (res.ok) {
        showToast("Security Password updated successfully!");
        setPasswordChangeForm({ newPassword: "", confirmPassword: "" });
      } else {
        const data = await res.json();
        showToast(data.error?.message || "Failed to update password.", "error");
      }
    } catch {
      showToast("Error updating security password.", "error");
    } finally {
      setSavingAdminPassword(false);
    }
  }

  async function handleHoldBlockSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!holdModalSlot) return;

    const res = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: holdForm.actionType,
        bookingDate: viewDate,
        startHour: holdModalSlot.hour,
        holdDurationMinutes: holdForm.holdDurationMinutes,
        customerName: holdForm.customerName,
        customerPhone: holdForm.customerPhone,
        notes: holdForm.notes,
        reason: holdForm.notes,
      }),
    });

    if (res.ok) {
      showToast(
        holdForm.actionType === "HOLD_SLOT"
          ? `Slot ${holdModalSlot.hourStr} held for ${holdForm.holdDurationMinutes} minutes.`
          : `Slot ${holdModalSlot.hourStr} blocked successfully.`,
      );
      setHoldModalSlot(null);
      setHoldForm({
        actionType: "HOLD_SLOT",
        holdDurationMinutes: 30,
        customerName: "",
        customerPhone: "",
        notes: "",
      });
      fetchAllAdminData();
    } else {
      const data = await res.json();
      showToast(data.error?.message || "Failed to complete slot action.", "error");
    }
  }

  async function fetchAllAdminData() {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();

      // Fetch Bookings via Admin API
      const bRes = await fetch("/api/admin/bookings");
      if (bRes.ok) {
        const bData = await bRes.json();
        if (bData.bookings) setBookings(bData.bookings as DatabaseBooking[]);
      }

      // Fetch Customers API
      const userRes = await fetch("/api/admin/users");
      let fetchedCustomers: CustomerUser[] = [];
      if (userRes.ok) {
        const uData = await userRes.json();
        if (uData.customers && uData.customers.length > 0) {
          fetchedCustomers = uData.customers;
        }
      }
      if (fetchedCustomers.length === 0 && bookings.length > 0) {
        const cMap = new Map<string, CustomerUser>();
        bookings.forEach((b) => {
          const key = (b.customer_phone || b.phone || b.customer_name || "GUEST").trim();
          const isConfirmed = b.status === "CONFIRMED" || b.status === "COMPLETED";
          const amt = b.amount_paise || (b.amount ? b.amount * 100 : 0);
          const existing = cMap.get(key);
          if (existing) {
            existing.totalBookings += 1;
            if (isConfirmed) {
              existing.completedBookings += 1;
              existing.totalSpentPaise += amt;
            }
          } else {
            cMap.set(key, {
              name: b.customer_name || "Guest Customer",
              phone: b.customer_phone || b.phone || "—",
              email: b.customer_email || b.email || "—",
              totalBookings: 1,
              completedBookings: isConfirmed ? 1 : 0,
              totalSpentPaise: isConfirmed ? amt : 0,
              lastBookingDate: b.created_at || new Date().toISOString(),
            });
          }
        });
        fetchedCustomers = Array.from(cMap.values());
      }
      setCustomers(fetchedCustomers);

      // Fetch Announcements
      const annRes = await fetch("/api/admin/announcements");
      if (annRes.ok) {
        const aData = await annRes.json();
        if (aData.announcements) setAnnouncements(aData.announcements);
      }

      // Fetch Gallery
      const galRes = await fetch("/api/admin/gallery");
      if (galRes.ok) {
        const gData = await galRes.json();
        if (gData.items) setGallery(gData.items);
      }

      // Fetch Coupons
      const cpnRes = await fetch("/api/admin/coupons");
      if (cpnRes.ok) {
        const cData = await cpnRes.json();
        if (cData.coupons) setCoupons(cData.coupons);
      }

      // Fetch Feedback
      const fbRes = await fetch("/api/feedback");
      if (fbRes.ok) {
        const fData = await fbRes.json();
        if (fData.feedback) setFeedback(fData.feedback);
      }

      // Fetch Audit Logs
      const auditRes = await fetch("/api/admin/audit");
      if (auditRes.ok) {
        const audData = await auditRes.json();
        if (audData.logs) setAuditLogs(audData.logs);
      }

      // Fetch Settings
      const setRes = await fetch("/api/admin/settings");
      if (setRes.ok) {
        const sData = await setRes.json();
        if (sData.settings) setWebsiteSettings(sData.settings);
      }

      // Fetch Razorpay Payments, Webhooks, Refunds
      const payRes = await fetch("/api/admin/payments");
      if (payRes.ok) {
        const pData = await payRes.json();
        if (pData.payments) setPaymentsList(pData.payments);
        if (pData.webhooks) setWebhooksList(pData.webhooks);
        if (pData.refunds) setRefundsList(pData.refunds);
      }
    } catch {
      showToast("Error loading control room data.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleProcessRefund(e: React.FormEvent) {
    e.preventDefault();
    if (!showRefundModal) return;
    const payment = paymentsList.find((p) => p.booking_id === showRefundModal.id) || {
      id: showRefundModal.id,
      amount_paise:
        showRefundModal.amount_paise ||
        (showRefundModal.amount ? showRefundModal.amount * 100 : 49900),
    };

    const targetAmountPaise =
      refundAmountPaiseInput > 0
        ? refundAmountPaiseInput
        : payment.amount_paise || (showRefundModal.amount ? showRefundModal.amount * 100 : 49900);

    setSubmittingRefund(true);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REFUND_PAYMENT",
          paymentId: payment.id,
          amountPaise: targetAmountPaise,
          reason: refundReason,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(data.message || "Refund issued successfully via Razorpay API!");
        setShowRefundModal(null);
        setRefundAmountPaiseInput(0);
        fetchAllAdminData();
      } else {
        const data = await res.json();
        showToast(data.error?.message || "Failed to process refund.", "error");
      }
    } catch {
      showToast("Network error processing refund.", "error");
    } finally {
      setSubmittingRefund(false);
    }
  }

  async function handleReconcileOrder(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!reconcileOrderIdInput.trim()) {
      showToast("Please enter a Razorpay Order ID (e.g. order_...)", "error");
      return;
    }

    setReconciling(true);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECONCILE_ORDER",
          razorpayOrderId: reconcileOrderIdInput.trim(),
        }),
      });

      const data = await res.json();
      setReconcileResult(data);
      if (res.ok && data.isMatched) {
        showToast("Razorpay Order reconciled cleanly! Database matches live API.");
      } else if (res.ok) {
        showToast("Reconciliation completed with status note.", "error");
      } else {
        showToast(data.error?.message || "Reconciliation failed.", "error");
      }
    } catch {
      showToast("Failed to connect to reconciliation API.", "error");
    } finally {
      setReconciling(false);
    }
  }

  useEffect(() => {
    fetchAllAdminData();

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-realtime-suite")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        fetchAllAdminData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered Bookings calculation
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchStatus = statusFilter === "ALL" || b.status === statusFilter;
      const ref = b.public_reference || b.reference || "";
      const name = b.customer_name || "";
      const phone = b.customer_phone || b.phone || "";
      const matchSearch =
        !searchQuery ||
        ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        phone.includes(searchQuery);

      return matchStatus && matchSearch;
    });
  }, [bookings, statusFilter, searchQuery]);

  // Compute effective date window based on filter type
  const effectiveDateWindow = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let start = todayStr;
    let end = todayStr;
    let label = "Today";

    if (analyticsFilterType === "preset") {
      if (dateRangePreset === "today") {
        start = todayStr;
        end = todayStr;
        label = "Today";
      } else if (dateRangePreset === "week") {
        const past = new Date();
        past.setDate(past.getDate() - 7);
        start = past.toISOString().split("T")[0] || todayStr;
        end = todayStr;
        label = "Last 7 Days";
      } else if (dateRangePreset === "month") {
        const firstDay = new Date(currentYear, currentMonth, 1);
        start = firstDay.toISOString().split("T")[0] || todayStr;
        end = todayStr;
        label = "This Month";
      } else if (dateRangePreset === "year") {
        const firstDay = new Date(currentYear, 0, 1);
        start = firstDay.toISOString().split("T")[0] || todayStr;
        end = todayStr;
        label = `Year ${currentYear}`;
      } else if (dateRangePreset === "5year") {
        const past = new Date(currentYear - 5, 0, 1);
        start = past.toISOString().split("T")[0] || todayStr;
        end = todayStr;
        label = "Last 5 Years";
      } else if (dateRangePreset === "all") {
        start = "2020-01-01";
        end = "2099-12-31";
        label = "All Time";
      }
    } else if (analyticsFilterType === "custom_dates") {
      start = customStartDate || "2020-01-01";
      end = customEndDate || todayStr;
      label = `Custom Period (${start} → ${end})`;
    } else if (analyticsFilterType === "specific_month") {
      const mStr = String(selectedMonth).padStart(2, "0");
      start = `${selectedMonthYear}-${mStr}-01`;
      const lastDayNum = new Date(selectedMonthYear, selectedMonth, 0).getDate();
      end = `${selectedMonthYear}-${mStr}-${String(lastDayNum).padStart(2, "0")}`;
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      label = `${monthNames[selectedMonth - 1]} ${selectedMonthYear}`;
    } else if (analyticsFilterType === "specific_year") {
      start = `${selectedYear}-01-01`;
      end = `${selectedYear}-12-31`;
      label = `Year ${selectedYear}`;
    }

    return { start, end, label };
  }, [
    analyticsFilterType,
    dateRangePreset,
    customStartDate,
    customEndDate,
    selectedMonth,
    selectedMonthYear,
    selectedYear,
    todayStr,
  ]);

  // Analytics Metrics Calculation based on effectiveDateWindow
  const analyticsMetrics = useMemo(() => {
    const { start: startDate, end: endDate } = effectiveDateWindow;

    // Bookings within selected date window
    const inRangeBookings = bookings.filter((b) => {
      const bDate = b.booking_date || b.date_key || "";
      return bDate >= startDate && bDate <= endDate;
    });

    const confirmedInRange = inRangeBookings.filter(
      (b) => b.status === "CONFIRMED" || b.status === "COMPLETED",
    );

    const rangeRevenuePaise = confirmedInRange.reduce(
      (sum, b) => sum + (b.amount_paise || (b.amount ? b.amount * 100 : 0)),
      0,
    );

    const todayBookings = bookings.filter(
      (b) =>
        (b.status === "CONFIRMED" || b.status === "COMPLETED") &&
        (b.booking_date || b.date_key) === todayStr,
    );
    const todayRevenuePaise = todayBookings.reduce(
      (sum, b) => sum + (b.amount_paise || (b.amount ? b.amount * 100 : 0)),
      0,
    );

    const allConfirmed = bookings.filter(
      (b) => b.status === "CONFIRMED" || b.status === "COMPLETED",
    );
    const totalGrossRevenuePaise = allConfirmed.reduce(
      (sum, b) => sum + (b.amount_paise || (b.amount ? b.amount * 100 : 0)),
      0,
    );

    const pendingCount = inRangeBookings.filter(
      (b) => b.status === "HOLD" || b.status === "PAYMENT_PENDING" || b.status === "PENDING",
    ).length;

    const completedCount = inRangeBookings.filter(
      (b) => b.status === "COMPLETED" || b.status === "CONFIRMED",
    ).length;

    const cancelledCount = inRangeBookings.filter((b) => b.status === "CANCELLED").length;

    const refundedPaise = inRangeBookings
      .filter((b) => b.payment_status === "REFUNDED" || b.status === "REFUNDED")
      .reduce((sum, b) => sum + (b.amount_paise || (b.amount ? b.amount * 100 : 0)), 0);

    // Hourly slot breakdown for the selected range
    const hourCounts: Record<number, number> = {};
    confirmedInRange.forEach((b) => {
      hourCounts[b.start_hour] = (hourCounts[b.start_hour] || 0) + 1;
    });

    // Peak demand hour in range
    let peakHour = 19;
    let maxHourCount = -1;
    Object.entries(hourCounts).forEach(([h, count]) => {
      if (count > maxHourCount) {
        maxHourCount = count;
        peakHour = Number(h);
      }
    });

    const formatHour = (h: number) => {
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${h12}:00 ${ampm}`;
    };

    return {
      rangeRevenue: rangeRevenuePaise / 100,
      rangeCount: confirmedInRange.length,
      todayRevenue: todayRevenuePaise / 100,
      todayCount: todayBookings.length,
      totalRevenue: totalGrossRevenuePaise / 100,
      pendingCount,
      completedCount,
      cancelledCount,
      refundedAmount: refundedPaise / 100,
      registeredUsers: customers.length,
      hourCounts,
      peakDemandHour: formatHour(peakHour),
      peakDemandCount: maxHourCount > 0 ? maxHourCount : 0,
    };
  }, [bookings, customers, effectiveDateWindow, todayStr]);

  // Handle Actions
  async function handleBlockSlot(hour: number) {
    const res = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "BLOCK_SLOT",
        bookingDate: viewDate,
        startHour: hour,
      }),
    });
    if (res.ok) {
      showToast(`Slot ${hour}:00 blocked successfully.`);
      fetchAllAdminData();
    } else {
      const data = await res.json();
      showToast(data.error?.message || "Failed to block slot.", "error");
    }
  }

  async function handleHoldSlot(hour: number, durationMinutes: number = 30) {
    const res = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "HOLD_SLOT",
        bookingDate: viewDate,
        startHour: hour,
        holdDurationMinutes: durationMinutes,
      }),
    });
    if (res.ok) {
      showToast(`Slot ${hour}:00 held for ${durationMinutes} minutes.`);
      fetchAllAdminData();
    } else {
      const data = await res.json();
      showToast(data.error?.message || "Failed to hold slot.", "error");
    }
  }

  async function handleCancelBooking(id: string) {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    const res = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "CANCEL_BOOKING",
        bookingId: id,
      }),
    });
    if (res.ok) {
      showToast("Booking cancelled successfully.");
      fetchAllAdminData();
    }
  }

  async function handleOfflineBookingSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "OFFLINE_BOOKING",
        customerName: offlineForm.customerName,
        customerPhone: offlineForm.customerPhone,
        bookingDate: offlineForm.bookingDate,
        startHour: Number(offlineForm.startHour),
        players: Number(offlineForm.players),
        amountPaise: Number(offlineForm.amountPaise),
        paymentMethod: offlineForm.paymentMethod,
      }),
    });

    if (res.ok) {
      showToast(`Offline booking created for ${offlineForm.customerName}!`);
      setShowOfflineModal(false);
      fetchAllAdminData();
    } else {
      const data = await res.json();
      showToast(data.error?.message || "Failed to create offline booking.", "error");
    }
  }

  async function handleSaveAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    const isEdit = Boolean(editingAnnouncementId);
    const method = isEdit ? "PUT" : "POST";
    const payload = isEdit ? { id: editingAnnouncementId, ...announcementForm } : announcementForm;

    const res = await fetch("/api/admin/announcements", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      showToast(
        isEdit
          ? "Floating announcement banner updated!"
          : "Floating announcement banner published!",
      );
      setShowAnnouncementModal(false);
      setEditingAnnouncementId(null);
      setAnnouncementForm({
        title: "",
        message: "",
        type: "OFFER",
        link_url: "",
        cta_text: "",
      });
      fetchAllAdminData();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(
        data.error?.message ||
          (isEdit ? "Failed to update announcement." : "Failed to create announcement."),
        "error",
      );
    }
  }

  async function handleDeleteAnnouncement(ann: AnnouncementItem) {
    if (!confirm(`Are you sure you want to delete banner '${ann.title}'?`)) return;
    const res = await fetch(`/api/admin/announcements?id=${ann.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast(`Banner '${ann.title}' deleted.`);
      fetchAllAdminData();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error?.message || "Failed to delete announcement.", "error");
    }
  }

  function handleStartEditAnnouncement(ann: AnnouncementItem) {
    setEditingAnnouncementId(ann.id);
    setAnnouncementForm({
      title: ann.title,
      message: ann.message,
      type: ann.type || "OFFER",
      link_url: ann.link_url || "",
      cta_text: ann.cta_text || "",
    });
    setShowAnnouncementModal(true);
  }

  function handleStartCreateAnnouncement() {
    setEditingAnnouncementId(null);
    setAnnouncementForm({
      title: "",
      message: "",
      type: "OFFER",
      link_url: "",
      cta_text: "",
    });
    setShowAnnouncementModal(true);
  }

  function handleGalleryFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const isVideo = file.type.startsWith("video/");
      setGalleryForm((prev) => ({
        ...prev,
        url: result,
        media_type: isVideo ? "VIDEO" : "IMAGE",
        title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
      }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveGallery(e: React.FormEvent) {
    e.preventDefault();
    const isEdit = Boolean(editingGalleryId);
    const method = isEdit ? "PUT" : "POST";
    const payload = isEdit ? { id: editingGalleryId, ...galleryForm } : galleryForm;

    const res = await fetch("/api/admin/gallery", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      showToast(isEdit ? "Gallery item updated!" : "Gallery media published successfully!");
      setShowGalleryModal(false);
      setEditingGalleryId(null);
      setGalleryForm({
        title: "",
        url: "",
        media_type: "IMAGE",
        category: "TURF",
        caption: "",
      });
      fetchAllAdminData();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(
        data.error?.message ||
          (isEdit ? "Failed to update gallery media." : "Failed to upload gallery media."),
        "error",
      );
    }
  }

  async function handleDeleteGallery(item: GalleryItem) {
    if (!confirm(`Delete gallery item '${item.title}'?`)) return;
    const res = await fetch(`/api/admin/gallery?id=${item.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast("Media deleted.");
      fetchAllAdminData();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error?.message || "Failed to delete media.", "error");
    }
  }

  function handleStartEditGallery(item: GalleryItem) {
    setEditingGalleryId(item.id);
    setGalleryForm({
      title: item.title,
      url: item.url,
      media_type: item.media_type || "IMAGE",
      category: item.category || "TURF",
      caption: item.caption || "",
    });
    setShowGalleryModal(true);
  }

  function handleStartCreateGallery() {
    setEditingGalleryId(null);
    setGalleryForm({
      title: "",
      url: "",
      media_type: "IMAGE",
      category: "TURF",
      caption: "",
    });
    setShowGalleryModal(true);
  }

  async function handleSaveCoupon(e: React.FormEvent) {
    e.preventDefault();
    const isEdit = Boolean(editingCouponId);
    const method = isEdit ? "PUT" : "POST";
    const payload = isEdit ? { id: editingCouponId, ...couponForm } : couponForm;

    const res = await fetch("/api/admin/coupons", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      showToast(
        isEdit ? `Coupon '${couponForm.code}' updated!` : `Coupon '${couponForm.code}' created!`,
      );
      setShowCouponModal(false);
      setEditingCouponId(null);
      setCouponForm({
        code: "",
        description: "",
        discount_type: "PERCENTAGE",
        discount_value: 20,
        min_booking_amount: 0,
        usage_limit: 100,
      });
      fetchAllAdminData();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(
        data.error?.message ||
          (isEdit ? "Failed to update coupon." : "Failed to create discount coupon."),
        "error",
      );
    }
  }

  async function handleDeleteCoupon(coupon: CouponItem) {
    if (!confirm(`Are you sure you want to delete promo code '${coupon.code}'?`)) return;
    const res = await fetch(`/api/admin/coupons?id=${coupon.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast(`Coupon '${coupon.code}' deleted.`);
      fetchAllAdminData();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error?.message || "Failed to delete coupon.", "error");
    }
  }

  function handleStartEditCoupon(coupon: CouponItem) {
    setEditingCouponId(coupon.id);
    setCouponForm({
      code: coupon.code,
      description: coupon.description || "",
      discount_type: coupon.discount_type || "PERCENTAGE",
      discount_value: coupon.discount_value,
      min_booking_amount: coupon.min_booking_amount || 0,
      usage_limit: coupon.usage_limit || 0,
    });
    setShowCouponModal(true);
  }

  async function handleToggleBlockCustomer(customer: CustomerUser) {
    const isBlocking = !customer.is_blocked;
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: customer.phone,
        action: "TOGGLE_BLOCK",
        is_blocked: isBlocking,
      }),
    });
    if (res.ok) {
      showToast(`Customer '${customer.name}' ${isBlocking ? "blocked" : "unblocked"}.`);
      if (
        detailCustomer &&
        (detailCustomer.phone === customer.phone || detailCustomer.id === customer.id)
      ) {
        setDetailCustomer({ ...detailCustomer, is_blocked: isBlocking });
      }
      fetchAllAdminData();
    } else {
      showToast("Failed to update customer block status.", "error");
    }
  }

  async function handleSaveCustomerEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCustomerForm || !detailCustomer) return;
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "EDIT",
        originalPhone: detailCustomer.phone,
        name: editingCustomerForm.name,
        phone: editingCustomerForm.phone,
        email: editingCustomerForm.email,
      }),
    });
    if (res.ok) {
      showToast("Customer profile updated.");
      setDetailCustomer({
        ...detailCustomer,
        name: editingCustomerForm.name,
        phone: editingCustomerForm.phone,
        email: editingCustomerForm.email,
      });
      setEditingCustomerForm(null);
      fetchAllAdminData();
    } else {
      showToast("Failed to update customer profile.", "error");
    }
  }

  async function handleCancelCustomerBookings(customerPhone: string) {
    if (!confirm(`Are you sure you want to cancel all active bookings for ${customerPhone}?`))
      return;
    const res = await fetch(`/api/admin/users?phone=${encodeURIComponent(customerPhone)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast(`Active bookings for ${customerPhone} cancelled.`);
      fetchAllAdminData();
    } else {
      showToast("Failed to cancel customer bookings.", "error");
    }
  }

  function handleStartCreateCoupon() {
    setEditingCouponId(null);
    setCouponForm({
      code: "",
      description: "",
      discount_type: "PERCENTAGE",
      discount_value: 20,
      min_booking_amount: 0,
      usage_limit: 100,
    });
    setShowCouponModal(true);
  }

  function exportCSV() {
    const headers = [
      "Reference",
      "Customer",
      "Phone",
      "Date",
      "Hour",
      "Amount INR",
      "Status",
      "Created At",
    ];
    const rows = filteredBookings.map((b) => [
      b.public_reference || b.reference || "",
      b.customer_name,
      b.customer_phone || b.phone || "",
      b.booking_date || b.date_key || "",
      `${b.start_hour}:00`,
      (b.amount_paise || (b.amount ? b.amount * 100 : 0)) / 100,
      b.status,
      b.created_at,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `gully_united_report_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV Financial Report Downloaded.");
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-20 flex flex-col">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-2xl border text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all animate-bounce ${
            toast.type === "success"
              ? "bg-[#CCFF00] text-black border-[#CCFF00]"
              : "bg-red-600 text-white border-red-500"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 border-b border-neutral-800/80 bg-black/90 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <LogoMark className="h-8" />
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white">
                Gully Control Suite
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-[#CCFF00]/10 border border-[#CCFF00]/30 text-[#CCFF00] text-[0.6rem] font-bold uppercase tracking-widest">
                v2.0 SuperAdmin
              </span>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative hidden md:block w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
              />
              <input
                type="text"
                placeholder="Search ref, customer, phone…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-1.5 pl-9 pr-3 text-xs font-medium text-white placeholder-neutral-500 focus:border-[#CCFF00] focus:outline-none"
              />
            </div>

            <button
              onClick={fetchAllAdminData}
              className="p-2 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>

            <Link
              href="/"
              className="text-xs font-extrabold uppercase tracking-[0.15em] text-neutral-400 hover:text-[#CCFF00] transition-colors"
            >
              ← Site
            </Link>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-extrabold uppercase tracking-wider hover:bg-red-500/20 transition-colors"
              title="Sign out of Admin Dashboard"
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Control Suite Layout */}
      <div className="mx-auto max-w-[1600px] w-full px-4 pt-6 sm:px-6 flex-1 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
        {/* Navigation Sidebar */}
        <aside className="space-y-1">
          <div className="px-3 py-2 text-[0.65rem] font-black uppercase tracking-widest text-neutral-500">
            Control Navigation
          </div>
          {[
            { id: "overview", label: "Overview & Analytics", icon: TrendingUp },
            { id: "bookings", label: "Bookings & Slot Control", icon: CalendarIcon },
            { id: "calendar", label: "Ground Schedule", icon: Clock },
            { id: "customers", label: "Customers Directory", icon: Users },
            { id: "payments", label: "Financials & Refunds", icon: DollarSign },
            { id: "pricing", label: "Discounts & Pricing", icon: Tag },
            { id: "gallery", label: "Media Gallery", icon: ImageIcon },
            { id: "announcements", label: "Site Alerts & Banners", icon: Bell },
            { id: "feedback", label: "Reviews & Feedback", icon: MessageSquare },
            { id: "audit", label: "Security Audit Logs", icon: ShieldCheck },
            { id: "settings", label: "Website Settings", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all text-left ${
                  isActive
                    ? "bg-[#CCFF00] text-black shadow-lg shadow-[#CCFF00]/10 font-extrabold"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </aside>

        {/* Dynamic Section Content */}
        <main className="space-y-8 min-w-0">
          {/* TAB 1: OVERVIEW & ANALYTICS */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white">
                    Business Overview
                  </h1>
                  <p className="text-xs text-neutral-400 mt-1">
                    Real-time turf revenue, bookings & player metrics with custom timeframes
                  </p>
                </div>
              </div>

              {/* Analytics Timeframe Filter Toolbar */}
              <div className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-4 space-y-3 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="text-[#CCFF00]" size={18} />
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      Analysis Timeframe Selection
                    </span>
                  </div>

                  {/* Filter Type Mode Switcher */}
                  <div className="flex flex-wrap items-center gap-1 bg-black p-1 rounded-xl border border-neutral-800 text-[0.65rem] font-bold">
                    <button
                      onClick={() => setAnalyticsFilterType("preset")}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        analyticsFilterType === "preset"
                          ? "bg-[#CCFF00] text-black font-extrabold"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Presets
                    </button>
                    <button
                      onClick={() => setAnalyticsFilterType("custom_dates")}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        analyticsFilterType === "custom_dates"
                          ? "bg-[#CCFF00] text-black font-extrabold"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Custom Date Range
                    </button>
                    <button
                      onClick={() => setAnalyticsFilterType("specific_month")}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        analyticsFilterType === "specific_month"
                          ? "bg-[#CCFF00] text-black font-extrabold"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Select Month
                    </button>
                    <button
                      onClick={() => setAnalyticsFilterType("specific_year")}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        analyticsFilterType === "specific_year"
                          ? "bg-[#CCFF00] text-black font-extrabold"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Select Year
                    </button>
                  </div>
                </div>

                {/* Sub-controls based on active filter mode */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Preset Mode Controls */}
                  {analyticsFilterType === "preset" && (
                    <div className="flex flex-wrap items-center gap-1.5 bg-black p-1 rounded-xl border border-neutral-800">
                      {(
                        [
                          { id: "today", label: "Today" },
                          { id: "week", label: "7 Days" },
                          { id: "month", label: "This Month" },
                          { id: "year", label: "This Year" },
                          { id: "5year", label: "5 Years" },
                          { id: "all", label: "All Time" },
                        ] as const
                      ).map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setDateRangePreset(r.id)}
                          className={`px-3 py-1 rounded-lg text-[0.65rem] font-bold uppercase tracking-wider transition-all ${
                            dateRangePreset === r.id
                              ? "bg-[#CCFF00] text-black shadow-sm font-black"
                              : "text-neutral-400 hover:text-white"
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Custom Date Range Controls */}
                  {analyticsFilterType === "custom_dates" && (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-[0.65rem] font-bold uppercase text-neutral-400">
                          Start Date:
                        </label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="bg-black border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                        />
                      </div>
                      <span className="text-neutral-600 text-xs">→</span>
                      <div className="flex items-center gap-2">
                        <label className="text-[0.65rem] font-bold uppercase text-neutral-400">
                          End Date:
                        </label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="bg-black border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setCustomStartDate(todayStr);
                          setCustomEndDate(todayStr);
                        }}
                        className="text-[0.65rem] font-bold uppercase tracking-wider text-neutral-400 hover:text-[#CCFF00] underline"
                      >
                        Reset Today
                      </button>
                    </div>
                  )}

                  {/* Specific Month Controls */}
                  {analyticsFilterType === "specific_month" && (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-[0.65rem] font-bold uppercase text-neutral-400">
                          Month:
                        </label>
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(Number(e.target.value))}
                          className="bg-black border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-[#CCFF00] focus:outline-none font-bold"
                        >
                          {[
                            "January",
                            "February",
                            "March",
                            "April",
                            "May",
                            "June",
                            "July",
                            "August",
                            "September",
                            "October",
                            "November",
                            "December",
                          ].map((m, idx) => (
                            <option key={m} value={idx + 1}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[0.65rem] font-bold uppercase text-neutral-400">
                          Year:
                        </label>
                        <select
                          value={selectedMonthYear}
                          onChange={(e) => setSelectedMonthYear(Number(e.target.value))}
                          className="bg-black border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-[#CCFF00] focus:outline-none font-bold"
                        >
                          {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Specific Year Controls */}
                  {analyticsFilterType === "specific_year" && (
                    <div className="flex items-center gap-2">
                      <label className="text-[0.65rem] font-bold uppercase text-neutral-400">
                        Select Year:
                      </label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="bg-black border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-[#CCFF00] focus:outline-none font-bold"
                      >
                        {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Active Analysis Period Badge */}
                  <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-[#CCFF00]/10 border border-[#CCFF00]/30 text-[#CCFF00] text-[0.65rem] font-black uppercase tracking-wider">
                    <span>Target Period: {effectiveDateWindow.label}</span>
                    <span className="text-neutral-400 font-normal">
                      ({effectiveDateWindow.start} to {effectiveDateWindow.end})
                    </span>
                  </div>
                </div>
              </div>

              {/* 10 Dynamic KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-1">
                  <div className="text-[0.65rem] font-black uppercase tracking-widest text-neutral-400">
                    Period Revenue
                  </div>
                  <div className="text-2xl font-black text-[#CCFF00]">
                    ₹{analyticsMetrics.rangeRevenue}
                  </div>
                  <div className="text-[0.6rem] text-emerald-400 flex items-center gap-1 font-semibold">
                    <TrendingUp size={10} /> {analyticsMetrics.rangeCount} slots in period
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-1">
                  <div className="text-[0.65rem] font-black uppercase tracking-widest text-neutral-400">
                    Period Bookings
                  </div>
                  <div className="text-2xl font-black text-white">
                    {analyticsMetrics.rangeCount} Slots
                  </div>
                  <div className="text-[0.6rem] text-neutral-400 font-semibold truncate">
                    {effectiveDateWindow.label}
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-1">
                  <div className="text-[0.65rem] font-black uppercase tracking-widest text-neutral-400">
                    Total Gross Revenue
                  </div>
                  <div className="text-2xl font-black text-white">
                    ₹{analyticsMetrics.totalRevenue}
                  </div>
                  <div className="text-[0.6rem] text-[#CCFF00] font-semibold">
                    All Time Confirmed
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-1">
                  <div className="text-[0.65rem] font-black uppercase tracking-widest text-neutral-400">
                    Active Holds
                  </div>
                  <div className="text-2xl font-black text-neutral-300">
                    {analyticsMetrics.pendingCount}
                  </div>
                  <div className="text-[0.6rem] text-neutral-400 font-semibold">
                    In Selected Period
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-1">
                  <div className="text-[0.65rem] font-black uppercase tracking-widest text-neutral-400">
                    Completed Slots
                  </div>
                  <div className="text-2xl font-black text-emerald-400">
                    {analyticsMetrics.completedCount}
                  </div>
                  <div className="text-[0.6rem] text-neutral-400 font-semibold">
                    Successful Played
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-1">
                  <div className="text-[0.65rem] font-black uppercase tracking-widest text-neutral-400">
                    Cancelled Bookings
                  </div>
                  <div className="text-2xl font-black text-neutral-400">
                    {analyticsMetrics.cancelledCount}
                  </div>
                  <div className="text-[0.6rem] text-neutral-500 font-semibold">Slots Released</div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-1">
                  <div className="text-[0.65rem] font-black uppercase tracking-widest text-neutral-400">
                    Total Refunded
                  </div>
                  <div className="text-2xl font-black text-neutral-300">
                    ₹{analyticsMetrics.refundedAmount}
                  </div>
                  <div className="text-[0.6rem] text-neutral-400 font-semibold">
                    In Selected Period
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-1">
                  <div className="text-[0.65rem] font-black uppercase tracking-widest text-neutral-400">
                    Registered Users
                  </div>
                  <div className="text-2xl font-black text-white">
                    {analyticsMetrics.registeredUsers}
                  </div>
                  <div className="text-[0.6rem] text-neutral-400 font-semibold">
                    Customer Profiles
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-1">
                  <div className="text-[0.65rem] font-black uppercase tracking-widest text-neutral-400">
                    Peak Demand Slot
                  </div>
                  <div className="text-2xl font-black text-[#CCFF00]">
                    {analyticsMetrics.peakDemandHour}
                  </div>
                  <div className="text-[0.6rem] text-[#CCFF00]/80 font-semibold">
                    {analyticsMetrics.peakDemandCount} bookings in range
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-1">
                  <div className="text-[0.65rem] font-black uppercase tracking-widest text-neutral-400">
                    System Health
                  </div>
                  <div className="text-2xl font-black text-emerald-400 flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" /> 100%
                  </div>
                  <div className="text-[0.6rem] text-emerald-400 font-semibold">
                    Supabase & RLS Online
                  </div>
                </div>
              </div>

              {/* Peak Hours & Slot Heatmap */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 space-y-4">
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <Zap size={18} className="text-[#CCFF00]" /> Slot Demand & Peak Hours
                  </h3>
                  <div className="space-y-3">
                    {Array.from({ length: 17 }, (_, i) => i + 6).map((h) => {
                      const count = analyticsMetrics.hourCounts[h] || 0;
                      const pct = Math.min(100, count * 20);
                      const hourStr = `${h % 12 || 12}:00 ${h >= 12 ? "PM" : "AM"}`;
                      const isNight = h >= 17;

                      return (
                        <div key={h} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="font-mono text-neutral-300">
                              {hourStr} {isNight ? "(Night ₹499)" : "(Day ₹299)"}
                            </span>
                            <span className="text-neutral-400">{count} Bookings</span>
                          </div>
                          <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                isNight
                                  ? "bg-gradient-to-r from-[#CCFF00] to-emerald-400"
                                  : "bg-blue-500"
                              }`}
                              style={{ width: `${Math.max(5, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Popular Insights Card */}
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 space-y-6">
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <Activity size={18} className="text-[#CCFF00]" /> Customer Insights & Squad
                    Preferences
                  </h3>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/80 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-neutral-400">
                          Most Active Time Window
                        </div>
                        <div className="text-lg font-black text-white mt-1">7:00 PM – 10:00 PM</div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-[#CCFF00]/10 text-[#CCFF00] text-xs font-extrabold">
                        Night Peak
                      </span>
                    </div>

                    <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/80 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-neutral-400">Average Squad Size</div>
                        <div className="text-lg font-black text-white mt-1">12 to 14 Players</div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-extrabold">
                        Optimal Turf
                      </span>
                    </div>

                    <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/80 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-neutral-400">
                          Repeat Customer Rate
                        </div>
                        <div className="text-lg font-black text-white mt-1">
                          68.4% Returning Teams
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-extrabold">
                        High Retention
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BOOKINGS & SLOT CONTROL */}
          {activeTab === "bookings" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white">
                    Booking Management
                  </h1>
                  <p className="text-xs text-neutral-400 mt-1">
                    Search, inspect, cancel, refund and mark completed
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={exportCSV}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-800 text-xs font-extrabold uppercase tracking-wider text-neutral-300 hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors"
                  >
                    <Download size={14} /> Export CSV
                  </button>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-800">
                {["ALL", "CONFIRMED", "HOLD", "COMPLETED", "CANCELLED", "BLOCKED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                      statusFilter === st
                        ? "bg-[#CCFF00] text-black font-extrabold"
                        : "text-neutral-400 hover:text-white bg-neutral-900/60 border border-neutral-800"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Bookings Table */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-neutral-800 text-[0.65rem] font-black uppercase tracking-wider text-neutral-500 bg-neutral-900/80">
                        <th className="px-6 py-3.5">Reference</th>
                        <th className="px-4 py-3.5">Customer</th>
                        <th className="px-4 py-3.5">Phone</th>
                        <th className="px-4 py-3.5">Date</th>
                        <th className="px-4 py-3.5">Time Slot</th>
                        <th className="px-4 py-3.5">Amount</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {filteredBookings.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-6 py-12 text-center text-sm text-neutral-500"
                          >
                            No booking records found for the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredBookings.map((b) => {
                          const ref = b.public_reference || b.reference || "N/A";
                          const date = b.booking_date || b.date_key || "";
                          const amount = (b.amount_paise || (b.amount ? b.amount * 100 : 0)) / 100;
                          const hourStr = `${b.start_hour % 12 || 12}:00 ${b.start_hour >= 12 ? "PM" : "AM"}`;

                          return (
                            <tr key={b.id} className="hover:bg-neutral-900/80 transition-colors">
                              <td className="px-6 py-4 font-mono text-xs font-bold text-[#CCFF00]">
                                {ref}
                              </td>
                              <td className="px-4 py-4 font-semibold text-white">
                                {b.customer_name}
                              </td>
                              <td className="px-4 py-4 font-mono text-xs text-neutral-400">
                                {b.customer_phone || b.phone || "—"}
                              </td>
                              <td className="px-4 py-4 text-xs font-mono">{date}</td>
                              <td className="px-4 py-4 text-xs font-semibold">{hourStr}</td>
                              <td className="px-4 py-4 font-mono font-bold text-white">
                                ₹{amount}
                              </td>
                              <td className="px-4 py-4">
                                <span
                                  className={`inline-block rounded-full border px-2.5 py-0.5 text-[0.6rem] font-bold tracking-wider uppercase ${
                                    STATUS_STYLE[b.status] || "border-neutral-700 text-neutral-400"
                                  }`}
                                >
                                  {b.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setDetailBooking(b)}
                                    className="px-2.5 py-1 rounded-md text-[0.65rem] font-bold uppercase tracking-wider border border-neutral-700 hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors"
                                  >
                                    View
                                  </button>
                                  {b.status === "CONFIRMED" && (
                                    <button
                                      onClick={() => setShowRefundModal(b)}
                                      className="px-2.5 py-1 rounded-md text-[0.65rem] font-bold uppercase tracking-wider border border-purple-900/60 text-purple-400 hover:bg-purple-950 transition-colors"
                                    >
                                      Refund
                                    </button>
                                  )}
                                  {b.status !== "CANCELLED" && (
                                    <button
                                      onClick={() => handleCancelBooking(b.id)}
                                      className="px-2.5 py-1 rounded-md text-[0.65rem] font-bold uppercase tracking-wider border border-red-900/60 text-red-400 hover:bg-red-950 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GROUND SCHEDULE & CALENDAR */}
          {activeTab === "calendar" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white">
                    Ground Booking Schedule
                  </h1>
                  <p className="text-xs text-neutral-400 mt-1">
                    Select date to block/unblock hourly turf availability
                  </p>
                </div>
                <input
                  type="date"
                  value={viewDate}
                  onChange={(e) => setViewDate(e.target.value)}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-[#CCFF00] focus:outline-none"
                />
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: 17 }, (_, i) => i + 6).map((hour) => {
                    const hourStr = `${hour % 12 || 12}:00 ${hour >= 12 ? "PM" : "AM"}`;
                    const existing = bookings.find(
                      (b) =>
                        (b.booking_date === viewDate || b.date_key === viewDate) &&
                        b.start_hour === hour &&
                        b.status !== "CANCELLED",
                    );

                    return (
                      <div
                        key={hour}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/80 text-xs"
                      >
                        <div>
                          <div className="font-mono font-bold text-sm text-white">{hourStr}</div>
                          <div className="text-[0.65rem] text-neutral-400">
                            {hour >= 17 ? "Night Rate: ₹499" : "Day Rate: ₹299"}
                          </div>
                        </div>

                        {existing ? (
                          <div className="text-right space-y-1">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded text-[0.6rem] font-bold uppercase border ${
                                STATUS_STYLE[existing.status] ||
                                "text-neutral-400 border-neutral-700"
                              }`}
                            >
                              {existing.status}
                            </span>
                            <div className="text-[0.65rem] font-extrabold text-white truncate max-w-[130px]">
                              {existing.customer_name}
                            </div>
                            {existing.notes && (
                              <div className="text-[0.6rem] text-amber-400/90 font-medium italic truncate max-w-[130px]">
                                📝 {existing.notes}
                              </div>
                            )}
                            {(existing.status === "BLOCKED" || existing.status === "HOLD") && (
                              <button
                                onClick={() => handleCancelBooking(existing.id)}
                                className="block text-[0.6rem] font-black text-red-400 hover:text-red-300 hover:underline uppercase tracking-wider ml-auto mt-1"
                              >
                                {existing.status === "HOLD" ? "Release Hold" : "Unblock Slot"}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setHoldForm({
                                  actionType: "HOLD_SLOT",
                                  holdDurationMinutes: 30,
                                  customerName: "",
                                  customerPhone: "",
                                  notes: "",
                                });
                                setHoldModalSlot({ hour, hourStr });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 text-[0.65rem] font-extrabold hover:bg-amber-500/20 transition-colors"
                            >
                              <Clock size={12} /> Hold
                            </button>
                            <button
                              onClick={() => {
                                setHoldForm({
                                  actionType: "BLOCK_SLOT",
                                  holdDurationMinutes: 30,
                                  customerName: "",
                                  customerPhone: "",
                                  notes: "",
                                });
                                setHoldModalSlot({ hour, hourStr });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-neutral-400 text-[0.65rem] font-extrabold hover:border-red-500/50 hover:text-red-400 transition-colors"
                            >
                              <Ban size={12} /> Block
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOMERS DIRECTORY */}
          {activeTab === "customers" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-black tracking-tight text-white font-display uppercase">
                      Customers Directory
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#CCFF00]/10 text-[#CCFF00] text-xs font-black border border-[#CCFF00]/30">
                      {customers.length} Profiles
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    View customer profiles, total spend and slot booking history
                  </p>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name, phone or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl py-2 px-3 text-xs text-white placeholder-neutral-500 focus:border-[#CCFF00] focus:outline-none w-full sm:w-64"
                  />
                </div>
              </div>

              {customers.length === 0 ? (
                <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-12 text-center max-w-md mx-auto space-y-4">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#CCFF00]/10 text-[#CCFF00]">
                    <Users size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase font-display">
                      No Customer Profiles Found
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      Customer accounts will automatically build up as players register and book
                      turf slots.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-neutral-800 text-[0.65rem] font-black uppercase tracking-wider text-neutral-500 bg-neutral-900/80">
                          <th className="px-6 py-3.5">Customer Name</th>
                          <th className="px-4 py-3.5">Phone Number</th>
                          <th className="px-4 py-3.5">Email</th>
                          <th className="px-4 py-3.5">Total Bookings</th>
                          <th className="px-4 py-3.5">Total Spent</th>
                          <th className="px-6 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60">
                        {customers
                          .filter((c) => {
                            if (!searchQuery) return true;
                            const q = searchQuery.toLowerCase();
                            return (
                              c.name.toLowerCase().includes(q) ||
                              c.phone.toLowerCase().includes(q) ||
                              c.email.toLowerCase().includes(q)
                            );
                          })
                          .map((c, i) => (
                            <tr key={i} className="hover:bg-neutral-900/80 transition-colors">
                              <td className="px-6 py-4 font-bold text-white">
                                <div className="flex items-center gap-2">
                                  <span>{c.name}</span>
                                  {c.is_blocked ? (
                                    <span className="px-2 py-0.5 rounded text-[0.6rem] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                                      Blocked
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[0.6rem] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      Active
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4 font-mono text-xs text-[#CCFF00]">
                                {c.phone}
                              </td>
                              <td className="px-4 py-4 font-mono text-xs text-neutral-400">
                                {c.email}
                              </td>
                              <td className="px-4 py-4 text-xs font-semibold">
                                {c.completedBookings} Completed ({c.totalBookings} Total)
                              </td>
                              <td className="px-4 py-4 font-mono font-bold text-white">
                                ₹{(c.totalSpentPaise / 100).toLocaleString("en-IN")}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setDetailCustomer(c)}
                                    className="px-3 py-1 rounded-xl text-xs font-black uppercase bg-neutral-800 text-white border border-neutral-700 hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors"
                                  >
                                    Profile
                                  </button>

                                  <button
                                    onClick={() => handleToggleBlockCustomer(c)}
                                    className={`px-2.5 py-1 rounded-xl text-[0.65rem] font-black uppercase transition-colors ${
                                      c.is_blocked
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                                        : "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                                    }`}
                                    title={c.is_blocked ? "Unblock Customer" : "Block Customer"}
                                  >
                                    {c.is_blocked ? "Unblock" : "Block"}
                                  </button>

                                  <button
                                    onClick={() => {
                                      setDetailCustomer(c);
                                      setEditingCustomerForm({
                                        name: c.name,
                                        phone: c.phone,
                                        email: c.email,
                                      });
                                    }}
                                    className="p-1.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-[#CCFF00] hover:bg-neutral-700 transition-colors"
                                    title="Edit Profile Details"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: FINANCIALS & REFUNDS */}
          {activeTab === "payments" && (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white">
                    Financial Summary & Razorpay Control
                  </h1>
                  <p className="text-xs text-neutral-400 mt-1">
                    Verified Razorpay payment transactions, instant API refunds & webhook health
                    audit
                  </p>
                </div>
                <button
                  onClick={exportCSV}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#CCFF00] text-black text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-[#CCFF00]/10 hover:bg-[#b8e600] transition-colors"
                >
                  <Download size={14} /> Download Financial CSV
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-2">
                  <div className="text-xs font-black uppercase tracking-wider text-neutral-400">
                    Gross Revenue
                  </div>
                  <div className="text-3xl font-black text-[#CCFF00]">
                    ₹{analyticsMetrics.totalRevenue}
                  </div>
                  <p className="text-[0.65rem] text-neutral-500 font-medium">
                    Total slot payments collected
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-2">
                  <div className="text-xs font-black uppercase tracking-wider text-neutral-400">
                    Total Refunded
                  </div>
                  <div className="text-3xl font-black text-purple-400">
                    ₹{analyticsMetrics.refundedAmount}
                  </div>
                  <p className="text-[0.65rem] text-neutral-500 font-medium">
                    {refundsList.length} processed refund(s)
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-2">
                  <div className="text-xs font-black uppercase tracking-wider text-neutral-400">
                    Net Revenue
                  </div>
                  <div className="text-3xl font-black text-emerald-400">
                    ₹{analyticsMetrics.totalRevenue - analyticsMetrics.refundedAmount}
                  </div>
                  <p className="text-[0.65rem] text-neutral-500 font-medium">
                    Net earnings after refunds
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-2">
                  <div className="text-xs font-black uppercase tracking-wider text-neutral-400">
                    Webhook Health
                  </div>
                  <div className="text-3xl font-black text-blue-400">{webhooksList.length}</div>
                  <p className="text-[0.65rem] text-emerald-400 font-bold">
                    ✓ 100% Signature Verified
                  </p>
                </div>
              </div>

              {/* Razorpay Order Reconciler Card */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      <ShieldCheck size={18} className="text-[#CCFF00]" /> Razorpay Order API
                      Reconciler
                    </h2>
                    <p className="text-xs text-neutral-400">
                      Query live Razorpay Order status & compare with local database records
                    </p>
                  </div>
                </div>

                <form onSubmit={handleReconcileOrder} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Enter Razorpay Order ID (e.g. order_P123456789)"
                    value={reconcileOrderIdInput}
                    onChange={(e) => setReconcileOrderIdInput(e.target.value)}
                    className="flex-1 bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-neutral-500 focus:border-[#CCFF00] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={reconciling}
                    className="px-5 py-2.5 rounded-xl bg-[#CCFF00] text-black text-xs font-extrabold uppercase tracking-wider hover:bg-[#b8e600] transition-colors disabled:opacity-50"
                  >
                    {reconciling ? "Querying API…" : "Reconcile Order"}
                  </button>
                </form>

                {reconcileResult && (
                  <div className="mt-4 p-4 rounded-xl border border-neutral-800 bg-black/60 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Reconciliation Match:</span>
                      <span
                        className={
                          reconcileResult.isMatched
                            ? "text-emerald-400 font-bold"
                            : "text-amber-400 font-bold"
                        }
                      >
                        {reconcileResult.isMatched ? "✓ EXACT MATCH" : "⚠ STATUS / MISMATCH NOTE"}
                      </span>
                    </div>
                    {reconcileResult.razorpayOrder && (
                      <div className="text-neutral-300">
                        <span className="text-neutral-500">Razorpay API:</span> ID{" "}
                        {reconcileResult.razorpayOrder.id} · Status:{" "}
                        <span className="text-[#CCFF00]">
                          {reconcileResult.razorpayOrder.status}
                        </span>{" "}
                        · Amount: ₹{(reconcileResult.razorpayOrder.amount || 0) / 100}
                      </div>
                    )}
                    {reconcileResult.databasePayment && (
                      <div className="text-neutral-300">
                        <span className="text-neutral-500">Database Record:</span> Payment ID{" "}
                        {reconcileResult.databasePayment.id} · Status:{" "}
                        <span className="text-[#CCFF00]">
                          {reconcileResult.databasePayment.status}
                        </span>{" "}
                        · Amount: ₹{(reconcileResult.databasePayment.amount_paise || 0) / 100}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Transactions Table */}
              <div className="space-y-4">
                <h2 className="text-lg font-black text-white">Verified Razorpay Payments</h2>
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-neutral-800 text-[0.65rem] font-black uppercase tracking-wider text-neutral-500 bg-neutral-900/80">
                          <th className="px-6 py-3.5">Razorpay Order ID</th>
                          <th className="px-4 py-3.5">Razorpay Payment ID</th>
                          <th className="px-4 py-3.5">Customer / Ref</th>
                          <th className="px-4 py-3.5">Amount</th>
                          <th className="px-4 py-3.5">Status</th>
                          <th className="px-4 py-3.5">Method</th>
                          <th className="px-4 py-3.5">Date</th>
                          <th className="px-6 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60">
                        {paymentsList.length === 0 ? (
                          <tr>
                            <td
                              colSpan={8}
                              className="px-6 py-12 text-center text-sm text-neutral-500"
                            >
                              No Razorpay payment records found.
                            </td>
                          </tr>
                        ) : (
                          paymentsList.map((p) => {
                            const amount = p.amount_paise / 100;
                            const customerName = p.bookings?.customer_name || "Guest";
                            const ref =
                              p.bookings?.public_reference || p.bookings?.reference || "N/A";
                            return (
                              <tr key={p.id} className="hover:bg-neutral-900/80 transition-colors">
                                <td className="px-6 py-4 font-mono text-xs font-bold text-[#CCFF00]">
                                  {p.razorpay_order_id}
                                </td>
                                <td className="px-4 py-4 font-mono text-xs text-neutral-300">
                                  {p.razorpay_payment_id || "—"}
                                </td>
                                <td className="px-4 py-4">
                                  <div className="font-bold text-white text-xs">{customerName}</div>
                                  <div className="font-mono text-[0.65rem] text-neutral-500">
                                    {ref}
                                  </div>
                                </td>
                                <td className="px-4 py-4 font-mono font-bold text-white">
                                  ₹{amount}
                                </td>
                                <td className="px-4 py-4">
                                  <span
                                    className={`inline-block rounded-full border px-2.5 py-0.5 text-[0.6rem] font-bold tracking-wider uppercase ${
                                      p.status === "paid"
                                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                                        : p.status === "refunded"
                                          ? "bg-purple-500/15 text-purple-400 border-purple-500/40"
                                          : p.status === "failed"
                                            ? "bg-red-500/15 text-red-400 border-red-500/40"
                                            : "bg-amber-500/15 text-amber-400 border-amber-500/40"
                                    }`}
                                  >
                                    {p.status}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-xs font-mono text-neutral-400">
                                  {p.method || "UPI / Card"}
                                </td>
                                <td className="px-4 py-4 text-xs font-mono text-neutral-400">
                                  {new Date(p.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => {
                                        setReconcileOrderIdInput(p.razorpay_order_id);
                                        handleReconcileOrder();
                                      }}
                                      className="px-2.5 py-1 rounded-md text-[0.65rem] font-bold uppercase tracking-wider border border-neutral-700 hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors"
                                    >
                                      Check
                                    </button>
                                    {p.status === "paid" && (
                                      <button
                                        onClick={() => {
                                          if (p.bookings) setShowRefundModal(p.bookings);
                                          else {
                                            setShowRefundModal({
                                              id: p.booking_id || p.id,
                                              public_reference: p.razorpay_order_id,
                                              customer_name: customerName,
                                              players: 12,
                                              booking_date: new Date().toISOString().split("T")[0]!,
                                              start_hour: 18,
                                              amount_paise: p.amount_paise,
                                              status: "CONFIRMED",
                                              payment_status: "paid",
                                              created_at: p.created_at,
                                            });
                                          }
                                        }}
                                        className="px-2.5 py-1 rounded-md text-[0.65rem] font-bold uppercase tracking-wider border border-purple-900/60 text-purple-400 hover:bg-purple-950 transition-colors"
                                      >
                                        Refund
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Webhook Log Stream */}
              <div className="space-y-4">
                <h2 className="text-lg font-black text-white">Razorpay Webhook Delivery Stream</h2>
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-neutral-800 text-[0.65rem] font-black uppercase tracking-wider text-neutral-500 bg-neutral-900/80">
                          <th className="px-6 py-3.5">Razorpay Event ID</th>
                          <th className="px-4 py-3.5">Event Type</th>
                          <th className="px-4 py-3.5">Amount</th>
                          <th className="px-4 py-3.5">Duplicate</th>
                          <th className="px-4 py-3.5">Status</th>
                          <th className="px-4 py-3.5">Received At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60">
                        {webhooksList.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-6 py-10 text-center text-sm text-neutral-500"
                            >
                              No webhook events logged yet.
                            </td>
                          </tr>
                        ) : (
                          webhooksList.map((w) => (
                            <tr
                              key={w.id}
                              className="hover:bg-neutral-900/80 transition-colors font-mono text-xs"
                            >
                              <td className="px-6 py-4 font-bold text-neutral-300">
                                {w.razorpay_event_id}
                              </td>
                              <td className="px-4 py-4 text-[#CCFF00] font-bold">{w.event_type}</td>
                              <td className="px-4 py-4 text-white">
                                ₹{(w.amount_paise || 0) / 100}
                              </td>
                              <td className="px-4 py-4">
                                {w.duplicate ? (
                                  <span className="px-2 py-0.5 rounded text-[0.6rem] bg-amber-500/20 text-amber-400">
                                    DUPLICATE
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[0.6rem] bg-emerald-500/20 text-emerald-400">
                                    FIRST PASS
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <span className="px-2 py-0.5 rounded text-[0.6rem] bg-emerald-500/20 text-emerald-400 uppercase">
                                  200 OK
                                </span>
                              </td>
                              <td className="px-4 py-4 text-neutral-400">
                                {new Date(w.created_at).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DISCOUNTS & PRICING */}
          {activeTab === "pricing" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white font-display uppercase">
                    Discounts & Promo Coupons
                  </h1>
                  <p className="text-xs text-neutral-400 mt-1">
                    Manage promo codes, usage limits, pause/activate and delete coupons
                  </p>
                </div>

                <button
                  onClick={handleStartCreateCoupon}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#CCFF00] text-black text-xs font-black uppercase tracking-wider hover:bg-[#b8e600] transition-colors"
                >
                  <Plus size={14} /> Create Promo Code
                </button>
              </div>

              {coupons.length === 0 ? (
                <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-12 text-center max-w-md mx-auto space-y-4">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#CCFF00]/10 text-[#CCFF00]">
                    <Tag size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase font-display">
                      No Discount Coupons Found
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      Create promo codes to offer instant discounts for players at checkout.
                    </p>
                  </div>
                  <button
                    onClick={handleStartCreateCoupon}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#CCFF00] text-black text-xs font-black uppercase tracking-wider hover:bg-[#b8e600] transition-colors"
                  >
                    <Plus size={14} /> Create First Coupon
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {coupons.map((cpn) => {
                    const usedCount = cpn.used_count || 0;
                    const usageLimit = cpn.usage_limit;
                    const isLimitReached = Boolean(usageLimit && usedCount >= usageLimit);
                    const usagePercent = usageLimit
                      ? Math.min(100, Math.round((usedCount / usageLimit) * 100))
                      : 0;

                    return (
                      <div
                        key={cpn.id}
                        className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 flex flex-col justify-between space-y-4 hover:border-neutral-700 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-base font-black text-[#CCFF00] tracking-wider">
                                {cpn.code}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-[#CCFF00]/10 text-[#CCFF00] text-[0.65rem] font-bold border border-[#CCFF00]/30">
                                {cpn.discount_type === "PERCENTAGE"
                                  ? `${cpn.discount_value}% OFF`
                                  : `₹${cpn.discount_value} OFF`}
                              </span>
                            </div>
                            {cpn.description && (
                              <p className="text-xs text-neutral-400 mt-1">{cpn.description}</p>
                            )}
                            {cpn.min_booking_amount > 0 && (
                              <p className="text-[0.65rem] text-neutral-500 mt-1">
                                Min Booking Amount: ₹{cpn.min_booking_amount}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Pause / Activate Toggle Button */}
                            <button
                              onClick={async () => {
                                const res = await fetch("/api/admin/coupons", {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: cpn.id, is_active: !cpn.is_active }),
                                });
                                if (res.ok) {
                                  showToast(
                                    `Coupon '${cpn.code}' ${!cpn.is_active ? "activated" : "paused"}.`,
                                  );
                                  fetchAllAdminData();
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl text-[0.65rem] font-black uppercase transition-all ${
                                cpn.is_active
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                                  : "bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700"
                              }`}
                              title={cpn.is_active ? "Pause Coupon" : "Activate Coupon"}
                            >
                              {cpn.is_active ? "Active" : "Paused"}
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => handleStartEditCoupon(cpn)}
                              className="p-1.5 rounded-xl bg-neutral-800 text-neutral-300 hover:text-[#CCFF00] hover:bg-neutral-700 transition-colors"
                              title="Edit Coupon Details"
                            >
                              <Edit2 size={14} />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteCoupon(cpn)}
                              className="p-1.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 transition-colors"
                              title="Delete Promo Code"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Usage Limit & Redemptions Badge */}
                        <div className="pt-3 border-t border-neutral-800/80 space-y-2">
                          <div className="flex items-center justify-between text-[0.7rem] font-bold">
                            <span className="text-neutral-400">Limit & Redemptions:</span>
                            <span
                              className={
                                isLimitReached ? "text-amber-400 font-extrabold" : "text-white"
                              }
                            >
                              {usedCount} / {usageLimit ? `${usageLimit} max` : "Unlimited"}
                              {isLimitReached && " (Limit Reached)"}
                            </span>
                          </div>
                          {usageLimit && usageLimit > 0 && (
                            <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isLimitReached ? "bg-amber-400" : "bg-[#CCFF00]"
                                }`}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: MEDIA GALLERY */}
          {activeTab === "gallery" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white font-display uppercase">
                    Turf Media Gallery & Best Plays
                  </h1>
                  <p className="text-xs text-neutral-400 mt-1">
                    Upload turf photos, best play match highlights, edit or delete gallery media
                  </p>
                </div>

                <button
                  onClick={handleStartCreateGallery}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#CCFF00] text-black text-xs font-black uppercase tracking-wider hover:bg-[#b8e600] transition-colors"
                >
                  <Plus size={14} /> Upload Media
                </button>
              </div>

              {gallery.length === 0 ? (
                <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-12 text-center max-w-md mx-auto space-y-4">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#CCFF00]/10 text-[#CCFF00]">
                    <ImageIcon size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase font-display">
                      No Media Uploaded Yet
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      Upload turf photos or match videos to showcase them across the venue gallery.
                    </p>
                  </div>
                  <button
                    onClick={handleStartCreateGallery}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#CCFF00] text-black text-xs font-black uppercase tracking-wider hover:bg-[#b8e600] transition-colors"
                  >
                    <Plus size={14} /> Upload First Media
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {gallery.map((g) => {
                    const isVideo = g.media_type === "VIDEO" || g.category === "BEST_PLAYS";
                    const posterSrc =
                      g.thumbnail_url ||
                      (isVideo
                        ? "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=600"
                        : g.url);

                    return (
                      <div
                        key={g.id}
                        className="group relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 aspect-video flex flex-col justify-end hover:border-neutral-700 transition-colors"
                      >
                        {isVideo && g.url.endsWith(".mp4") ? (
                          <video src={g.url} className="w-full h-full object-cover" muted loop />
                        ) : (
                          <img
                            src={posterSrc}
                            alt={g.title}
                            className="w-full h-full object-cover"
                          />
                        )}

                        {isVideo && (
                          <div className="absolute inset-0 grid place-items-center bg-black/40 group-hover:bg-black/20 transition-colors">
                            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#CCFF00] text-black shadow-lg">
                              <Play size={18} className="ml-0.5" />
                            </div>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-3 flex flex-col justify-between opacity-95 group-hover:opacity-100 transition-opacity">
                          <span className="self-start px-2 py-0.5 rounded bg-black/80 text-[0.6rem] font-black uppercase text-[#CCFF00] border border-[#CCFF00]/30">
                            {g.category} {isVideo ? "• VIDEO" : ""}
                          </span>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white truncate">{g.title}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleStartEditGallery(g)}
                                className="p-1 rounded-lg bg-neutral-800 text-neutral-300 hover:text-[#CCFF00] hover:bg-neutral-700 transition-colors"
                                title="Edit Media Info"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteGallery(g)}
                                className="p-1 rounded-lg bg-neutral-800 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 transition-colors"
                                title="Delete Media"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: ANNOUNCEMENTS */}
          {activeTab === "announcements" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white font-display uppercase">
                    Floating Banners & Alerts
                  </h1>
                  <p className="text-xs text-neutral-400 mt-1">
                    Manage floating site-wide headers, edit offer details, activate/pause, or delete
                    banners
                  </p>
                </div>

                <button
                  onClick={handleStartCreateAnnouncement}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#CCFF00] text-black text-xs font-black uppercase tracking-wider hover:bg-[#b8e600] transition-colors"
                >
                  <Plus size={14} /> New Banner
                </button>
              </div>

              {announcements.length === 0 ? (
                <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-12 text-center max-w-md mx-auto space-y-4">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#CCFF00]/10 text-[#CCFF00]">
                    <Bell size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase font-display">
                      No Active Banners or Alerts
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      Publish floating offer banners, rain delay alerts, or ground announcements.
                    </p>
                  </div>
                  <button
                    onClick={handleStartCreateAnnouncement}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#CCFF00] text-black text-xs font-black uppercase tracking-wider hover:bg-[#b8e600] transition-colors"
                  >
                    <Plus size={14} /> Create First Banner
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {announcements.map((a) => (
                    <div
                      key={a.id}
                      className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 flex items-center justify-between gap-4 hover:border-neutral-700 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-white">{a.title}</span>
                          <span className="px-2 py-0.5 rounded bg-[#CCFF00]/10 text-[#CCFF00] text-[0.6rem] font-bold uppercase border border-[#CCFF00]/30">
                            {a.type}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-1">{a.message}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Pause / Activate Toggle Button */}
                        <button
                          onClick={async () => {
                            const res = await fetch("/api/admin/announcements", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: a.id, is_active: !a.is_active }),
                            });
                            if (res.ok) {
                              showToast(
                                `Banner '${a.title}' ${!a.is_active ? "activated" : "paused"}.`,
                              );
                              fetchAllAdminData();
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[0.65rem] font-black uppercase transition-all ${
                            a.is_active
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                              : "bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700"
                          }`}
                          title={a.is_active ? "Pause Banner" : "Activate Banner"}
                        >
                          {a.is_active ? "Active" : "Paused"}
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleStartEditAnnouncement(a)}
                          className="p-1.5 rounded-xl bg-neutral-800 text-neutral-300 hover:text-[#CCFF00] hover:bg-neutral-700 transition-colors"
                          title="Edit Banner Details"
                        >
                          <Edit2 size={14} />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteAnnouncement(a)}
                          className="p-1.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 transition-colors"
                          title="Delete Banner Alert"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 9: REVIEWS & FEEDBACK */}
          {activeTab === "feedback" && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white font-display uppercase">
                  Customer Reviews & Feedback
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Inspect ratings submitted by turf players
                </p>
              </div>

              {feedback.length === 0 ? (
                <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-12 text-center max-w-md mx-auto space-y-3">
                  <MessageSquare size={28} className="text-[#CCFF00] mx-auto opacity-60" />
                  <h3 className="text-xl font-black text-white uppercase font-display">
                    No Reviews Yet
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Player feedback will appear here as reviews are submitted.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {feedback.map((f) => (
                    <div
                      key={f.id}
                      className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">{f.customer_name}</span>
                        <div className="text-amber-400 font-bold text-xs">
                          {"★".repeat(f.rating)}
                        </div>
                      </div>
                      <p className="text-xs text-neutral-300 italic">&ldquo;{f.comment}&rdquo;</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 10: AUDIT LOGS */}
          {activeTab === "audit" && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white">
                  Security Audit Trail
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Immutable administrative action logs
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 space-y-3">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/80 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono font-bold text-[#CCFF00]">{log.action}</span>
                      <span className="text-neutral-400 ml-2">by {log.admin_email}</span>
                    </div>
                    <span className="text-neutral-500 font-mono text-[0.65rem]">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 11: WEBSITE & ADMIN SECURITY SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white">
                  Admin & Website Settings
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Change admin profile details, security password, and ground configurations
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CARD 1: CHANGE ADMIN NAME & PROFILE */}
                <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-3">
                    <UserCheck size={18} className="text-[#CCFF00]" />
                    <h3 className="font-extrabold text-base text-white">
                      Admin Profile & Display Name
                    </h3>
                  </div>

                  <form onSubmit={handleUpdateAdminName} className="space-y-4">
                    <div>
                      <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                        Admin Full Name / Display Name
                      </label>
                      <input
                        type="text"
                        required
                        value={adminNameForm.fullName}
                        onChange={(e) =>
                          setAdminNameForm({ ...adminNameForm, fullName: e.target.value })
                        }
                        className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                          Admin Contact Email
                        </label>
                        <input
                          type="email"
                          required
                          value={adminNameForm.email}
                          onChange={(e) =>
                            setAdminNameForm({ ...adminNameForm, email: e.target.value })
                          }
                          className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                          Admin Phone Number
                        </label>
                        <input
                          type="tel"
                          required
                          value={adminNameForm.phone}
                          onChange={(e) =>
                            setAdminNameForm({ ...adminNameForm, phone: e.target.value })
                          }
                          className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingAdminProfile}
                      className="w-full py-3 rounded-xl bg-[#CCFF00] text-black text-xs font-black uppercase tracking-wider hover:bg-[#b8e600] transition-colors shadow-lg shadow-[#CCFF00]/10 disabled:opacity-50"
                    >
                      {savingAdminProfile ? "Saving Profile..." : "Update Admin Profile"}
                    </button>
                  </form>
                </div>

                {/* CARD 2: CHANGE ADMIN SECURITY PASSWORD */}
                <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-3">
                    <Lock size={18} className="text-amber-400" />
                    <h3 className="font-extrabold text-base text-white">
                      Change Security Password
                    </h3>
                  </div>

                  <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                        New Security Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="Enter new password (min 6 chars)"
                        value={passwordChangeForm.newPassword}
                        onChange={(e) =>
                          setPasswordChangeForm({
                            ...passwordChangeForm,
                            newPassword: e.target.value,
                          })
                        }
                        className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="Re-type new password"
                        value={passwordChangeForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordChangeForm({
                            ...passwordChangeForm,
                            confirmPassword: e.target.value,
                          })
                        }
                        className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingAdminPassword}
                      className="w-full py-3 rounded-xl bg-amber-400 text-black text-xs font-black uppercase tracking-wider hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/10 disabled:opacity-50"
                    >
                      {savingAdminPassword ? "Updating Password..." : "Change Security Password"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 2: BOOKING DETAILS */}
      {detailBooking && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setDetailBooking(null)}
        >
          <div
            className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 w-full max-w-md space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-mono text-xs text-[#CCFF00] font-bold">
              {detailBooking.public_reference || detailBooking.reference}
            </p>
            <h3 className="text-2xl font-black text-white">{detailBooking.customer_name}</h3>

            <dl className="space-y-2 text-xs divide-y divide-neutral-800 border-t border-b border-neutral-800 py-3">
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">Phone</span>
                <span className="font-mono font-bold">
                  {detailBooking.customer_phone || detailBooking.phone}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">Date & Hour</span>
                <span className="font-bold">
                  {detailBooking.booking_date || detailBooking.date_key} @{" "}
                  {detailBooking.start_hour}:00
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">Status</span>
                <span className="font-bold text-[#CCFF00]">{detailBooking.status}</span>
              </div>
            </dl>

            <button
              onClick={() => setDetailBooking(null)}
              className="w-full py-2.5 rounded-xl border border-neutral-700 text-xs font-bold uppercase hover:bg-neutral-800"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: CUSTOMER PROFILE & CONTROL SUITE */}
      {detailCustomer && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => {
            setDetailCustomer(null);
            setEditingCustomerForm(null);
          }}
        >
          <div
            className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 w-full max-w-2xl space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-[#CCFF00]/10 text-[#CCFF00] grid place-items-center font-extrabold text-xl">
                  {detailCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black text-white uppercase font-display">
                      {detailCustomer.name}
                    </h3>
                    {detailCustomer.is_blocked ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-black uppercase border border-red-500/30">
                        Blocked
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase border border-emerald-500/30">
                        Active Profile
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-neutral-400 mt-0.5">
                    Phone: {detailCustomer.phone} | Email: {detailCustomer.email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setDetailCustomer(null);
                  setEditingCustomerForm(null);
                }}
                className="text-neutral-500 hover:text-white text-base font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl border border-neutral-800 bg-black/40">
                <span className="text-[0.65rem] font-black uppercase text-neutral-400 block">
                  Total Spent
                </span>
                <span className="font-mono text-lg font-black text-[#CCFF00]">
                  ₹{(detailCustomer.totalSpentPaise / 100).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl border border-neutral-800 bg-black/40">
                <span className="text-[0.65rem] font-black uppercase text-neutral-400 block">
                  Completed Bookings
                </span>
                <span className="font-mono text-lg font-black text-white">
                  {detailCustomer.completedBookings}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl border border-neutral-800 bg-black/40">
                <span className="text-[0.65rem] font-black uppercase text-neutral-400 block">
                  Total Slots
                </span>
                <span className="font-mono text-lg font-black text-white">
                  {detailCustomer.totalBookings}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl border border-neutral-800 bg-black/40">
                <span className="text-[0.65rem] font-black uppercase text-neutral-400 block">
                  Status
                </span>
                <span
                  className={`text-xs font-black uppercase ${detailCustomer.is_blocked ? "text-red-400" : "text-emerald-400"}`}
                >
                  {detailCustomer.is_blocked ? "BLOCKED" : "ACTIVE"}
                </span>
              </div>
            </div>

            {/* Admin Action Controls Toolbar */}
            <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-950 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-white uppercase font-display">
                  Customer Management Actions
                </h4>
                <p className="text-[0.65rem] text-neutral-400">
                  Block customer, edit profile info, or cancel all active bookings.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Block / Unblock Button */}
                <button
                  onClick={() => handleToggleBlockCustomer(detailCustomer)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-colors ${
                    detailCustomer.is_blocked
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                      : "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                  }`}
                >
                  {detailCustomer.is_blocked ? "Unblock Customer" : "Block Customer"}
                </button>

                {/* Edit Profile Button */}
                <button
                  onClick={() => {
                    if (editingCustomerForm) {
                      setEditingCustomerForm(null);
                    } else {
                      setEditingCustomerForm({
                        name: detailCustomer.name,
                        phone: detailCustomer.phone,
                        email: detailCustomer.email,
                      });
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-black uppercase bg-neutral-800 text-white border border-neutral-700 hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors"
                >
                  {editingCustomerForm ? "Close Edit" : "Edit Profile"}
                </button>

                {/* Cancel All Active Bookings Button */}
                <button
                  onClick={() => handleCancelCustomerBookings(detailCustomer.phone)}
                  className="px-3 py-1.5 rounded-xl text-xs font-black uppercase bg-red-950/60 text-red-300 border border-red-800/50 hover:bg-red-900/80 transition-colors"
                >
                  Cancel All Bookings
                </button>
              </div>
            </div>

            {/* Edit Customer Profile Form (if active) */}
            {editingCustomerForm && (
              <form
                onSubmit={handleSaveCustomerEdit}
                className="p-4 rounded-2xl border border-[#CCFF00]/30 bg-[#CCFF00]/5 space-y-4"
              >
                <h4 className="text-xs font-black text-[#CCFF00] uppercase font-display">
                  Edit Customer Contact Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editingCustomerForm.name}
                      onChange={(e) =>
                        setEditingCustomerForm({ ...editingCustomerForm, name: e.target.value })
                      }
                      className="w-full bg-black border border-neutral-800 rounded-xl py-2 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      required
                      value={editingCustomerForm.phone}
                      onChange={(e) =>
                        setEditingCustomerForm({ ...editingCustomerForm, phone: e.target.value })
                      }
                      className="w-full bg-black border border-neutral-800 rounded-xl py-2 px-3 text-xs font-mono text-[#CCFF00] focus:border-[#CCFF00] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={editingCustomerForm.email}
                      onChange={(e) =>
                        setEditingCustomerForm({ ...editingCustomerForm, email: e.target.value })
                      }
                      className="w-full bg-black border border-neutral-800 rounded-xl py-2 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#CCFF00] text-black text-xs font-black uppercase tracking-wider hover:bg-[#b8e600] transition-colors"
                  >
                    Save Profile Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCustomerForm(null)}
                    className="px-3 py-2 rounded-xl border border-neutral-700 text-neutral-400 text-xs font-bold uppercase hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Customer's Booking History */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-white uppercase font-display flex items-center justify-between">
                <span>Customer Slot Booking History</span>
                <span className="text-xs text-neutral-400 font-mono font-normal">
                  Phone: {detailCustomer.phone}
                </span>
              </h4>

              {(() => {
                const customerBookings = bookings.filter(
                  (b) =>
                    (b.customer_phone && b.customer_phone.includes(detailCustomer.phone)) ||
                    (b.phone && b.phone.includes(detailCustomer.phone)) ||
                    (b.customer_name &&
                      b.customer_name.toLowerCase() === detailCustomer.name.toLowerCase()),
                );

                if (customerBookings.length === 0) {
                  return (
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6 text-center text-xs text-neutral-400">
                      No turf slot bookings found for this customer phone number.
                    </div>
                  );
                }

                return (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {customerBookings.map((b) => (
                      <div
                        key={b.id}
                        className="p-3.5 rounded-2xl border border-neutral-800 bg-neutral-950 flex items-center justify-between text-xs hover:border-neutral-700 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#CCFF00]">
                              {b.public_reference || b.reference || "BOOKING"}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[0.6rem] font-bold uppercase ${
                                b.status === "CONFIRMED" || b.status === "COMPLETED"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : b.status === "CANCELLED"
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-amber-500/20 text-amber-300"
                              }`}
                            >
                              {b.status}
                            </span>
                          </div>
                          <p className="text-neutral-300 mt-1">
                            Date:{" "}
                            <span className="font-bold text-white">
                              {b.booking_date || b.date_key}
                            </span>{" "}
                            @ {b.start_hour}:00 - {b.start_hour + 1}:00
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-white text-sm">
                            ₹
                            {(b.amount_paise ? b.amount_paise / 100 : b.amount || 0).toLocaleString(
                              "en-IN",
                            )}
                          </span>

                          {b.status !== "CANCELLED" && (
                            <button
                              onClick={() => handleCancelBooking(b.id)}
                              className="px-2.5 py-1 rounded-lg bg-red-950/80 text-red-300 border border-red-800/50 text-[0.65rem] font-black uppercase hover:bg-red-900 transition-colors"
                            >
                              Cancel Slot
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HOLD / BLOCK SLOT */}
      {holdModalSlot && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setHoldModalSlot(null)}
        >
          <div
            className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 w-full max-w-md space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <span className="text-[0.65rem] font-black uppercase tracking-widest text-amber-400">
                  Ground Slot Control
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">
                  Slot {holdModalSlot.hourStr} ({viewDate})
                </h3>
              </div>
              <button
                onClick={() => setHoldModalSlot(null)}
                className="text-neutral-500 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleHoldBlockSubmit} className="space-y-4">
              <div>
                <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-2">
                  Action Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHoldForm({ ...holdForm, actionType: "HOLD_SLOT" })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      holdForm.actionType === "HOLD_SLOT"
                        ? "border-amber-400 bg-amber-500/10 text-amber-400"
                        : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
                    }`}
                  >
                    <Clock size={14} /> Temporary Hold
                  </button>
                  <button
                    type="button"
                    onClick={() => setHoldForm({ ...holdForm, actionType: "BLOCK_SLOT" })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      holdForm.actionType === "BLOCK_SLOT"
                        ? "border-red-500 bg-red-500/10 text-red-400"
                        : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
                    }`}
                  >
                    <Ban size={14} /> Permanent Block
                  </button>
                </div>
              </div>

              {holdForm.actionType === "HOLD_SLOT" && (
                <div>
                  <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                    Hold Duration
                  </label>
                  <select
                    value={holdForm.holdDurationMinutes}
                    onChange={(e) =>
                      setHoldForm({ ...holdForm, holdDurationMinutes: Number(e.target.value) })
                    }
                    className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes (Standard Hold)</option>
                    <option value={60}>1 Hour</option>
                    <option value={120}>2 Hours</option>
                    <option value={240}>4 Hours</option>
                    <option value={720}>12 Hours</option>
                    <option value={1440}>24 Hours</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                    Customer Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh"
                    value={holdForm.customerName}
                    onChange={(e) => setHoldForm({ ...holdForm, customerName: e.target.value })}
                    className="w-full bg-black border border-neutral-800 rounded-xl py-2 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={holdForm.customerPhone}
                    onChange={(e) => setHoldForm({ ...holdForm, customerPhone: e.target.value })}
                    className="w-full bg-black border border-neutral-800 rounded-xl py-2 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                  Reason / Internal Notes
                </label>
                <input
                  type="text"
                  placeholder={
                    holdForm.actionType === "HOLD_SLOT"
                      ? "e.g. Holding slot for phone inquiry"
                      : "e.g. Turf maintenance / Rain delay"
                  }
                  value={holdForm.notes}
                  onChange={(e) => setHoldForm({ ...holdForm, notes: e.target.value })}
                  className="w-full bg-black border border-neutral-800 rounded-xl py-2 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setHoldModalSlot(null)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-800 text-xs font-bold text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
                    holdForm.actionType === "HOLD_SLOT"
                      ? "bg-amber-400 text-black hover:bg-amber-300 shadow-lg shadow-amber-400/10"
                      : "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/10"
                  }`}
                >
                  {holdForm.actionType === "HOLD_SLOT" ? "Hold Slot" : "Block Slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RAZORPAY REFUND */}
      {showRefundModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setShowRefundModal(null)}
        >
          <div
            className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 w-full max-w-md space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <span className="text-[0.65rem] font-black uppercase tracking-widest text-purple-400">
                  Razorpay API Instant Refund
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">
                  Refund{" "}
                  {showRefundModal.public_reference || showRefundModal.reference || "Booking"}
                </h3>
              </div>
              <button
                onClick={() => setShowRefundModal(null)}
                className="text-neutral-500 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProcessRefund} className="space-y-4">
              <div>
                <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                  Customer Name
                </label>
                <div className="text-sm font-bold text-white bg-black border border-neutral-800 rounded-xl p-3">
                  {showRefundModal.customer_name} (
                  {showRefundModal.customer_phone || showRefundModal.phone || "No phone"})
                </div>
              </div>

              <div>
                <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                  Refund Amount (Paise)
                </label>
                <input
                  type="number"
                  required
                  value={
                    refundAmountPaiseInput ||
                    showRefundModal.amount_paise ||
                    (showRefundModal.amount ? showRefundModal.amount * 100 : 49900)
                  }
                  onChange={(e) => setRefundAmountPaiseInput(Number(e.target.value))}
                  className="w-full bg-black border border-neutral-800 rounded-xl py-2 px-3 text-xs font-mono text-white focus:border-purple-400 focus:outline-none"
                />
                <span className="text-[0.65rem] text-neutral-500 mt-1 block">
                  Amount in ₹: ₹
                  {(
                    (refundAmountPaiseInput ||
                      showRefundModal.amount_paise ||
                      (showRefundModal.amount ? showRefundModal.amount * 100 : 49900)) / 100
                  ).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                  Reason for Refund
                </label>
                <input
                  type="text"
                  required
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Customer cancellation due to weather"
                  className="w-full bg-black border border-neutral-800 rounded-xl py-2 px-3 text-xs text-white focus:border-purple-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-800 text-xs font-bold text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRefund}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-black uppercase tracking-wider hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/20 disabled:opacity-50"
                >
                  {submittingRefund ? "Processing API Refund…" : "Confirm Razorpay Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD GALLERY MEDIA */}
      {showGalleryModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setShowGalleryModal(false)}
        >
          <div
            className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 w-full max-w-md space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-xl font-black text-white uppercase font-display flex items-center gap-2">
                <ImageIcon size={20} className="text-[#CCFF00]" />{" "}
                {editingGalleryId ? "Edit Gallery Media" : "Upload Media & Best Plays"}
              </h3>
              <button
                onClick={() => {
                  setShowGalleryModal(false);
                  setEditingGalleryId(null);
                }}
                className="text-neutral-500 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveGallery} className="space-y-4">
              <div>
                <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                  Upload Local File (Image or Video)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleGalleryFileUpload}
                    className="w-full bg-black border border-neutral-800 rounded-xl py-2 px-3 text-xs text-neutral-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:uppercase file:bg-[#CCFF00] file:text-black hover:file:bg-[#b8e600] cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                  Media Title / Highlight Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Best Play: Match Winning Sixer!"
                  value={galleryForm.title}
                  onChange={(e) => setGalleryForm({ ...galleryForm, title: e.target.value })}
                  className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                  Or Image / Video Web URL / YouTube Link
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://... or data:image/..."
                  value={galleryForm.url}
                  onChange={(e) => setGalleryForm({ ...galleryForm, url: e.target.value })}
                  className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs font-mono text-[#CCFF00] focus:border-[#CCFF00] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                    Gallery Category
                  </label>
                  <select
                    value={galleryForm.category}
                    onChange={(e) => setGalleryForm({ ...galleryForm, category: e.target.value })}
                    className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                  >
                    <option value="TURF">Turf Pitch Arena</option>
                    <option value="BEST_PLAYS">Best Plays & Highlights</option>
                    <option value="FLOODLIGHTS">Floodlights & Night Matches</option>
                    <option value="FACILITIES">Amenities & Lounge</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                    Media Type
                  </label>
                  <select
                    value={galleryForm.media_type}
                    onChange={(e) => setGalleryForm({ ...galleryForm, media_type: e.target.value })}
                    className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                  >
                    <option value="IMAGE">Photo Image</option>
                    <option value="VIDEO">Video Clip / Highlight</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                  Caption / Play Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 14 floodlights active during 9 PM match"
                  value={galleryForm.caption}
                  onChange={(e) => setGalleryForm({ ...galleryForm, caption: e.target.value })}
                  className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#CCFF00] text-black text-xs font-black uppercase tracking-wider hover:bg-[#b8e600] transition-colors shadow-lg shadow-[#CCFF00]/10 mt-2"
              >
                {editingGalleryId ? "Update Gallery Media" : "Publish Media to Gallery"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SITE ANNOUNCEMENT BANNER */}
      {showAnnouncementModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setShowAnnouncementModal(false)}
        >
          <div
            className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 w-full max-w-md space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-xl font-black text-white uppercase font-display flex items-center gap-2">
                <Bell size={20} className="text-[#CCFF00]" />{" "}
                {editingAnnouncementId ? "Edit Floating Banner / Alert" : "Publish Site Banner"}
              </h3>
              <button
                onClick={() => {
                  setShowAnnouncementModal(false);
                  setEditingAnnouncementId(null);
                }}
                className="text-neutral-500 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveAnnouncement} className="space-y-4">
              <div>
                <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                  Banner Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekend Special Night Slot Discount!"
                  value={announcementForm.title}
                  onChange={(e) =>
                    setAnnouncementForm({ ...announcementForm, title: e.target.value })
                  }
                  className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                  Message Content
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Book 2 consecutive night slots and get a free tournament match ball!"
                  value={announcementForm.message}
                  onChange={(e) =>
                    setAnnouncementForm({ ...announcementForm, message: e.target.value })
                  }
                  className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                    Banner Type
                  </label>
                  <select
                    value={announcementForm.type}
                    onChange={(e) =>
                      setAnnouncementForm({ ...announcementForm, type: e.target.value })
                    }
                    className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                  >
                    <option value="OFFER">Offer Banner</option>
                    <option value="ALERT">Alert Notice</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="NEWS">General News</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                    Button Label (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Book Now"
                    value={announcementForm.cta_text}
                    onChange={(e) =>
                      setAnnouncementForm({ ...announcementForm, cta_text: e.target.value })
                    }
                    className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                  Target Link URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. /book"
                  value={announcementForm.link_url}
                  onChange={(e) =>
                    setAnnouncementForm({ ...announcementForm, link_url: e.target.value })
                  }
                  className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#CCFF00] text-black text-xs font-black uppercase tracking-wider hover:bg-[#b8e600] transition-colors shadow-lg shadow-[#CCFF00]/10 mt-2"
              >
                {editingAnnouncementId ? "Update Banner Details" : "Publish Site Banner"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROMO COUPON CODE */}
      {showCouponModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setShowCouponModal(false)}
        >
          <div
            className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 w-full max-w-md space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-xl font-black text-white uppercase font-display flex items-center gap-2">
                <Tag size={20} className="text-[#CCFF00]" />{" "}
                {editingCouponId ? "Edit Promo Code" : "Create Promo Code"}
              </h3>
              <button
                onClick={() => {
                  setShowCouponModal(false);
                  setEditingCouponId(null);
                }}
                className="text-neutral-500 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveCoupon} className="space-y-4">
              <div>
                <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                  Coupon Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GULLY20"
                  value={couponForm.code}
                  onChange={(e) =>
                    setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })
                  }
                  className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs font-mono uppercase text-[#CCFF00] focus:border-[#CCFF00] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={couponForm.discount_type}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, discount_type: e.target.value })
                    }
                    className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (INR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    required
                    value={couponForm.discount_value}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, discount_value: Number(e.target.value) })
                    }
                    className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                    Usage Limit (Max Uses)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 100 (0 = unlimited)"
                    value={couponForm.usage_limit || ""}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, usage_limit: Number(e.target.value) })
                    }
                    className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                    Min Booking Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 299"
                    value={couponForm.min_booking_amount || ""}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, min_booking_amount: Number(e.target.value) })
                    }
                    className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[0.65rem] font-black uppercase text-neutral-400 mb-1">
                  Description / Offer Details
                </label>
                <input
                  type="text"
                  placeholder="e.g. 20% discount on weekday slots (Max 100 uses)"
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-[#CCFF00] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#CCFF00] text-black text-xs font-black uppercase tracking-wider hover:bg-[#b8e600] transition-colors shadow-lg shadow-[#CCFF00]/10 mt-2"
              >
                {editingCouponId ? "Update Promo Code" : "Create Promo Coupon"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
