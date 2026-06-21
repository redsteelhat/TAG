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
  Search
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { EmptyState } from './empty-state';
import { getJson, patchJson, postJson } from '../lib/api-client';
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
  cashNetProfit: string;
  trueNetProfit: string;
  note?: string | null;
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

export function IncomeTripList() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [meta, setMeta] = useState<TripsResponse['meta'] | null>(null);
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
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingTrip, setIsSavingTrip] = useState(false);

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

    setIsSavingTrip(true);
    setFormMessage(null);

    try {
      const payload = buildTripPayload(tripForm);

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
      endedAt: toDateTimeInput(trip.endedAt),
      grossIncome: valueOrEmpty(trip.grossIncome),
      note: trip.note ?? '',
      paymentMethod: trip.paymentMethod,
      pickupLocation: trip.pickupLocation ?? '',
      startedAt: toDateTimeInput(trip.startedAt),
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
          label="Görüntülenen gelir"
          value={formatMoney(pageMetrics.grossIncome)}
        />
        <MetricCard
          label="Görüntülenen net kâr"
          value={formatMoney(pageMetrics.netProfit)}
        />
        <MetricCard
          label="Görüntülenen km"
          value={`${formatNumber(pageMetrics.totalKm)} km`}
        />
        <MetricCard
          label="Yakıt etkisi"
          value={formatMoney(pageMetrics.fuelCost)}
        />
      </section>

      <section className="panel data-form trip-editor-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              {editingTripId ? 'Sefer duzenleme' : 'Yeni sefer'}
            </p>
            <h2>{editingTripId ? 'Sefer kaydıni duzenle' : 'Sefer ekle'}</h2>
          </div>
          <button
            className="secondary-button"
            onClick={beginCreateTrip}
            type="button"
          >
            <Plus aria-hidden="true" className="button-icon" />
            Yeni
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
                type="datetime-local"
                value={tripForm.startedAt}
              />
            </label>

            <label>
              Bitiş saati
              <input
                onChange={(event) =>
                  updateTripForm('endedAt', event.target.value)
                }
                type="datetime-local"
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
                  ? 'Seferi Güncelle'
                  : 'Sefer Ekle'}
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

        {message ? <p className="form-alert">{message}</p> : null}

        {trips.length > 0 ? (
          <div className="data-table" role="table" aria-label="Gelir seferleri">
            <div className="data-table-row data-table-head" role="row">
              <span>Tarih</span>
              <span>Rota</span>
              <span>Ödeme</span>
              <span>Km</span>
              <span>Gelir</span>
              <span>Yakıt</span>
              <span>Net kâr</span>
              <span>Islem</span>
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
                <button
                  className="icon-button"
                  onClick={() => beginEditTrip(trip)}
                  title="Seferi duzenle"
                  type="button"
                >
                  <Edit3 aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-panel compact">
            <EmptyState
              description={
                hasActiveFilters
                  ? 'Bu filtrelerle eşleşen sefer bulunamadı. Filtreleri temizleyerek tüm gelir kayıtlarını tekrar görebilirsin.'
                  : 'İlk seferini eklediğinde brüt gelir, km, yakıt etkisi ve net kâr bu listede görünür.'
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
                      'Yakıt tahmini olussun'
                    ]
              }
            />
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

function toNumber(value: string) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function buildTripPayload(form: TripFormState) {
  return removeEmptyValues({
    cancellationIncome: normalizeDecimal(form.cancellationIncome),
    deadheadKm: normalizeDecimal(form.deadheadKm),
    dropoffLocation: form.dropoffLocation.trim(),
    endedAt: toIsoDateTime(form.endedAt),
    grossIncome: normalizeDecimal(form.grossIncome),
    note: form.note.trim(),
    paymentMethod: form.paymentMethod,
    pickupLocation: form.pickupLocation.trim(),
    startedAt: toIsoDateTime(form.startedAt),
    tipAmount: normalizeDecimal(form.tipAmount),
    tripDate: form.tripDate,
    tripKm: normalizeDecimal(form.tripKm),
    vehicleId: form.vehicleId
  });
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

function toIsoDateTime(value: string) {
  if (!value) {
    return undefined;
  }

  return new Date(value).toISOString();
}

function toDateInput(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function toDateTimeInput(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const timezoneOffsetMs = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function valueOrEmpty(value?: string | null) {
  if (!value || value === '0.00') {
    return '';
  }

  return value;
}
