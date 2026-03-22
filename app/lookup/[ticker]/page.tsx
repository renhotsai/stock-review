import LookupClient from './LookupClient';
import LookupPageHeader from '@/components/LookupPageHeader';

export default function LookupPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <LookupPageHeader ticker={ticker} />
      <LookupClient ticker={ticker} />
    </div>
  );
}
