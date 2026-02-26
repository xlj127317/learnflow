function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
  );
}

export default function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-4 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <SkeletonBlock key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonBlock className="h-64" />
          <SkeletonBlock className="h-64" />
        </div>
      </div>
    </div>
  );
}
