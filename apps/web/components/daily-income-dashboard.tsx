'use client';

import { Clock, Route, TrendingUp, WalletCards } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getJson } from '../lib/api-client';
import { getAccessToken } from '../lib/auth-storage';

interface Trip {
  id: string;
  durationMinutes?: number | null;
  totalIncome: string;
  totalKm: string;
  trueNetProfit: string;
}

interface Shift {
  id: string;
  activeMinutes?: number | null;
}

interface TripsResponse {
  data: Trip[];
  meta: {
    total: number;
  };
}

interface ShiftsResponse {
  data: Shift[];
}

interface DashboardMetrics {
  grossIncome: number;
  netProfit: number;
  totalKm: number;
  activeMinutes: number;
  tripCount: number;
}

const emptyMetrics: DashboardMetrics = {
  activeMinutes: 0,
  grossIncome: 0,
  netProfit: 0,
  totalKm: 0,
  tripCount: 0
};

export function DailyIncomeDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>(emptyMetrics);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDailyMetrics() {
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

      const today = getLocalDateInputValue();

      try {
        const [tripsResponse, shiftsResponse] = await Promise.all([
          getJson<TripsResponse>('/trips', {
            accessToken,
            query: {
              endDate: today,
              page: 1,
              pageSize: 100,
              sortBy: 'tripDate',
              sortDirection: 'desc',
              startDate: today
            }
          }),
          getJson<ShiftsResponse>('/shifts', {
            accessToken,
            query: {
              endDate: today,
              page: 1,
              pageSize: 50,
              sortBy: 'startedAt',
              sortDirection: 'desc',
              startDate: today
            }
          })
        ]);

        const nextMetrics = calculateMetrics(
          tripsResponse.data,
          shiftsResponse.data,
          tripsResponse.meta.total
        );

        if (isMounted) {
          setMetrics(nextMetrics);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Gunluk metrikler alinamadi.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDailyMetrics();

    return () => {
      isMounted = false;
    };
  }, []);

  const cards = useMemo(() => {
    const hourlyNetProfit =
      metrics.activeMinutes > 0 ? metrics.netProfit / (metrics.activeMinutes / 60) : 0;
    const netProfitPerKm = metrics.totalKm > 0 ? metrics.netProfit / metrics.totalKm : 0;

    if (needsLogin) {
      return [
        {
          detail: 'Oturum acildiginda bugunun verisi yuklenir',
          icon: WalletCards,
          label: 'Bugunku brut gelir',
          trend: 'Giris gerekli',
          value: '-'
        },
        {
          detail: 'Yakit, paket ve sabit giderler dusulur',
          icon: TrendingUp,
          label: 'Bugunku net kar',
          trend: 'Giris gerekli',
          value: '-'
        },
        {
          detail: 'Toplam km kayitlarindan hesaplanir',
          icon: Route,
          label: 'Km basi net kar',
          trend: 'Giris gerekli',
          value: '-'
        },
        {
          detail: 'Vardiya veya sefer suresinden hesaplanir',
          icon: Clock,
          label: 'Saatlik net kar',
          trend: 'Giris gerekli',
          value: '-'
        }
      ];
    }

    if (isLoading) {
      return [
        {
          detail: 'Bugunun seferleri kontrol ediliyor',
          icon: WalletCards,
          label: 'Bugunku brut gelir',
          trend: 'Yukleniyor',
          value: '...'
        },
        {
          detail: 'Net kar hesaplamasi hazirlaniyor',
          icon: TrendingUp,
          label: 'Bugunku net kar',
          trend: 'Yukleniyor',
          value: '...'
        },
        {
          detail: 'Km toplamlandi',
          icon: Route,
          label: 'Km basi net kar',
          trend: 'Yukleniyor',
          value: '...'
        },
        {
          detail: 'Aktif sure toplamlaniyor',
          icon: Clock,
          label: 'Saatlik net kar',
          trend: 'Yukleniyor',
          value: '...'
        }
      ];
    }

    if (error) {
      return [
        {
          detail: error,
          icon: WalletCards,
          label: 'Bugunku brut gelir',
          trend: 'API hatasi',
          value: '-'
        },
        {
          detail: 'Servis duzelince otomatik hesaplanir',
          icon: TrendingUp,
          label: 'Bugunku net kar',
          trend: 'Bekliyor',
          value: '-'
        },
        {
          detail: 'Km verisi alinamadi',
          icon: Route,
          label: 'Km basi net kar',
          trend: 'Bekliyor',
          value: '-'
        },
        {
          detail: 'Sure verisi alinamadi',
          icon: Clock,
          label: 'Saatlik net kar',
          trend: 'Bekliyor',
          value: '-'
        }
      ];
    }

    return [
      {
        detail: `${metrics.tripCount} sefer`,
        icon: WalletCards,
        label: 'Bugunku brut gelir',
        trend: metrics.tripCount > 0 ? 'Canli veri' : 'Kayit yok',
        value: formatMoney(metrics.grossIncome)
      },
      {
        detail: 'Sefer bazli hesaplanan true net kar',
        icon: TrendingUp,
        label: 'Bugunku net kar',
        trend: metrics.netProfit >= 0 ? 'Karda' : 'Zararda',
        value: formatMoney(metrics.netProfit)
      },
      {
        detail: `${formatNumber(metrics.totalKm)} km toplam kullanim`,
        icon: Route,
        label: 'Km basi net kar',
        trend: metrics.totalKm > 0 ? 'Hesaplandi' : 'Km gerekli',
        value: `${formatNumber(netProfitPerKm, 2)} TL`
      },
      {
        detail: `${formatDuration(metrics.activeMinutes)} aktif sure`,
        icon: Clock,
        label: 'Saatlik net kar',
        trend: metrics.activeMinutes > 0 ? 'Hesaplandi' : 'Sure gerekli',
        value: formatMoney(hourlyNetProfit)
      }
    ];
  }, [error, isLoading, metrics, needsLogin]);

  return (
    <section className="metric-grid" aria-label="Gunluk gelir metrikleri">
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

function calculateMetrics(trips: Trip[], shifts: Shift[], totalTripCount: number) {
  const tripMetrics = trips.reduce(
    (totals, trip) => ({
      activeMinutes: totals.activeMinutes + (trip.durationMinutes ?? 0),
      grossIncome: totals.grossIncome + toNumber(trip.totalIncome),
      netProfit: totals.netProfit + toNumber(trip.trueNetProfit),
      totalKm: totals.totalKm + toNumber(trip.totalKm)
    }),
    {
      activeMinutes: 0,
      grossIncome: 0,
      netProfit: 0,
      totalKm: 0
    }
  );

  const shiftActiveMinutes = shifts.reduce(
    (total, shift) => total + (shift.activeMinutes ?? 0),
    0
  );

  return {
    ...tripMetrics,
    activeMinutes: shiftActiveMinutes || tripMetrics.activeMinutes,
    tripCount: totalTripCount
  };
}

function getLocalDateInputValue() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;

  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
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
