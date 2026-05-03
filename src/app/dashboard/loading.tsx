export default function DashboardLoading() {
  return (
    <div className="relative md:h-[calc(100dvh-7.5rem)] animate-pulse">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:h-full md:grid-rows-1">
        {/* Left column — queue */}
        <div className="flex flex-col gap-3 md:col-span-7 lg:col-span-6">
          {/* Tab strip */}
          <div className="flex gap-0.5 rounded-md border border-border p-0.5">
            {[40, 28, 40, 28, 28].map((w, i) => (
              <div key={i} className={`h-8 flex-1 rounded bg-muted`} />
            ))}
          </div>
          {/* Row skeleton */}
          <div className="rounded-lg border border-border overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3 border-b border-border last:border-b-0">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/20 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-2/3 rounded bg-muted" />
                  <div className="h-2.5 w-1/3 rounded bg-muted" />
                </div>
                <div className="h-6 w-16 rounded bg-muted shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Right column — stats panel */}
        <div className="flex flex-col gap-4 md:col-span-5 lg:col-span-6">
          {/* Readiness card */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-16 rounded bg-muted" />
                <div className="h-2 w-full rounded bg-muted" />
              </div>
            </div>
          </div>
          {/* Category breakdown */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2.5">
            <div className="h-3 w-32 rounded bg-muted" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-2.5 w-20 rounded bg-muted shrink-0" />
                <div className="flex-1 h-1.5 rounded-full bg-muted" />
                <div className="h-2.5 w-8 rounded bg-muted shrink-0" />
              </div>
            ))}
          </div>
          {/* Chart */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <div className="h-3 w-28 rounded bg-muted" />
            <div className="h-32 rounded bg-muted/60" />
          </div>
        </div>
      </div>
    </div>
  );
}
