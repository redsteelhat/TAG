'use client';

import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileSearch,
  LockKeyhole,
  ListFilter,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { EmptyState } from './empty-state';
import { deleteJson, getJson, patchJson, postJson } from '../lib/api-client';
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
  vehicleId: string;
  shiftId?: string | null;
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
  tripKm: string;
  deadheadKm: string;
  totalKm: string;
  estimatedFuelCost: string;
  allocatedPackageCost: string;
  allocatedFixedCost: string;
  allocatedMaintenanceCost: string;
  allocatedDepreciationCost: string;
  allocatedOtherVariableCost: string;
  cashNetProfit: string;
  trueNetProfit: string;
  note?: string | null;
}

interface TripProfitBreakdown {
  cancellationIncome: string;
  depreciationCost: string;
  fixedCost: string;
  fuelCost: string;
  grossIncome: string;
  maintenanceCost: string;
  otherVariableCost: string;
  packageCost: string;
  tipAmount: string;
  totalIncome: string;
  trueNetProfit: string;
}

interface TripProfitBreakdownResponse {
  data: TripProfitBreakdown;
}

interface Vehicle {
  id: string;
  plateNumber: string;
  brand?: string | null;
  model?: string | null;
  isActive: boolean;
}

interface VehiclesResponse {
  data: Vehicle[];
}

interface TripResponse {
  data: Trip;
}

interface DashboardAggregation {
  fuelCost: string;
  todayGrossIncome: string;
  todayNetProfit: string;
  totalKm: string;
}

interface ReportOverviewResponse {
  data: {
    dashboard: DashboardAggregation;
  };
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

interface TripFormState {
  cancellationIncome: string;
  deadheadKm: string;
  dropoffLocation: string;
  endedAt: string;
  grossIncome: string;
  note: string;
  paymentMethod: PaymentMethod;
  pickupLocation: string;
  startedAt: string;
  tipAmount: string;
  tripDate: string;
  tripKm: string;
  vehicleId: string;
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CARD: 'Kart',
  CASH: 'Nakit',
  DIGITAL: 'Dijital',
  MIXED: 'Karma',
  OTHER: 'Diğer'
};

const sortOptions: Array<{ label: string; value: TripSortBy }> = [
  { label: 'Sefer tarihi', value: 'tripDate' },
  { label: 'Oluşturma tarihi', value: 'createdAt' },
  { label: 'Gelir', value: 'totalIncome' },
  { label: 'Km', value: 'totalKm' },
  { label: 'Net kâr', value: 'trueNetProfit' }
];

const emptyTripForm: TripFormState = {
  cancellationIncome: '',
  deadheadKm: '',
  dropoffLocation: '',
  endedAt: '',
  grossIncome: '',
  note: '',
  paymentMethod: 'DIGITAL',
  pickupLocation: '',
  startedAt: '',
  tipAmount: '',
  tripDate: new Date().toISOString().slice(0, 10),
  tripKm: '',
  vehicleId: ''
};

interface TripFormValidationResult {
  endedAt?: string;
  startedAt?: string;
  message?: string;
}

export function IncomeTripList() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [meta, setMeta] = useState<TripsResponse['meta'] | null>(null);
  const [todayDashboard, setTodayDashboard] =
    useState<DashboardAggregation | null>(null);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [tripForm, setTripForm] = useState<TripFormState>(emptyTripForm);
  const [q, setQ] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [sortBy, setSortBy] = useState<TripSortBy>('tripDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [selectedBreakdown, setSelectedBreakdown] = useState<{
    breakdown: TripProfitBreakdown;
    tripId: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBreakdown, setIsLoadingBreakdown] = useState(false);
  const [isSavingTrip, setIsSavingTrip] = useState(false);

  const pageMetrics = useMemo(() => {
    const visibleTotals = trips.reduce(
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

    if (!todayDashboard) {
      return visibleTotals;
    }

    return {
      fuelCost: toNumber(todayDashboard.fuelCost),
      grossIncome: toNumber(todayDashboard.todayGrossIncome),
      netProfit: toNumber(todayDashboard.todayNetProfit),
      totalKm: toNumber(todayDashboard.totalKm)
    };
  }, [todayDashboard, trips]);
  const summarySourceLabel = todayDashboard
    ? 'Dashboard ile aynı günlük kaynak'
    : 'Aktif filtre ve sayfa kapsamında';
  const hasActiveFilters = Boolean(
    q.trim() || startDate || endDate || paymentMethod
  );

  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void fetchVehicles(accessToken);
    void fetchTodayDashboard(accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void fetchTrips(accessToken);
  }, [accessToken, page, sortBy, sortDirection]);

  useEffect(() => {
    if (tripForm.vehicleId || vehicles.length === 0) {
      return;
    }

    const activeVehicle = vehicles.find((vehicle) => vehicle.isActive);
    setTripForm((currentForm) => ({
      ...currentForm,
      vehicleId: activeVehicle?.id ?? vehicles[0].id
    }));
  }, [tripForm.vehicleId, vehicles]);

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
      setMessage('Sefer listesini görmek için önce giriş yapmalısın.');
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
        error instanceof Error ? error.message : 'Seferler yüklenemedi.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchVehicles(token = accessToken) {
    if (!token) {
      return;
    }

    try {
      const response = await getJson<VehiclesResponse>('/vehicles', {
        accessToken: token
      });

      setVehicles(response.data);
    } catch (error) {
      setFormMessage(
        error instanceof Error ? error.message : 'Araçlar yüklenemedi.'
      );
    }
  }

  async function fetchTodayDashboard(token = accessToken) {
    if (!token) {
      return;
    }

    try {
      const today = getLocalDateInputValue();
      const response = await getJson<ReportOverviewResponse>(
        '/reports/overview',
        {
          accessToken: token,
          query: {
            date: today,
            month: today.slice(0, 7)
          }
        }
      );

      setTodayDashboard(response.data.dashboard);
    } catch {
      setTodayDashboard(null);
    }
  }

  async function handleTripSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setFormMessage('Sefer kaydetmek için önce giriş yapmalısın.');
      return;
    }

    if (!tripForm.vehicleId) {
      setFormMessage('Sefer kaydetmek için önce araç seçmelisin.');
      return;
    }

    const validation = validateTripForm(tripForm);

    if (validation.message) {
      setFormMessage(validation.message);
      return;
    }

    setIsSavingTrip(true);
    setFormMessage(null);

    try {
      const payload = buildTripPayload(tripForm, validation);

      if (editingTripId) {
        await patchJson<TripResponse>(`/trips/${editingTripId}`, payload, {
          accessToken
        });
      } else {
        await postJson<TripResponse>('/trips', payload, { accessToken });
      }

      setFormMessage(
        editingTripId ? 'Sefer kaydı güncellendi.' : 'Sefer kaydı oluşturuldu.'
      );
      setEditingTripId(null);
      resetTripForm();
      setPage(1);
      await fetchTrips(accessToken, 1);
      await fetchTodayDashboard(accessToken);
    } catch (error) {
      setFormMessage(
        error instanceof Error ? error.message : 'Sefer kaydedilemedi.'
      );
    } finally {
      setIsSavingTrip(false);
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

  function beginCreateTrip() {
    setEditingTripId(null);
    setFormMessage(null);
    resetTripForm();
  }

  function beginEditTrip(trip: Trip) {
    setEditingTripId(trip.id);
    setFormMessage(null);
    setTripForm({
      cancellationIncome: valueOrEmpty(trip.cancellationIncome),
      deadheadKm: valueOrEmpty(trip.deadheadKm),
      dropoffLocation: trip.dropoffLocation ?? '',
      endedAt: toTimeInput(trip.endedAt),
      grossIncome: valueOrEmpty(trip.grossIncome),
      note: trip.note ?? '',
      paymentMethod: trip.paymentMethod,
      pickupLocation: trip.pickupLocation ?? '',
      startedAt: toTimeInput(trip.startedAt),
      tipAmount: valueOrEmpty(trip.tipAmount),
      tripDate: toDateInput(trip.tripDate),
      tripKm: valueOrEmpty(trip.tripKm),
      vehicleId: trip.vehicleId
    });
  }

  function resetTripForm() {
    const activeVehicle = vehicles.find((vehicle) => vehicle.isActive);
    setTripForm({
      ...emptyTripForm,
      tripDate: new Date().toISOString().slice(0, 10),
      vehicleId: activeVehicle?.id ?? vehicles[0]?.id ?? ''
    });
  }

  async function deleteTrip(trip: Trip) {
    if (!accessToken) {
      return;
    }

    const confirmed = window.confirm('Bu sefer kaydını silmek istiyor musun?');

    if (!confirmed) {
      return;
    }

    try {
      await deleteJson<{ data: { success: boolean } }>(`/trips/${trip.id}`, {
        accessToken
      });
      setSelectedBreakdown((current) =>
        current?.tripId === trip.id ? null : current
      );
      setMessage('Sefer kaydı silindi.');
      await fetchTrips(accessToken, page);
      await fetchTodayDashboard(accessToken);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sefer silinemedi.');
    }
  }

  async function showTripBreakdown(trip: Trip) {
    if (!accessToken) {
      return;
    }

    if (selectedBreakdown?.tripId === trip.id) {
      setSelectedBreakdown(null);
      return;
    }

    setIsLoadingBreakdown(true);

    try {
      const response = await getJson<TripProfitBreakdownResponse>(
        `/trips/${trip.id}/profit-breakdown`,
        { accessToken }
      );

      setSelectedBreakdown({
        breakdown: response.data,
        tripId: trip.id
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Sefer kırılımı yüklenemedi.'
      );
    } finally {
      setIsLoadingBreakdown(false);
    }
  }

  function updateTripForm<Key extends keyof TripFormState>(
    key: Key,
    value: TripFormState[Key]
  ) {
    setTripForm((currentForm) => ({
      ...currentForm,
      [key]: value
    }));
  }

  if (!accessToken) {
    return (
      <section className="panel empty-state-panel">
        <EmptyState
          actionHref="/login"
          actionLabel="Giriş ekranına git"
          description="Sefer, vardiya ve net kâr verilerini görebilmek için aktif oturum gerekiyor."
          eyebrow="Oturum gerekli"
          icon={LockKeyhole}
          title="Gelir ve sefer listesini görmek için giriş yap."
        />
      </section>
    );
  }

  return (
    <section className="income-list-page">
      <section className="metric-grid income-metrics" aria-label="Sayfa özeti">
        <MetricCard
          label="Brüt gelir"
          value={formatMoney(pageMetrics.grossIncome)}
          sourceLabel={summarySourceLabel}
        />
        <MetricCard
          label="Net kâr"
          value={formatMoney(pageMetrics.netProfit)}
          sourceLabel={summarySourceLabel}
        />
        <MetricCard
          label="Toplam km"
          value={`${formatNumber(pageMetrics.totalKm)} km`}
          sourceLabel={summarySourceLabel}
        />
        <MetricCard
          label="Yakıt etkisi"
          value={formatMoney(pageMetrics.fuelCost)}
          sourceLabel={summarySourceLabel}
        />
      </section>

      <section className="panel data-form trip-editor-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              {editingTripId ? 'Sefer düzenleme' : 'Yeni sefer'}
            </p>
            <h2>{editingTripId ? 'Sefer kaydını düzenle' : 'Sefer ekle'}</h2>
          </div>
          <button
            className="secondary-button"
            onClick={beginCreateTrip}
            type="button"
          >
            <Plus aria-hidden="true" className="button-icon" />
            Yeni sefer
          </button>
        </div>

        <form className="trip-editor-form" onSubmit={handleTripSubmit}>
          <div className="trip-editor-grid">
            <label>
              Araç
              <select
                disabled={vehicles.length === 0}
                onChange={(event) =>
                  updateTripForm('vehicleId', event.target.value)
                }
                required
                value={tripForm.vehicleId}
              >
                <option value="">Araç seç</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {formatVehicleLabel(vehicle)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Sefer tarihi
              <input
                onChange={(event) =>
                  updateTripForm('tripDate', event.target.value)
                }
                required
                type="date"
                value={tripForm.tripDate}
              />
            </label>

            <label>
              Başlangıç saati
              <input
                onChange={(event) =>
                  updateTripForm('startedAt', event.target.value)
                }
                type="time"
                value={tripForm.startedAt}
              />
            </label>

            <label>
              Bitiş saati
              <input
                onChange={(event) =>
                  updateTripForm('endedAt', event.target.value)
                }
                type="time"
                value={tripForm.endedAt}
              />
            </label>

            <label>
              Brüt gelir
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updateTripForm('grossIncome', event.target.value)
                }
                placeholder="450.00"
                required
                value={tripForm.grossIncome}
              />
            </label>

            <label>
              Bahşiş / ekstra
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updateTripForm('tipAmount', event.target.value)
                }
                placeholder="0.00"
                value={tripForm.tipAmount}
              />
            </label>

            <label>
              İptal geliri
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updateTripForm('cancellationIncome', event.target.value)
                }
                placeholder="0.00"
                value={tripForm.cancellationIncome}
              />
            </label>

            <label>
              Ödeme tipi
              <select
                onChange={(event) =>
                  updateTripForm(
                    'paymentMethod',
                    event.target.value as PaymentMethod
                  )
                }
                value={tripForm.paymentMethod}
              >
                {Object.entries(paymentMethodLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Sefer km
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updateTripForm('tripKm', event.target.value)
                }
                placeholder="18.00"
                value={tripForm.tripKm}
              />
            </label>

            <label>
              Boş km
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updateTripForm('deadheadKm', event.target.value)
                }
                placeholder="4.00"
                value={tripForm.deadheadKm}
              />
            </label>

            <label>
              Toplam km
              <input
                readOnly
                value={formatNumber(calculateFormTotalKm(tripForm))}
              />
            </label>

            <label>
              Başlangıç lokasyonu
              <input
                onChange={(event) =>
                  updateTripForm('pickupLocation', event.target.value)
                }
                placeholder="Kadıköy"
                value={tripForm.pickupLocation}
              />
            </label>

            <label>
              Bitiş lokasyonu
              <input
                onChange={(event) =>
                  updateTripForm('dropoffLocation', event.target.value)
                }
                placeholder="Beşiktaş"
                value={tripForm.dropoffLocation}
              />
            </label>
          </div>

          <label>
            Not
            <textarea
              onChange={(event) => updateTripForm('note', event.target.value)}
              placeholder="Yoğun trafik, yolcu bekleme, ödeme detayı"
              rows={3}
              value={tripForm.note}
            />
          </label>

          {formMessage ? (
            <p
              className={
                formMessage.includes('oluşturuldu') ||
                formMessage.includes('güncellendi')
                  ? 'form-success'
                  : 'form-alert'
              }
            >
              {formMessage}
            </p>
          ) : null}

          <div className="form-actions">
            <button
              className="secondary-button"
              onClick={resetTripForm}
              type="button"
            >
              Formu temizle
            </button>
            {editingTripId ? (
              <button
                className="secondary-button"
                onClick={beginCreateTrip}
                type="button"
              >
                Vazgeç
              </button>
            ) : null}
            <button
              className="primary-button"
              disabled={isSavingTrip || vehicles.length === 0}
            >
              <Save aria-hidden="true" className="button-icon" />
              {isSavingTrip
                ? 'Kaydediliyor'
                : editingTripId
                  ? 'Seferi güncelle'
                  : 'Sefer ekle'}
            </button>
          </div>
        </form>
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
            Başlangıç
            <input
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
          </label>

          <label>
            Bitiş
            <input
              onChange={(event) => setEndDate(event.target.value)}
              type="date"
              value={endDate}
            />
          </label>

          <label>
            Ödeme
            <select
              onChange={(event) => setPaymentMethod(event.target.value)}
              value={paymentMethod}
            >
              <option value="">Tüm ödemeler</option>
              {Object.entries(paymentMethodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Sırala
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
            Yön
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
              {isLoading ? 'Yükleniyor' : 'Filtrele'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel income-table-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Sefer kayıtları</p>
            <h2>Gelir/sefer listesi</h2>
          </div>
          <span className="status-pill">
            {meta ? `${meta.total} kayıt` : 'Hazırlanıyor'}
          </span>
        </div>

        {message ? (
          <div className="form-alert" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{message}</span>
            <button
              className="secondary-button compact"
              onClick={() => fetchTrips()}
              type="button"
              style={{ marginLeft: '12px', padding: '4px 8px', fontSize: '12px' }}
            >
              <RefreshCw aria-hidden="true" className="inline-icon" style={{ marginRight: '4px', width: '12px', height: '12px' }} />
              Tekrar Dene
            </button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="skeleton-list animate-pulse" style={{ padding: '20px 0' }}>
            <div className="skeleton-row" style={{ height: '40px', marginBottom: '8px' }} />
            <div className="skeleton-row" style={{ height: '48px', marginBottom: '8px' }} />
            <div className="skeleton-row" style={{ height: '48px', marginBottom: '8px' }} />
            <div className="skeleton-row" style={{ height: '48px', marginBottom: '8px' }} />
            <div className="skeleton-row" style={{ height: '48px', marginBottom: '8px' }} />
          </div>
        ) : trips.length > 0 ? (
          <div className="data-table" role="table" aria-label="Gelir seferleri">
            <div className="data-table-row data-table-head" role="row">
              <span>Tarih</span>
              <span>Rota</span>
              <span>Ödeme</span>
              <span>Km</span>
              <span>Gelir</span>
              <span>Yakıt</span>
              <span>Net kâr</span>
              <span>İşlem</span>
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
                <span className="table-actions">
                  <button
                    className="icon-button"
                    disabled={isLoadingBreakdown}
                    onClick={() => showTripBreakdown(trip)}
                    title="Kâr kırılımı"
                    type="button"
                  >
                    <FileSearch aria-hidden="true" />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => beginEditTrip(trip)}
                    title="Seferi düzenle"
                    type="button"
                  >
                    <Edit3 aria-hidden="true" />
                  </button>
                  <button
                    className="icon-button danger"
                    onClick={() => deleteTrip(trip)}
                    title="Seferi sil"
                    type="button"
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-panel compact">
            <EmptyState
              description={
                hasActiveFilters
                  ? 'Bu filtrelerle eşleşen sefer bulunamadı. Filtreleri temizleyerek tüm gelir kayıtlarını tekrar görebilirsin.'
                  : 'Henüz sefer kaydınız bulunmamaktadır. Seferlerinizi buraya ekleyerek net kâr, yakıt tüketimi ve km başı kâr analizlerini anlık takip edin.'
              }
              icon={hasActiveFilters ? FileSearch : Plus}
              title={
                hasActiveFilters
                  ? 'Filtreye uygun sefer yok.'
                  : 'Henüz sefer kaydı yok.'
              }
              tips={
                hasActiveFilters
                  ? ['Tarih aralığını genişlet', 'Ödeme filtresini temizle']
                  : [
                      'Brüt geliri gir',
                      'Km bilgisini ekle',
                      'Yakıt tahmini oluşsun'
                    ]
              }
            />
          </div>
        )}

        {selectedBreakdown ? (
          <TripBreakdownPanel breakdown={selectedBreakdown.breakdown} />
        ) : null}

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
            Önceki
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

function MetricCard({
  label,
  sourceLabel,
  value
}: {
  label: string;
  sourceLabel: string;
  value: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-card-header">
        <p>{label}</p>
      </div>
      <strong>{value}</strong>
      <span>{sourceLabel}</span>
    </article>
  );
}

function TripBreakdownPanel({
  breakdown
}: {
  breakdown: TripProfitBreakdown;
}) {
  const rows: Array<[string, string, 'minus' | 'plus' | 'result']> = [
    ['Brüt gelir', breakdown.grossIncome, 'plus'],
    ['Bahşiş', breakdown.tipAmount, 'plus'],
    ['İptal geliri', breakdown.cancellationIncome, 'plus'],
    ['Yakıt', breakdown.fuelCost, 'minus'],
    ['Paket payı', breakdown.packageCost, 'minus'],
    ['Sabit gider payı', breakdown.fixedCost, 'minus'],
    ['Bakım rezervi', breakdown.maintenanceCost, 'minus'],
    ['Amortisman', breakdown.depreciationCost, 'minus'],
    ['Net kâr', breakdown.trueNetProfit, 'result']
  ];

  return (
    <section className="trip-breakdown-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Hesaplama kırılımı</p>
          <h2>Sefer net kâr formülü</h2>
        </div>
      </div>
      <div className="break-even-list">
        {rows.map(([label, amount, type]) => (
          <div className="expense-row" key={label}>
            <span>
              {type === 'plus' ? '+ ' : type === 'minus' ? '- ' : '= '}
              {label}
            </span>
            <strong>{formatMoney(toNumber(amount))}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatRoute(trip: Trip) {
  const pickup = trip.pickupLocation || 'Başlangıç yok';
  const dropoff = trip.dropoffLocation || 'Bitiş yok';

  return `${pickup} - ${dropoff}`;
}

function formatVehicleLabel(vehicle: Vehicle) {
  const name = [vehicle.brand, vehicle.model].filter(Boolean).join(' ');

  return name ? `${vehicle.plateNumber} - ${name}` : vehicle.plateNumber;
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

function getLocalDateInputValue() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;

  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function toNumber(value: string) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function buildTripPayload(
  form: TripFormState,
  validation: TripFormValidationResult
) {
  return removeEmptyValues({
    cancellationIncome: normalizeDecimal(form.cancellationIncome),
    deadheadKm: normalizeDecimal(form.deadheadKm),
    dropoffLocation: form.dropoffLocation.trim(),
    endedAt: validation.endedAt,
    grossIncome: normalizeDecimal(form.grossIncome),
    note: form.note.trim(),
    paymentMethod: form.paymentMethod,
    pickupLocation: form.pickupLocation.trim(),
    startedAt: validation.startedAt,
    tipAmount: normalizeDecimal(form.tipAmount),
    tripDate: form.tripDate,
    tripKm: normalizeDecimal(form.tripKm),
    vehicleId: form.vehicleId
  });
}

function validateTripForm(form: TripFormState): TripFormValidationResult {
  if (!form.vehicleId) {
    return { message: 'Araç zorunlu.' };
  }

  if (!form.tripDate) {
    return { message: 'Sefer tarihi zorunlu.' };
  }

  const nonNegativeFields: Array<[keyof TripFormState, string]> = [
    ['grossIncome', 'Brüt gelir negatif olamaz.'],
    ['tipAmount', 'Bahşiş negatif olamaz.'],
    ['cancellationIncome', 'İptal geliri negatif olamaz.'],
    ['tripKm', 'Sefer km negatif olamaz.'],
    ['deadheadKm', 'Boş km negatif olamaz.']
  ];

  for (const [field, message] of nonNegativeFields) {
    const value = form[field];

    if (value !== '' && Number(normalizeDecimal(value) ?? 0) < 0) {
      return { message };
    }
  }

  if (!form.grossIncome) {
    return { message: 'Brüt gelir zorunlu.' };
  }

  const startedAt = combineDateAndTime(form.tripDate, form.startedAt);
  const endedAt = combineDateAndTime(form.tripDate, form.endedAt);

  if (startedAt && endedAt && new Date(endedAt) < new Date(startedAt)) {
    return { message: 'Bitiş saati başlangıçtan önce olamaz.' };
  }

  return { endedAt, startedAt };
}

function calculateFormTotalKm(form: TripFormState) {
  return (
    toNumber(normalizeDecimal(form.tripKm) ?? '0') +
    toNumber(normalizeDecimal(form.deadheadKm) ?? '0')
  );
}

function removeEmptyValues(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) => value !== undefined && value !== ''
    )
  );
}

function normalizeDecimal(value: string) {
  const normalizedValue = value.trim().replace(',', '.');

  return normalizedValue || undefined;
}

function combineDateAndTime(date: string, time: string) {
  if (!date || !time) {
    return undefined;
  }

  return new Date(`${date}T${time}:00`).toISOString();
}

function toDateInput(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function toTimeInput(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const timezoneOffsetMs = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(11, 16);
}

function valueOrEmpty(value?: string | null) {
  if (!value || value === '0.00') {
    return '';
  }

  return value;
}
