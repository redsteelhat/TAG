'use client';

import {
  ChevronLeft,
  ChevronRight,
  FileSearch,
  LockKeyhole,
  ListFilter,
  Package,
  RefreshCw,
  Save,
  Search
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { EmptyState } from './empty-state';
import { getJson, postJson } from '../lib/api-client';
import { getAccessToken } from '../lib/auth-storage';

type AllocationMethod = 'PER_DAY' | 'PER_TRIP' | 'PER_KM';
type SortDirection = 'asc' | 'desc';
type PackageSortBy = 'amount' | 'createdAt' | 'endsAt' | 'startsAt';

interface TagPackage {
  id: string;
  vehicleId: string;
  name: string;
  amount: string;
  startsAt: string;
  endsAt: string;
  durationDays: number;
  dailyCost: string;
  allocationMethod: AllocationMethod;
  breakEvenTarget?: string | null;
  isActive: boolean;
  note?: string | null;
}

interface Vehicle {
  id: string;
  plateNumber: string;
  brand?: string | null;
  model?: string | null;
  isActive: boolean;
}

interface TagPackagesResponse {
  data: TagPackage[];
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

interface TagPackageResponse {
  data: TagPackage;
}

interface PackageFilterValues {
  allocationMethod: string;
  endDate: string;
  isActive: string;
  maxAmount: string;
  minAmount: string;
  q: string;
  sortBy: PackageSortBy;
  sortDirection: SortDirection;
  startDate: string;
  vehicleId: string;
}

interface PackageFormState {
  allocationMethod: AllocationMethod;
  amount: string;
  breakEvenTarget: string;
  durationDays: string;
  endsAt: string;
  isActive: boolean;
  name: string;
  note: string;
  startsAt: string;
  vehicleId: string;
}

const allocationMethodLabels: Record<AllocationMethod, string> = {
  PER_DAY: 'Gune bol',
  PER_KM: 'Km’ye bol',
  PER_TRIP: 'Sefere bol'
};

const sortOptions: Array<{ label: string; value: PackageSortBy }> = [
  { label: 'Baslangic tarihi', value: 'startsAt' },
  { label: 'Bitis tarihi', value: 'endsAt' },
  { label: 'Tutar', value: 'amount' },
  { label: 'Olusturma tarihi', value: 'createdAt' }
];

const today = new Date().toISOString().slice(0, 10);
const defaultEndDate = addDays(today, 6);

const emptyPackageForm: PackageFormState = {
  allocationMethod: 'PER_DAY',
  amount: '',
  breakEvenTarget: '',
  durationDays: '',
  endsAt: defaultEndDate,
  isActive: true,
  name: 'Haftalik TAG paketi',
  note: '',
  startsAt: today,
  vehicleId: ''
};

export function PackagePanel() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [packages, setPackages] = useState<TagPackage[]>([]);
  const [meta, setMeta] = useState<TagPackagesResponse['meta'] | null>(null);
  const [packageForm, setPackageForm] =
    useState<PackageFormState>(emptyPackageForm);
  const [vehicleId, setVehicleId] = useState('');
  const [allocationMethod, setAllocationMethod] = useState('');
  const [isActive, setIsActive] = useState('');
  const [q, setQ] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState<PackageSortBy>('startsAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingPackage, setIsSavingPackage] = useState(false);

  const pageMetrics = useMemo(() => {
    return packages.reduce(
      (totals, item) => ({
        activeCount: totals.activeCount + (item.isActive ? 1 : 0),
        breakEvenTarget:
          totals.breakEvenTarget + toNumber(item.breakEvenTarget ?? '0'),
        dailyCost: totals.dailyCost + toNumber(item.dailyCost),
        totalAmount: totals.totalAmount + toNumber(item.amount)
      }),
      {
        activeCount: 0,
        breakEvenTarget: 0,
        dailyCost: 0,
        totalAmount: 0
      }
    );
  }, [packages]);
  const hasActiveFilters = Boolean(
    vehicleId ||
    allocationMethod ||
    isActive ||
    q.trim() ||
    startDate ||
    endDate ||
    minAmount ||
    maxAmount
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

    void fetchPackages(accessToken);
  }, [accessToken, page, sortBy, sortDirection]);

  useEffect(() => {
    if (packageForm.vehicleId || vehicles.length === 0) {
      return;
    }

    const activeVehicle = vehicles.find((vehicle) => vehicle.isActive);

    setPackageForm((currentForm) => ({
      ...currentForm,
      vehicleId: activeVehicle?.id ?? vehicles[0].id
    }));
  }, [packageForm.vehicleId, vehicles]);

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
        error instanceof Error ? error.message : 'Araclar yuklenemedi.'
      );
    }
  }

  async function fetchPackages(
    token = accessToken,
    pageToLoad = page,
    filters: PackageFilterValues = {
      allocationMethod,
      endDate,
      isActive,
      maxAmount,
      minAmount,
      q,
      sortBy,
      sortDirection,
      startDate,
      vehicleId
    }
  ) {
    if (!token) {
      setMessage('Paket giderlerini gormek icin once giris yapmalisin.');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await getJson<TagPackagesResponse>('/tag-packages', {
        accessToken: token,
        query: {
          allocationMethod: filters.allocationMethod || undefined,
          endDate: filters.endDate,
          isActive: filters.isActive || undefined,
          maxAmount: normalizeDecimal(filters.maxAmount),
          minAmount: normalizeDecimal(filters.minAmount),
          page: pageToLoad,
          pageSize: 10,
          q: filters.q.trim() || undefined,
          sortBy: filters.sortBy,
          sortDirection: filters.sortDirection,
          startDate: filters.startDate,
          vehicleId: filters.vehicleId || undefined
        }
      });

      setPackages(response.data);
      setMeta(response.meta);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Paketler yuklenemedi.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePackageSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setFormMessage('Paket kaydetmek icin once giris yapmalisin.');
      return;
    }

    if (!packageForm.vehicleId) {
      setFormMessage('Paket kaydetmek icin once arac secmelisin.');
      return;
    }

    setIsSavingPackage(true);
    setFormMessage(null);

    try {
      await postJson<TagPackageResponse>(
        '/tag-packages',
        buildPackagePayload(packageForm),
        { accessToken }
      );

      setFormMessage('Paket kaydi olusturuldu.');
      resetPackageForm();
      setPage(1);
      await fetchPackages(accessToken, 1);
    } catch (error) {
      setFormMessage(
        error instanceof Error ? error.message : 'Paket kaydedilemedi.'
      );
    } finally {
      setIsSavingPackage(false);
    }
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void fetchPackages(accessToken, 1);
  }

  function clearFilters() {
    const clearedFilters: PackageFilterValues = {
      allocationMethod: '',
      endDate: '',
      isActive: '',
      maxAmount: '',
      minAmount: '',
      q: '',
      sortBy: 'startsAt',
      sortDirection: 'desc',
      startDate: '',
      vehicleId: ''
    };

    setVehicleId('');
    setAllocationMethod('');
    setIsActive('');
    setQ('');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('startsAt');
    setSortDirection('desc');
    setPage(1);
    void fetchPackages(accessToken, 1, clearedFilters);
  }

  function resetPackageForm() {
    const activeVehicle = vehicles.find((vehicle) => vehicle.isActive);

    setPackageForm({
      ...emptyPackageForm,
      endsAt: addDays(today, 6),
      startsAt: today,
      vehicleId: activeVehicle?.id ?? vehicles[0]?.id ?? ''
    });
  }

  function updatePackageForm<Key extends keyof PackageFormState>(
    key: Key,
    value: PackageFormState[Key]
  ) {
    setPackageForm((currentForm) => ({
      ...currentForm,
      [key]: value
    }));
  }

  if (!accessToken) {
    return (
      <section className="panel empty-state-panel">
        <EmptyState
          actionHref="/login"
          actionLabel="Giris ekranina git"
          description="Paket payi, gunluk dagitim ve break-even hesaplarini gorebilmek icin aktif oturum gerekiyor."
          eyebrow="Oturum gerekli"
          icon={LockKeyhole}
          title="Paket giderlerini gormek icin giris yap."
        />
      </section>
    );
  }

  return (
    <section className="income-list-page">
      <section className="metric-grid income-metrics" aria-label="Paket ozeti">
        <MetricCard
          label="Goruntulenen paket"
          value={formatMoney(pageMetrics.totalAmount)}
        />
        <MetricCard
          label="Gunluk paket payi"
          value={formatMoney(pageMetrics.dailyCost)}
        />
        <MetricCard
          label="Break-even hedefi"
          value={formatMoney(pageMetrics.breakEvenTarget)}
        />
        <MetricCard label="Aktif paket" value={`${pageMetrics.activeCount}`} />
      </section>

      <section className="panel data-form quick-expense-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Paket girisi</p>
            <h2>Paket gideri ekle</h2>
          </div>
          <span className="status-pill">
            {packageForm.amount && packageForm.startsAt && packageForm.endsAt
              ? `${formatMoney(calculateDailyCost(packageForm))} / gun`
              : 'Dagitim bekliyor'}
          </span>
        </div>

        <form className="quick-expense-form" onSubmit={handlePackageSubmit}>
          <div className="package-entry-grid">
            <label>
              Arac
              <select
                disabled={vehicles.length === 0}
                onChange={(event) =>
                  updatePackageForm('vehicleId', event.target.value)
                }
                required
                value={packageForm.vehicleId}
              >
                <option value="">Arac sec</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {formatVehicleLabel(vehicle)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Paket adi
              <input
                onChange={(event) =>
                  updatePackageForm('name', event.target.value)
                }
                placeholder="Haftalik TAG paketi"
                required
                value={packageForm.name}
              />
            </label>

            <label>
              Paket tutari
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updatePackageForm('amount', event.target.value)
                }
                placeholder="700.00"
                required
                value={packageForm.amount}
              />
            </label>

            <label>
              Baslangic
              <input
                onChange={(event) =>
                  updatePackageForm('startsAt', event.target.value)
                }
                required
                type="date"
                value={packageForm.startsAt}
              />
            </label>

            <label>
              Bitis
              <input
                onChange={(event) =>
                  updatePackageForm('endsAt', event.target.value)
                }
                required
                type="date"
                value={packageForm.endsAt}
              />
            </label>

            <label>
              Gecerlilik gunu
              <input
                inputMode="numeric"
                onChange={(event) =>
                  updatePackageForm('durationDays', event.target.value)
                }
                placeholder={String(calculateDurationDays(packageForm))}
                value={packageForm.durationDays}
              />
            </label>

            <label>
              Dagitim
              <select
                onChange={(event) =>
                  updatePackageForm(
                    'allocationMethod',
                    event.target.value as AllocationMethod
                  )
                }
                value={packageForm.allocationMethod}
              >
                {Object.entries(allocationMethodLabels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Break-even hedefi
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updatePackageForm('breakEvenTarget', event.target.value)
                }
                placeholder="1240.00"
                value={packageForm.breakEvenTarget}
              />
            </label>
          </div>

          <div className="quick-expense-bottom-row">
            <label>
              Not
              <input
                onChange={(event) =>
                  updatePackageForm('note', event.target.value)
                }
                placeholder="Haftalik operasyon paketi"
                value={packageForm.note}
              />
            </label>

            <label className="checkbox-row quick-expense-checkbox">
              <input
                checked={packageForm.isActive}
                onChange={(event) =>
                  updatePackageForm('isActive', event.target.checked)
                }
                type="checkbox"
              />
              Aktif paket
            </label>
          </div>

          {formMessage ? (
            <p
              className={
                formMessage.includes('olusturuldu')
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
              onClick={resetPackageForm}
              type="button"
            >
              Temizle
            </button>
            <button
              className="primary-button"
              disabled={isSavingPackage || vehicles.length === 0}
            >
              <Save aria-hidden="true" className="button-icon" />
              {isSavingPackage ? 'Kaydediliyor' : 'Paket Ekle'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <form className="package-list-toolbar" onSubmit={handleFilterSubmit}>
          <label className="toolbar-search">
            <Search aria-hidden="true" />
            <input
              onChange={(event) => setQ(event.target.value)}
              placeholder="Paket adi veya not ara"
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
            Dagitim
            <select
              onChange={(event) => setAllocationMethod(event.target.value)}
              value={allocationMethod}
            >
              <option value="">Tum dagitimlar</option>
              {Object.entries(allocationMethodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Durum
            <select
              onChange={(event) => setIsActive(event.target.value)}
              value={isActive}
            >
              <option value="">Tum durumlar</option>
              <option value="true">Aktif</option>
              <option value="false">Pasif</option>
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
            Min tutar
            <input
              inputMode="decimal"
              onChange={(event) => setMinAmount(event.target.value)}
              placeholder="100.00"
              value={minAmount}
            />
          </label>

          <label>
            Max tutar
            <input
              inputMode="decimal"
              onChange={(event) => setMaxAmount(event.target.value)}
              placeholder="5000.00"
              value={maxAmount}
            />
          </label>

          <label>
            Sirala
            <select
              onChange={(event) =>
                setSortBy(event.target.value as PackageSortBy)
              }
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
              onClick={clearFilters}
              type="button"
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
            <p className="eyebrow">Paket kayitlari</p>
            <h2>Paket giderleri</h2>
          </div>
          <span className="status-pill">
            {meta ? `${meta.total} kayit` : 'Hazirlaniyor'}
          </span>
        </div>

        {message ? <p className="form-alert">{message}</p> : null}

        {packages.length > 0 ? (
          <div className="data-table" role="table" aria-label="Paket giderleri">
            <div
              className="data-table-row data-table-head package-table-row"
              role="row"
            >
              <span>Paket</span>
              <span>Arac</span>
              <span>Donem</span>
              <span>Dagitim</span>
              <span>Gunluk</span>
              <span>Break-even</span>
              <span>Durum</span>
              <span>Tutar</span>
            </div>

            {packages.map((item) => (
              <div
                className="data-table-row package-table-row"
                role="row"
                key={item.id}
              >
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.note || 'Not yok'}</small>
                </span>
                <span>{vehicleNameById(vehicles, item.vehicleId)}</span>
                <span>
                  <strong>{formatDate(item.startsAt)}</strong>
                  <small>
                    {formatDate(item.endsAt)} - {item.durationDays} gun
                  </small>
                </span>
                <span>{allocationMethodLabels[item.allocationMethod]}</span>
                <span>{formatMoney(toNumber(item.dailyCost))}</span>
                <span>
                  {item.breakEvenTarget
                    ? formatMoney(toNumber(item.breakEvenTarget))
                    : 'Yok'}
                </span>
                <span>
                  <span
                    className={
                      item.isActive
                        ? 'status-pill compact active'
                        : 'status-pill compact completed'
                    }
                  >
                    {item.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </span>
                <b>{formatMoney(toNumber(item.amount))}</b>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-panel compact">
            <EmptyState
              description={
                hasActiveFilters
                  ? 'Bu filtrelerle eslesen paket bulunamadi. Donem veya durum filtresini temizleyerek tekrar deneyebilirsin.'
                  : 'TAG paket, uyelik veya operasyonel kullanim bedellerini eklediginde gunluk pay ve break-even etkisi burada gorunur.'
              }
              icon={hasActiveFilters ? FileSearch : Package}
              title={
                hasActiveFilters
                  ? 'Filtreye uygun paket yok.'
                  : 'Henuz paket kaydi yok.'
              }
              tips={
                hasActiveFilters
                  ? [
                      'Aktif/pasif filtresini kaldir',
                      'Donem araligini genislet'
                    ]
                  : [
                      'Paket tutarini gir',
                      'Baslangic ve bitis sec',
                      'Dagitim metodunu belirle'
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

function buildPackagePayload(form: PackageFormState) {
  return removeEmptyValues({
    allocationMethod: form.allocationMethod,
    amount: normalizeDecimal(form.amount),
    breakEvenTarget: normalizeDecimal(form.breakEvenTarget),
    durationDays: form.durationDays ? Number(form.durationDays) : undefined,
    endsAt: form.endsAt,
    isActive: form.isActive,
    name: form.name.trim(),
    note: form.note.trim(),
    startsAt: form.startsAt,
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

function calculateDailyCost(form: PackageFormState) {
  const amount = toNumber(form.amount);
  const durationDays = form.durationDays
    ? Number(form.durationDays)
    : calculateDurationDays(form);

  return durationDays > 0 ? amount / durationDays : 0;
}

function calculateDurationDays(
  form: Pick<PackageFormState, 'endsAt' | 'startsAt'>
) {
  if (!form.startsAt || !form.endsAt) {
    return 1;
  }

  const start = new Date(form.startsAt);
  const end = new Date(form.endsAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 1;
  }

  const dayMs = 24 * 60 * 60 * 1000;

  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / dayMs) + 1);
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function formatVehicleLabel(vehicle: Vehicle) {
  const name = [vehicle.brand, vehicle.model].filter(Boolean).join(' ');

  return name ? `${vehicle.plateNumber} - ${name}` : vehicle.plateNumber;
}

function vehicleNameById(vehicles: Vehicle[], vehicleId: string) {
  const vehicle = vehicles.find((item) => item.id === vehicleId);

  return vehicle ? formatVehicleLabel(vehicle) : 'Arac';
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
    maximumFractionDigits: 0,
    style: 'currency'
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
