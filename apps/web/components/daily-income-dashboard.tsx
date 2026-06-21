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
              : 'Ana panel metrikleri alınamadı.'
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
      return buildStateCards('Giriş gerekli', 'Oturum açıldığında ana panel verisi yüklenir');
    }

    if (isLoading) {
      return buildStateCards('Yükleniyor', 'Finans motoru rapor özeti hesaplanıyor', '...');
    }

    if (error || !overview) {
      return buildStateCards('API hatası', error ?? 'Ana panel metrikleri alınamadı');
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
        label: 'Bugünkü brüt gelir',
        trend: daily.tripCount > 0 ? 'Canlı rapor' : 'Kayıt yok',
        value: formatMoneyValue(daily.grossIncome)
      },
      {
        detail: 'Yakıt, paket ve dağıtılmış giderler düşüldü',
        icon: TrendingUp,
        label: 'Bugünkü net kâr',
        trend: netProfit >= 0 ? 'Kârda' : 'Zararda',
        value: formatMoneyValue(daily.netProfit)
      },
      {
        detail: 'Toplam finans motoru gideri',
        icon: ReceiptText,
        label: 'Bugünkü toplam gider',
        trend: 'Yaklaşık maliyet',
        value: formatMoneyValue(daily.totalCost)
      },
      {
        detail: `${formatNumber(totalKm)} km toplam kullanım`,
        icon: Route,
        label: 'Km başı net kâr',
        trend: totalKm > 0 ? 'Hesaplandı' : 'Km gerekli',
        value: `${formatNumber(toNumber(overview.kmProfitability.netProfitPerKm), 2)} TL`
      },
      {
        detail: `${formatDuration(activeMinutes)} aktif süre`,
        icon: Clock,
        label: 'Saatlik net kâr',
        trend: activeMinutes > 0 ? 'Hesaplandı' : 'Süre gerekli',
        value: formatMoneyValue(overview.hourlyProfitability.netProfitPerHour)
      },
      {
        detail: 'Seferlerden tahmini yakıt etkisi',
        icon: Fuel,
        label: 'Yakıt maliyeti',
        trend: 'Kârı azaltıyor',
        value: formatMoneyValue(daily.fuelCost)
      },
      {
        detail: `Kalan: ${formatMoneyValue(breakEven.remainingRevenue)}`,
        icon: Gauge,
        label: 'Başabaş durumu',
        trend: breakEven.isBreakEvenReached ? 'Paket çıktı' : 'Kâra geçmedi',
        value: `%${formatNumber(breakEvenProgress, 0)}`
      },
      {
        detail: `Eşik: ${formatMoneyValue(breakEven.breakEvenRevenue)}`,
        icon: PackageCheck,
        label: 'Paket / operasyon payı',
        trend: toNumber(daily.tagPackageCost) > 0 ? 'Dağıtıldı' : 'Paket yok',
        value: formatMoneyValue(daily.tagPackageCost)
      }
    ] satisfies MetricCard[];
  }, [error, isLoading, needsLogin, overview]);

  return (
    <section className="metric-grid" aria-label="Günlük ana panel metrikleri">
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
      label: 'Bugünkü brüt gelir',
      trend,
      value
    },
    {
      detail,
      icon: TrendingUp,
      label: 'Bugünkü net kâr',
      trend,
      value
    },
    {
      detail,
      icon: ReceiptText,
      label: 'Bugünkü toplam gider',
      trend,
      value
    },
    {
      detail,
      icon: Route,
      label: 'Km başı net kâr',
      trend,
      value
    },
    {
      detail,
      icon: Clock,
      label: 'Saatlik net kâr',
      trend,
      value
    },
    {
      detail,
      icon: Fuel,
      label: 'Yakıt maliyeti',
      trend,
      value
    },
    {
      detail,
      icon: Gauge,
      label: 'Başabaş durumu',
      trend,
      value
    },
    {
      detail,
      icon: PackageCheck,
      label: 'Paket / operasyon payı',
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
