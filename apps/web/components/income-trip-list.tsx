'use client';

import {
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Plus,
  RefreshCw,
  Search
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getJson } from '../lib/api-client';
import { getAccessToken } from '../lib/auth-storage';

type PaymentMethod = 'CASH' | 'CARD' | 'DIGITAL' | 'MIXED' | 'OTHER';
type SortDirection = 'asc' | 'desc';
type TripSortBy =
  | 'createdAt'
  | 'totalIncome'
  | 'totalKm'
  | 'tripDate'
  | 'trueNetProfit';

interface Trip {
  id: string;
  tripDate: string;
  startedAt?: string | null;
  endedAt?: string | null;
  durationMinutes?: number | null;
  totalIncome: string;
  grossIncome: string;
  tipAmount: string;
  cancellationIncome: string;
  paymentMethod: PaymentMethod;
  pickupLocation?: string | null;
  dropoffLocation?: string | null;
  totalKm: string;
  estimatedFuelCost: string;
  cashNetProfit: string;
  trueNetProfit: string;
  note?: string | null;
}

interface TripsResponse {
  data: Trip[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface TripFilterValues {
  endDate: string;
  paymentMethod: string;
  q: string;
  sortBy: TripSortBy;
  sortDirection: SortDirection;
  startDate: string;
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CARD: 'Kart',
  CASH: 'Nakit',
  DIGITAL: 'Dijital',
  MIXED: 'Karma',
  OTHER: 'Diger'
};

const sortOptions: Array<{ label: string; value: TripSortBy }> = [
  { label: 'Sefer tarihi', value: 'tripDate' },
  { label: 'Olusturma tarihi', value: 'createdAt' },
  { label: 'Gelir', value: 'totalIncome' },
  { label: 'Km', value: 'totalKm' },
  { label: 'Net kar', value: 'trueNetProfit' }
];

export function IncomeTripList() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [meta, setMeta] = useState<TripsResponse['meta'] | null>(null);
  const [q, setQ] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [sortBy, setSortBy] = useState<TripSortBy>('tripDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const pageMetrics = useMemo(() => {
    return trips.reduce(
      (totals, trip) => ({
        grossIncome: totals.grossIncome + toNumber(trip.totalIncome),
        netProfit: totals.netProfit + toNumber(trip.trueNetProfit),
        totalKm: totals.totalKm + toNumber(trip.totalKm),
        fuelCost: totals.fuelCost + toNumber(trip.estimatedFuelCost)
      }),
      {
        fuelCost: 0,
        grossIncome: 0,
        netProfit: 0,
        totalKm: 0
      }
    );
  }, [trips]);

  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void fetchTrips(accessToken);
  }, [accessToken, page, sortBy, sortDirection]);

  async function fetchTrips(
    token = accessToken,
    pageToLoad = page,
    filters: TripFilterValues = {
      endDate,
      paymentMethod,
      q,
      sortBy,
      sortDirection,
      startDate
    }
  ) {
    if (!token) {
      setMessage('Sefer listesini gormek icin once giris yapmalisin.');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await getJson<TripsResponse>('/trips', {
        accessToken: token,
        query: {
          endDate: filters.endDate,
          page: pageToLoad,
          pageSize: 10,
          paymentMethod: filters.paymentMethod || undefined,
          q: filters.q.trim() || undefined,
          sortBy: filters.sortBy,
          sortDirection: filters.sortDirection,
          startDate: filters.startDate
        }
      });

      setTrips(response.data);
      setMeta(response.meta);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Seferler yuklenemedi.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void fetchTrips(accessToken, 1);
  }

  function clearFilters() {
    const clearedFilters: TripFilterValues = {
      endDate: '',
      paymentMethod: '',
      q: '',
      sortBy: 'tripDate',
      sortDirection: 'desc',
      startDate: ''
    };

    setQ('');
    setStartDate('');
    setEndDate('');
    setPaymentMethod('');
    setSortBy('tripDate');
    setSortDirection('desc');
    setPage(1);
    void fetchTrips(accessToken, 1, clearedFilters);
  }

  if (!accessToken) {
    return (
      <section className="panel empty-state-panel">
        <p className="eyebrow">Oturum gerekli</p>
        <h2>Gelir ve sefer listesini gormek icin giris yap.</h2>
        <p>Token bulunamadigi icin API’den sefer verisi cekilmedi.</p>
      </section>
    );
  }

  return (
    <section className="income-list-page">
      <section className="metric-grid income-metrics" aria-label="Sayfa ozeti">
        <MetricCard
          label="Goruntulenen gelir"
          value={formatMoney(pageMetrics.grossIncome)}
        />
        <MetricCard
          label="Goruntulenen net kar"
          value={formatMoney(pageMetrics.netProfit)}
        />
        <MetricCard
          label="Goruntulenen km"
          value={`${formatNumber(pageMetrics.totalKm)} km`}
        />
        <MetricCard
          label="Yakit etkisi"
          value={formatMoney(pageMetrics.fuelCost)}
        />
      </section>

      <section className="panel">
        <form className="list-toolbar" onSubmit={handleFilterSubmit}>
          <label className="toolbar-search">
            <Search aria-hidden="true" />
            <input
              onChange={(event) => setQ(event.target.value)}
              placeholder="Lokasyon veya not ara"
              value={q}
            />
          </label>

          <label>
            Baslangic
            <input
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
          </label>

          <label>
            Bitis
            <input
              onChange={(event) => setEndDate(event.target.value)}
              type="date"
              value={endDate}
            />
          </label>

          <label>
            Odeme
            <select
              onChange={(event) => setPaymentMethod(event.target.value)}
              value={paymentMethod}
            >
              <option value="">Tum odemeler</option>
              {Object.entries(paymentMethodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Sirala
            <select
              onChange={(event) => setSortBy(event.target.value as TripSortBy)}
              value={sortBy}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Yon
            <select
              onChange={(event) =>
                setSortDirection(event.target.value as SortDirection)
              }
              value={sortDirection}
            >
              <option value="desc">Azalan</option>
              <option value="asc">Artan</option>
            </select>
          </label>

          <div className="toolbar-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={clearFilters}
            >
              <ListFilter aria-hidden="true" className="button-icon" />
              Temizle
            </button>
            <button className="primary-button" disabled={isLoading}>
              <RefreshCw aria-hidden="true" className="button-icon" />
              {isLoading ? 'Yukleniyor' : 'Filtrele'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel income-table-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Sefer kayitlari</p>
            <h2>Gelir/sefer listesi</h2>
          </div>
          <span className="status-pill">
            {meta ? `${meta.total} kayit` : 'Hazirlaniyor'}
          </span>
        </div>

        {message ? <p className="form-alert">{message}</p> : null}

        {trips.length > 0 ? (
          <div className="data-table" role="table" aria-label="Gelir seferleri">
            <div className="data-table-row data-table-head" role="row">
              <span>Tarih</span>
              <span>Rota</span>
              <span>Odeme</span>
              <span>Km</span>
              <span>Gelir</span>
              <span>Yakit</span>
              <span>Net kar</span>
            </div>

            {trips.map((trip) => (
              <div className="data-table-row" role="row" key={trip.id}>
                <span>
                  <strong>{formatDate(trip.tripDate)}</strong>
                  <small>{formatTime(trip.startedAt)}</small>
                </span>
                <span>
                  <strong>{formatRoute(trip)}</strong>
                  <small>{trip.note || 'Not yok'}</small>
                </span>
                <span>{paymentMethodLabels[trip.paymentMethod]}</span>
                <span>{formatNumber(toNumber(trip.totalKm))} km</span>
                <span>{formatMoney(toNumber(trip.totalIncome))}</span>
                <span>{formatMoney(toNumber(trip.estimatedFuelCost))}</span>
                <b>{formatMoney(toNumber(trip.trueNetProfit))}</b>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-panel compact">
            <Plus aria-hidden="true" className="panel-icon" />
            <h2>Henuz sefer kaydi yok.</h2>
            <p>
              Sefer ekleme ekrani tamamlandiginda yeni gelir kayitlari burada
              listelenecek.
            </p>
          </div>
        )}

        <div className="pagination-bar">
          <button
            className="secondary-button"
            disabled={!meta?.hasPreviousPage || isLoading}
            onClick={() =>
              setPage((currentPage) => Math.max(1, currentPage - 1))
            }
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="button-icon" />
            Onceki
          </button>
          <span>
            Sayfa {meta?.page ?? page} / {meta?.totalPages || 1}
          </span>
          <button
            className="secondary-button"
            disabled={!meta?.hasNextPage || isLoading}
            onClick={() => setPage((currentPage) => currentPage + 1)}
            type="button"
          >
            Sonraki
            <ChevronRight aria-hidden="true" className="button-icon trailing" />
          </button>
        </div>
      </section>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <div className="metric-card-header">
        <p>{label}</p>
      </div>
      <strong>{value}</strong>
      <span>Aktif filtre ve sayfa kapsaminda</span>
    </article>
  );
}

function formatRoute(trip: Trip) {
  const pickup = trip.pickupLocation || 'Baslangic yok';
  const dropoff = trip.dropoffLocation || 'Bitis yok';

  return `${pickup} - ${dropoff}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short'
  }).format(new Date(value));
}

function formatTime(value?: string | null) {
  if (!value) {
    return 'Saat yok';
  }

  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    currency: 'TRY',
    maximumFractionDigits: 0,
    style: 'currency'
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: 1
  }).format(value);
}

function toNumber(value: string) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}
