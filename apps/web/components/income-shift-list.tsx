'use client';

import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  ListFilter,
  RefreshCw
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { EmptyState } from './empty-state';
import { getJson } from '../lib/api-client';
import { getAccessToken } from '../lib/auth-storage';

type ShiftStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELED';
type SortDirection = 'asc' | 'desc';
type ShiftSortBy =
  | 'createdAt'
  | 'grossIncome'
  | 'startedAt'
  | 'totalKm'
  | 'trueNetProfit';

interface Shift {
  id: string;
  vehicleId: string;
  startedAt: string;
  endedAt?: string | null;
  startOdometerKm?: string | null;
  endOdometerKm?: string | null;
  totalKm?: string | null;
  activeMinutes?: number | null;
  status: ShiftStatus;
  grossIncome: string;
  cashNetProfit: string;
  trueNetProfit: string;
  note?: string | null;
}

interface Vehicle {
  id: string;
  plateNumber: string;
  brand?: string | null;
  model?: string | null;
}

interface VehiclesResponse {
  data: Vehicle[];
}

interface ShiftsResponse {
  data: Shift[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface ShiftFilterValues {
  endDate: string;
  q: string;
  sortBy: ShiftSortBy;
  sortDirection: SortDirection;
  startDate: string;
  status: string;
  vehicleId: string;
}

const statusLabels: Record<ShiftStatus, string> = {
  ACTIVE: 'Aktif',
  CANCELED: 'Iptal',
  COMPLETED: 'Tamamlandi'
};

const shiftSortOptions: Array<{ label: string; value: ShiftSortBy }> = [
  { label: 'Baslangic', value: 'startedAt' },
  { label: 'Olusturma', value: 'createdAt' },
  { label: 'Brut gelir', value: 'grossIncome' },
  { label: 'Toplam km', value: 'totalKm' },
  { label: 'Net kar', value: 'trueNetProfit' }
];

export function IncomeShiftList() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [meta, setMeta] = useState<ShiftsResponse['meta'] | null>(null);
  const [vehicleId, setVehicleId] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<ShiftSortBy>('startedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const pageMetrics = useMemo(() => {
    return shifts.reduce(
      (totals, shift) => ({
        activeMinutes: totals.activeMinutes + (shift.activeMinutes ?? 0),
        grossIncome: totals.grossIncome + toNumber(shift.grossIncome),
        totalKm: totals.totalKm + toNumber(shift.totalKm),
        trueNetProfit: totals.trueNetProfit + toNumber(shift.trueNetProfit)
      }),
      {
        activeMinutes: 0,
        grossIncome: 0,
        totalKm: 0,
        trueNetProfit: 0
      }
    );
  }, [shifts]);
  const hasActiveFilters = Boolean(
    vehicleId || status || q.trim() || startDate || endDate
  );

  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void fetchVehicles(accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void fetchShifts(accessToken);
  }, [accessToken, page, sortBy, sortDirection]);

  async function fetchVehicles(token = accessToken) {
    if (!token) {
      return;
    }

    try {
      const response = await getJson<VehiclesResponse>('/vehicles', {
        accessToken: token
      });

      setVehicles(response.data);
    } catch {
      setVehicles([]);
    }
  }

  async function fetchShifts(
    token = accessToken,
    pageToLoad = page,
    filters: ShiftFilterValues = {
      endDate,
      q,
      sortBy,
      sortDirection,
      startDate,
      status,
      vehicleId
    }
  ) {
    if (!token) {
      setMessage('Vardiya listesini gormek icin once giris yapmalisin.');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await getJson<ShiftsResponse>('/shifts', {
        accessToken: token,
        query: {
          endDate: filters.endDate,
          page: pageToLoad,
          pageSize: 8,
          q: filters.q.trim() || undefined,
          sortBy: filters.sortBy,
          sortDirection: filters.sortDirection,
          startDate: filters.startDate,
          status: filters.status || undefined,
          vehicleId: filters.vehicleId || undefined
        }
      });

      setShifts(response.data);
      setMeta(response.meta);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Vardiyalar yuklenemedi.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void fetchShifts(accessToken, 1);
  }

  function clearFilters() {
    const clearedFilters: ShiftFilterValues = {
      endDate: '',
      q: '',
      sortBy: 'startedAt',
      sortDirection: 'desc',
      startDate: '',
      status: '',
      vehicleId: ''
    };

    setVehicleId('');
    setStatus('');
    setQ('');
    setStartDate('');
    setEndDate('');
    setSortBy('startedAt');
    setSortDirection('desc');
    setPage(1);
    void fetchShifts(accessToken, 1, clearedFilters);
  }

  if (!accessToken) {
    return null;
  }

  return (
    <section className="panel income-table-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Vardiya kayitlari</p>
          <h2>Vardiya listesi</h2>
        </div>
        <span className="status-pill">
          {meta ? `${meta.total} kayit` : 'Hazirlaniyor'}
        </span>
      </div>

      <section className="shift-metric-grid" aria-label="Vardiya sayfa ozeti">
        <MiniMetric
          label="Brut gelir"
          value={formatMoney(pageMetrics.grossIncome)}
        />
        <MiniMetric
          label="Net kar"
          value={formatMoney(pageMetrics.trueNetProfit)}
        />
        <MiniMetric
          label="Toplam km"
          value={`${formatNumber(pageMetrics.totalKm)} km`}
        />
        <MiniMetric
          label="Aktif sure"
          value={formatDuration(pageMetrics.activeMinutes)}
        />
      </section>

      <form
        className="list-toolbar shift-toolbar"
        onSubmit={handleFilterSubmit}
      >
        <label className="toolbar-search">
          <CalendarClock aria-hidden="true" />
          <input
            onChange={(event) => setQ(event.target.value)}
            placeholder="Vardiya notu ara"
            value={q}
          />
        </label>

        <label>
          Arac
          <select
            onChange={(event) => setVehicleId(event.target.value)}
            value={vehicleId}
          >
            <option value="">Tum araclar</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {formatVehicleLabel(vehicle)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Durum
          <select
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="">Aktif + tamamlandi</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
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
          Sirala
          <select
            onChange={(event) => setSortBy(event.target.value as ShiftSortBy)}
            value={sortBy}
          >
            {shiftSortOptions.map((option) => (
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

      {message ? <p className="form-alert">{message}</p> : null}

      {shifts.length > 0 ? (
        <div className="data-table" role="table" aria-label="Vardiyalar">
          <div
            className="data-table-row shift-table-row data-table-head"
            role="row"
          >
            <span>Baslangic</span>
            <span>Bitis</span>
            <span>Arac</span>
            <span>Durum</span>
            <span>Sure</span>
            <span>Km</span>
            <span>Gelir</span>
            <span>Net kar</span>
          </div>

          {shifts.map((shift) => (
            <div
              className="data-table-row shift-table-row"
              role="row"
              key={shift.id}
            >
              <span>
                <strong>{formatDateTime(shift.startedAt)}</strong>
                <small>{shift.note || 'Not yok'}</small>
              </span>
              <span>
                {shift.endedAt ? formatDateTime(shift.endedAt) : 'Devam ediyor'}
              </span>
              <span>{formatVehicleById(shift.vehicleId, vehicles)}</span>
              <span>
                <span
                  className={`status-pill compact ${shift.status.toLowerCase()}`}
                >
                  {statusLabels[shift.status]}
                </span>
              </span>
              <span>{formatDuration(shift.activeMinutes)}</span>
              <span>{formatNullableKm(shift.totalKm)}</span>
              <span>{formatMoney(toNumber(shift.grossIncome))}</span>
              <b>{formatMoney(toNumber(shift.trueNetProfit))}</b>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state-panel compact">
          <EmptyState
            description={
              hasActiveFilters
                ? 'Bu filtrelerle eslesen vardiya bulunamadi. Durum, arac veya tarih filtresini temizleyebilirsin.'
                : 'Vardiya baslatip bitirdiginde sure, km, gelir ve net kar bu listede gorunur.'
            }
            icon={hasActiveFilters ? FileSearch : CalendarClock}
            title={
              hasActiveFilters
                ? 'Filtreye uygun vardiya yok.'
                : 'Henuz vardiya kaydi yok.'
            }
            tips={
              hasActiveFilters
                ? ['Tarih araligini genislet', 'Durum filtresini kaldir']
                : ['Vardiyaya basla', 'Seferleri ekle', 'Vardiyayi bitir']
            }
          />
        </div>
      )}

      <div className="pagination-bar">
        <button
          className="secondary-button"
          disabled={!meta?.hasPreviousPage || isLoading}
          onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
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
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="mini-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatVehicleById(vehicleId: string, vehicles: Vehicle[]) {
  const vehicle = vehicles.find((item) => item.id === vehicleId);

  return vehicle ? formatVehicleLabel(vehicle) : vehicleId;
}

function formatVehicleLabel(vehicle: Vehicle) {
  const name = [vehicle.brand, vehicle.model].filter(Boolean).join(' ');

  return name ? `${vehicle.plateNumber} - ${name}` : vehicle.plateNumber;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short'
  }).format(new Date(value));
}

function formatDuration(minutes?: number | null) {
  if (!minutes) {
    return '0s 00d';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}s ${String(remainingMinutes).padStart(2, '0')}d`;
}

function formatNullableKm(value?: string | null) {
  if (!value) {
    return '0 km';
  }

  return `${formatNumber(toNumber(value))} km`;
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

function toNumber(value?: string | null) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}
