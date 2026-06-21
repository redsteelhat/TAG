'use client';

import {
  BellRing,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  FileText,
  ListFilter,
  RefreshCw,
  Shield,
  Wrench
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { EmptyState } from './empty-state';
import { getJson, patchJson } from '../lib/api-client';
import { getAccessToken } from '../lib/auth-storage';

type NotificationType =
  | 'MAINTENANCE_REMINDER'
  | 'INSURANCE_REMINDER'
  | 'TAX_REMINDER'
  | 'PACKAGE_ENDING'
  | 'SYSTEM_ANNOUNCEMENT'
  | 'EXPORT_READY';
type NotificationStatus = 'PENDING' | 'SENT' | 'READ' | 'FAILED';

interface NotificationItem {
  id: string;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  body: string;
  scheduledAt?: string | null;
  sentAt?: string | null;
  readAt?: string | null;
  metadata?: unknown;
  createdAt: string;
}

interface NotificationsResponse {
  data: NotificationItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    unreadCount: number;
  };
}

interface NotificationResponse {
  data: NotificationItem;
}

interface MarkAllReadResponse {
  data: {
    updatedCount: number;
  };
}

const typeLabels: Record<NotificationType, string> = {
  EXPORT_READY: 'Export hazir',
  INSURANCE_REMINDER: 'Sigorta',
  MAINTENANCE_REMINDER: 'Bakim',
  PACKAGE_ENDING: 'Paket bitisi',
  SYSTEM_ANNOUNCEMENT: 'Sistem',
  TAX_REMINDER: 'MTV / vergi'
};

const statusLabels: Record<NotificationStatus, string> = {
  FAILED: 'Hatali',
  PENDING: 'Bekliyor',
  READ: 'Okundu',
  SENT: 'Okunmadi'
};

export function ReminderPanel() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [meta, setMeta] = useState<NotificationsResponse['meta'] | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const metrics = useMemo(() => {
    return items.reduce(
      (totals, item) => ({
        failed: totals.failed + (item.status === 'FAILED' ? 1 : 0),
        pending:
          totals.pending +
          (item.status === 'PENDING' || item.status === 'SENT' ? 1 : 0),
        read: totals.read + (item.status === 'READ' ? 1 : 0)
      }),
      {
        failed: 0,
        pending: 0,
        read: 0
      }
    );
  }, [items]);
  const hasActiveFilters = Boolean(typeFilter || statusFilter || unreadOnly);

  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void fetchNotifications(accessToken);
  }, [accessToken, page]);

  async function fetchNotifications(token = accessToken, pageToLoad = page) {
    if (!token) {
      setMessage('Hatirlaticilari gormek icin once giris yapmalisin.');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await getJson<NotificationsResponse>('/notifications', {
        accessToken: token,
        query: {
          page: pageToLoad,
          pageSize: 10,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          unreadOnly: unreadOnly ? 'true' : undefined
        }
      });

      setItems(response.data);
      setMeta(response.meta);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Hatirlaticilar yuklenemedi.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void fetchNotifications(accessToken, 1);
  }

  async function markAsRead(item: NotificationItem) {
    if (!accessToken || item.status === 'READ') {
      return;
    }

    setUpdatingId(item.id);
    setMessage(null);

    try {
      const response = await patchJson<NotificationResponse>(
        `/notifications/${item.id}/read`,
        {},
        {
          accessToken
        }
      );

      setItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === item.id ? response.data : currentItem
        )
      );
      await fetchNotifications(accessToken, page);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Hatirlatici okundu olarak isaretlenemedi.'
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function markAllAsRead() {
    if (!accessToken) {
      return;
    }

    setIsMarkingAll(true);
    setMessage(null);

    try {
      const response = await patchJson<MarkAllReadResponse>(
        '/notifications/read-all',
        {},
        {
          accessToken
        }
      );

      setMessage(`${response.data.updatedCount} hatirlatici okundu yapildi.`);
      await fetchNotifications(accessToken, 1);
      setPage(1);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Hatirlaticilar okundu olarak isaretlenemedi.'
      );
    } finally {
      setIsMarkingAll(false);
    }
  }

  return (
    <div className="reminder-page">
      <section className="metric-grid reminder-metrics">
        <article className="metric-card">
          <span>Okunmadi</span>
          <strong>{meta?.unreadCount ?? metrics.pending}</strong>
        </article>
        <article className="metric-card">
          <span>Bu sayfada bekleyen</span>
          <strong>{metrics.pending}</strong>
        </article>
        <article className="metric-card">
          <span>Bu sayfada okunan</span>
          <strong>{metrics.read}</strong>
        </article>
        <article className="metric-card">
          <span>Hatali</span>
          <strong>{metrics.failed}</strong>
        </article>
      </section>

      <section className="panel income-table-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Hatirlaticilar</p>
            <h2>Bildirim ve hatirlatici gecmisi</h2>
          </div>
          <div className="panel-actions">
            <button
              className="secondary-button"
              disabled={isLoading}
              onClick={() => fetchNotifications()}
              type="button"
            >
              <RefreshCw aria-hidden="true" className="inline-icon" />
              Yenile
            </button>
            <button
              className="primary-button"
              disabled={isMarkingAll || (meta?.unreadCount ?? 0) === 0}
              onClick={markAllAsRead}
              type="button"
            >
              <CheckCheck aria-hidden="true" className="inline-icon" />
              Tumunu okundu yap
            </button>
          </div>
        </div>

        <form className="reminder-list-toolbar" onSubmit={handleFilterSubmit}>
          <label>
            Tip
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="">Tumu</option>
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
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
              <option value="SENT">Okunmadi</option>
              <option value="READ">Okundu</option>
              <option value="FAILED">Hatali</option>
            </select>
          </label>

          <label className="checkbox-row reminder-unread-filter">
            <input
              checked={unreadOnly}
              onChange={(event) => setUnreadOnly(event.target.checked)}
              type="checkbox"
            />
            Sadece okunmamis
          </label>

          <button className="secondary-button" type="submit">
            <ListFilter aria-hidden="true" className="inline-icon" />
            Filtrele
          </button>
        </form>

        {message ? <p className="form-message">{message}</p> : null}

        {isLoading ? (
          <div className="data-table-empty">Hatirlaticilar yukleniyor.</div>
        ) : items.length === 0 ? (
          <div className="empty-state-panel compact">
            <EmptyState
              description={
                hasActiveFilters
                  ? 'Bu filtrelerle eslesen hatirlatici bulunamadi. Tip, durum veya okunmamis filtresini temizleyebilirsin.'
                  : 'Yaklasan bakim, sigorta, MTV, paket bitisi ve export hazir bildirimleri burada listelenir.'
              }
              icon={hasActiveFilters ? FileSearch : BellRing}
              title={
                hasActiveFilters
                  ? 'Filtreye uygun hatirlatici yok.'
                  : 'Henuz hatirlatici yok.'
              }
              tips={
                hasActiveFilters
                  ? ['Tip filtresini kaldir', 'Durum filtresini kaldir']
                  : [
                      'Bakim kaydi ekle',
                      'Sabit gider vadesi gir',
                      'Export talebi olustur'
                    ]
              }
            />
          </div>
        ) : (
          <div className="data-table" role="table" aria-label="Hatirlaticilar">
            <div
              className="data-table-row data-table-head reminder-table-row"
              role="row"
            >
              <span>Tip</span>
              <span>Baslik</span>
              <span>Durum</span>
              <span>Zaman</span>
              <span>Meta</span>
              <span>Aksiyon</span>
            </div>

            {items.map((item) => {
              const TypeIcon = iconForType(item.type);

              return (
                <div
                  className="data-table-row reminder-table-row"
                  role="row"
                  key={item.id}
                >
                  <span className="reminder-type-cell">
                    <TypeIcon aria-hidden="true" className="inline-icon" />
                    {typeLabels[item.type]}
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.body}</small>
                  </span>
                  <span>
                    <b
                      className={`reminder-status ${item.status.toLowerCase()}`}
                    >
                      {statusLabels[item.status]}
                    </b>
                  </span>
                  <span>
                    <strong>{formatDateTime(item.createdAt)}</strong>
                    <small>{resolveNotificationTime(item)}</small>
                  </span>
                  <span>{summarizeMetadata(item.metadata)}</span>
                  <span>
                    <button
                      className="secondary-button"
                      disabled={
                        item.status === 'READ' || updatingId === item.id
                      }
                      onClick={() => markAsRead(item)}
                      type="button"
                    >
                      <CheckCircle2
                        aria-hidden="true"
                        className="inline-icon"
                      />
                      Okundu
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="pagination-row">
          <button
            className="secondary-button"
            disabled={!meta?.hasPreviousPage}
            onClick={() =>
              setPage((currentPage) => Math.max(1, currentPage - 1))
            }
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

function iconForType(type: NotificationType) {
  if (type === 'MAINTENANCE_REMINDER') {
    return Wrench;
  }

  if (type === 'INSURANCE_REMINDER') {
    return Shield;
  }

  if (type === 'TAX_REMINDER' || type === 'PACKAGE_ENDING') {
    return CalendarClock;
  }

  if (type === 'EXPORT_READY') {
    return FileText;
  }

  return BellRing;
}

function resolveNotificationTime(item: NotificationItem) {
  if (item.readAt) {
    return `Okundu: ${formatDateTime(item.readAt)}`;
  }

  if (item.sentAt) {
    return `Gonderildi: ${formatDateTime(item.sentAt)}`;
  }

  if (item.scheduledAt) {
    return `Planlandi: ${formatDateTime(item.scheduledAt)}`;
  }

  return 'Zaman yok';
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

function summarizeMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object') {
    return '-';
  }

  const values = Object.entries(metadata as Record<string, unknown>)
    .filter(([, value]) => value !== undefined && value !== null)
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${String(value)}`);

  return values.length > 0 ? values.join(', ') : '-';
}
