import type { ReactNode } from 'react';

type DeltaSign = 'positive' | 'negative' | 'neutral';

interface DeltaBadgeProps {
  value: number | string;
  sign?: DeltaSign;
  unit?: string;
  className?: string;
}

/**
 * DeltaBadge — shows trend indicators like "+12%", "−8%", "0 TL"
 * Used in metric cards and comparison tables.
 *
 * Auto-detects sign from numeric value when sign not provided.
 */
export function DeltaBadge({ value, sign, unit = '%', className = '' }: DeltaBadgeProps) {
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
  
  const detectedSign: DeltaSign = sign ?? (
    numericValue > 0 ? 'positive' : numericValue < 0 ? 'negative' : 'neutral'
  );

  const variantClass = {
    positive: 'status-pill success',
    negative: 'status-pill danger',
    neutral: 'status-pill muted',
  }[detectedSign];

  const prefix = detectedSign === 'positive' ? '+' : '';
  const formattedValue = typeof value === 'string' ? value : `${prefix}${value}`;

  return (
    <span className={`${variantClass} ${className}`.trim()} aria-label={`Değişim: ${formattedValue}${unit}`}>
      {formattedValue}{unit !== '%' && unit ? ` ${unit}` : unit}
    </span>
  );
}

/**
 * FinanceDelta — specifically for monetary deltas.
 * Shows "+1.250 TL" or "−480 TL".
 */
export function FinanceDelta({ value, className = '' }: { value: number; className?: string }) {
  return (
    <DeltaBadge
      value={new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0 }).format(Math.abs(value))}
      sign={value >= 0 ? 'positive' : 'negative'}
      unit=" TL"
      className={className}
    />
  );
}
