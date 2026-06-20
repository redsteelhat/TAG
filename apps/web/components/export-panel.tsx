'use client';

import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  ListFilter,
  RefreshCw,
  Save
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL, getJson, postJson } from '../lib/api-client';
import { getAccessToken } from '../lib/auth-storage';

type ExportFormat = 'PDF' | 'XLSX';
type ExportPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY';
type ExportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
type SortDirection = 'asc' | 'desc';

interface ExportJob {
  id: string;
  format: ExportFormat;
  status: ExportStatus;
  periodStart: string;
  periodEnd: string;
  fileUrl?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

interface ExportJobsResponse {
  data: ExportJob[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface ExportJobResponse {
  data: ExportJob;
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

interface ExportFormState {
  date: string;
  format: ExportFormat;
  includeRawData: boolean;
  month: string;
  period: ExportPeriod;
  vehicleId: string;
  weekStart: string;
}

const today = new Date().toISOString().slice(0, 10);
const currentMonth = today.slice(0, 7);

const emptyForm: ExportFormState = {
  date: today,
  format: 'XLSX',
  includeRawData: true,
  month: currentMonth,
  period: 'MONTHLY',
  vehicleId: '',
  weekStart: today
};

const statusLabels: Record<ExportStatus, string> = {
  COMPLETED: 'Tamamlandi',
  FAILED: 'Hatali',
  PENDING: 'Bekliyor',
  PROCESSING: 'Isleniyor'
};

export function ExportPanel() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [meta, setMeta] = useState<ExportJobsResponse['meta'] | null>(null);
  const [form, setForm] = useState<ExportFormState>(emptyForm);
  const [formatFilter, setFormatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const metrics = useMemo(() => {
    return jobs.reduce(
      (totals, job) => ({
        completed: totals.completed + (job.status === 'COMPLETED' ? 1 : 0),
        failed: totals.failed + (job.status === 'FAILED' ? 1 : 0),
        pending:
          totals.pending +
          (job.status === 'PENDING' || job.status === 'PROCESSING' ? 1 : 0)
      }),
      {
        completed: 0,
        failed: 0,
        pending: 0
      }
    );
  }, [jobs]);

  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void fetchVehicles(accessToken);
    void fetchJobs(accessToken);
  }, [accessToken, page, sortDirection]);

  async function fetchVehicles(token = accessToken) {
    if (!token) {
      return;
    }

    try {
      const response = await getJson<VehiclesResponse>('/vehicles', {
        accessToken: token
      });

      setVehicles(response.data);
      const activeVehicle = response.data.find((vehicle) => vehicle.isActive);

      if (!form.vehicleId && activeVehicle) {
        setForm((currentForm) => ({
          ...currentForm,
          vehicleId: activeVehicle.id
        }));
      }
    } catch {
      // Export can still work without a vehicle filter.
    }
  }

  async function fetchJobs(token = accessToken, pageToLoad = page) {
    if (!token) {
      setMessage('Export gecmisini gormek icin once giris yapmalisin.');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await getJson<ExportJobsResponse>('/exports', {
        accessToken: token,
        query: {
          format: formatFilter || undefined,
          page: pageToLoad,
          pageSize: 10,
          sortDirection,
          status: statusFilter || undefined
        }
      });

      setJobs(response.data);
      setMeta(response.meta);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Export gecmisi yuklenemedi.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setMessage('Export almak icin once giris yapmalisin.');
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await postJson<ExportJobResponse>(
        form.format === 'PDF' ? '/exports/pdf' : '/exports/excel',
        removeEmptyValues({
          date: form.period === 'DAILY' ? form.date : undefined,
          includeRawData: form.includeRawData,
          month: form.period === 'MONTHLY' ? form.month : undefined,
          period: form.period,
          vehicleId: form.vehicleId || undefined,
          weekStart: form.period === 'WEEKLY' ? form.weekStart : undefined
        }),
        {
          accessToken
        }
      );

      setJobs((currentJobs) => [response.data, ...currentJobs].slice(0, 10));
      setMessage('Export talebi kuyruga alindi.');
      setPage(1);
      await fetchJobs(accessToken, 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Export alinamadi.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void fetchJobs(accessToken, 1);
  }

  async function downloadJob(job: ExportJob) {
    if (!accessToken || !job.fileUrl) {
      return;
    }

    setDownloadingId(job.id);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}${job.fileUrl}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Dosya indirilemedi.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = buildFileName(job);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Dosya indirilemedi.');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="export-page">
      <section className="metric-grid export-metrics">
        <article className="metric-card">
          <span>Tamamlanan</span>
          <strong>{metrics.completed}</strong>
        </article>
        <article className="metric-card">
          <span>Kuyrukta / isleniyor</span>
          <strong>{metrics.pending}</strong>
        </article>
        <article className="metric-card">
          <span>Hatali</span>
          <strong>{metrics.failed}</strong>
        </article>
        <article className="metric-card">
          <span>Toplam kayit</span>
          <strong>{meta?.total ?? jobs.length}</strong>
        </article>
      </section>

      <section className="panel export-request-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Rapor dosyasi</p>
            <h2>Export talebi olustur</h2>
          </div>
          <span className="status-pill">Queue ile islenir</span>
        </div>

        <form className="export-request-form data-form" onSubmit={handleSubmit}>
          <div className="export-request-grid">
            <label>
              Format
              <select
                value={form.format}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    format: event.target.value as ExportFormat
                  }))
                }
              >
                <option value="XLSX">Excel XLSX</option>
                <option value="PDF">PDF rapor</option>
              </select>
            </label>

            <label>
              Donem
              <select
                value={form.period}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    period: event.target.value as ExportPeriod
                  }))
                }
              >
                <option value="DAILY">Gunluk</option>
                <option value="WEEKLY">Haftalik</option>
                <option value="MONTHLY">Aylik</option>
              </select>
            </label>

            {form.period === 'MONTHLY' ? (
              <label>
                Ay
                <input
                  type="month"
                  value={form.month}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      month: event.target.value
                    }))
                  }
                />
              </label>
            ) : null}

            {form.period === 'WEEKLY' ? (
              <label>
                Hafta baslangici
                <input
                  type="date"
                  value={form.weekStart}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      weekStart: event.target.value
                    }))
                  }
                />
              </label>
            ) : null}

            {form.period === 'DAILY' ? (
              <label>
                Tarih
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      date: event.target.value
                    }))
                  }
                />
              </label>
            ) : null}

            <label>
              Arac
              <select
                value={form.vehicleId}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    vehicleId: event.target.value
                  }))
                }
              >
                <option value="">Tum araclar</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plateNumber} {vehicle.brand ?? ''} {vehicle.model ?? ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="export-bottom-row">
            <label className="checkbox-row">
              <input
                checked={form.includeRawData}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    includeRawData: event.target.checked
                  }))
                }
                type="checkbox"
              />
              Ham sefer, gider, yakit ve bakim verilerini dahil et
            </label>

            <button className="primary-button" disabled={isSubmitting} type="submit">
              <Save aria-hidden="true" className="inline-icon" />
              {isSubmitting ? 'Kuyruga aliniyor' : 'Export al'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel income-table-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Export gecmisi</p>
            <h2>Dosyalar</h2>
          </div>
          <button
            className="secondary-button"
            disabled={isLoading}
            onClick={() => fetchJobs()}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="inline-icon" />
            Yenile
          </button>
        </div>

        <form className="export-list-toolbar" onSubmit={handleFilterSubmit}>
          <label>
            Format
            <select
              value={formatFilter}
              onChange={(event) => setFormatFilter(event.target.value)}
            >
              <option value="">Tumu</option>
              <option value="XLSX">Excel</option>
              <option value="PDF">PDF</option>
            </select>
          </label>

          <label>
            Durum
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">Tumu</option>
              <option value="PENDING">Bekliyor</option>
              <option value="PROCESSING">Isleniyor</option>
              <option value="COMPLETED">Tamamlandi</option>
              <option value="FAILED">Hatali</option>
            </select>
          </label>

          <label>
            Yon
            <select
              value={sortDirection}
              onChange={(event) =>
                setSortDirection(event.target.value as SortDirection)
              }
            >
              <option value="desc">Yeni once</option>
              <option value="asc">Eski once</option>
            </select>
          </label>

          <button className="secondary-button" type="submit">
            <ListFilter aria-hidden="true" className="inline-icon" />
            Filtrele
          </button>
        </form>

        {message ? <p className="form-message">{message}</p> : null}

        <div className="data-table" role="table" aria-label="Export gecmisi">
          <div className="data-table-row data-table-head export-table-row" role="row">
            <span>Format</span>
            <span>Donem</span>
            <span>Durum</span>
            <span>Olusturma</span>
            <span>Tamamlanma</span>
            <span>Hata</span>
            <span>Indir</span>
          </div>

          {isLoading ? (
            <div className="data-table-empty">Export gecmisi yukleniyor.</div>
          ) : jobs.length === 0 ? (
            <div className="data-table-empty">Export kaydi bulunamadi.</div>
          ) : (
            jobs.map((job) => (
              <div className="data-table-row export-table-row" role="row" key={job.id}>
                <span className="export-format-cell">
                  {job.format === 'PDF' ? (
                    <FileText aria-hidden="true" className="inline-icon" />
                  ) : (
                    <FileSpreadsheet aria-hidden="true" className="inline-icon" />
                  )}
                  {job.format}
                </span>
                <span>
                  <strong>{formatDate(job.periodStart)}</strong>
                  <small>{formatDate(job.periodEnd)}</small>
                </span>
                <span>
                  <b className={`export-status ${job.status.toLowerCase()}`}>
                    {statusLabels[job.status]}
                  </b>
                </span>
                <span>{formatDateTime(job.createdAt)}</span>
                <span>{job.completedAt ? formatDateTime(job.completedAt) : '-'}</span>
                <span>{job.errorMessage ?? '-'}</span>
                <span>
                  <button
                    aria-label="Export indir"
                    className="icon-button"
                    disabled={job.status !== 'COMPLETED' || downloadingId === job.id}
                    onClick={() => downloadJob(job)}
                    type="button"
                  >
                    <Download aria-hidden="true" />
                  </button>
                </span>
              </div>
            ))
          )}
        </div>

        <div className="pagination-row">
          <button
            className="secondary-button"
            disabled={!meta?.hasPreviousPage}
            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="inline-icon" />
            Onceki
          </button>
          <span>
            Sayfa {meta?.page ?? page} / {meta?.totalPages ?? 1}
          </span>
          <button
            className="secondary-button"
            disabled={!meta?.hasNextPage}
            onClick={() => setPage((currentPage) => currentPage + 1)}
            type="button"
          >
            Sonraki
            <ChevronRight aria-hidden="true" className="inline-icon" />
          </button>
        </div>
      </section>
    </div>
  );
}

function buildFileName(job: ExportJob) {
  const extension = job.format === 'PDF' ? 'pdf' : 'xlsx';

  return `tag-finans-${job.periodStart.slice(0, 10)}-${job.periodEnd.slice(0, 10)}.${extension}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(value));
}

function removeEmptyValues(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) => value !== undefined && value !== ''
    )
  );
}
