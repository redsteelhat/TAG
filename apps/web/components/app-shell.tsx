"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Car,
  BellRing,
  CalendarClock,
  Calculator,
  Download,
  Fuel,
  ListChecks,
  LayoutDashboard,
  Menu,
  Package,
  Receipt,
  ReceiptText,
  Settings,
  ShieldCheck,
  Target,
  Wallet,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { getStoredUserRole, isAdminRole } from "../lib/auth-storage";

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
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Genel",
    items: [
      { label: "Ana Panel", href: "/", icon: LayoutDashboard },
      { label: "Kurulum", href: "/onboarding", icon: ListChecks },
    ],
  },
  {
    title: "Operasyon",
    items: [
      { label: "Gelirler", href: "/income", icon: Wallet },
      { label: "Giderler", href: "/expenses", icon: Receipt },
      { label: "Sabit Gider", href: "/fixed-costs", icon: CalendarClock },
      { label: "Amortisman", href: "/depreciation", icon: Calculator },
      { label: "Yakıt", href: "/fuel", icon: Fuel },
      { label: "Araçlar", href: "/vehicles", icon: Car },
      { label: "Paketler", href: "/packages", icon: Package },
      { label: "Bakım", href: "/maintenance", icon: Wrench },
    ],
  },
  {
    title: "Analiz",
    items: [
      { label: "Raporlar", href: "/reports", icon: ReceiptText },
      { label: "Hedefler", href: "/goals", icon: Target },
      { label: "Hatırlatıcılar", href: "/reminders", icon: BellRing },
      { label: "Dışa Aktar", href: "/exports", icon: Download },
    ],
  },
  {
    title: "Sistem",
    items: [
      { label: "Admin", href: "/admin", icon: ShieldCheck, adminOnly: true },
      { label: "Ayarlar", href: "/settings", icon: Settings },
    ],
  },
];

export function AppShell({ eyebrow, title, actions, children }: AppShellProps) {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setRole(getStoredUserRole());
  }, []);
  const canSeeAdmin = isAdminRole(role);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <main className="app-shell">
      {isSidebarOpen ? (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}

      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`} aria-label="Ana navigasyon">
        <div className="sidebar-header-mobile">
          <button className="icon-button" onClick={() => setIsSidebarOpen(false)} type="button" aria-label="Menüyü kapat">
            <X aria-hidden="true" />
          </button>
        </div>

        <Link className="brand" href="/">
          <span className="brand-mark">TF</span>
          <div>
            <p className="brand-name">TAG Finans</p>
            <p className="brand-subtitle">Sürücü operasyon paneli</p>
          </div>
        </Link>

        <nav className="nav-list">
          {navSections.map((section) => {
            const visibleItems = section.items.filter(
              (item) => !item.adminOnly || canSeeAdmin,
            );

            if (visibleItems.length === 0) {
              return null;
            }

            return (
              <div className="nav-section" key={section.title}>
                <p className="nav-section-title">{section.title}</p>
                <div className="nav-section-items">
                  {visibleItems.map((item) => {
                    const isActive = isActivePath(pathname, item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        aria-current={isActive ? "page" : undefined}
                        className={isActive ? "nav-item active" : "nav-item"}
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
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-footer-label">MVP odağı</span>
          <strong>Gerçek net kâr hesabı</strong>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-title-wrapper">
            <button
              className="mobile-menu-toggle"
              onClick={() => setIsSidebarOpen(true)}
              type="button"
              aria-label="Menüyü aç"
            >
              <Menu aria-hidden="true" />
            </button>
            <div>
              <p className="eyebrow">{eyebrow}</p>
              <h1>{title}</h1>
            </div>
          </div>
          {actions ? <div className="actions">{actions}</div> : null}
        </header>

        {children}
      </section>
    </main>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
