import { cn } from '@/lib/utils';
import { formatToman } from '@/lib/format';

interface AmountProps {
  value: number;
  showSign?: boolean;
  className?: string;
}

export function Amount({ value, showSign = false, className }: AmountProps) {
  const isPositive = value >= 0;
  const formatted = formatToman(Math.abs(value));

  return (
    <span
      className={cn(
        'tabular-nums font-medium',
        showSign && (isPositive ? 'text-success' : 'text-destructive'),
        className
      )}
    >
      {showSign && !isPositive && '−'}
      {showSign && isPositive && value > 0 && '+'}
      {formatted}
    </span>
  );
}
