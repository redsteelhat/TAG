"use client";

import {
  BellRing,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileSearch,
  FileText,
  ListFilter,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "./empty-state";
import { getJson, patchJson } from "../lib/api-client";
import { getAccessToken } from "../lib/auth-storage";

type ReminderScreenTab = "definitions" | "history";
type ReminderType =
  | "MAINTENANCE"
  | "OIL_CHANGE"
  | "TIRE"
  | "INSURANCE"
  | "CASCO"
  | "MTV"
  | "INSPECTION"
  | "PACKAGE_ENDING"
  | "DAILY_GOAL"
  | "FUEL_CONSUMPTION"
  | "EXPORT_READY";
type ReminderRepeat = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "KM";
type ReminderChannel = "IN_APP" | "PUSH" | "EMAIL" | "SMS";
type ReminderSourceModule =
  | "MANUAL"
  | "MAINTENANCE"
  | "FIXED_COST"
  | "PACKAGE"
  | "EXPORT";
type NotificationType =
  | "MAINTENANCE_REMINDER"
  | "INSURANCE_REMINDER"
  | "TAX_REMINDER"
  | "PACKAGE_ENDING"
  | "SYSTEM_ANNOUNCEMENT"
  | "EXPORT_READY";
type NotificationStatus = "PENDING" | "SENT" | "READ" | "FAILED";

interface Vehicle {
  id: string;
  brand?: string | null;
  isActive: boolean;
  model?: string | null;
  plateNumber: string;
}

interface VehiclesResponse {
  data: Vehicle[];
}

interface ReminderDefinition {
  id: string;
  title: string;
  type: ReminderType;
  vehicleId?: string;
  scheduledDate?: string;
  kmThreshold?: string;
  repeat: ReminderRepeat;
  channel: ReminderChannel;
  isActive: boolean;
  note?: string;
  sourceModule: ReminderSourceModule;
  sourceEntityId?: string;
  createdAt: string;
  updatedAt: string;
}

interface ReminderForm {
  title: string;
  type: ReminderType;
  vehicleId: string;
  scheduledDate: string;
  kmThreshold: string;
  repeat: ReminderRepeat;
  channel: ReminderChannel;
  isActive: boolean;
  note: string;
}

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

const reminderStorageKey = "tag-reminder-definitions";

const emptyReminderForm: ReminderForm = {
  channel: "IN_APP",
  isActive: true,
  kmThreshold: "",
  note: "",
  repeat: "NONE",
  scheduledDate: "",
  title: "",
  type: "MAINTENANCE",
  vehicleId: "",
};

const reminderTypeLabels: Record<ReminderType, string> = {
  CASCO: "Kasko",
  DAILY_GOAL: "Günlük hedef",
  EXPORT_READY: "Dışa aktarma hazır",
  FUEL_CONSUMPTION: "Yakıt tüketim uyarısı",
  INSPECTION: "Muayene",
  INSURANCE: "Sigorta",
  MAINTENANCE: "Bakım",
  MTV: "MTV",
  OIL_CHANGE: "Yağ değişimi",
  PACKAGE_ENDING: "Paket bitişi",
  TIRE: "Lastik",
};

const repeatLabels: Record<ReminderRepeat, string> = {
  DAILY: "Günlük",
  KM: "Km eşiğine göre",
  MONTHLY: "Aylık",
  NONE: "Tek sefer",
  WEEKLY: "Haftalık",
  YEARLY: "Yıllık",
};

const channelLabels: Record<ReminderChannel, string> = {
  EMAIL: "E-posta",
  IN_APP: "Uygulama içi",
  PUSH: "Mobil bildirim",
  SMS: "SMS",
};

const sourceModuleLabels: Record<ReminderSourceModule, string> = {
  EXPORT: "Dışa aktarma",
  FIXED_COST: "Sabit gider",
  MAINTENANCE: "Bakım",
  MANUAL: "Manuel",
  PACKAGE: "Paket",
};

const vehicleRequiredReminderTypes = new Set<ReminderType>([
  "MAINTENANCE",
  "OIL_CHANGE",
  "TIRE",
  "INSURANCE",
  "CASCO",
  "MTV",
  "INSPECTION",
  "PACKAGE_ENDING",
  "FUEL_CONSUMPTION",
]);

const typeLabels: Record<NotificationType, string> = {
  EXPORT_READY: "Dışa aktarma hazır",
  INSURANCE_REMINDER: "Sigorta",
  MAINTENANCE_REMINDER: "Bakım",
  PACKAGE_ENDING: "Paket bitişi",
  SYSTEM_ANNOUNCEMENT: "Sistem",
  TAX_REMINDER: "MTV / vergi",
};

const statusLabels: Record<NotificationStatus, string> = {
  FAILED: "Hatalı",
  PENDING: "Bekliyor",
  READ: "Okundu",
  SENT: "Okunmadı",
};

export function ReminderPanel() {
  const [activeTab, setActiveTab] = useState<ReminderScreenTab>("definitions");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [definitions, setDefinitions] = useState<ReminderDefinition[]>([]);
  const [form, setForm] = useState<ReminderForm>(emptyReminderForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [meta, setMeta] = useState<NotificationsResponse["meta"] | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const metrics = useMemo(() => {
    const activeDefinitions = definitions.filter((item) => item.isActive);

    return {
      activeDefinitions: activeDefinitions.length,
      dueSoon: activeDefinitions.filter((item) => isDueSoon(item)).length,
      failed: items.filter((item) => item.status === "FAILED").length,
      pending: items.filter(
        (item) => item.status === "PENDING" || item.status === "SENT",
      ).length,
      read: items.filter((item) => item.status === "READ").length,
    };
  }, [definitions, items]);
  const hasActiveFilters = Boolean(typeFilter || statusFilter || unreadOnly);

  useEffect(() => {
    const token = getAccessToken();

    setAccessToken(token);
    setDefinitions(loadReminderDefinitions());

    if (token) {
      void fetchVehicles(token);
      void fetchNotifications(token);
    }
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void fetchNotifications(accessToken);
  }, [accessToken, page]);

  async function fetchVehicles(token: string) {
    try {
      const response = await getJson<VehiclesResponse>("/vehicles", {
        accessToken: token,
        query: {
          page: 1,
          pageSize: 100,
        },
      });

      setVehicles(response.data.filter((vehicle) => vehicle.isActive));
    } catch {
      setVehicles([]);
    }
  }

  async function fetchNotifications(token = accessToken, pageToLoad = page) {
    return fetchNotificationHistory(token, pageToLoad, {
      status: statusFilter,
      type: typeFilter,
      unreadOnly,
    });
  }

  async function fetchNotificationHistory(
    token: string | null,
    pageToLoad: number,
    filters: {
      status: string;
      type: string;
      unreadOnly: boolean;
    },
  ) {
    if (!token) {
      setMessage("Hatırlatıcıları görmek için önce giriş yapmalısın.");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await getJson<NotificationsResponse>("/notifications", {
        accessToken: token,
        query: {
          page: pageToLoad,
          pageSize: 10,
          status: filters.unreadOnly ? undefined : filters.status || undefined,
          type: filters.type || undefined,
          unreadOnly: filters.unreadOnly ? "true" : undefined,
        },
      });

      setItems(response.data);
      setMeta(response.meta);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Bildirim geçmişi yüklenemedi.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleDefinitionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage(null);

    const validationError = validateReminderForm(form);

    if (validationError) {
      setFormMessage(validationError);
      return;
    }

    const now = new Date().toISOString();
    const nextDefinition: ReminderDefinition = {
      channel: form.channel,
      createdAt:
        definitions.find((definition) => definition.id === editingId)
          ?.createdAt ?? now,
      id: editingId ?? crypto.randomUUID(),
      isActive: form.isActive,
      kmThreshold: normalizeOptional(form.kmThreshold),
      note: normalizeOptional(form.note),
      repeat: form.repeat,
      scheduledDate: normalizeOptional(form.scheduledDate),
      sourceModule: "MANUAL",
      title: form.title.trim(),
      type: form.type,
      updatedAt: now,
      vehicleId: normalizeOptional(form.vehicleId),
    };
    const nextDefinitions = editingId
      ? definitions.map((definition) =>
          definition.id === editingId ? nextDefinition : definition,
        )
      : [nextDefinition, ...definitions];

    persistDefinitions(nextDefinitions);
    setDefinitions(nextDefinitions);
    setForm(emptyReminderForm);
    setEditingId(null);
    setIsFormOpen(false);
    setFormMessage(
      editingId ? "Hatırlatıcı güncellendi." : "Hatırlatıcı eklendi.",
    );
  }

  function beginCreateDefinition() {
    setActiveTab("definitions");
    setEditingId(null);
    setForm(emptyReminderForm);
    setFormMessage(null);
    setIsFormOpen(true);
  }

  function beginEditDefinition(definition: ReminderDefinition) {
    setActiveTab("definitions");
    setEditingId(definition.id);
    setForm({
      channel: definition.channel,
      isActive: definition.isActive,
      kmThreshold: definition.kmThreshold ?? "",
      note: definition.note ?? "",
      repeat: definition.repeat,
      scheduledDate: definition.scheduledDate ?? "",
      title: definition.title,
      type: definition.type,
      vehicleId: definition.vehicleId ?? "",
    });
    setFormMessage(null);
    setIsFormOpen(true);
  }

  function cancelForm() {
    setEditingId(null);
    setForm(emptyReminderForm);
    setFormMessage(null);
    setIsFormOpen(false);
  }

  function toggleDefinition(definition: ReminderDefinition) {
    const nextDefinitions = definitions.map((item) =>
      item.id === definition.id
        ? {
            ...item,
            isActive: !item.isActive,
            updatedAt: new Date().toISOString(),
          }
        : item,
    );

    persistDefinitions(nextDefinitions);
    setDefinitions(nextDefinitions);
  }

  function deleteDefinition(definition: ReminderDefinition) {
    const nextDefinitions = definitions.filter(
      (item) => item.id !== definition.id,
    );

    persistDefinitions(nextDefinitions);
    setDefinitions(nextDefinitions);
    setFormMessage(`${definition.title} hatırlatıcısı silindi.`);
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void fetchNotifications(accessToken, 1);
  }

  function clearHistoryFilters() {
    setTypeFilter("");
    setStatusFilter("");
    setUnreadOnly(false);
    setPage(1);
    void fetchNotificationHistory(accessToken, 1, {
      status: "",
      type: "",
      unreadOnly: false,
    });
  }

  async function markAsRead(item: NotificationItem) {
    if (!accessToken || item.status === "READ") {
      return;
    }

    setUpdatingId(item.id);
    setMessage(null);

    try {
      const response = await patchJson<NotificationResponse>(
        `/notifications/${item.id}/read`,
        {},
        {
          accessToken,
        },
      );

      setItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === item.id ? response.data : currentItem,
        ),
      );
      await fetchNotifications(accessToken, page);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Bildirim okundu olarak işaretlenemedi.",
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
        "/notifications/read-all",
        {},
        {
          accessToken,
        },
      );

      setMessage(`${response.data.updatedCount} bildirim okundu yapıldı.`);
      await fetchNotifications(accessToken, 1);
      setPage(1);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Bildirimler okundu olarak işaretlenemedi.",
      );
    } finally {
      setIsMarkingAll(false);
    }
  }

  return (
    <div className="reminder-page">
      <section className="metric-grid reminder-metrics">
        <article className="metric-card">
          <span>Aktif hatırlatıcı</span>
          <strong>{metrics.activeDefinitions}</strong>
        </article>
        <article className="metric-card">
          <span>Yaklaşan hatırlatıcı</span>
          <strong>{metrics.dueSoon}</strong>
        </article>
        <article className="metric-card">
          <span>Bekleyen bildirim</span>
          <strong>{meta?.unreadCount ?? metrics.pending}</strong>
        </article>
        <article className="metric-card">
          <span>Okunan bildirim</span>
          <strong>{metrics.read}</strong>
        </article>
      </section>

      <section className="panel reminder-control-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Hatırlatıcı yönetimi</p>
            <h2>Tanımlar ve bildirim geçmişi</h2>
          </div>
          <button
            className="primary-button"
            onClick={beginCreateDefinition}
            type="button"
          >
            <Plus aria-hidden="true" className="inline-icon" />
            Hatırlatıcı Ekle
          </button>
        </div>

        <div
          className="reminder-tabs"
          role="tablist"
          aria-label="Hatırlatıcı sekmeleri"
        >
          <button
            className={activeTab === "definitions" ? "active" : ""}
            onClick={() => setActiveTab("definitions")}
            type="button"
          >
            Tanımlı Hatırlatıcılar
          </button>
          <button
            className={activeTab === "history" ? "active" : ""}
            onClick={() => setActiveTab("history")}
            type="button"
          >
            Bildirim Geçmişi
          </button>
        </div>
      </section>

      {activeTab === "definitions" ? (
        <DefinitionsTab
          definitions={definitions}
          editingId={editingId}
          form={form}
          formMessage={formMessage}
          isFormOpen={isFormOpen}
          setForm={setForm}
          vehicles={vehicles}
          onCancel={cancelForm}
          onDelete={deleteDefinition}
          onEdit={beginEditDefinition}
          onSubmit={handleDefinitionSubmit}
          onToggle={toggleDefinition}
        />
      ) : (
        <HistoryTab
          hasActiveFilters={hasActiveFilters}
          isLoading={isLoading}
          isMarkingAll={isMarkingAll}
          items={items}
          message={message}
          meta={meta}
          page={page}
          setPage={setPage}
          setStatusFilter={setStatusFilter}
          setTypeFilter={setTypeFilter}
          setUnreadOnly={setUnreadOnly}
          statusFilter={statusFilter}
          typeFilter={typeFilter}
          unreadOnly={unreadOnly}
          updatingId={updatingId}
          onClearFilters={clearHistoryFilters}
          onFilterSubmit={handleFilterSubmit}
          onMarkAllAsRead={markAllAsRead}
          onMarkAsRead={markAsRead}
          onRefresh={() => fetchNotifications()}
        />
      )}
    </div>
  );
}

function DefinitionsTab({
  definitions,
  editingId,
  form,
  formMessage,
  isFormOpen,
  setForm,
  vehicles,
  onCancel,
  onDelete,
  onEdit,
  onSubmit,
  onToggle,
}: {
  definitions: ReminderDefinition[];
  editingId: string | null;
  form: ReminderForm;
  formMessage: string | null;
  isFormOpen: boolean;
  setForm: (form: ReminderForm) => void;
  vehicles: Vehicle[];
  onCancel: () => void;
  onDelete: (definition: ReminderDefinition) => void;
  onEdit: (definition: ReminderDefinition) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggle: (definition: ReminderDefinition) => void;
}) {
  return (
    <div className="reminder-definition-grid">
      {isFormOpen ? (
        <form className="panel data-form" onSubmit={onSubmit}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                {editingId ? "Hatırlatıcı düzenle" : "Yeni hatırlatıcı"}
              </p>
              <h2>Hatırlatıcı tanımı</h2>
            </div>
            <button className="icon-button" onClick={onCancel} type="button">
              <X aria-hidden="true" />
            </button>
          </div>

          <div className="reminder-form-grid">
            <label>
              Başlık
              <input
                required
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="Sigorta yenileme"
              />
            </label>
            <label>
              Tip
              <select
                required
                value={form.type}
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value as ReminderType })
                }
              >
                {Object.entries(reminderTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Araç
              <select
                value={form.vehicleId}
                onChange={(event) =>
                  setForm({ ...form, vehicleId: event.target.value })
                }
              >
                <option value="">Araçsız genel hatırlatıcı</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {formatVehicleLabel(vehicle)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tarih
              <input
                value={form.scheduledDate}
                onChange={(event) =>
                  setForm({ ...form, scheduledDate: event.target.value })
                }
                type="date"
              />
            </label>
            <label>
              Km eşiği
              <input
                inputMode="numeric"
                min="0"
                value={form.kmThreshold}
                onChange={(event) =>
                  setForm({ ...form, kmThreshold: event.target.value })
                }
                placeholder="120000"
              />
            </label>
            <label>
              Tekrarlama
              <select
                value={form.repeat}
                onChange={(event) =>
                  setForm({
                    ...form,
                    repeat: event.target.value as ReminderRepeat,
                  })
                }
              >
                {Object.entries(repeatLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Bildirim kanalı
              <select
                value={form.channel}
                onChange={(event) =>
                  setForm({
                    ...form,
                    channel: event.target.value as ReminderChannel,
                  })
                }
              >
                {Object.entries(channelLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-row quick-expense-checkbox">
              <input
                checked={form.isActive}
                onChange={(event) =>
                  setForm({ ...form, isActive: event.target.checked })
                }
                type="checkbox"
              />
              Aktif hatırlatıcı
            </label>
          </div>

          <label>
            Not
            <textarea
              value={form.note}
              onChange={(event) =>
                setForm({ ...form, note: event.target.value })
              }
              placeholder="Örn. poliçe bitişinden 7 gün önce kontrol et"
            />
          </label>

          <div className="form-actions">
            <button
              className="secondary-button"
              onClick={onCancel}
              type="button"
            >
              Vazgeç
            </button>
            <button className="primary-button" type="submit">
              <Save aria-hidden="true" className="inline-icon" />
              {editingId ? "Güncelle" : "Kaydet"}
            </button>
          </div>

          {formMessage ? (
            <p
              className={
                formMessage.includes("başarıyla") ||
                formMessage.includes("eklendi") ||
                formMessage.includes("güncellendi") ||
                formMessage.includes("silindi")
                  ? "form-success"
                  : "form-alert"
              }
            >
              {formMessage}
            </p>
          ) : null}
        </form>
      ) : null}

      <section className="panel income-table-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Tanımlı Hatırlatıcılar</p>
            <h2>Planlanan olaylar</h2>
          </div>
          <span className="status-pill">{definitions.length} tanım</span>
        </div>

        {formMessage && !isFormOpen ? (
          <p
            className={
              formMessage.includes("başarıyla") ||
              formMessage.includes("eklendi") ||
              formMessage.includes("güncellendi") ||
              formMessage.includes("silindi")
                ? "form-success"
                : "form-alert"
            }
          >
            {formMessage}
          </p>
        ) : null}

        {definitions.length === 0 ? (
          <div className="empty-state-panel compact">
            <EmptyState
              description="Bakım, paket bitişi, sigorta, MTV, muayene, hedef ve dışa aktarma olayları için hatırlatıcı tanımlayabilirsin."
              icon={BellRing}
              title="Henüz tanımlı hatırlatıcı yok."
              tips={[
                "Hatırlatıcı Ekle",
                "Tarih veya km eşiği gir",
                "Bildirim kanalını seç",
              ]}
            />
          </div>
        ) : (
          <div
            className="data-table"
            role="table"
            aria-label="Tanımlı hatırlatıcılar"
          >
            <div
              className="data-table-row data-table-head reminder-definition-row"
              role="row"
            >
              <span>Hatırlatıcı</span>
              <span>Tip</span>
              <span>Araç</span>
              <span>Tarih / km</span>
              <span>Tekrarlama</span>
              <span>Kanal</span>
              <span>Kaynak</span>
              <span>Durum</span>
              <span>İşlem</span>
            </div>

            {definitions.map((definition) => (
              <div
                className="data-table-row reminder-definition-row"
                key={definition.id}
                role="row"
              >
                <span>
                  <strong>{definition.title}</strong>
                  <small>{definition.note || "Not yok"}</small>
                </span>
                <span>{reminderTypeLabels[definition.type]}</span>
                <span>{vehicleNameById(vehicles, definition.vehicleId)}</span>
                <span>
                  <strong>
                    {definition.scheduledDate
                      ? formatDate(definition.scheduledDate)
                      : "Tarih yok"}
                  </strong>
                  <small>
                    {definition.kmThreshold
                      ? `${formatNumber(Number(definition.kmThreshold))} km`
                      : "Km eşiği yok"}
                  </small>
                </span>
                <span>{repeatLabels[definition.repeat]}</span>
                <span>{channelLabels[definition.channel]}</span>
                <span>{sourceModuleLabels[definition.sourceModule]}</span>
                <span>
                  <button
                    className={
                      definition.isActive
                        ? "status-pill compact active"
                        : "status-pill compact completed"
                    }
                    onClick={() => onToggle(definition)}
                    type="button"
                  >
                    {definition.isActive ? "Aktif" : "Pasif"}
                  </button>
                </span>
                <span className="table-actions">
                  <button
                    aria-label={`${definition.title} hatırlatıcısını düzenle`}
                    className="icon-button"
                    onClick={() => onEdit(definition)}
                    type="button"
                  >
                    <Edit3 aria-hidden="true" />
                  </button>
                  <button
                    aria-label={`${definition.title} hatırlatıcısını sil`}
                    className="icon-button danger"
                    onClick={() => onDelete(definition)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function HistoryTab({
  hasActiveFilters,
  isLoading,
  isMarkingAll,
  items,
  message,
  meta,
  page,
  setPage,
  setStatusFilter,
  setTypeFilter,
  setUnreadOnly,
  statusFilter,
  typeFilter,
  unreadOnly,
  updatingId,
  onClearFilters,
  onFilterSubmit,
  onMarkAllAsRead,
  onMarkAsRead,
  onRefresh,
}: {
  hasActiveFilters: boolean;
  isLoading: boolean;
  isMarkingAll: boolean;
  items: NotificationItem[];
  message: string | null;
  meta: NotificationsResponse["meta"] | null;
  page: number;
  setPage: (setter: (currentPage: number) => number) => void;
  setStatusFilter: (value: string) => void;
  setTypeFilter: (value: string) => void;
  setUnreadOnly: (value: boolean) => void;
  statusFilter: string;
  typeFilter: string;
  unreadOnly: boolean;
  updatingId: string | null;
  onClearFilters: () => void;
  onFilterSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMarkAllAsRead: () => void;
  onMarkAsRead: (item: NotificationItem) => void;
  onRefresh: () => void;
}) {
  return (
    <section className="panel income-table-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Bildirim Geçmişi</p>
          <h2>Gönderilen ve bekleyen bildirimler</h2>
        </div>
        <div className="panel-actions">
          <button
            className="secondary-button"
            disabled={isLoading}
            onClick={onRefresh}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="inline-icon" />
            Yenile
          </button>
          <button
            className="primary-button"
            disabled={isMarkingAll || (meta?.unreadCount ?? 0) === 0}
            onClick={onMarkAllAsRead}
            type="button"
          >
            <CheckCheck aria-hidden="true" className="inline-icon" />
            Tümünü okundu yap
          </button>
        </div>
      </div>

      <form className="reminder-list-toolbar" onSubmit={onFilterSubmit}>
        <label>
          Tip
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="">Tümü</option>
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
            disabled={unreadOnly}
            value={unreadOnly ? "" : statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">Tümü</option>
            <option value="PENDING">Bekliyor</option>
            <option value="SENT">Okunmadı</option>
            <option value="READ">Okundu</option>
            <option value="FAILED">Hatalı</option>
          </select>
        </label>

        <label className="checkbox-row reminder-unread-filter">
          <input
            checked={unreadOnly}
            onChange={(event) => {
              setUnreadOnly(event.target.checked);

              if (event.target.checked) {
                setStatusFilter("");
              }
            }}
            type="checkbox"
          />
          Sadece okunmamış
        </label>

        <div className="toolbar-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={onClearFilters}
          >
            Temizle
          </button>
          <button className="secondary-button" type="submit">
            <ListFilter aria-hidden="true" className="inline-icon" />
            Filtrele
          </button>
        </div>
      </form>

      {message ? (
        <div
          className={
            message.includes("başarıyla") ||
            message.includes("okundu") ||
            message.includes("yapıldı")
              ? "form-success"
              : "form-alert"
          }
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <span>{message}</span>
          <button
            className="secondary-button compact"
            onClick={onRefresh}
            type="button"
            style={{ fontSize: "12px", marginLeft: "12px", padding: "4px 8px" }}
          >
            <RefreshCw
              aria-hidden="true"
              className="inline-icon"
              style={{ height: "12px", marginRight: "4px", width: "12px" }}
            />
            Tekrar Dene
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="skeleton-list animate-pulse" style={{ padding: "20px 0" }}>
          <div className="skeleton-row" style={{ height: "40px", marginBottom: "8px" }} />
          <div className="skeleton-row" style={{ height: "48px", marginBottom: "8px" }} />
          <div className="skeleton-row" style={{ height: "48px", marginBottom: "8px" }} />
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state-panel compact">
          <EmptyState
            description={
              hasActiveFilters
                ? "Bu filtrelerle eşleşen bildirim bulunamadı. Tip, durum veya okunmamış filtresini temizleyebilirsin."
                : "Bakım, sigorta, MTV, paket bitişi ve dışa aktarma hazır bildirimleri burada listelenir."
            }
            icon={hasActiveFilters ? FileSearch : BellRing}
            title={
              hasActiveFilters
                ? "Filtreye uygun bildirim yok."
                : "Henüz bildirim geçmişi yok."
            }
            tips={
              hasActiveFilters
                ? ["Tip filtresini kaldır", "Durum filtresini kaldır"]
                : [
                    "Hatırlatıcı tanımı oluştur",
                    "Sabit gider vadesi gir",
                    "Dışa aktarma talebi oluştur",
                  ]
            }
          />
        </div>
      ) : (
        <div className="data-table" role="table" aria-label="Bildirim geçmişi">
          <div
            className="data-table-row data-table-head reminder-table-row"
            role="row"
          >
            <span>Tip</span>
            <span>Başlık</span>
            <span>Durum</span>
            <span>Zaman</span>
            <span>Detay</span>
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
                  <b className={`reminder-status ${item.status.toLowerCase()}`}>
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
                    disabled={item.status === "READ" || updatingId === item.id}
                    onClick={() => onMarkAsRead(item)}
                    type="button"
                  >
                    <CheckCircle2 aria-hidden="true" className="inline-icon" />
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
          onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="inline-icon" />
          Önceki
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
  );
}

function iconForType(type: NotificationType) {
  if (type === "MAINTENANCE_REMINDER") {
    return Wrench;
  }

  if (type === "INSURANCE_REMINDER") {
    return Shield;
  }

  if (type === "TAX_REMINDER" || type === "PACKAGE_ENDING") {
    return CalendarClock;
  }

  if (type === "EXPORT_READY") {
    return FileText;
  }

  return BellRing;
}

function resolveNotificationTime(item: NotificationItem) {
  if (item.readAt) {
    return `Okundu: ${formatDateTime(item.readAt)}`;
  }

  if (item.sentAt) {
    return `Gönderildi: ${formatDateTime(item.sentAt)}`;
  }

  if (item.scheduledAt) {
    return `Planlandı: ${formatDateTime(item.scheduledAt)}`;
  }

  return "Zaman yok";
}

function loadReminderDefinitions() {
  if (typeof window === "undefined") {
    return [];
  }

  const storedValue = window.localStorage.getItem(reminderStorageKey);

  if (!storedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(storedValue) as ReminderDefinition[];

    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

function persistDefinitions(definitions: ReminderDefinition[]) {
  window.localStorage.setItem(reminderStorageKey, JSON.stringify(definitions));
}

function validateReminderForm(form: ReminderForm) {
  if (!form.title.trim()) {
    return "Başlık zorunlu.";
  }

  if (!form.type) {
    return "Tip zorunlu.";
  }

  if (!form.scheduledDate && !form.kmThreshold.trim()) {
    return "Tarih veya km eşiğinden en az biri zorunlu.";
  }

  if (form.scheduledDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduled = new Date(form.scheduledDate);
    if (scheduled < today) {
      return "Hatırlatıcı tarihi geçmiş bir tarih olamaz.";
    }
  }

  if (form.kmThreshold && Number(form.kmThreshold) < 0) {
    return "Km eşiği negatif olamaz.";
  }

  if (vehicleRequiredReminderTypes.has(form.type) && !form.vehicleId) {
    return "Bu hatırlatıcı tipi için araç seçimi zorunlu.";
  }

  return null;
}

function isDueSoon(definition: ReminderDefinition) {
  const now = new Date();
  const threshold = new Date(now);

  threshold.setDate(now.getDate() + 14);

  if (definition.scheduledDate) {
    const scheduledDate = new Date(definition.scheduledDate);

    return scheduledDate >= now && scheduledDate <= threshold;
  }

  return Boolean(definition.kmThreshold);
}

function vehicleNameById(vehicles: Vehicle[], vehicleId?: string) {
  const vehicle = vehicles.find((item) => item.id === vehicleId);

  return vehicle ? formatVehicleLabel(vehicle) : "Genel";
}

function formatVehicleLabel(vehicle: Vehicle) {
  const name = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");

  return name ? `${vehicle.plateNumber} - ${name}` : vehicle.plateNumber;
}

function normalizeOptional(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue || undefined;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function summarizeMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return "-";
  }

  const values = Object.entries(metadata as Record<string, unknown>)
    .filter(([, value]) => value !== undefined && value !== null)
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${String(value)}`);

  return values.length > 0 ? values.join(", ") : "-";
}
