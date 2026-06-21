'use client';

import { RefreshCw, Route } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getJson } from '../lib/api-client';
import { getAccessToken } from '../lib/auth-storage';

interface KmProfitabilityReport {
  date: string;
  grossIncome: string;
  grossIncomePerKm: string;
  netProfit: string;
  netProfitPerKm: string;
  totalKm: string;
  tripCount: number;
}

interface KmProfitabilityResponse {
  data: KmProfitabilityReport;
}

interface KmProfitTrendPoint {
  date: string;
  netProfit: number;
  netProfitPerKm: number;
  totalKm: number;
  tripCount: number;
}

const trendDays = 30;

export function KmProfitTrendChart() {
  const [points, setPoints] = useState<KmProfitTrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = getAccessToken();

    if (!accessToken) {
      setMessage('Km başı kâr trendini görmek için oturum acmalısın.');
      return;
    }

    void loadKmProfitTrend(accessToken);
  }, []);

  const trend = useMemo(() => fillMissingDays(points, trendDays), [points]);
  const maxKm = Math.max(...trend.map((point) => point.totalKm), 1);
  const totalKm = trend.reduce((sum, point) => sum + point.totalKm, 0);
  const totalNetProfit = trend.reduce((sum, point) => sum + point.netProfit, 0);
  const totalTripCount = trend.reduce((sum, point) => sum + point.tripCount, 0);
  const weightedNetProfitPerKm = totalKm > 0 ? totalNetProfit / totalKm : 0;
  const bestPoint = trend.reduce<KmProfitTrendPoint | null>((best, point) => {
    if (point.totalKm <= 0) {
      return best;
    }

    if (!best || point.netProfitPerKm > best.netProfitPerKm) {
      return point;
    }

    return best;
  }, null);
  const linePoints = buildKmProfitLinePoints(trend);

  async function loadKmProfitTrend(accessToken: string) {
    setIsLoading(true);
    setMessage(null);

    try {
      const endDate = getLocalDateInputValue();
      const startDate = addDays(endDate, -(trendDays - 1));
      const dates = Array.from({ length: trendDays }, (_, index) =>
        addDays(startDate, index)
      );
      const responses = await Promise.all(
        dates.map((date) =>
          getJson<KmProfitabilityResponse>('/reports/km-profitability', {
            accessToken,
            query: {
              date,
              period: 'daily'
            }
          })
        )
      );

      setPoints(
        responses.map((response) => ({
          date: response.data.date,
          netProfit: toNumber(response.data.netProfit),
          netProfitPerKm: toNumber(response.data.netProfitPerKm),
          totalKm: toNumber(response.data.totalKm),
          tripCount: response.data.tripCount
        }))
      );
    } catch (error) {
      setPoints([]);
      setMessage(
        error instanceof Error ? error.message : 'Km başı kâr trendi alınamadı.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="panel fuel-trend-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Km başı kâr trendi</p>
          <h2>Son 30 gün km verimliligi</h2>
        </div>
        <Route aria-hidden="true" className="panel-icon" />
      </div>

      <div className="fuel-trend-summary">
        <div>
          <span>Ağırlıklı km kârı</span>
          <strong>{formatMoney(weightedNetProfitPerKm)}</strong>
        </div>
        <div>
          <span>Toplam net kâr</span>
          <strong>{formatMoney(totalNetProfit)}</strong>
        </div>
        <div>
          <span>Toplam km</span>
          <strong>{formatNumber(totalKm, 1)} km</strong>
        </div>
        <div>
          <span>Sefer</span>
          <strong>{totalTripCount}</strong>
        </div>
      </div>

      {message ? <p className="form-message">{message}</p> : null}

      <div
        className="fuel-trend-chart"
        aria-label="Son 30 gün km başı kâr trendi"
      >
        <div className="fuel-trend-bars">
          {trend.map((point, index) => {
            const height =
              point.totalKm > 0
                ? Math.max((point.totalKm / maxKm) * 100, 6)
                : 0;
            const showLabel =
              index === 0 || index === trend.length - 1 || index % 6 === 0;

            return (
              <div className="fuel-trend-day" key={point.date}>
                <div className="fuel-trend-bar-slot">
                  <span
                    aria-label={`${formatDateLabel(point.date)} toplam km ${formatNumber(point.totalKm, 1)}, km başı kâr ${formatMoney(point.netProfitPerKm)}`}
                    className={
                      point.netProfitPerKm < 0
                        ? 'fuel-trend-bar negative'
                        : 'fuel-trend-bar'
                    }
                    style={{ height: `${height}%` }}
                    title={`${formatDateLabel(point.date)} - ${formatMoney(point.netProfitPerKm)} / km`}
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
            className="fuel-trend-line km-profit-line"
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
          Günlük toplam km
        </span>
        <span>
          <i className="legend-swatch km-profit" />
          Km başı net kâr
        </span>
        {bestPoint ? (
          <span>
            En iyi gün: {formatShortDate(bestPoint.date)} /{' '}
            {formatMoney(bestPoint.netProfitPerKm)}
          </span>
        ) : null}
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

function fillMissingDays(
  points: KmProfitTrendPoint[],
  days: number
): KmProfitTrendPoint[] {
  const endDate = getLocalDateInputValue();
  const startDate = addDays(endDate, -(days - 1));
  const pointsByDate = new Map(points.map((point) => [point.date, point]));

  return Array.from({ length: days }, (_, index) => {
    const date = addDays(startDate, index);

    return (
      pointsByDate.get(date) ?? {
        date,
        netProfit: 0,
        netProfitPerKm: 0,
        totalKm: 0,
        tripCount: 0
      }
    );
  });
}

function buildKmProfitLinePoints(points: KmProfitTrendPoint[]) {
  const activePoints = points.filter((point) => point.totalKm > 0);

  if (activePoints.length < 2) {
    return null;
  }

  const profits = activePoints.map((point) => point.netProfitPerKm);
  const minProfit = Math.min(...profits);
  const maxProfit = Math.max(...profits);
  const profitRange = Math.max(maxProfit - minProfit, 1);
  const maxIndex = Math.max(points.length - 1, 1);

  return activePoints
    .map((point) => {
      const x =
        (points.findIndex((item) => item.date === point.date) / maxIndex) * 100;
      const y = 92 - ((point.netProfitPerKm - minProfit) / profitRange) * 76;

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
    maximumFractionDigits: 2,
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
