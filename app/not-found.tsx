import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white grid place-items-center px-4 font-sans">
      <div className="max-w-md w-full text-center">
        <LogoMark className="h-12 mx-auto" />
        <h1 className="text-6xl font-black text-[#CCFF00] mt-6">404</h1>
        <h2 className="text-xl font-bold mt-2">Page Not Found</h2>
        <p className="text-neutral-400 text-sm mt-3">
          The page or booking slot you are looking for does not exist.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 px-6 py-3 rounded-xl bg-[#CCFF00] text-black font-extrabold uppercase text-xs tracking-widest hover:bg-[#b8e600] transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
