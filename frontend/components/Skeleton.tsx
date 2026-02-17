interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-text/[0.06] before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-text/[0.04] before:to-transparent motion-reduce:before:animate-none ${className}`}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-background/80 rounded-xl p-6 border border-text/10">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-12 w-12 rounded-lg" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-52 mb-2" />
        <Skeleton className="h-5 w-72" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Tier Distribution */}
      <div className="bg-background/80 rounded-xl p-6 border border-text/10">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg p-4 border border-text/5 bg-text/[0.02]">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-background/80 rounded-xl p-6 border border-text/10">
        <Skeleton className="h-6 w-36 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-text/5">
              <div className="flex items-center">
                <Skeleton className="w-2 h-2 rounded-full mr-3" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MemberTableSkeleton() {
  return (
    <div className="bg-background/80 rounded-xl border border-text/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-text/10">
          <thead className="bg-background/60">
            <tr>
              {['Username', 'Wallet', 'FairScore', 'Tier', 'Joined', 'Actions'].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-text/10">
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
                <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                <td className="px-6 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                <td className="px-6 py-4"><Skeleton className="h-4 w-4" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-80" />
      </div>

      <div className="max-w-2xl">
        <div className="bg-background/80 rounded-xl p-6 border border-text/10 space-y-6">
          {/* Tier Thresholds heading */}
          <div>
            <Skeleton className="h-6 w-36 mb-2" />
            <Skeleton className="h-4 w-72 mb-6" />

            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-40 mb-2" />
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-2 flex-1 rounded-full" />
                    <Skeleton className="h-10 w-20 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-kick toggle */}
          <div className="pt-6 border-t border-text/10">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
          </div>

          {/* Save button */}
          <div className="pt-6 border-t border-text/10">
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-36 mb-2" />
        <Skeleton className="h-5 w-80" />
      </div>

      {/* Score Distribution Chart */}
      <div className="bg-background/80 rounded-xl p-6 border border-text/10">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>

      {/* Two charts in grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-background/80 rounded-xl p-6 border border-text/10">
          <Skeleton className="h-6 w-36 mb-4" />
          <Skeleton className="h-[250px] w-full rounded-lg" />
        </div>
        <div className="bg-background/80 rounded-xl p-6 border border-text/10">
          <Skeleton className="h-6 w-36 mb-4" />
          <Skeleton className="h-[250px] w-full rounded-lg" />
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-background/80 rounded-xl p-6 border border-text/10">
        <Skeleton className="h-6 w-52 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-text/5">
              <div className="flex items-center">
                <Skeleton className="w-3 h-3 rounded-full mr-3" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-16" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ActivityLogSkeleton() {
  return (
    <div className="bg-background/80 rounded-xl border border-text/10 overflow-hidden">
      <div className="divide-y divide-text/5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 p-4">
            {/* Action Icon */}
            <Skeleton className="flex-shrink-0 w-9 h-9 rounded-lg" />

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-48" />
            </div>

            {/* Timestamp */}
            <div className="flex-shrink-0 space-y-1">
              <Skeleton className="h-4 w-14 ml-auto" />
              <Skeleton className="h-3 w-12 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
