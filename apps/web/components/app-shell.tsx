'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  Car,
  CalendarClock,
  Calculator,
  Download,
  Fuel,
  LayoutDashboard,
  Package,
  Receipt,
  ReceiptText,
  Settings,
  Target,
  Wallet,
  Wrench,
  type LucideIcon
} from 'lucide-react';

interface AppShellProps {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Genel',
    items: [{ label: 'Dashboard', href: '/', icon: LayoutDashboard }]
  },
  {
    title: 'Operasyon',
    items: [
      { label: 'Gelirler', href: '/income', icon: Wallet },
      { label: 'Giderler', href: '/expenses', icon: Receipt },
      { label: 'Sabit Gider', href: '/fixed-costs', icon: CalendarClock },
      { label: 'Amortisman', href: '/depreciation', icon: Calculator },
      { label: 'Yakit', href: '/fuel', icon: Fuel },
      { label: 'Araclar', href: '/vehicles', icon: Car },
      { label: 'Paketler', href: '/packages', icon: Package },
      { label: 'Bakim', href: '/maintenance', icon: Wrench }
    ]
  },
  {
    title: 'Analiz',
    items: [
      { label: 'Raporlar', href: '/reports', icon: ReceiptText },
      { label: 'Hedefler', href: '/goals', icon: Target },
      { label: 'Disa Aktar', href: '/exports', icon: Download }
    ]
  },
  {
    title: 'Sistem',
    items: [{ label: 'Ayarlar', href: '/settings', icon: Settings }]
  }
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
          {navSections.map((section) => (
            <div className="nav-section" key={section.title}>
              <p className="nav-section-title">{section.title}</p>
              <div className="nav-section-items">
                {section.items.map((item) => {
                  const isActive = isActivePath(pathname, item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      aria-current={isActive ? 'page' : undefined}
                      className={isActive ? 'nav-item active' : 'nav-item'}
                      href={item.href}
                      key={item.href}
                    >
                      <Icon aria-hidden="true" className="nav-item-icon" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
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

function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
