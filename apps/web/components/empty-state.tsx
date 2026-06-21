import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  eyebrow?: string;
  icon: LucideIcon;
  title: string;
  tips?: string[];
}

export function EmptyState({
  actionHref,
  actionLabel,
  description,
  eyebrow,
  icon: Icon,
  title,
  tips = []
}: EmptyStateProps) {
  return (
    <div className="empty-state-card">
      <div className="empty-state-icon" aria-hidden="true">
        <Icon />
      </div>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      <p>{description}</p>

      {tips.length > 0 ? (
        <div className="empty-state-tips" aria-label="Sonraki adimlar">
          {tips.map((tip) => (
            <span key={tip}>{tip}</span>
          ))}
        </div>
      ) : null}

      {actionHref && actionLabel ? (
        <Link className="secondary-button empty-state-action" href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
