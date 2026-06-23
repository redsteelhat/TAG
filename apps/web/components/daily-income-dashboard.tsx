"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Calculator,
  Clock,
  FileSearch,
  Fuel,
  Gauge,
  PackageCheck,
  Plus,
  ReceiptText,
  Route,
  TrendingUp,
  WalletCards,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getJson } from "../lib/api-client";
import { getAccessToken } from "../lib/auth-storage";
import { EmptyState } from "./empty-state";

interface ProfitReport {
  activeMinutes: number;
  actualFuelEntryCount: number;
  activePackageCount: number;
  depreciation: string;
  directExpenseCount: number;
  fixedExpenses: string;
  fuelCost: string;
  grossIncome: string;
  maintenanceReserve: string;
  netProfit: string;
  recurringExpenseCount: number;
  tagPackageCost: string;
  totalCost: string;
  totalKm: string;
  tripCount: number;
}

interface BreakEvenReport {
  breakEvenProgressPercent: string;
  breakEvenRevenue: string;
  isBreakEvenReached: boolean;
  remainingRevenue: string;
  status: "IN_PROGRESS" | "NO_TARGET" | "REACHED";
}

interface DashboardTrip {
  dropoffLocation: string | null;
  grossIncome: string;
  id: string;
  netProfit: string;
  pickupLocation: string | null;
  startedAt: string | null;
  totalKm: string;
  tripDate: string;
}

interface ExpenseImpactItem {
  amount: string;
  key: string;
  label: string;
  percentage: number;
}

interface ShiftSummary {
  activeMinutes: number;
  activeShiftId: string | null;
  shiftCount: number;
  status: "ACTIVE" | "COMPLETED" | "NONE";
  totalKm: string;
  tripCount: number;
}

interface DashboardWarning {
  code: string;
  message: string;
}

interface DashboardAggregation {
  activeDuration: number;
  breakEvenProgress: string;
  breakEvenRemaining: string;
  breakEvenStatus: "IN_PROGRESS" | "NO_TARGET" | "REACHED";
  breakEvenTarget: string;
  depreciationCost: string;
  depreciationStatus: {
    effect: string;
    enabled: boolean;
    message: string;
  };
  expenseImpact: ExpenseImpactItem[];
  fixedCostShare: string;
  fuelCost: string;
  hasData: boolean;
  hourlyNetProfit: string;
  kmNetProfit: string;
  maintenanceReserve: string;
  packageShare: string;
  recentTrips: DashboardTrip[];
  shiftSummary: ShiftSummary;
  source: {
    api: string;
    dateField: string;
    period: string;
  };
  todayGrossIncome: string;
  todayNetProfit: string;
  todayTotalExpense: string;
  totalKm: string;
  warnings: DashboardWarning[];
}

interface ReportOverview {
  breakEven: BreakEvenReport;
  dailyProfit: ProfitReport;
  dashboard: DashboardAggregation;
  generatedAt: string;
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

const quickActions = [
  { label: "Sefer ekle", href: "/income", icon: Plus },
  { label: "Gider ekle", href: "/expenses", icon: ReceiptText },
  { label: "Yakıt ekle", href: "/fuel", icon: Fuel },
  { label: "Bakım ekle", href: "/maintenance", icon: Wrench },
];

const breakEvenStatusLabels: Record<
  DashboardAggregation["breakEvenStatus"],
  string
> = {
  IN_PROGRESS: "Devam ediyor",
  NO_TARGET: "Hedef tanımlı değil",
  REACHED: "Aşıldı",
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
        const response = await getJson<ReportOverviewResponse>(
          "/reports/overview",
          {
            accessToken,
            query: {
              date: today,
              month: today.slice(0, 7),
            },
          },
        );

        if (isMounted) {
          setOverview(response.data);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Ana panel metrikleri alınamadı.",
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
      return buildStateCards(
        "Giriş gerekli",
        "Oturum açıldığında ana panel verisi yüklenir",
      );
    }

    if (isLoading) {
      return buildStateCards(
        "Yükleniyor",
        "Finans motoru rapor özeti hesaplanıyor",
        "...",
      );
    }

    if (error || !overview) {
      return buildStateCards(
        "API hatası",
        error ?? "Ana panel metrikleri alınamadı",
      );
    }

    const dashboard = overview.dashboard;
    const netProfit = toNumber(dashboard.todayNetProfit);
    const totalKm = toNumber(dashboard.totalKm);
    const activeMinutes = dashboard.activeDuration ?? 0;
    const breakEvenProgress = clamp(
      toNumber(dashboard.breakEvenProgress),
      0,
      100,
    );

    return [
      {
        detail: `${dashboard.recentTrips.length} son kayıt / ${overview.dailyProfit.tripCount} sefer`,
        icon: WalletCards,
        label: "Bugünkü brüt gelir",
        trend: overview.dailyProfit.tripCount > 0 ? "Canlı rapor" : "Kayıt yok",
        value: formatMoneyValue(dashboard.todayGrossIncome),
      },
      {
        detail: "Yakıt, paket ve dağıtılmış giderler düşüldü",
        icon: TrendingUp,
        label: "Bugünkü net kâr",
        trend: netProfit >= 0 ? "Kârda" : "Zararda",
        value: formatMoneyValue(dashboard.todayNetProfit),
      },
      {
        detail: "Yakıt, paket, sabit gider, bakım ve amortisman",
        icon: ReceiptText,
        label: "Bugünkü toplam gider",
        trend: "Finans motoru",
        value: formatMoneyValue(dashboard.todayTotalExpense),
      },
      {
        detail: dashboard.depreciationStatus.message,
        icon: Calculator,
        label: "Amortisman etkisi",
        trend: dashboard.depreciationStatus.enabled
          ? "Gerçek kâr maliyeti"
          : "Nakit bazlı",
        value: dashboard.depreciationStatus.enabled
          ? `-${formatMoneyValue(dashboard.depreciationStatus.effect)}`
          : "Kapalı",
      },
      {
        detail:
          totalKm > 0
            ? `${formatNumber(totalKm)} km toplam kullanım`
            : "Veri yok",
        icon: Route,
        label: "Km başı net kâr",
        trend: totalKm > 0 ? "Hesaplandı" : "Km gerekli",
        value:
          totalKm > 0
            ? `${formatNumber(toNumber(dashboard.kmNetProfit), 2)} TL`
            : "Veri yok",
      },
      {
        detail:
          activeMinutes > 0
            ? `${formatDuration(activeMinutes)} aktif süre`
            : "Süre gerekli",
        icon: Clock,
        label: "Saatlik net kâr",
        trend: activeMinutes > 0 ? "Hesaplandı" : "Süre gerekli",
        value:
          activeMinutes > 0
            ? formatMoneyValue(dashboard.hourlyNetProfit)
            : "Veri yok",
      },
      {
        detail:
          dashboard.warnings.length > 0
            ? dashboard.warnings[0].message
            : "Seferlerden tahmini yakıt etkisi",
        icon: Fuel,
        label: "Yakıt maliyeti",
        trend:
          dashboard.warnings.length > 0 ? "Varsayım gerekli" : "Kârı azaltıyor",
        value: formatMoneyValue(dashboard.fuelCost),
      },
      {
        detail: `Kalan: ${formatMoneyValue(dashboard.breakEvenRemaining)}`,
        icon: Gauge,
        label: "Başabaş durumu",
        trend: breakEvenStatusLabels[dashboard.breakEvenStatus],
        value: `%${formatNumber(breakEvenProgress, 0)}`,
      },
      {
        detail: `Eşik: ${formatMoneyValue(dashboard.breakEvenTarget)}`,
        icon: PackageCheck,
        label: "Paket / operasyon payı",
        trend: toNumber(dashboard.packageShare) > 0 ? "Dağıtıldı" : "Paket yok",
        value: formatMoneyValue(dashboard.packageShare),
      },
    ] satisfies MetricCard[];
  }, [error, isLoading, needsLogin, overview]);

  if (needsLogin) {
    return (
      <section className="panel empty-state-panel">
        <EmptyState
          actionHref="/login"
          actionLabel="Giriş yap"
          description="Günlük metrikler, son seferler ve gider etkisi gerçek kayıtlarından hesaplanır."
          eyebrow="Oturum gerekli"
          icon={FileSearch}
          title="Ana panel verilerini görmek için giriş yap."
        />
      </section>
    );
  }

  return (
    <>
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

      {error ? <p className="form-alert">{error}</p> : null}

      {!isLoading && overview && !overview.dashboard.hasData ? (
        <section className="panel empty-state-panel">
          <EmptyState
            actionHref="/income"
            actionLabel="İlk seferi ekle"
            description="Bugün için sefer, gider, yakıt veya paket kaydı yok. Demo veri gösterilmez; ana panel gerçek günlük kayıtlarla dolar."
            eyebrow="Bugün kayıt yok"
            icon={FileSearch}
            title="Ana panel için gerçek kayıt bekleniyor."
            tips={[
              "Sefer ekle",
              "Yakıt veya gider ekle",
              "Paket payını tanımla",
            ]}
          />
        </section>
      ) : null}

      {overview ? <DashboardDetails dashboard={overview.dashboard} /> : null}
    </>
  );
}

function DashboardDetails({ dashboard }: { dashboard: DashboardAggregation }) {
  return (
    <>
      {dashboard.warnings.length > 0 ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Uyarılar</p>
              <h2>Hesaplama varsayımları</h2>
            </div>
            <AlertTriangle aria-hidden="true" className="panel-icon" />
          </div>
          <div className="break-even-list">
            {dashboard.warnings.map((warning) => (
              <div className="expense-row" key={warning.code}>
                <span>{warning.message}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="dashboard-grid">
        <div className="dashboard-main">
          <section className="panel break-even-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Başabaş</p>
                <h2>Paket ve günlük maliyet eşiği</h2>
              </div>
              <span className="status-pill">
                {breakEvenStatusLabels[dashboard.breakEvenStatus]}
              </span>
            </div>

            <div className="break-even-summary">
              <strong>{formatMoneyValue(dashboard.breakEvenTarget)}</strong>
              <span>Bugün kâra geçmek için gereken minimum gelir</span>
            </div>
            <div
              aria-label="Başabaş ilerlemesi"
              className="progress-track"
              role="progressbar"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={Math.round(
                clamp(toNumber(dashboard.breakEvenProgress), 0, 100),
              )}
            >
              <span
                style={{
                  width: `${clamp(toNumber(dashboard.breakEvenProgress), 0, 100)}%`,
                }}
              />
            </div>
            <div className="break-even-list">
              {[
                ["Paket payı", dashboard.packageShare],
                ["Yakıt", dashboard.fuelCost],
                ["Sabit gider", dashboard.fixedCostShare],
                ["Bakım rezervi", dashboard.maintenanceReserve],
                ["Amortisman", dashboard.depreciationCost],
              ].map(([name, amount]) => (
                <div className="expense-row" key={name}>
                  <span>{name}</span>
                  <strong>{formatMoneyValue(amount)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Son kayıtlar</p>
                <h2>Sefer kârlılığı</h2>
              </div>
              <Link className="text-link" href="/income">
                Tüm gelirler
              </Link>
            </div>
            {dashboard.recentTrips.length > 0 ? (
              <div className="trip-table" role="table" aria-label="Seferler">
                {dashboard.recentTrips.map((trip) => (
                  <div className="trip-row" role="row" key={trip.id}>
                    <span>{formatTripTime(trip)}</span>
                    <strong>{formatRoute(trip)}</strong>
                    <span>{formatNumber(toNumber(trip.totalKm), 1)} km</span>
                    <span>{formatMoneyValue(trip.grossIncome)}</span>
                    <b>{formatMoneyValue(trip.netProfit)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                actionHref="/income"
                actionLabel="Sefer ekle"
                description="Seçili gün için sefer kaydı bulunmadığı için son kayıt listesi boş."
                icon={FileSearch}
                title="Bugün sefer kaydı yok."
              />
            )}
          </section>
        </div>

        <aside className="dashboard-side">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Hızlı kayıt</p>
                <h2>Operasyon aksiyonları</h2>
              </div>
            </div>
            <div className="quick-action-grid">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    className="quick-action"
                    href={action.href}
                    key={action.href}
                  >
                    <Icon aria-hidden="true" />
                    <span>{action.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Gider etkisi</p>
                <h2>Kâr eriten kalemler</h2>
              </div>
            </div>
            {dashboard.expenseImpact.length > 0 ? (
              <div className="cost-stack">
                {dashboard.expenseImpact.map((item) => (
                  <div className="cost-row" key={item.key}>
                    <div>
                      <span>{item.label}</span>
                      <strong>{formatMoneyValue(item.amount)}</strong>
                    </div>
                    <div className="mini-bar">
                      <span style={{ width: `${item.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                actionHref="/expenses"
                actionLabel="Gider ekle"
                description="Bugün için yakıt, paket, sabit gider, bakım veya amortisman etkisi hesaplanmadı."
                icon={BarChart3}
                title="Gider etkisi yok."
              />
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Vardiya</p>
                <h2>Aktif çalışma özeti</h2>
              </div>
              <Gauge aria-hidden="true" className="panel-icon" />
            </div>
            <div className="shift-summary">
              <div>
                <span>Süre</span>
                <strong>
                  {dashboard.shiftSummary.activeMinutes > 0
                    ? formatDuration(dashboard.shiftSummary.activeMinutes)
                    : "Süre gerekli"}
                </strong>
              </div>
              <div>
                <span>Toplam km</span>
                <strong>
                  {toNumber(dashboard.shiftSummary.totalKm) > 0
                    ? `${formatNumber(toNumber(dashboard.shiftSummary.totalKm), 1)} km`
                    : "Veri yok"}
                </strong>
              </div>
              <div>
                <span>Sefer</span>
                <strong>{dashboard.shiftSummary.tripCount}</strong>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </>
  );
}

function buildStateCards(
  trend: string,
  detail: string,
  value = "-",
): MetricCard[] {
  return [
    {
      detail,
      icon: WalletCards,
      label: "Bugünkü brüt gelir",
      trend,
      value,
    },
    {
      detail,
      icon: TrendingUp,
      label: "Bugünkü net kâr",
      trend,
      value,
    },
    {
      detail,
      icon: ReceiptText,
      label: "Bugünkü toplam gider",
      trend,
      value,
    },
    {
      detail,
      icon: Route,
      label: "Km başı net kâr",
      trend,
      value,
    },
    {
      detail,
      icon: Clock,
      label: "Saatlik net kâr",
      trend,
      value,
    },
    {
      detail,
      icon: Fuel,
      label: "Yakıt maliyeti",
      trend,
      value,
    },
    {
      detail,
      icon: Gauge,
      label: "Başabaş durumu",
      trend,
      value,
    },
    {
      detail,
      icon: PackageCheck,
      label: "Paket / operasyon payı",
      trend,
      value,
    },
  ];
}

function getLocalDateInputValue() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;

  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function formatTripTime(trip: DashboardTrip) {
  const date = trip.startedAt ?? trip.tripDate;

  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatRoute(trip: DashboardTrip) {
  if (trip.pickupLocation || trip.dropoffLocation) {
    return `${trip.pickupLocation ?? "Başlangıç yok"} - ${trip.dropoffLocation ?? "Bitiş yok"}`;
  }

  return "Lokasyon girilmedi";
}

function formatMoneyValue(value: string | number | null | undefined) {
  return formatMoney(toNumber(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    currency: "TRY",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
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
