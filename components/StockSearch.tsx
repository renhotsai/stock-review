'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type SearchResult = { symbol: string; name: string; exchange: string };

export default function StockSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced search
  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data: SearchResult[] = await res.json();
        setResults(data);
        setOpen(true);
        setHighlighted(-1);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navigate = (symbol: string) => {
    router.push(`/lookup/${symbol}`);
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Enter') {
      if (highlighted >= 0 && results[highlighted]) {
        navigate(results[highlighted].symbol);
      } else if (query.trim()) {
        navigate(query.trim().toUpperCase());
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="輸入股票代號或公司名稱..."
          className="w-full border border-gray-300 rounded-lg pl-4 pr-20 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        {loading ? (
          <span className="absolute right-3 top-2 text-xs text-gray-400">搜尋中...</span>
        ) : (
          <span className="absolute right-3 top-2 text-xs text-gray-400 pointer-events-none">
            🔍
          </span>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {results.map((r, i) => (
            <li
              key={r.symbol}
              onClick={() => navigate(r.symbol)}
              onMouseEnter={() => setHighlighted(i)}
              className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer text-sm ${
                i === highlighted ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <span className="font-semibold text-gray-900 w-16 shrink-0">{r.symbol}</span>
              <span className="text-gray-500 text-xs truncate flex-1">{r.name}</span>
              <span className="text-gray-400 text-xs shrink-0">{r.exchange}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
