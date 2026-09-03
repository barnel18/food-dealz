import type { DealCardData } from '@/lib/deals/types';
import { DealCard } from './deal-card';

export function DealList({
  deals,
  savedIds,
  isLoggedIn,
  showBusiness = true,
}: {
  deals: DealCardData[];
  savedIds: ReadonlySet<string>;
  isLoggedIn: boolean;
  showBusiness?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {deals.map((d) => (
        <DealCard key={d.id} deal={d} saved={savedIds.has(d.id)} isLoggedIn={isLoggedIn} showBusiness={showBusiness} />
      ))}
    </div>
  );
}
