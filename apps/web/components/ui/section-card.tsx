import type { ReactNode, LucideIcon } from 'lucide-react';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Use small shadow instead of default ambient shadow */
  compact?: boolean;
}

/**
 * SectionCard — standardised card container.
 * 12px border-radius, white surface, ambient shadow.
 *
 * Replaces ad-hoc `.panel` usages with a structured header + content layout.
 */
export function SectionCard({
  title,
  subtitle,
  icon,
  actions,
  children,
  className = '',
  compact = false,
}: SectionCardProps) {
  return (
    <div
      className={`panel section-card ${compact ? 'section-card--compact' : ''} ${className}`.trim()}
    >
      <div className="panel-heading section-card__header">
        <div className="section-card__title-group">
          {icon ? (
            <span className="panel-icon section-card__icon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <div>
            <h2 className="section-card__title">{title}</h2>
            {subtitle ? (
              <p className="section-card__subtitle">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="section-card__actions">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
