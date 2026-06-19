'use client';

import {
  Clock,
  Fuel,
  Gauge,
  PackageCheck,
  ReceiptText,
  Route,
  TrendingUp,
  WalletCards
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getJson } from '../lib/api-client';
import { getAccessToken } from '../lib/auth-storage';

interface ProfitReport {
  activeMinutes: number;
  fuelCost: string;
  grossIncome: string;
  netProfit: string;
  tagPackageCost: string;
  totalCost: string;
  totalKm: string;
  tripCount: number;
}

interface KmProfitabilityReport {
  netProfitPerKm: string;
}

interface HourlyProfitabilityReport {
  netProfitPerHour: string;
}

interface BreakEvenReport {
  breakEvenProgressPercent: string;
  breakEvenRevenue: string;
  isBreakEvenReached: boolean;
  remainingRevenue: string;
}

interface ReportOverview {
  breakEven: BreakEvenReport;
  dailyProfit: ProfitReport;
  generatedAt: string;
  hourlyProfitability: HourlyProfitabilityReport;
  kmProfitability: KmProfitabilityReport;
}

interface ReportOverviewResponse {
  data: ReportOverview;
}

type MetricCard = {
  detail: string;
  icon: typeof WalletCards;
  label: string;
  trend: string;
  value: string;
};

export function DailyIncomeDashboard() {
  const [overview, setOverview] = useState<ReportOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardMetrics() {
      const accessToken = getAccessToken();

      if (!accessToken) {
        if (isMounted) {
          setNeedsLogin(true);
          setIsLoading(false);
        }

        return;
      }

      setIsLoading(true);
      setError(null);
      setNeedsLogin(false);

      try {
        const today = getLocalDateInputValue();
        const response = await getJson<ReportOverviewResponse>('/reports/overview', {
          accessToken,
          query: {
            date: today,
            month: today.slice(0, 7)
          }
        });

        if (isMounted) {
          setOverview(response.data);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Dashboard metrikleri alinamadi.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboardMetrics();

    return () => {
      isMounted = false;
    };
  }, []);

  const cards = useMemo(() => {
    if (needsLogin) {
      return buildStateCards('Giris gerekli', 'Oturum acildiginda dashboard verisi yuklenir');
    }

    if (isLoading) {
      return buildStateCards('Yukleniyor', 'Finans motoru rapor ozeti hesaplaniyor', '...');
    }

    if (error || !overview) {
      return buildStateCards('API hatasi', error ?? 'Dashboard metrikleri alinamadi');
    }

    const daily = overview.dailyProfit;
    const breakEven = overview.breakEven;
    const netProfit = toNumber(daily.netProfit);
    const totalKm = toNumber(daily.totalKm);
    const activeMinutes = daily.activeMinutes ?? 0;
    const breakEvenProgress = clamp(toNumber(breakEven.breakEvenProgressPercent), 0, 999);

    return [
      {
        detail: `${daily.tripCount} sefer`,
        icon: WalletCards,
        label: 'Bugunku brut gelir',
        trend: daily.tripCount > 0 ? 'Canli rapor' : 'Kayit yok',
        value: formatMoneyValue(daily.grossIncome)
      },
      {
        detail: 'Yakit, paket ve dagitilmis giderler dusuldu',
        icon: TrendingUp,
        label: 'Bugunku net kar',
        trend: netProfit >= 0 ? 'Karda' : 'Zararda',
        value: formatMoneyValue(daily.netProfit)
      },
      {
        detail: 'Toplam finans motoru gideri',
        icon: ReceiptText,
        label: 'Bugunku toplam gider',
        trend: 'Yaklasik maliyet',
        value: formatMoneyValue(daily.totalCost)
      },
      {
        detail: `${formatNumber(totalKm)} km toplam kullanim`,
        icon: Route,
        label: 'Km basi net kar',
        trend: totalKm > 0 ? 'Hesaplandi' : 'Km gerekli',
        value: `${formatNumber(toNumber(overview.kmProfitability.netProfitPerKm), 2)} TL`
      },
      {
        detail: `${formatDuration(activeMinutes)} aktif sure`,
        icon: Clock,
        label: 'Saatlik net kar',
        trend: activeMinutes > 0 ? 'Hesaplandi' : 'Sure gerekli',
        value: formatMoneyValue(overview.hourlyProfitability.netProfitPerHour)
      },
      {
        detail: 'Seferlerden tahmini yakit etkisi',
        icon: Fuel,
        label: 'Yakit maliyeti',
        trend: 'Kar eritici',
        value: formatMoneyValue(daily.fuelCost)
      },
      {
        detail: `Kalan: ${formatMoneyValue(breakEven.remainingRevenue)}`,
        icon: Gauge,
        label: 'Break-even durumu',
        trend: breakEven.isBreakEvenReached ? 'Paket cikti' : 'Kara gecmedi',
        value: `%${formatNumber(breakEvenProgress, 0)}`
      },
      {
        detail: `Esik: ${formatMoneyValue(breakEven.breakEvenRevenue)}`,
        icon: PackageCheck,
        label: 'Paket / operasyon payi',
        trend: toNumber(daily.tagPackageCost) > 0 ? 'Dagitildi' : 'Paket yok',
        value: formatMoneyValue(daily.tagPackageCost)
      }
    ] satisfies MetricCard[];
  }, [error, isLoading, needsLogin, overview]);

  return (
    <section className="metric-grid" aria-label="Gunluk dashboard metrikleri">
      {cards.map((metric) => {
        const Icon = metric.icon;

        return (
          <article className="metric-card" key={metric.label}>
            <div className="metric-card-header">
              <p>{metric.label}</p>
              <Icon aria-hidden="true" className="metric-icon" />
            </div>
            <strong>{metric.value}</strong>
            <span>{metric.detail}</span>
            <small>{metric.trend}</small>
          </article>
        );
      })}
    </section>
  );
}

function buildStateCards(trend: string, detail: string, value = '-'): MetricCard[] {
  return [
    {
      detail,
      icon: WalletCards,
      label: 'Bugunku brut gelir',
      trend,
      value
    },
    {
      detail,
      icon: TrendingUp,
      label: 'Bugunku net kar',
      trend,
      value
    },
    {
      detail,
      icon: ReceiptText,
      label: 'Bugunku toplam gider',
      trend,
      value
    },
    {
      detail,
      icon: Route,
      label: 'Km basi net kar',
      trend,
      value
    },
    {
      detail,
      icon: Clock,
      label: 'Saatlik net kar',
      trend,
      value
    },
    {
      detail,
      icon: Fuel,
      label: 'Yakit maliyeti',
      trend,
      value
    },
    {
      detail,
      icon: Gauge,
      label: 'Break-even durumu',
      trend,
      value
    },
    {
      detail,
      icon: PackageCheck,
      label: 'Paket / operasyon payi',
      trend,
      value
    }
  ];
}

function getLocalDateInputValue() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;

  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function formatMoneyValue(value: string | number | null | undefined) {
  return formatMoney(toNumber(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    currency: 'TRY',
    maximumFractionDigits: 0,
    style: 'currency'
  }).format(value);
}

function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits,
    minimumFractionDigits: 0
  }).format(value);
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  return `${hours}s ${remainingMinutes}d`;
}

function toNumber(value: string | number | null | undefined) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
