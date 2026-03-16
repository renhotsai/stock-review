'use client';

export default function FinancialsLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-gray-200 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-100 rounded w-1/5" />
            <div className="flex gap-2 mt-2">
              <div className="h-5 w-20 bg-gray-100 rounded-full" />
              <div className="h-5 w-24 bg-gray-100 rounded-full" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-5 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="h-48 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
