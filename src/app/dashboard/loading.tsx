export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white flex">
      <aside className="w-60 min-h-screen bg-[#0a0a0c] border-r border-white/5 p-6 hidden md:block">
        <div className="h-7 w-32 bg-white/5 rounded-lg animate-pulse mb-8" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </aside>
      <main className="flex-1 p-8">
        <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse mb-4" />
        <div className="h-4 w-64 bg-white/5 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 animate-pulse">
              <div className="h-8 w-20 bg-white/5 rounded mb-2" />
              <div className="h-3 w-24 bg-white/5 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 animate-pulse">
          <div className="h-5 w-32 bg-white/5 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-white/5 rounded" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
