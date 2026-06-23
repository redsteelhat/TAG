import type { ReactNode } from 'react';

type StatusVariant = 'success' | 'danger' | 'warning' | 'info' | 'muted' | 'teal';

interface StatusBadgeProps {
  variant: StatusVariant;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}

/**
 * Unified StatusBadge component — Fiscal Driver Pro design system.
 *
 * Variants:
 * - success  → profit, completed, active, healthy (green)
 * - danger   → urgent, failed, overdue, critical, loss (red)
 * - warning  → queued, pending, upcoming, estimated (amber)
 * - info     → processing, live, tracked (blue)
 * - muted    → standby, inactive, disabled, no-data (neutral)
 * - teal     → primary active state (teal)
 */
export function StatusBadge({ variant, children, dot = false, className = '' }: StatusBadgeProps) {
  return (
    <span className={`status-pill ${variant} ${className}`.trim()}>
      {dot ? (
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'currentColor',
            flexShrink: 0,
          }}
        />
      ) : null}
      {children}
    </span>
  );
}

/**
 * Convenience exports for common status values.
 */
export function StatusActive({ children }: { children?: ReactNode }) {
  return <StatusBadge variant="teal" dot>{children ?? 'Aktif'}</StatusBadge>;
}

export function StatusCompleted({ children }: { children?: ReactNode }) {
  return <StatusBadge variant="success">{children ?? 'Tamamlandı'}</StatusBadge>;
}

export function StatusPending({ children }: { children?: ReactNode }) {
  return <StatusBadge variant="warning">{children ?? 'Bekliyor'}</StatusBadge>;
}

export function StatusFailed({ children }: { children?: ReactNode }) {
  return <StatusBadge variant="danger">{children ?? 'Başarısız'}</StatusBadge>;
}

export function StatusProcessing({ children }: { children?: ReactNode }) {
  return <StatusBadge variant="info">{children ?? 'İşleniyor'}</StatusBadge>;
}
