'use client';

import {
  Activity,
  AlertTriangle,
  Database,
  FileDown,
  MessageSquare,
  RefreshCw,
  Server,
  Users
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getJson } from '../lib/api-client';
import { getAccessToken } from '../lib/auth-storage';

interface AdminOverviewResponse {
  data: {
    generatedAt: string;
    health: {
      status: 'ok' | 'degraded';
      checks: {
        database: {
          status: 'ok' | 'degraded';
          latencyMs?: number;
        };
        queue: {
          status: 'ok' | 'degraded';
          pendingCount: number;
          failedCount?: number;
        };
      };
    };
    users: {
      total: number;
      active: number;
      new24h: number;
      new7d: number;
      admins: number;
      bySubscription: Record<string, number>;
    };
    records: {
      vehicles: number;
      trips: number;
      expenses: number;
      fuelEntries: number;
      maintenanceEntries: number;
    };
    operations: {
      auditLogs24h: number;
      exportJobs: Record<string, number>;
      failedExports24h: number;
      failedNotifications24h: number;
      pendingNotifications: number;
      queue: {
        activeCount: number;
        pendingCount: number;
        totalCount: number;
        counts: Record<string, number>;
      };
    };
    feedback: {
      open: number;
      recent: Array<{
        id: string;
        createdAt: string;
        rating?: number | null;
        status: string;
        userId: string;
      }>;
    };
    recentUsers: Array<{
      id: string;
      createdAt: string;
      role: string;
      subscriptionStatus: string;
    }>;
  };
}

export function AdminOverviewPanel() {
  const [overview, setOverview] = useState<
    AdminOverviewResponse['data'] | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const riskCount = useMemo(() => {
    if (!overview) {
      return 0;
    }

    return (
      overview.operations.failedExports24h +
      overview.operations.failedNotifications24h +
      (overview.health.status === 'degraded' ? 1 : 0)
    );
  }, [overview]);

  useEffect(() => {
    void fetchOverview();
  }, []);

  async function fetchOverview() {
    const token = getAccessToken();

    if (!token) {
      setMessage(
        'Admin panelini gormek icin admin hesabi ile giris yapmalisin.'
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await getJson<AdminOverviewResponse>('/admin/overview', {
        accessToken: token
      });
      setOverview(response.data);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Admin ozeti yuklenemedi.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <section className="panel admin-empty">Admin ozeti yukleniyor...</section>
    );
  }

  if (!overview) {
    return (
      <section className="panel admin-empty">
        <AlertTriangle className="panel-icon" aria-hidden="true" />
        <strong>Admin paneli acilamadi</strong>
        <p>{message ?? 'Yetki veya baglanti kontrolu gerekli.'}</p>
      </section>
    );
  }

  return (
    <div className="admin-page">
      {message ? <p className="form-error">{message}</p> : null}

      <section className="metric-grid admin-metrics">
        <MetricCard
          icon={Users}
          label="Toplam kullanici"
          value={formatNumber(overview.users.total)}
          detail={`${formatNumber(overview.users.new7d)} yeni / 7 gun`}
        />
        <MetricCard
          icon={Activity}
          label="Sistem durumu"
          value={overview.health.status === 'ok' ? 'OK' : 'Risk'}
          detail={`DB ${overview.health.checks.database.latencyMs ?? 0} ms`}
        />
        <MetricCard
          icon={FileDown}
          label="Export isleri"
          value={formatNumber(totalCount(overview.operations.exportJobs))}
          detail={`${formatNumber(overview.operations.failedExports24h)} hata / 24s`}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Operasyon riski"
          value={formatNumber(riskCount)}
          detail={`${formatNumber(overview.feedback.open)} acik feedback`}
        />
      </section>

      <section className="admin-grid">
        <div className="panel admin-panel">
          <PanelHeader
            icon={Database}
            title="Kayit Sayilari"
            actionLabel="Yenile"
            onAction={fetchOverview}
          />
          <div className="admin-kpi-list">
            <Kpi label="Arac" value={overview.records.vehicles} />
            <Kpi label="Sefer" value={overview.records.trips} />
            <Kpi label="Gider" value={overview.records.expenses} />
            <Kpi label="Yakit" value={overview.records.fuelEntries} />
            <Kpi label="Bakim" value={overview.records.maintenanceEntries} />
          </div>
        </div>

        <div className="panel admin-panel">
          <PanelHeader icon={Server} title="Sistem Kuyrugu" />
          <div className="admin-kpi-list">
            <Kpi label="Aktif" value={overview.operations.queue.activeCount} />
            <Kpi
              label="Bekleyen"
              value={overview.operations.queue.pendingCount}
            />
            <Kpi label="Toplam" value={overview.operations.queue.totalCount} />
            <Kpi label="Audit / 24s" value={overview.operations.auditLogs24h} />
            <Kpi
              label="Bildirim bekleyen"
              value={overview.operations.pendingNotifications}
            />
          </div>
        </div>

        <div className="panel admin-panel">
          <PanelHeader icon={Users} title="Son Kullanicilar" />
          <div className="admin-table" role="table">
            <div className="admin-table-row admin-table-head" role="row">
              <span>ID</span>
              <span>Rol</span>
              <span>Abonelik</span>
              <span>Kayit</span>
            </div>
            {overview.recentUsers.map((user) => (
              <div className="admin-table-row" role="row" key={user.id}>
                <span>{shortId(user.id)}</span>
                <span>{user.role}</span>
                <span>{user.subscriptionStatus}</span>
                <span>{formatDate(user.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel admin-panel">
          <PanelHeader icon={MessageSquare} title="Feedback" />
          {overview.feedback.recent.length === 0 ? (
            <p className="admin-muted">Aktif feedback kaydi yok.</p>
          ) : (
            <div className="admin-table" role="table">
              <div className="admin-table-row admin-table-head" role="row">
                <span>ID</span>
                <span>Durum</span>
                <span>Puan</span>
                <span>Tarih</span>
              </div>
              {overview.feedback.recent.map((item) => (
                <div className="admin-table-row" role="row" key={item.id}>
                  <span>{shortId(item.id)}</span>
                  <span>{item.status}</span>
                  <span>{item.rating ?? '-'}</span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <p className="admin-timestamp">
        Son guncelleme: {formatDateTime(overview.generatedAt)}
      </p>
    </div>
  );
}

function MetricCard({
  detail,
  icon: Icon,
  label,
  value
}: {
  detail: string;
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <p>{label}</p>
        <Icon className="metric-icon" aria-hidden="true" />
      </div>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  );
}

function PanelHeader({
  actionLabel,
  icon: Icon,
  onAction,
  title
}: {
  actionLabel?: string;
  icon: typeof Users;
  onAction?: () => void;
  title: string;
}) {
  return (
    <div className="panel-header">
      <div>
        <Icon className="panel-icon" aria-hidden="true" />
        <h2>{title}</h2>
      </div>
      {actionLabel && onAction ? (
        <button className="secondary-button" type="button" onClick={onAction}>
          <RefreshCw className="button-icon" aria-hidden="true" />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-kpi">
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </div>
  );
}

function totalCount(counts: Record<string, number>) {
  return Object.values(counts).reduce((sum, value) => sum + value, 0);
}

function shortId(id: string) {
  return id.slice(0, 8);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('tr-TR').format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit'
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit'
  }).format(new Date(value));
}
