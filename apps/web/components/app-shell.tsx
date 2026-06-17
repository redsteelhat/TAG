'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface AppShellProps {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Gelirler', href: '/income' },
  { label: 'Giderler', href: '/expenses' },
  { label: 'Yakit', href: '/fuel' },
  { label: 'Paketler', href: '/packages' },
  { label: 'Raporlar', href: '/reports' }
];

export function AppShell({ eyebrow, title, actions, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Ana navigasyon">
        <Link className="brand" href="/">
          <span className="brand-mark">TF</span>
          <div>
            <p className="brand-name">TAG Finans</p>
            <p className="brand-subtitle">Surucu operasyon paneli</p>
          </div>
        </Link>

        <nav className="nav-list">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={isActive ? 'nav-item active' : 'nav-item'}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-footer-label">MVP odagi</span>
          <strong>Gercek net kar hesabi</strong>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
          </div>
          {actions ? <div className="actions">{actions}</div> : null}
        </header>

        {children}
      </section>
    </main>
  );
}
