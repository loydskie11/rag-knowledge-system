import { Skeleton } from "../ui/skeleton";

const pulse = "bg-gray-200/80";

export function DashboardSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-6 pb-10" aria-busy="true" aria-label="Loading dashboard">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <Skeleton className={`h-7 w-52 ${pulse}`} />
          <Skeleton className={`h-4 w-full max-w-md ${pulse}`} />
        </div>
        <Skeleton className={`h-9 w-36 ${pulse}`} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <Skeleton className={`h-3 w-28 ${pulse}`} />
              <Skeleton className={`h-8 w-8 rounded-lg ${pulse}`} />
            </div>
            <Skeleton className={`mt-5 h-8 w-20 ${pulse}`} />
            <Skeleton className={`mt-2 h-3 w-36 ${pulse}`} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
          <Skeleton className={`h-4 w-40 ${pulse}`} />
          <Skeleton className={`mt-5 h-64 w-full ${pulse}`} />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <Skeleton className={`h-4 w-32 ${pulse}`} />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className={`h-9 w-9 rounded-lg ${pulse}`} />
                <div className="flex-1 space-y-2">
                  <Skeleton className={`h-3 w-full ${pulse}`} />
                  <Skeleton className={`h-3 w-2/3 ${pulse}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white" aria-busy="true" aria-label="Loading records">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <Skeleton className={`h-9 w-64 ${pulse}`} />
        <Skeleton className={`h-9 w-28 ${pulse}`} />
      </div>
      <div className="grid gap-4 border-b border-gray-100 bg-gray-50 px-5 py-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((_, index) => <Skeleton key={index} className={`h-3 w-3/4 ${pulse}`} />)}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="grid gap-4 border-b border-gray-100 px-5 py-4 last:border-0" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((_, column) => <Skeleton key={column} className={`h-4 ${column === 0 ? "w-full" : "w-3/4"} ${pulse}`} />)}
        </div>
      ))}
    </div>
  );
}

export function ModuleSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading module">
      <div className="space-y-2">
        <Skeleton className={`h-7 w-56 ${pulse}`} />
        <Skeleton className={`h-4 w-full max-w-lg ${pulse}`} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className={`h-24 rounded-xl ${pulse}`} />)}
      </div>
      <TableSkeleton rows={5} columns={4} />
    </div>
  );
}
