'use client';

interface ScoreBadgeProps {
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
}

export default function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  if (score == null) return <span className="text-gray-400">—</span>;

  const color =
    score >= 8 ? 'bg-green-100 text-green-800 border-green-200' :
    score >= 6 ? 'bg-blue-100 text-blue-800 border-blue-200' :
    score >= 4 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
    'bg-red-100 text-red-800 border-red-200';

  const sizeClass =
    size === 'sm' ? 'text-xs px-1.5 py-0.5' :
    size === 'lg' ? 'text-lg px-3 py-1.5 font-bold' :
    'text-sm px-2 py-1 font-semibold';

  return (
    <span className={`inline-flex items-center rounded-full border ${color} ${sizeClass}`}>
      {score.toFixed(1)}
    </span>
  );
}
