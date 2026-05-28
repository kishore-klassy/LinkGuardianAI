"use client";
export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white flex items-center justify-center">
      <div className="text-center max-w-sm mx-auto p-6">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-black mb-2" style={{ fontFamily: "Syne, sans-serif" }}>Something went wrong</h1>
        <p className="text-sm text-white/50 mb-6">{error.message || "Could not load dashboard."}</p>
        <button
          onClick={reset}
          className="bg-gradient-to-r from-violet-500 to-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
          style={{ fontFamily: "Syne, sans-serif" }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
