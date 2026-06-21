import Link from 'next/link';
import { AppShell } from './app-shell';

interface ModulePlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  primaryActionLabel: string;
}

export function ModulePlaceholder({
  eyebrow,
  title,
  description,
  primaryActionLabel
}: ModulePlaceholderProps) {
  return (
    <AppShell
      actions={
        <>
          <Link className="secondary-button button-link" href="/">
            Ana Panel
          </Link>
          <button className="primary-button" type="button">
            {primaryActionLabel}
          </button>
        </>
      }
      eyebrow={eyebrow}
      title={title}
    >
      <section className="module-placeholder">
        <div>
          <p className="eyebrow">Sprint 1 navigasyon</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </section>
    </AppShell>
  );
}
