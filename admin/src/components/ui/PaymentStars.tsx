import { Gift, Star } from 'lucide-react';
import clsx from 'clsx';
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from '../../types';

const TOTAL_STARS = 4;

// Fees fully paid -> all 4 stars filled; half payment -> 2 of 4; unset ->
// blank stars. Free students get a distinct "Free" pill instead of stars so
// they never read as "unpaid".
function filledCount(paymentStatus?: PaymentStatus | null): number {
  if (paymentStatus === 'Paid in Full') return 4;
  if (paymentStatus === 'Half Payment') return 2;
  return 0;
}

const PaymentStars = ({
  paymentStatus,
  paymentRemark,
  size = 12,
}: {
  paymentStatus?: PaymentStatus | null;
  paymentRemark?: string;
  size?: number;
}) => {
  const label = paymentStatus ? PAYMENT_STATUS_LABELS[paymentStatus] : '';
  const title = paymentStatus
    ? paymentRemark
      ? `${label} — ${paymentRemark}`
      : label
    : 'No payment recorded';

  if (paymentStatus === 'Free') {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700"
        title={title}
      >
        <Gift size={size - 1} />
        {label}
      </span>
    );
  }

  const filled = filledCount(paymentStatus);

  return (
    <span className="inline-flex shrink-0 items-center gap-0.5" title={title}>
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
