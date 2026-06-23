"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Database,
  FileDown,
  MessageSquare,
  RefreshCw,
  Server,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getJson } from "../lib/api-client";
import {
  getAccessToken,
  getStoredUserRole,
  isAdminRole,
} from "../lib/auth-storage";

interface AdminOverviewResponse {
  data: {
    generatedAt: string;
    health: {
      status: "ok" | "degraded";
      checks: {
        database: {
          status: "ok" | "degraded";
          latencyMs?: number;
        };
        queue: {
          status: "ok" | "degraded";
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
      apiErrorCount24h: number;
      auditLogs24h: number;
      exportJobs: Record<string, number>;
      failedExports24h: number;
      failedNotifications24h: number;
      paymentSubscriptionIssues: number;
      pendingNotifications: number;
      queue: {
        activeCount: number;
        failedCount?: number;
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
      fullName?: string | null;
      email: string;
      phone?: string | null;
      createdAt: string;
      lastLoginAt?: string | null;
      role: string;
      subscriptionStatus: string;
      vehicleCount: number;
      recordCount: number;
    }>;
  };
}

export function AdminOverviewPanel() {
  const [overview, setOverview] = useState<
    AdminOverviewResponse["data"] | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const risks = useMemo(() => {
    if (!overview) {
      return [];
    }

    return [
      {
        label: "Hatalı dışa aktarma",
        value: overview.operations.failedExports24h,
      },
      {
        label: "Hatalı bildirim işi",
        value: overview.operations.failedNotifications24h,
      },
      {
        label: "API hata sayısı",
        value: overview.operations.apiErrorCount24h,
      },
      {
        label: "DB gecikmesi",
        value: overview.health.checks.database.latencyMs ?? 0,
        suffix: "ms",
      },
      {
        label: "Açık feedback",
        value: overview.feedback.open,
      },
      {
        label: "Ödeme / abonelik riski",
        value: overview.operations.paymentSubscriptionIssues,
      },
    ];
  }, [overview]);
  const riskCount = risks.reduce(
    (total, risk) =>
      total +
      (risk.suffix === "ms"
        ? risk.value > 250
          ? 1
          : 0
        : risk.value > 0
          ? risk.value
          : 0),
    0,
  );

  useEffect(() => {
    void fetchOverview();
  }, []);

  async function fetchOverview() {
    const token = getAccessToken();

    if (!token) {
      setMessage(
        "Admin panelini görmek için admin hesabı ile giriş yapmalısın.",
      );
      setIsLoading(false);
      return;
    }

    const role = getStoredUserRole();

    if (role && !isAdminRole(role)) {
      setIsForbidden(true);
      setMessage("Bu sayfaya erişmek için ADMIN rolü gerekli.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setIsForbidden(false);

    try {
      const response = await getJson<AdminOverviewResponse>("/admin/overview", {
        accessToken: token,
      });
      setOverview(response.data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Admin özeti yüklenemedi.";

      if (/admin role|credentials|unauthorized|forbidden/i.test(errorMessage)) {
        setIsForbidden(true);
        setMessage("Bu sayfaya erişmek için ADMIN rolü gerekli.");
      } else {
        setMessage("Admin özeti yüklenemedi. Bağlantı ve yetkiyi kontrol et.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <section className="panel admin-empty">Admin özeti yükleniyor...</section>
    );
  }

  if (!overview) {
    return (
      <section className="panel admin-empty">
        <AlertTriangle className="panel-icon" aria-hidden="true" />
        <strong>
          {isForbidden ? "403 - Yetkisiz erişim" : "Admin paneli açılamadı"}
        </strong>
        <p>{message ?? "Yetki veya bağlantı kontrolü gerekli."}</p>
        {isForbidden ? (
          <Link className="secondary-button button-link" href="/">
            Ana panele dön
          </Link>
        ) : null}
      </section>
    );
  }

  return (
    <div className="admin-page">
      {message ? <p className="form-error">{message}</p> : null}

      <section className="metric-grid admin-metrics">
        <MetricCard
          icon={Users}
          label="Toplam kullanıcı"
          value={formatNumber(overview.users.total)}
          detail={`${formatNumber(overview.users.new7d)} yeni / 7 gün`}
        />
        <MetricCard
          icon={Activity}
          label="Sistem durumu"
          value={overview.health.status === "ok" ? "OK" : "Risk"}
          detail={`DB ${overview.health.checks.database.latencyMs ?? 0} ms`}
        />
        <MetricCard
          icon={FileDown}
          label="Dışa aktarma işleri"
          value={formatNumber(totalCount(overview.operations.exportJobs))}
          detail={`${formatNumber(overview.operations.failedExports24h)} hata / 24s`}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Operasyon riski"
          value={formatNumber(riskCount)}
          detail={`${formatNumber(overview.feedback.open)} açık feedback`}
        />
      </section>

      <section className="admin-grid">
        <div className="panel admin-panel">
          <PanelHeader
            icon={Database}
            title="Kayıt Sayıları"
            actionLabel="Yenile"
            onAction={fetchOverview}
          />
          <div className="admin-kpi-list">
            <Kpi label="Araç" value={overview.records.vehicles} />
            <Kpi label="Sefer" value={overview.records.trips} />
            <Kpi label="Gider" value={overview.records.expenses} />
            <Kpi label="Yakıt" value={overview.records.fuelEntries} />
            <Kpi label="Bakım" value={overview.records.maintenanceEntries} />
          </div>
        </div>

        <div className="panel admin-panel">
          <PanelHeader icon={Server} title="Sistem Kuyruğu" />
          <div className="admin-kpi-list">
            <Kpi label="Aktif" value={overview.operations.queue.activeCount} />
            <Kpi
              label="Bekleyen"
              value={overview.operations.queue.pendingCount}
            />
            <Kpi
              label="Tamamlanan"
              value={overview.operations.queue.counts.COMPLETED ?? 0}
            />
            <Kpi
              label="Hatalı"
              value={
                overview.operations.queue.failedCount ??
                overview.operations.queue.counts.FAILED ??
                0
              }
            />
            <Kpi
              label="Bildirim bekleyen"
              value={overview.operations.pendingNotifications}
            />
          </div>
        </div>

        <div className="panel admin-panel">
          <PanelHeader icon={Users} title="Son Kullanıcılar" />
          <div className="admin-table" role="table">
            <div
              className="admin-table-row admin-table-head admin-user-table-row"
              role="row"
            >
              <span>Ad soyad</span>
              <span>E-posta</span>
              <span>Telefon</span>
              <span>Rol</span>
              <span>Abonelik</span>
              <span>Kayıt</span>
              <span>Son giriş</span>
              <span>Araç</span>
              <span>Kayıt</span>
            </div>
            {overview.recentUsers.map((user) => (
              <div
                className="admin-table-row admin-user-table-row"
                role="row"
                key={user.id}
              >
                <span>{user.fullName ?? "-"}</span>
                <span>{maskEmail(user.email)}</span>
                <span>{maskPhone(user.phone)}</span>
                <span>{formatRole(user.role)}</span>
                <span>{formatSubscription(user.subscriptionStatus)}</span>
                <span>{formatDate(user.createdAt)}</span>
                <span>
                  {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "-"}
                </span>
                <span>{formatNumber(user.vehicleCount)}</span>
                <span>{formatNumber(user.recordCount)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel admin-panel">
          <PanelHeader icon={AlertTriangle} title="Operasyon Riski" />
          <div className="admin-risk-grid">
            {risks.map((risk) => (
              <Kpi
                key={risk.label}
                label={risk.label}
                value={risk.value}
                suffix={risk.suffix}
              />
            ))}
          </div>
          <p className="admin-muted">
            Kullanıcı finansal tutarları bu panelde gösterilmez; yalnızca
            operasyonel sayımlar ve sistem riskleri izlenir.
          </p>
        </div>
      </section>

      <section className="panel admin-panel">
        <PanelHeader icon={MessageSquare} title="Açık Feedback" />
        {overview.feedback.recent.length === 0 ? (
          <p className="admin-muted">Aktif feedback kaydı yok.</p>
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
                <span>{item.rating ?? "-"}</span>
                <span>{formatDate(item.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="admin-timestamp">
        Son güncelleme: {formatDateTime(overview.generatedAt)}
      </p>
    </div>
  );
}

function MetricCard({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: LucideIcon;
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
  title,
}: {
  actionLabel?: string;
  icon: LucideIcon;
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

function Kpi({
  label,
  suffix,
  value,
}: {
  label: string;
  suffix?: string;
  value: number;
}) {
  return (
    <div className="admin-kpi">
      <span>{label}</span>
      <strong>
        {formatNumber(value)}
        {suffix ?? ""}
      </strong>
    </div>
  );
}

function totalCount(counts: Record<string, number>) {
  return Object.values(counts).reduce((sum, value) => sum + value, 0);
}

function shortId(id: string) {
  return id.slice(0, 8);
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");

  if (!name || !domain) {
    return email;
  }

  return `${name.slice(0, 2)}***@${domain}`;
}

function maskPhone(phone?: string | null) {
  if (!phone) {
    return "-";
  }

  return `${phone.slice(0, 5)} *** ${phone.slice(-2)}`;
}

function formatRole(role: string) {
  if (role === "SUPER_ADMIN") {
    return "Süper admin";
  }

  return role === "ADMIN" ? "Admin" : "Kullanıcı";
}

function formatSubscription(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Aktif",
    CANCELED: "İptal",
    EXPIRED: "Süresi doldu",
    PAST_DUE: "Ödeme riski",
    TRIAL: "Deneme",
  };

  return labels[status] ?? status;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}
