import { Star } from 'lucide-react';
import clsx from 'clsx';
import type { PaymentStatus } from '../../types';

const TOTAL_STARS = 4;

// Fees fully paid -> all 4 stars filled; half payment -> 2 of 4; anything
// else (free/unset) -> 0 filled, matching the "blank stars by default" spec.
function filledCount(paymentStatus?: PaymentStatus | null): number {
  if (paymentStatus === 'Paid in Full') return 4;
  if (paymentStatus === 'Half Payment') return 2;
  return 0;
}

const PaymentStars = ({ paymentStatus, size = 12 }: { paymentStatus?: PaymentStatus | null; size?: number }) => {
  const filled = filledCount(paymentStatus);

  return (
    <span className="inline-flex items-center gap-0.5" title={paymentStatus ? paymentStatus : 'No payment recorded'}>
      {Array.from({ length: TOTAL_STARS }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={clsx(i < filled ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-300')}
        />
      ))}
    </span>
  );
};

export default PaymentStars;
