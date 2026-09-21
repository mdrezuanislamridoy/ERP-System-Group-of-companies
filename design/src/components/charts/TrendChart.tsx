import React from 'react';

interface Point {
  month: string;
  value: number;
}

export function TrendChart({ data, label }: {data: Point[];label: string;}) {
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 100;
  const h = 40;

  const points = data.map((d, i) => {
    const x = i / (data.length - 1) * w;
    const y = h - (d.value - min) / span * (h - 6) - 3;
    return `${x},${y}`;
  });

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-24 w-full" role="img" aria-label={label}>
        <polyline
          points={`0,${h} ${points.join(' ')} ${w},${h}`}
          fill="rgba(59,130,246,0.12)"
          stroke="none" />
        
        <polyline points={points.join(' ')} fill="none" stroke="#3B82F6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-xs text-faint">
        {data.map((d) =>
        <span key={d.month}>{d.month}</span>
        )}
      </div>
    </div>);

}