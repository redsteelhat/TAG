'use client';

import {
  ChevronLeft,
  ChevronRight,
  FileSearch,
  Fuel,
  LockKeyhole,
  ListFilter,
  RefreshCw,
  Save,
  Search
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { EmptyState } from './empty-state';
import { getJson, postJson } from '../lib/api-client';
import { getAccessToken } from '../lib/auth-storage';

type FuelType = 'DIESEL' | 'GASOLINE' | 'LPG' | 'HYBRID' | 'ELECTRIC' | 'OTHER';
type PaymentMethod = 'CASH' | 'CARD' | 'DIGITAL' | 'MIXED' | 'OTHER';
type SortDirection = 'asc' | 'desc';
type FuelSortBy =
  | 'amount'
  | 'createdAt'
  | 'liters'
  | 'odometerKm'
  | 'pricePerLiter';

interface FuelEntry {
  id: string;
  vehicleId: string;
  fuelType: FuelType;
  amount: string;
  liters: string;
  pricePerLiter: string;
  odometerKm?: string | null;
  stationName?: string | null;
  city?: string | null;
  district?: string | null;
  fullTank: boolean;
  tankFillLevel?: string | null;
  paymentMethod?: PaymentMethod | null;
  receiptUrl?: string | null;
  createdAt: string;
}

interface Vehicle {
  id: string;
  plateNumber: string;
  brand?: string | null;
  model?: string | null;
  averageConsumptionLPer100Km?: string;
  fuelType?: FuelType;
  isActive: boolean;
}

interface FuelEntriesResponse {
  data: FuelEntry[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface VehiclesResponse {
  data: Vehicle[];
}

interface FuelEntryResponse {
  data: FuelEntry;
}

interface FuelFilterValues {
  endDate: string;
  fuelType: string;
  fullTank: string;
  maxAmount: string;
  maxLiters: string;
  minAmount: string;
  minLiters: string;
  paymentMethod: string;
  q: string;
  sortBy: FuelSortBy;
  sortDirection: SortDirection;
  startDate: string;
  vehicleId: string;
}

interface FuelFormState {
  amount: string;
  city: string;
  createdAt: string;
  district: string;
  fuelType: FuelType;
  fullTank: boolean;
  liters: string;
  odometerKm: string;
  paymentMethod: PaymentMethod;
  pricePerLiter: string;
  receiptUrl: string;
  stationName: string;
  tankFillLevel: string;
  vehicleId: string;
}

const fuelTypeLabels: Record<FuelType, string> = {
  DIESEL: 'Dizel',
  ELECTRIC: 'Elektrik',
  GASOLINE: 'Benzin',
  HYBRID: 'Hibrit',
  LPG: 'LPG',
  OTHER: 'Diğer'
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CARD: 'Kart',
  CASH: 'Nakit',
  DIGITAL: 'Dijital',
  MIXED: 'Karma',
  OTHER: 'Diğer'
};

const sortOptions: Array<{ label: string; value: FuelSortBy }> = [
  { label: 'Kayıt tarihi', value: 'createdAt' },
  { label: 'Tutar', value: 'amount' },
  { label: 'Litre', value: 'liters' },
  { label: 'Litre fiyatı', value: 'pricePerLiter' },
  { label: 'Km sayacı', value: 'odometerKm' }
];

const emptyFuelForm: FuelFormState = {
  amount: '',
  city: '',
  createdAt: getLocalDateInputValue(),
  district: '',
  fuelType: 'GASOLINE',
  fullTank: false,
  liters: '',
  odometerKm: '',
  paymentMethod: 'CARD',
  pricePerLiter: '',
  receiptUrl: '',
  stationName: '',
  tankFillLevel: '',
  vehicleId: ''
};

export function FuelPanel() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [meta, setMeta] = useState<FuelEntriesResponse['meta'] | null>(null);
  const [fuelForm, setFuelForm] = useState<FuelFormState>(emptyFuelForm);
  const [vehicleId, setVehicleId] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [fullTank, setFullTank] = useState('');
  const [q, setQ] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [minLiters, setMinLiters] = useState('');
  const [maxLiters, setMaxLiters] = useState('');
  const [sortBy, setSortBy] = useState<FuelSortBy>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingFuel, setIsSavingFuel] = useState(false);

  const selectedFormVehicle = vehicles.find(
    (vehicle) => vehicle.id === fuelForm.vehicleId
  );
  const selectedSummaryVehicle =
    vehicles.find((vehicle) => vehicle.id === vehicleId) ?? selectedFormVehicle;
  const calculatedPricePerLiter = calculateLivePricePerLiter(
    fuelForm.amount,
    fuelForm.liters
  );
  const hasUnsavedFuelDraft = isFuelFormDirty(fuelForm, selectedFormVehicle);
  const fuelTypeWarning =
    selectedFormVehicle?.fuelType &&
    selectedFormVehicle.fuelType !== fuelForm.fuelType
      ? `Seçili aracın varsayılan yakıt tipi ${fuelTypeLabels[selectedFormVehicle.fuelType]}.`
      : null;
  const pageMetrics = useMemo(() => {
    return buildFuelMetrics(fuelEntries, selectedSummaryVehicle);
  }, [fuelEntries, selectedSummaryVehicle]);
  const hasActiveFilters = Boolean(
    vehicleId ||
    fuelType ||
    paymentMethod ||
    fullTank ||
    q.trim() ||
    startDate ||
    endDate ||
    minAmount ||
    maxAmount ||
    minLiters ||
    maxLiters
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

    void fetchFuelEntries(accessToken);
  }, [accessToken, page, sortBy, sortDirection]);

  useEffect(() => {
    if (fuelForm.vehicleId || vehicles.length === 0) {
      return;
    }

    const activeVehicle = vehicles.find((vehicle) => vehicle.isActive);
    const selectedVehicle = activeVehicle ?? vehicles[0];

    setFuelForm((currentForm) => ({
      ...currentForm,
      fuelType: selectedVehicle.fuelType ?? currentForm.fuelType,
      vehicleId: selectedVehicle.id
    }));
  }, [fuelForm.vehicleId, vehicles]);

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

  async function fetchFuelEntries(
    token = accessToken,
    pageToLoad = page,
    filters: FuelFilterValues = {
      endDate,
      fuelType,
      fullTank,
      maxAmount,
      maxLiters,
      minAmount,
      minLiters,
      paymentMethod,
      q,
      sortBy,
      sortDirection,
      startDate,
      vehicleId
    }
  ) {
    if (!token) {
      setMessage('Yakıt panelini görmek için önce giriş yapmalısın.');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await getJson<FuelEntriesResponse>('/fuel-entries', {
        accessToken: token,
        query: {
          endDate: filters.endDate,
          fuelType: filters.fuelType || undefined,
          fullTank: filters.fullTank || undefined,
          maxAmount: normalizeDecimal(filters.maxAmount),
          maxLiters: normalizeDecimal(filters.maxLiters),
          minAmount: normalizeDecimal(filters.minAmount),
          minLiters: normalizeDecimal(filters.minLiters),
          page: pageToLoad,
          pageSize: 10,
          paymentMethod: filters.paymentMethod || undefined,
          q: filters.q.trim() || undefined,
          sortBy: filters.sortBy,
          sortDirection: filters.sortDirection,
          startDate: filters.startDate,
          vehicleId: filters.vehicleId || undefined
        }
      });

      setFuelEntries(response.data);
      setMeta(response.meta);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Yakıt kayıtları yüklenemedi.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFuelSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setFormMessage('Yakıt kaydetmek için önce giriş yapmalısın.');
      return;
    }

    if (!fuelForm.vehicleId) {
      setFormMessage('Yakıt kaydetmek için önce araç seçmelisin.');
      return;
    }

    const validationMessage = validateFuelForm(fuelForm, calculatedPricePerLiter);

    if (validationMessage) {
      setFormMessage(validationMessage);
      return;
    }

    setIsSavingFuel(true);
    setFormMessage(null);

    try {
      await postJson<FuelEntryResponse>(
        '/fuel-entries',
        buildFuelPayload(fuelForm, calculatedPricePerLiter),
        { accessToken }
      );

      setFormMessage('Yakıt kaydı oluşturuldu.');
      resetFuelForm();
      setPage(1);
      await fetchFuelEntries(accessToken, 1);
    } catch (error) {
      setFormMessage(
        error instanceof Error ? error.message : 'Yakıt kaydedilemedi.'
      );
    } finally {
      setIsSavingFuel(false);
    }
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void fetchFuelEntries(accessToken, 1);
  }

  function clearFilters() {
    const clearedFilters: FuelFilterValues = {
      endDate: '',
      fuelType: '',
      fullTank: '',
      maxAmount: '',
      maxLiters: '',
      minAmount: '',
      minLiters: '',
      paymentMethod: '',
      q: '',
      sortBy: 'createdAt',
      sortDirection: 'desc',
      startDate: '',
      vehicleId: ''
    };

    setVehicleId('');
    setFuelType('');
    setPaymentMethod('');
    setFullTank('');
    setQ('');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setMinLiters('');
    setMaxLiters('');
    setSortBy('createdAt');
    setSortDirection('desc');
    setPage(1);
    void fetchFuelEntries(accessToken, 1, clearedFilters);
  }

  function resetFuelForm() {
    const activeVehicle = vehicles.find((vehicle) => vehicle.isActive);
    const selectedVehicle = activeVehicle ?? vehicles[0];

    setFuelForm({
      ...emptyFuelForm,
      createdAt: getLocalDateInputValue(),
      fuelType: selectedVehicle?.fuelType ?? emptyFuelForm.fuelType,
      vehicleId: selectedVehicle?.id ?? ''
    });
  }

  function updateFuelVehicle(vehicleId: string) {
    const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);

    setFuelForm((currentForm) => ({
      ...currentForm,
      fuelType: selectedVehicle?.fuelType ?? currentForm.fuelType,
      vehicleId
    }));
  }

  function updateFuelForm<Key extends keyof FuelFormState>(
    key: Key,
    value: FuelFormState[Key]
  ) {
    setFuelForm((currentForm) => ({
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
          description="Yakıt tüketimi, litre fiyatı ve km başı yakıt maliyetini hesaplamak için aktif oturum gerekiyor."
          eyebrow="Oturum gerekli"
          icon={LockKeyhole}
          title="Yakıt panelini görmek için giriş yap."
        />
      </section>
    );
  }

  return (
    <section className="income-list-page">
      <section className="metric-grid income-metrics" aria-label="Yakıt özeti">
        <MetricCard
          label="Görüntülenen yakıt tutarı"
          value={formatMoney(pageMetrics.amount)}
        />
        <MetricCard
          label="Toplam litre"
          value={`${formatNumber(pageMetrics.liters)} lt`}
        />
        <MetricCard
          label="Ortalama litre fiyatı"
          value={formatMoney(pageMetrics.averagePricePerLiter)}
        />
        <MetricCard
          label={pageMetrics.consumptionLabel}
          value={
            pageMetrics.consumptionPer100Km > 0
              ? `${formatNumber(pageMetrics.consumptionPer100Km)} lt`
              : 'Veri yok'
          }
          detail={pageMetrics.consumptionDetail}
        />
      </section>

      <section className="panel data-form quick-expense-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Yakıt girişi</p>
            <h2>Yakıt ekle</h2>
          </div>
          <span className="status-pill">
            {hasUnsavedFuelDraft
              ? 'Kaydedilmemiş taslak'
              : pageMetrics.costPerKm > 0
              ? `${formatMoney(pageMetrics.costPerKm)} / km`
              : 'Km maliyeti hazır değil'}
          </span>
        </div>

        <form className="quick-expense-form" onSubmit={handleFuelSubmit}>
          <div className="fuel-entry-grid">
            <label>
              Araç
              <select
                disabled={vehicles.length === 0}
                onChange={(event) => updateFuelVehicle(event.target.value)}
                required
                value={fuelForm.vehicleId}
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
              Kayıt tarihi
              <input
                onChange={(event) =>
                  updateFuelForm('createdAt', event.target.value)
                }
                required
                type="date"
                value={fuelForm.createdAt}
              />
            </label>

            <label>
              Yakıt tipi
              <select
                onChange={(event) =>
                  updateFuelForm('fuelType', event.target.value as FuelType)
                }
                value={fuelForm.fuelType}
              >
                {Object.entries(fuelTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Tutar
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updateFuelForm('amount', event.target.value)
                }
                placeholder="1500.00"
                required
                value={fuelForm.amount}
              />
            </label>

            <label>
              Litre
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updateFuelForm('liters', event.target.value)
                }
                placeholder="32.500"
                required
                value={fuelForm.liters}
              />
            </label>

            <label>
              Litre fiyatı
              <input
                placeholder="Tutar ve litre gir"
                readOnly
                value={
                  calculatedPricePerLiter
                    ? `${formatNumber(calculatedPricePerLiter, 2)} TL/L`
                    : ''
                }
              />
            </label>

            <label>
              Km sayacı
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updateFuelForm('odometerKm', event.target.value)
                }
                placeholder="85120.5"
                value={fuelForm.odometerKm}
              />
            </label>

            <label>
              Depo durumu
              <select
                onChange={(event) =>
                  updateFuelForm('tankFillLevel', event.target.value)
                }
                value={fuelForm.tankFillLevel}
              >
                <option value="">Belirtilmedi</option>
                <option value="FULL">Full</option>
                <option value="HALF">Yarım</option>
                <option value="MANUAL">Manuel</option>
              </select>
            </label>

            <label>
              Ödeme
              <select
                onChange={(event) =>
                  updateFuelForm(
                    'paymentMethod',
                    event.target.value as PaymentMethod
                  )
                }
                value={fuelForm.paymentMethod}
              >
                {Object.entries(paymentMethodLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              İstasyon
              <input
                onChange={(event) =>
                  updateFuelForm('stationName', event.target.value)
                }
                placeholder="Shell Kadıköy"
                value={fuelForm.stationName}
              />
            </label>

            <label>
              Şehir
              <input
                onChange={(event) => updateFuelForm('city', event.target.value)}
                placeholder="İstanbul"
                value={fuelForm.city}
              />
            </label>

            <label>
              İlçe
              <input
                onChange={(event) =>
                  updateFuelForm('district', event.target.value)
                }
                placeholder="Kadıköy"
                value={fuelForm.district}
              />
            </label>

            <label>
              Fiş URL
              <input
                onChange={(event) =>
                  updateFuelForm('receiptUrl', event.target.value)
                }
                placeholder="https://..."
                value={fuelForm.receiptUrl}
              />
            </label>
          </div>

          {fuelTypeWarning ? (
            <p className="form-hint warning">{fuelTypeWarning}</p>
          ) : null}

          <label className="checkbox-row fuel-checkbox">
            <input
              checked={fuelForm.fullTank}
              onChange={(event) =>
                updateFuelForm('fullTank', event.target.checked)
              }
              type="checkbox"
            />
            Full depo kaydı
          </label>

          {hasUnsavedFuelDraft ? (
            <p className="form-hint">
              Bu bilgiler kaydedilene kadar yakıt listesine, dashboard
              hesaplarına ve sefer net kârına yansımaz.
            </p>
          ) : null}

          {formMessage ? (
            <p
              className={
                formMessage.includes('oluşturuldu')
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
              onClick={resetFuelForm}
              type="button"
            >
              Temizle
            </button>
            <button
              className="primary-button"
              disabled={isSavingFuel || vehicles.length === 0}
            >
              <Save aria-hidden="true" className="button-icon" />
              {isSavingFuel ? 'Kaydediliyor' : 'Yakıt ekle'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <form className="fuel-list-toolbar" onSubmit={handleFilterSubmit}>
          <label className="toolbar-search">
            <Search aria-hidden="true" />
            <input
              onChange={(event) => setQ(event.target.value)}
              placeholder="İstasyon, şehir veya fiş ara"
              value={q}
            />
          </label>

          <label>
            Araç
            <select
              onChange={(event) => setVehicleId(event.target.value)}
              value={vehicleId}
            >
              <option value="">Tüm araçlar</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {formatVehicleLabel(vehicle)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Yakıt
            <select
              onChange={(event) => setFuelType(event.target.value)}
              value={fuelType}
            >
              <option value="">Tüm yakıtlar</option>
              {Object.entries(fuelTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
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
            Depo
            <select
              onChange={(event) => setFullTank(event.target.value)}
              value={fullTank}
            >
              <option value="">Tüm kayıtlar</option>
              <option value="true">Full depo</option>
              <option value="false">Full değil</option>
            </select>
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
            Min tutar
            <input
              inputMode="decimal"
              onChange={(event) => setMinAmount(event.target.value)}
              placeholder="500.00"
              value={minAmount}
            />
          </label>

          <label>
            Max tutar
            <input
              inputMode="decimal"
              onChange={(event) => setMaxAmount(event.target.value)}
              placeholder="3000.00"
              value={maxAmount}
            />
          </label>

          <label>
            Min litre
            <input
              inputMode="decimal"
              onChange={(event) => setMinLiters(event.target.value)}
              placeholder="10.000"
              value={minLiters}
            />
          </label>

          <label>
            Max litre
            <input
              inputMode="decimal"
              onChange={(event) => setMaxLiters(event.target.value)}
              placeholder="70.000"
              value={maxLiters}
            />
          </label>

          <label>
            Sırala
            <select
              onChange={(event) => setSortBy(event.target.value as FuelSortBy)}
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
              onClick={clearFilters}
              type="button"
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
            <p className="eyebrow">Yakıt kayıtları</p>
            <h2>Yakıt paneli</h2>
          </div>
          <span className="status-pill">
            {meta ? `${meta.total} kayıt` : 'Hazırlanıyor'}
          </span>
        </div>

        {message ? (
          <div className="form-alert-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", margin: "8px 0" }}>
            <p className="form-alert">{message}</p>
            <button
              className="secondary-button compact"
              onClick={() => {
                setMessage(null);
                void fetchFuelEntries(accessToken, page);
              }}
              type="button"
            >
              <RefreshCw aria-hidden="true" className="inline-icon" />
              Yenile
            </button>
          </div>
        ) : null}

        {fuelEntries.length > 0 ? (
          <div className="data-table" role="table" aria-label="Yakıt kayıtları">
            <div
              className="data-table-row data-table-head fuel-table-row"
              role="row"
            >
              <span>Tarih</span>
              <span>İstasyon</span>
              <span>Yakıt</span>
              <span>Litre</span>
              <span>Litre fiyat</span>
              <span>Tutar</span>
              <span>Km</span>
              <span>Depo</span>
            </div>

            {fuelEntries.map((entry) => (
              <div
                className="data-table-row fuel-table-row"
                role="row"
                key={entry.id}
              >
                <span>
                  <strong>{formatDate(entry.createdAt)}</strong>
                  <small>{formatVehicleName(vehicles, entry.vehicleId)}</small>
                </span>
                <span>
                  <strong>{entry.stationName || 'İstasyon yok'}</strong>
                  <small>{formatLocation(entry)}</small>
                </span>
                <span>{fuelTypeLabels[entry.fuelType]}</span>
                <span>{formatNumber(toNumber(entry.liters))} lt</span>
                <span>{formatMoney(toNumber(entry.pricePerLiter))}</span>
                <b>{formatMoney(toNumber(entry.amount))}</b>
                <span>{formatOdometer(entry.odometerKm)}</span>
                <span>
                  <span
                    className={
                      entry.fullTank
                        ? 'status-pill compact active'
                        : 'status-pill compact completed'
                    }
                  >
                    {entry.fullTank ? 'Full' : entry.tankFillLevel || 'Kayıt'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-panel compact">
            <EmptyState
              description={
                hasActiveFilters
                  ? 'Bu filtrelerle eşleşen yakıt kaydı bulunamadı. Filtreleri temizleyerek tüm yakıt geçmişini görebilirsin.'
                  : 'Litre, tutar, km sayacı ve istasyon bilgisi girdikçe yakıt maliyeti burada analiz edilir.'
              }
              icon={hasActiveFilters ? FileSearch : Fuel}
              title={
                hasActiveFilters
                  ? 'Filtreye uygun yakıt kaydı yok.'
                  : 'Henüz yakıt kaydı yok.'
              }
              tips={
                hasActiveFilters
                  ? ['Tarih aralığını genişlet', 'Yakıt tipi filtresini kaldır']
                  : [
                      'Tutar ve litre gir',
                      'Km sayacını ekle',
                      'Full depo kaydını işaretle'
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

function MetricCard({
  detail = 'Kaydedilmiş gerçek kayıtlar',
  label,
  value
}: {
  detail?: string;
  label: string;
  value: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-card-header">
        <p>{label}</p>
      </div>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}

function buildFuelPayload(
  form: FuelFormState,
  calculatedPricePerLiter: number | null
) {
  return removeEmptyValues({
    amount: normalizeDecimal(form.amount),
    city: form.city.trim(),
    createdAt: toFuelEntryDate(form.createdAt),
    district: form.district.trim(),
    fuelType: form.fuelType,
    fullTank: form.fullTank,
    liters: normalizeDecimal(form.liters),
    odometerKm: normalizeDecimal(form.odometerKm),
    paymentMethod: form.paymentMethod,
    pricePerLiter: calculatedPricePerLiter
      ? calculatedPricePerLiter.toFixed(3)
      : undefined,
    receiptUrl: form.receiptUrl.trim(),
    stationName: form.stationName.trim(),
    tankFillLevel: form.tankFillLevel,
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

function buildFuelMetrics(entries: FuelEntry[], vehicle?: Vehicle) {
  const totals = entries.reduce(
    (currentTotals, entry) => ({
      amount: currentTotals.amount + toNumber(entry.amount),
      liters: currentTotals.liters + toNumber(entry.liters)
    }),
    {
      amount: 0,
      liters: 0
    }
  );
  const fullTankConsumption = calculateFullTankConsumption(entries);
  const vehicleAverageConsumption = toNumber(
    vehicle?.averageConsumptionLPer100Km ?? ''
  );
  const consumptionPer100Km =
    fullTankConsumption ?? (vehicleAverageConsumption > 0
      ? vehicleAverageConsumption
      : 0);
  const consumptionLabel = fullTankConsumption
    ? '100 km tüketim'
    : vehicleAverageConsumption > 0
      ? 'Tahmini tüketim'
      : 'Tüketim verisi yok';
  const consumptionDetail = fullTankConsumption
    ? 'Full depo kayıtlarından hesaplandı'
    : vehicleAverageConsumption > 0
      ? 'Seçili aracın ortalama tüketimi'
      : 'Full depo veya araç ortalaması gerekli';
  const odometerValues = entries
    .map((entry) => toNumber(entry.odometerKm ?? ''))
    .filter((value) => value > 0)
    .sort((first, second) => first - second);
  const kmDelta =
    odometerValues.length >= 2
      ? odometerValues[odometerValues.length - 1] - odometerValues[0]
      : 0;

  return {
    ...totals,
    averagePricePerLiter: totals.liters > 0 ? totals.amount / totals.liters : 0,
    consumptionDetail,
    consumptionLabel,
    consumptionPer100Km,
    costPerKm: kmDelta > 0 ? totals.amount / kmDelta : 0
  };
}

function calculateFullTankConsumption(entries: FuelEntry[]) {
  const orderedFullTankEntries = entries
    .filter((entry) => entry.fullTank && toNumber(entry.odometerKm ?? '') > 0)
    .sort(
      (first, second) =>
        toNumber(first.odometerKm ?? '') - toNumber(second.odometerKm ?? '')
    );

  if (orderedFullTankEntries.length < 2) {
    return null;
  }

  const start = orderedFullTankEntries[orderedFullTankEntries.length - 2];
  const end = orderedFullTankEntries[orderedFullTankEntries.length - 1];
  const startKm = toNumber(start.odometerKm ?? '');
  const endKm = toNumber(end.odometerKm ?? '');
  const kmDelta = endKm - startKm;

  if (kmDelta <= 0) {
    return null;
  }

  const litersBetweenFullTanks = entries
    .filter((entry) => {
      const odometerKm = toNumber(entry.odometerKm ?? '');

      return odometerKm > startKm && odometerKm <= endKm;
    })
    .reduce((total, entry) => total + toNumber(entry.liters), 0);

  if (litersBetweenFullTanks <= 0) {
    return null;
  }

  return (litersBetweenFullTanks / kmDelta) * 100;
}

function calculateLivePricePerLiter(amountValue: string, litersValue: string) {
  const amount = toNumber(normalizeDecimal(amountValue) ?? '');
  const liters = toNumber(normalizeDecimal(litersValue) ?? '');
  const pricePerLiter = liters > 0 ? amount / liters : 0;

  if (amount <= 0 || liters <= 0 || !Number.isFinite(pricePerLiter)) {
    return null;
  }

  return pricePerLiter;
}

function validateFuelForm(
  form: FuelFormState,
  calculatedPricePerLiter: number | null
) {
  if (!form.vehicleId) {
    return 'Araç zorunlu.';
  }

  if (!form.createdAt) {
    return 'Kayıt tarihi zorunlu.';
  }

  if (toNumber(normalizeDecimal(form.amount) ?? '') <= 0) {
    return 'Tutar 0’dan büyük olmalı.';
  }

  if (toNumber(normalizeDecimal(form.liters) ?? '') <= 0) {
    return 'Litre 0’dan büyük olmalı.';
  }

  if (
    form.odometerKm &&
    toNumber(normalizeDecimal(form.odometerKm) ?? '') < 0
  ) {
    return 'Km sayacı negatif olamaz.';
  }

  if (!calculatedPricePerLiter || !Number.isFinite(calculatedPricePerLiter)) {
    return 'Litre fiyatı hesaplanamadı.';
  }

  return null;
}

function isFuelFormDirty(form: FuelFormState, selectedVehicle?: Vehicle) {
  const defaultFuelType = selectedVehicle?.fuelType ?? emptyFuelForm.fuelType;

  return Boolean(
    form.amount ||
      form.city ||
      form.district ||
      form.createdAt !== getLocalDateInputValue() ||
      form.fullTank ||
      form.liters ||
      form.odometerKm ||
      form.paymentMethod !== emptyFuelForm.paymentMethod ||
      form.receiptUrl ||
      form.stationName ||
      form.tankFillLevel ||
      form.fuelType !== defaultFuelType
  );
}

function toFuelEntryDate(date: string) {
  return new Date(`${date}T12:00:00`).toISOString();
}

function getLocalDateInputValue() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;

  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function formatVehicleLabel(vehicle: Vehicle) {
  const name = [vehicle.brand, vehicle.model].filter(Boolean).join(' ');

  return name ? `${vehicle.plateNumber} - ${name}` : vehicle.plateNumber;
}

function formatVehicleName(vehicles: Vehicle[], vehicleId: string) {
  const vehicle = vehicles.find((item) => item.id === vehicleId);

  return vehicle ? formatVehicleLabel(vehicle) : 'Araç';
}

function formatLocation(entry: FuelEntry) {
  const location = [entry.district, entry.city].filter(Boolean).join(' / ');

  return location || 'Konum yok';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short'
  }).format(new Date(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    currency: 'TRY',
    maximumFractionDigits: 2,
    style: 'currency'
  }).format(value);
}

function formatOdometer(value?: string | null) {
  if (!value) {
    return 'Km yok';
  }

  return `${formatNumber(toNumber(value))} km`;
}

function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits
  }).format(value);
}

function normalizeDecimal(value: string) {
  const normalizedValue = value.trim().replace(',', '.');

  return normalizedValue || undefined;
}

function toNumber(value: string) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}
