import type { Metadata } from "next";
import AdminPage from "@/routes/admin";

export const metadata: Metadata = {
  title: "Admin Dashboard | Gully United XLV",
  robots: { index: false, follow: false },
};

export default function AdminRoute() {
  return <AdminPage />;
}
