import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white flex items-center justify-center">
      <div className="text-center max-w-sm mx-auto p-6">
        <div className="text-5xl mb-4">🔗</div>
        <h1 className="text-2xl font-black mb-2" style={{ fontFamily: "Syne, sans-serif" }}>Link Not Found</h1>
        <p className="text-sm text-white/50 mb-6">This page doesn&apos;t exist or has been moved.</p>
        <Link
          href="/"
          className="bg-gradient-to-r from-violet-500 to-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm hover:opacity-90 transition-opacity inline-block"
          style={{ fontFamily: "Syne, sans-serif" }}
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
