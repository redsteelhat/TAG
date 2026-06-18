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

type AllocationType = 'IMMEDIATE' | 'DAILY' | 'MONTHLY' | 'PER_KM';
type ExpenseType =
  | 'VARIABLE'
  | 'FIXED'
  | 'SEMI_VARIABLE'
  | 'PLATFORM_PACKAGE'
  | 'FINANCING'
  | 'DEPRECIATION'
  | 'OPERATIONAL';
type PaymentMethod = 'CASH' | 'CARD' | 'DIGITAL' | 'MIXED' | 'OTHER';
type SortDirection = 'asc' | 'desc';
type ExpenseSortBy = 'amount' | 'createdAt' | 'expenseDate';

interface Expense {
  id: string;
  vehicleId: string;
  categoryId?: string | null;
  expenseType: ExpenseType;
  amount: string;
  expenseDate: string;
  allocationType: AllocationType;
  allocationPeriodStart?: string | null;
  allocationPeriodEnd?: string | null;
  odometerKm?: string | null;
  isRecurring: boolean;
  paymentMethod?: PaymentMethod | null;
  receiptUrl?: string | null;
  note?: string | null;
}

interface Vehicle {
  id: string;
  plateNumber: string;
  brand?: string | null;
  model?: string | null;
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
  expenseType?: ExpenseType | null;
  isActive: boolean;
}

interface ExpensesResponse {
  data: Expense[];
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

interface CategoriesResponse {
  data: Category[];
}

interface ExpenseFilterValues {
  allocationType: string;
  categoryId: string;
  endDate: string;
  expenseType: string;
  maxAmount: string;
  minAmount: string;
  paymentMethod: string;
  q: string;
  sortBy: ExpenseSortBy;
  sortDirection: SortDirection;
  startDate: string;
  vehicleId: string;
}

const allocationTypeLabels: Record<AllocationType, string> = {
  DAILY: 'Gunluk',
  IMMEDIATE: 'Anlik',
  MONTHLY: 'Aylik',
  PER_KM: 'Km bazli'
};

const expenseTypeLabels: Record<ExpenseType, string> = {
  DEPRECIATION: 'Amortisman',
  FINANCING: 'Finansman',
  FIXED: 'Sabit',
  OPERATIONAL: 'Operasyon',
  PLATFORM_PACKAGE: 'Paket',
  SEMI_VARIABLE: 'Yari degisken',
  VARIABLE: 'Degisken'
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CARD: 'Kart',
  CASH: 'Nakit',
  DIGITAL: 'Dijital',
  MIXED: 'Karma',
  OTHER: 'Diger'
};

const sortOptions: Array<{ label: string; value: ExpenseSortBy }> = [
  { label: 'Gider tarihi', value: 'expenseDate' },
  { label: 'Tutar', value: 'amount' },
  { label: 'Olusturma tarihi', value: 'createdAt' }
];

export function ExpenseList() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [meta, setMeta] = useState<ExpensesResponse['meta'] | null>(null);
  const [vehicleId, setVehicleId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [expenseType, setExpenseType] = useState('');
  const [allocationType, setAllocationType] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [q, setQ] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState<ExpenseSortBy>('expenseDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const pageMetrics = useMemo(() => {
    return expenses.reduce(
      (totals, expense) => {
        const amount = toNumber(expense.amount);

        return {
          recurringTotal: totals.recurringTotal + (expense.isRecurring ? amount : 0),
          totalAmount: totals.totalAmount + amount,
          variableTotal:
            totals.variableTotal +
            (expense.expenseType === 'VARIABLE' ? amount : 0)
        };
      },
      {
        recurringTotal: 0,
        totalAmount: 0,
        variableTotal: 0
      }
    );
  }, [expenses]);

  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void fetchReferenceData(accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void fetchExpenses(accessToken);
  }, [accessToken, page, sortBy, sortDirection]);

  async function fetchReferenceData(token = accessToken) {
    if (!token) {
      return;
    }

    try {
      const [vehiclesResponse, categoriesResponse] = await Promise.all([
        getJson<VehiclesResponse>('/vehicles', {
          accessToken: token
        }),
        getJson<CategoriesResponse>('/categories', {
          accessToken: token,
          query: {
            pageSize: 100,
            sortBy: 'name',
            sortDirection: 'asc'
          }
        })
      ]);

      setVehicles(vehiclesResponse.data);
      setCategories(categoriesResponse.data);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Filtre verileri yuklenemedi.'
      );
    }
  }

  async function fetchExpenses(
    token = accessToken,
    pageToLoad = page,
    filters: ExpenseFilterValues = {
      allocationType,
      categoryId,
      endDate,
      expenseType,
      maxAmount,
      minAmount,
      paymentMethod,
      q,
      sortBy,
      sortDirection,
      startDate,
      vehicleId
    }
  ) {
    if (!token) {
      setMessage('Gider listesini gormek icin once giris yapmalisin.');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await getJson<ExpensesResponse>('/expenses', {
        accessToken: token,
        query: {
          allocationType: filters.allocationType || undefined,
          categoryId: filters.categoryId || undefined,
          endDate: filters.endDate,
          expenseType: filters.expenseType || undefined,
          maxAmount: normalizeDecimal(filters.maxAmount),
          minAmount: normalizeDecimal(filters.minAmount),
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

      setExpenses(response.data);
      setMeta(response.meta);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Giderler yuklenemedi.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void fetchExpenses(accessToken, 1);
  }

  function clearFilters() {
    const clearedFilters: ExpenseFilterValues = {
      allocationType: '',
      categoryId: '',
      endDate: '',
      expenseType: '',
      maxAmount: '',
      minAmount: '',
      paymentMethod: '',
      q: '',
      sortBy: 'expenseDate',
      sortDirection: 'desc',
      startDate: '',
      vehicleId: ''
    };

    setVehicleId('');
    setCategoryId('');
    setExpenseType('');
    setAllocationType('');
    setPaymentMethod('');
    setQ('');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('expenseDate');
    setSortDirection('desc');
    setPage(1);
    void fetchExpenses(accessToken, 1, clearedFilters);
  }

  if (!accessToken) {
    return (
      <section className="panel empty-state-panel">
        <p className="eyebrow">Oturum gerekli</p>
        <h2>Gider listesini gormek icin giris yap.</h2>
        <p>Token bulunamadigi icin API’den gider verisi cekilmedi.</p>
      </section>
    );
  }

  return (
    <section className="income-list-page">
      <section className="metric-grid income-metrics" aria-label="Gider ozeti">
        <MetricCard
          label="Goruntulenen gider"
          value={formatMoney(pageMetrics.totalAmount)}
        />
        <MetricCard
          label="Degisken gider"
          value={formatMoney(pageMetrics.variableTotal)}
        />
        <MetricCard
          label="Tekrarlayan gider"
          value={formatMoney(pageMetrics.recurringTotal)}
        />
        <MetricCard
          label="Kayit sayisi"
          value={`${expenses.length}`}
        />
      </section>

      <section className="panel">
        <form className="expense-list-toolbar" onSubmit={handleFilterSubmit}>
          <label className="toolbar-search">
            <Search aria-hidden="true" />
            <input
              onChange={(event) => setQ(event.target.value)}
              placeholder="Not veya fis ara"
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
            Kategori
            <select
              onChange={(event) => setCategoryId(event.target.value)}
              value={categoryId}
            >
              <option value="">Tum kategoriler</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tip
            <select
              onChange={(event) => setExpenseType(event.target.value)}
              value={expenseType}
            >
              <option value="">Tum tipler</option>
              {Object.entries(expenseTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Dagitim
            <select
              onChange={(event) => setAllocationType(event.target.value)}
              value={allocationType}
            >
              <option value="">Tum dagitimlar</option>
              {Object.entries(allocationTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
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
                setSortBy(event.target.value as ExpenseSortBy)
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
            <p className="eyebrow">Gider kayitlari</p>
            <h2>Gider listesi</h2>
          </div>
          <span className="status-pill">
            {meta ? `${meta.total} kayit` : 'Hazirlaniyor'}
          </span>
        </div>

        {message ? <p className="form-alert">{message}</p> : null}

        {expenses.length > 0 ? (
          <div className="data-table" role="table" aria-label="Giderler">
            <div
              className="data-table-row data-table-head expense-table-row"
              role="row"
            >
              <span>Tarih</span>
              <span>Kategori</span>
              <span>Tip</span>
              <span>Dagitim</span>
              <span>Odeme</span>
              <span>Arac</span>
              <span>Durum</span>
              <span>Tutar</span>
            </div>

            {expenses.map((expense) => (
              <div
                className="data-table-row expense-table-row"
                role="row"
                key={expense.id}
              >
                <span>
                  <strong>{formatDate(expense.expenseDate)}</strong>
                  <small>{formatOdometer(expense.odometerKm)}</small>
                </span>
                <span>
                  <strong>{categoryNameById(categories, expense.categoryId)}</strong>
                  <small>{expense.note || 'Not yok'}</small>
                </span>
                <span>{expenseTypeLabels[expense.expenseType]}</span>
                <span>{allocationTypeLabels[expense.allocationType]}</span>
                <span>
                  {expense.paymentMethod
                    ? paymentMethodLabels[expense.paymentMethod]
                    : 'Yok'}
                </span>
                <span>{vehicleNameById(vehicles, expense.vehicleId)}</span>
                <span>
                  <span
                    className={
                      expense.isRecurring
                        ? 'status-pill compact active'
                        : 'status-pill compact completed'
                    }
                  >
                    {expense.isRecurring ? 'Tekrarlayan' : 'Tekil'}
                  </span>
                </span>
                <b>{formatMoney(toNumber(expense.amount))}</b>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-panel compact">
            <Plus aria-hidden="true" className="panel-icon" />
            <h2>Henuz gider kaydi yok.</h2>
            <p>
              Yakit disi giderler, sabit giderler ve operasyon maliyetleri
              burada listelenecek.
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

function categoryNameById(categories: Category[], categoryId?: string | null) {
  if (!categoryId) {
    return 'Kategori yok';
  }

  return categories.find((category) => category.id === categoryId)?.name ?? 'Kategori';
}

function vehicleNameById(vehicles: Vehicle[], vehicleId: string) {
  const vehicle = vehicles.find((item) => item.id === vehicleId);

  return vehicle ? formatVehicleLabel(vehicle) : 'Arac';
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

function formatMoney(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    currency: 'TRY',
    maximumFractionDigits: 0,
    style: 'currency'
  }).format(value);
}

function formatOdometer(value?: string | null) {
  if (!value) {
    return 'Km yok';
  }

  return `${formatNumber(toNumber(value))} km`;
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

function normalizeDecimal(value: string) {
  const normalizedValue = value.trim().replace(',', '.');

  return normalizedValue || undefined;
}
