'use client';

import { Fuel, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getJson } from '../lib/api-client';
import { getAccessToken } from '../lib/auth-storage';

interface FuelEntry {
  amount: string;
  createdAt: string;
  id: string;
  liters: string;
  pricePerLiter: string;
}

interface FuelEntriesResponse {
  data: FuelEntry[];
  meta: {
    total: number;
  };
}

interface FuelTrendPoint {
  amount: number;
  averagePricePerLiter: number | null;
  date: string;
  entryCount: number;
  liters: number;
}

const trendDays = 30;

export function FuelTrendChart() {
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = getAccessToken();

    if (!accessToken) {
      setMessage('Yakıt trendini görmek için oturum acmalısın.');
      return;
    }

    void loadFuelTrend(accessToken);
  }, []);

  const trend = useMemo(() => buildFuelTrend(entries, trendDays), [entries]);
  const maxAmount = Math.max(...trend.map((point) => point.amount), 1);
  const totalAmount = trend.reduce((sum, point) => sum + point.amount, 0);
  const totalLiters = trend.reduce((sum, point) => sum + point.liters, 0);
  const totalEntryCount = trend.reduce(
    (sum, point) => sum + point.entryCount,
    0
  );
  const weightedAveragePrice = totalLiters > 0 ? totalAmount / totalLiters : 0;
  const linePoints = buildPriceLinePoints(trend);

  async function loadFuelTrend(accessToken: string) {
    setIsLoading(true);
    setMessage(null);

    try {
      const endDate = getLocalDateInputValue();
      const startDate = addDays(endDate, -(trendDays - 1));
      const response = await getJson<FuelEntriesResponse>('/fuel-entries', {
        accessToken,
        query: {
          endDate,
          page: 1,
          pageSize: 100,
          sortBy: 'createdAt',
          sortDirection: 'asc',
          startDate
        }
      });

      setEntries(response.data);
    } catch (error) {
      setEntries([]);
      setMessage(
        error instanceof Error ? error.message : 'Yakıt trendi alınamadı.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="panel fuel-trend-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Yakıt trendi</p>
          <h2>Son 30 gün yakıt maliyeti</h2>
        </div>
        <Fuel aria-hidden="true" className="panel-icon" />
      </div>

      <div className="fuel-trend-summary">
        <div>
          <span>Toplam yakıt</span>
          <strong>{formatMoney(totalAmount)}</strong>
        </div>
        <div>
          <span>Litre</span>
          <strong>{formatNumber(totalLiters, 1)} L</strong>
        </div>
        <div>
          <span>Ort. litre fiyati</span>
          <strong>{formatMoney(weightedAveragePrice)}</strong>
        </div>
        <div>
          <span>Kayıt</span>
          <strong>{totalEntryCount}</strong>
        </div>
      </div>

      {message ? <p className="form-message">{message}</p> : null}

      <div className="fuel-trend-chart" aria-label="Son 30 gün yakıt trendi">
        <div className="fuel-trend-bars">
          {trend.map((point, index) => {
            const height =
              point.amount > 0
                ? Math.max((point.amount / maxAmount) * 100, 6)
                : 0;
            const showLabel =
              index === 0 || index === trend.length - 1 || index % 6 === 0;

            return (
              <div className="fuel-trend-day" key={point.date}>
                <div className="fuel-trend-bar-slot">
                  <span
                    aria-label={`${formatDateLabel(point.date)} yakıt maliyeti ${formatMoney(point.amount)}`}
                    className="fuel-trend-bar"
                    style={{ height: `${height}%` }}
                    title={`${formatDateLabel(point.date)} - ${formatMoney(point.amount)}`}
                  />
                </div>
                <small>{showLabel ? formatShortDate(point.date) : ''}</small>
              </div>
            );
          })}
        </div>

        {linePoints ? (
          <svg
            aria-hidden="true"
            className="fuel-trend-line"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <polyline points={linePoints} />
          </svg>
        ) : null}
      </div>

      <div className="fuel-trend-legend">
        <span>
          <i className="legend-swatch fuel-cost" />
          Günlük yakıt tutarı
        </span>
        <span>
          <i className="legend-swatch fuel-price" />
          Ortalama litre fiyati
        </span>
        {isLoading ? (
          <span>
            <RefreshCw aria-hidden="true" className="inline-icon" />
            Yükleniyor
          </span>
        ) : null}
      </div>
    </section>
  );
}

function buildFuelTrend(entries: FuelEntry[], days: number): FuelTrendPoint[] {
  const endDate = getLocalDateInputValue();
  const startDate = addDays(endDate, -(days - 1));
  const totalsByDate = new Map<
    string,
    { amount: number; entryCount: number; liters: number }
  >();

  for (const entry of entries) {
    const date = toLocalDateInputValue(new Date(entry.createdAt));
    const current = totalsByDate.get(date) ?? {
      amount: 0,
      entryCount: 0,
      liters: 0
    };

    totalsByDate.set(date, {
      amount: current.amount + toNumber(entry.amount),
      entryCount: current.entryCount + 1,
      liters: current.liters + toNumber(entry.liters)
    });
  }

  return Array.from({ length: days }, (_, index) => {
    const date = addDays(startDate, index);
    const totals = totalsByDate.get(date) ?? {
      amount: 0,
      entryCount: 0,
      liters: 0
    };

    return {
      ...totals,
      averagePricePerLiter:
        totals.liters > 0 ? totals.amount / totals.liters : null,
      date
    };
  });
}

function buildPriceLinePoints(points: FuelTrendPoint[]) {
  const pricedPoints = points.filter(
    (point) => point.averagePricePerLiter !== null
  );

  if (pricedPoints.length < 2) {
    return null;
  }

  const prices = pricedPoints.map((point) => point.averagePricePerLiter ?? 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = Math.max(maxPrice - minPrice, 1);
  const maxIndex = Math.max(points.length - 1, 1);

  return pricedPoints
    .map((point) => {
      const x =
        (points.findIndex((item) => item.date === point.date) / maxIndex) * 100;
      const y =
        92 - (((point.averagePricePerLiter ?? 0) - minPrice) / priceRange) * 76;

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

function getLocalDateInputValue() {
  return toLocalDateInputValue(new Date());
}

function toLocalDateInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;

  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);

  return toLocalDateInputValue(date);
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

function formatDateLabel(dateValue: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long'
  }).format(new Date(`${dateValue}T00:00:00`));
}

function formatShortDate(dateValue: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit'
  }).format(new Date(`${dateValue}T00:00:00`));
}

function toNumber(value: string | number | null | undefined) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}
