"use client";

import Link from "next/link";
import {
  BellRing,
  CheckCircle2,
  CreditCard,
  FolderTree,
  KeyRound,
  Laptop,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { deleteJson, getJson, patchJson, postJson } from "../lib/api-client";
import { getAccessToken } from "../lib/auth-storage";

type SettingsTab =
  | "profile"
  | "finance"
  | "categories"
  | "notifications"
  | "security"
  | "subscription";
type ExpenseType =
  | "VARIABLE"
  | "FIXED"
  | "SEMI_VARIABLE"
  | "PLATFORM_PACKAGE"
  | "FINANCING"
  | "DEPRECIATION"
  | "OPERATIONAL";
type FixedCostAllocationMethod =
  | "CALENDAR_DAY"
  | "ACTIVE_DAY"
  | "PER_KM"
  | "MONTHLY_DIRECT";
type DepreciationModel = "MONTHLY" | "PER_KM";
type SaveState = "idle" | "loading" | "success" | "error";

interface UserProfile {
  id: string;
  email: string;
  phone?: string | null;
  fullName?: string | null;
  role: string;
  subscriptionStatus: string;
  trialEndsAt?: string | null;
  locale: string;
  timezone: string;
  createdAt: string;
}

interface DriverProfile {
  defaultVehicleId?: string | null;
  dailyTargetNetProfit?: string | null;
  fixedCostAllocationMethod: FixedCostAllocationMethod;
}

interface Vehicle {
  id: string;
  plateNumber: string;
  brand?: string | null;
  model?: string | null;
  isActive: boolean;
  depreciationEnabled: boolean;
  depreciationModel?: DepreciationModel | null;
  annualDepreciationAmount?: string | null;
  annualEstimatedKm?: string | null;
}

interface Category {
  id: string;
  name: string;
  expenseType?: ExpenseType | null;
  isSystem: boolean;
  isActive: boolean;
}

interface ProfileForm {
  fullName: string;
  phone: string;
  email: string;
  timezone: string;
}

interface FinanceForm {
  defaultVehicleId: string;
  dailyTargetNetProfit: string;
  fixedCostAllocationMethod: FixedCostAllocationMethod;
  fuelCalculationMethod: string;
  depreciationIncluded: boolean;
  maintenanceReserveIncluded: boolean;
  missingCostWarningsEnabled: boolean;
}

interface NotificationSettings {
  maintenanceReminder: boolean;
  packageEnding: boolean;
  legalDueReminder: boolean;
  dailySummary: boolean;
  goalAlert: boolean;
  exportReady: boolean;
}

interface SecuritySettings {
  logoutAllRequested: boolean;
  requirePasswordChange: boolean;
  exportRequested: boolean;
  deleteRequested: boolean;
}

interface SettingsAdapterData {
  financeSettings: {
    fuelCalculationMethod: string;
    maintenanceReserveIncluded: boolean;
    missingCostWarningsEnabled: boolean;
  };
  notificationSettings: NotificationSettings;
  securitySettings: SecuritySettings;
  sessions: Array<{
    id: string;
    device: string;
    location: string;
    lastSeen: string;
    current: boolean;
  }>;
}

interface ApiResponse<T> {
  data: T;
}

interface ListResponse<T> {
  data: T[];
}

const tabs: Array<{
  id: SettingsTab;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "profile", label: "Profil", icon: UserRound },
  { id: "finance", label: "Finans Varsayımları", icon: WalletCards },
  { id: "categories", label: "Kategoriler", icon: FolderTree },
  { id: "notifications", label: "Bildirimler", icon: BellRing },
  { id: "security", label: "Güvenlik", icon: ShieldCheck },
  { id: "subscription", label: "Abonelik / Plan", icon: CreditCard },
];

const fixedCostAllocationLabels: Record<FixedCostAllocationMethod, string> = {
  ACTIVE_DAY: "Çalışılan güne böl",
  CALENDAR_DAY: "Takvim gününe böl",
  MONTHLY_DIRECT: "Aylık direkt gider yaz",
  PER_KM: "Km’ye böl",
};

const expenseTypeLabels: Record<ExpenseType, string> = {
  DEPRECIATION: "Amortisman",
  FINANCING: "Finansman",
  FIXED: "Sabit gider",
  OPERATIONAL: "Operasyon",
  PLATFORM_PACKAGE: "Platform paketi",
  SEMI_VARIABLE: "Bakım / yarı değişken",
  VARIABLE: "Değişken gider",
};

const incomeCategoryPresets = ["Sefer geliri", "Bahşiş", "İptal geliri"];
const quickExpensePresets = [
  "Yakıt",
  "Otopark",
  "HGS",
  "Yıkama",
  "Bakım",
  "Ceza",
];

const settingsAdapter = {
  load(): SettingsAdapterData {
    if (typeof window === "undefined") {
      return defaultAdapterData;
    }

    const storedValue = window.localStorage.getItem("tag-settings-adapter");

    if (!storedValue) {
      return defaultAdapterData;
    }

    try {
      const parsedValue = JSON.parse(
        storedValue,
      ) as Partial<SettingsAdapterData>;

      return {
        ...defaultAdapterData,
        ...parsedValue,
        financeSettings: {
          ...defaultAdapterData.financeSettings,
          ...parsedValue.financeSettings,
        },
        notificationSettings: {
          ...defaultAdapterData.notificationSettings,
          ...parsedValue.notificationSettings,
        },
        securitySettings: {
          ...defaultAdapterData.securitySettings,
          ...parsedValue.securitySettings,
        },
        sessions: parsedValue.sessions ?? defaultAdapterData.sessions,
      };
    } catch {
      return defaultAdapterData;
    }
  },
  async save<Key extends keyof SettingsAdapterData>(
    key: Key,
    value: SettingsAdapterData[Key],
  ) {
    const current = this.load();
    const nextValue = {
      ...current,
      [key]: value,
    };

    window.localStorage.setItem(
      "tag-settings-adapter",
      JSON.stringify(nextValue),
    );

    await wait(250);

    return nextValue;
  },
};

const defaultAdapterData: SettingsAdapterData = {
  financeSettings: {
    fuelCalculationMethod: "LAST_FUEL_AND_VEHICLE_AVERAGE",
    maintenanceReserveIncluded: true,
    missingCostWarningsEnabled: true,
  },
  notificationSettings: {
    dailySummary: true,
    exportReady: true,
    goalAlert: true,
    legalDueReminder: true,
    maintenanceReminder: true,
    packageEnding: true,
  },
  securitySettings: {
    deleteRequested: false,
    exportRequested: false,
    logoutAllRequested: false,
    requirePasswordChange: false,
  },
  sessions: [
    {
      id: "current",
      current: true,
      device: "Mevcut tarayıcı",
      lastSeen: "Şimdi",
      location: "Türkiye",
    },
    {
      id: "mobile",
      current: false,
      device: "Mobil cihaz",
      lastSeen: "Son 24 saat",
      location: "Türkiye",
    },
  ],
};

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [adapterData, setAdapterData] =
    useState<SettingsAdapterData>(defaultAdapterData);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    email: "",
    fullName: "",
    phone: "",
    timezone: "Europe/Istanbul",
  });
  const [financeForm, setFinanceForm] = useState<FinanceForm>({
    dailyTargetNetProfit: "",
    defaultVehicleId: "",
    depreciationIncluded: false,
    fixedCostAllocationMethod: "CALENDAR_DAY",
    fuelCalculationMethod: "LAST_FUEL_AND_VEHICLE_AVERAGE",
    maintenanceReserveIncluded: true,
    missingCostWarningsEnabled: true,
  });
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] =
    useState<ExpenseType>("VARIABLE");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryType, setEditingCategoryType] =
    useState<ExpenseType>("VARIABLE");
  const [message, setMessage] = useState<string | null>(null);
  const [saveStateByKey, setSaveStateByKey] = useState<
    Partial<Record<string, SaveState>>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  const selectedVehicle = useMemo(
    () =>
      vehicles.find((vehicle) => vehicle.id === financeForm.defaultVehicleId),
    [financeForm.defaultVehicleId, vehicles],
  );

  useEffect(() => {
    const token = getAccessToken();
    const localSettings = settingsAdapter.load();

    setAccessToken(token);
    setAdapterData(localSettings);
    setFinanceForm((currentForm) => ({
      ...currentForm,
      fuelCalculationMethod:
        localSettings.financeSettings.fuelCalculationMethod,
      maintenanceReserveIncluded:
        localSettings.financeSettings.maintenanceReserveIncluded,
      missingCostWarningsEnabled:
        localSettings.financeSettings.missingCostWarningsEnabled,
    }));

    if (!token) {
      setIsLoading(false);
      setMessage("Ayarları yönetmek için önce giriş yapmalısın.");
      return;
    }

    void loadSettings(token);
  }, []);

  async function loadSettings(token = accessToken) {
    if (!token) {
      return;
    }

    const localSettings = settingsAdapter.load();

    setAdapterData(localSettings);
    setIsLoading(true);
    setMessage(null);

    try {
      const [
        profileResponse,
        driverProfileResponse,
        vehiclesResponse,
        categoriesResponse,
      ] = await Promise.all([
        getJson<ApiResponse<UserProfile>>("/me", { accessToken: token }),
        getJson<ApiResponse<DriverProfile>>("/driver-profile", {
          accessToken: token,
        }),
        getJson<ListResponse<Vehicle>>("/vehicles", { accessToken: token }),
        getJson<ListResponse<Category>>("/categories", {
          accessToken: token,
          query: {
            includeInactive: "true",
            pageSize: 100,
            sortBy: "name",
            sortDirection: "asc",
          },
        }),
      ]);
      const activeVehicle =
        vehiclesResponse.data.find((vehicle) => vehicle.isActive) ??
        vehiclesResponse.data[0];
      const defaultVehicle =
        vehiclesResponse.data.find(
          (vehicle) =>
            vehicle.id === driverProfileResponse.data.defaultVehicleId,
        ) ?? activeVehicle;

      setProfile(profileResponse.data);
      setVehicles(vehiclesResponse.data);
      setCategories(categoriesResponse.data);
      setProfileForm({
        email: profileResponse.data.email,
        fullName: profileResponse.data.fullName ?? "",
        phone: profileResponse.data.phone ?? "",
        timezone: profileResponse.data.timezone ?? "Europe/Istanbul",
      });
      setFinanceForm((currentForm) => ({
        ...currentForm,
        dailyTargetNetProfit:
          driverProfileResponse.data.dailyTargetNetProfit ?? "",
        defaultVehicleId: defaultVehicle?.id ?? "",
        depreciationIncluded: defaultVehicle?.depreciationEnabled ?? false,
        fixedCostAllocationMethod:
          driverProfileResponse.data.fixedCostAllocationMethod ??
          "CALENDAR_DAY",
        fuelCalculationMethod:
          localSettings.financeSettings.fuelCalculationMethod,
        maintenanceReserveIncluded:
          localSettings.financeSettings.maintenanceReserveIncluded,
        missingCostWarningsEnabled:
          localSettings.financeSettings.missingCostWarningsEnabled,
      }));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ayarlar yüklenemedi.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    await runSave("profile", async () => {
      const response = await patchJson<ApiResponse<UserProfile>>(
        "/me",
        {
          fullName: profileForm.fullName.trim() || undefined,
          timezone: profileForm.timezone,
        },
        { accessToken },
      );

      setProfile(response.data);
      await settingsAdapter.save("securitySettings", {
        ...adapterData.securitySettings,
        requirePasswordChange:
          adapterData.securitySettings.requirePasswordChange,
      });
      return "Profil bilgileri kaydedildi. Telefon ve e-posta değişikliği doğrulama altyapısı hazır olduğunda aktifleşecek.";
    });
  }

  async function saveFinance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    const targetProfit = normalizeDecimal(financeForm.dailyTargetNetProfit);
    if (targetProfit) {
      const parsed = Number(targetProfit);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setMessage("Günlük net kâr hedefi negatif olamaz.");
        setSaveStateByKey((currentState) => ({
          ...currentState,
          finance: "error",
        }));
        return;
      }
    }

    await runSave("finance", async () => {
      await patchJson<ApiResponse<DriverProfile>>(
        "/driver-profile",
        removeEmptyValues({
          dailyTargetNetProfit: normalizeDecimal(
            financeForm.dailyTargetNetProfit,
          ),
          defaultVehicleId: financeForm.defaultVehicleId,
          fixedCostAllocationMethod: financeForm.fixedCostAllocationMethod,
        }),
        { accessToken },
      );

      if (selectedVehicle) {
        if (
          financeForm.depreciationIncluded &&
          (!selectedVehicle.depreciationModel ||
            !selectedVehicle.annualDepreciationAmount)
        ) {
          throw new Error(
            "Amortismanı açmak için önce amortisman ekranında model ve yıllık değer kaybı gir.",
          );
        }

        if (
          selectedVehicle.depreciationModel &&
          selectedVehicle.annualDepreciationAmount
        ) {
          await patchJson<ApiResponse<Vehicle>>(
            `/vehicles/${selectedVehicle.id}/depreciation-settings`,
            removeEmptyValues({
              annualDepreciationAmount:
                selectedVehicle.annualDepreciationAmount,
              annualEstimatedKm: selectedVehicle.annualEstimatedKm,
              depreciationEnabled: financeForm.depreciationIncluded,
              depreciationModel: selectedVehicle.depreciationModel,
            }),
            { accessToken },
          );
        }
      }

      const nextAdapterData = await settingsAdapter.save("financeSettings", {
        fuelCalculationMethod: financeForm.fuelCalculationMethod,
        maintenanceReserveIncluded: financeForm.maintenanceReserveIncluded,
        missingCostWarningsEnabled: financeForm.missingCostWarningsEnabled,
      });

      setAdapterData(nextAdapterData);
      await loadSettings(accessToken);
      return "Finans varsayımları kaydedildi. Ana panel ve raporlar yeni varsayımlarla yenilenir.";
    });
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken || !newCategoryName.trim()) {
      return;
    }

    await runSave("category", async () => {
      const response = await postJson<ApiResponse<Category>>(
        "/categories",
        {
          expenseType: newCategoryType,
          name: newCategoryName.trim(),
        },
        { accessToken },
      );

      setCategories((currentCategories) => [
        response.data,
        ...currentCategories,
      ]);
      setNewCategoryName("");
      return "Kategori eklendi.";
    });
  }

  async function updateCategory(category: Category) {
    if (!accessToken || !editingCategoryName.trim()) {
      return;
    }

    await runSave(`category-${category.id}`, async () => {
      const response = await patchJson<ApiResponse<Category>>(
        `/categories/${category.id}`,
        {
          expenseType: editingCategoryType,
          name: editingCategoryName.trim(),
        },
        { accessToken },
      );

      setCategories((currentCategories) =>
        currentCategories.map((item) =>
          item.id === category.id ? response.data : item,
        ),
      );
      setEditingCategoryId(null);
      return "Kategori güncellendi.";
    });
  }

  async function deleteCategory(category: Category) {
    if (!accessToken || category.isSystem) {
      return;
    }

    await runSave(`category-${category.id}`, async () => {
      await deleteJson(`/categories/${category.id}`, { accessToken });
      setCategories((currentCategories) =>
        currentCategories.map((item) =>
          item.id === category.id ? { ...item, isActive: false } : item,
        ),
      );
      return "Kategori pasifleştirildi.";
    });
  }

  async function saveNotificationSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await runSave("notifications", async () => {
      const nextData = await settingsAdapter.save(
        "notificationSettings",
        adapterData.notificationSettings,
      );

      setAdapterData(nextData);
      return "Bildirim tercihleri kaydedildi.";
    });
  }

  async function saveSecuritySettings(action: keyof SecuritySettings) {
    await runSave(`security-${action}`, async () => {
      const nextData = await settingsAdapter.save("securitySettings", {
        ...adapterData.securitySettings,
        [action]: true,
      });

      setAdapterData(nextData);
      return "Güvenlik talebi kaydedildi.";
    });
  }

  async function runSave(key: string, action: () => Promise<string>) {
    setSaveStateByKey((currentState) => ({
      ...currentState,
      [key]: "loading",
    }));
    setMessage(null);

    try {
      const successMessage = await action();

      setSaveStateByKey((currentState) => ({
        ...currentState,
        [key]: "success",
      }));
      setMessage(successMessage);
    } catch (error) {
      setSaveStateByKey((currentState) => ({
        ...currentState,
        [key]: "error",
      }));
      setMessage(
        error instanceof Error ? error.message : "Ayar kaydedilemedi.",
      );
    }
  }

  function startEditCategory(category: Category) {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
    setEditingCategoryType(category.expenseType ?? "VARIABLE");
  }

  function updateNotification<Key extends keyof NotificationSettings>(
    key: Key,
    value: NotificationSettings[Key],
  ) {
    setAdapterData((currentData) => ({
      ...currentData,
      notificationSettings: {
        ...currentData.notificationSettings,
        [key]: value,
      },
    }));
  }

  if (!accessToken) {
    return (
      <section className="panel empty-state-panel">
        <p className="eyebrow">Oturum gerekli</p>
        <h2>Ayarları yönetmek için giriş yap.</h2>
        <Link className="primary-button button-link" href="/login">
          Giriş yap
        </Link>
      </section>
    );
  }

  return (
    <div className="settings-page">
      <section className="settings-tabs" aria-label="Ayar sekmeleri">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              className={activeTab === tab.id ? "active" : ""}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <Icon aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </section>

      {message ? (
        <p
          className={
            message.includes("başarıyla") ||
            message.includes("kaydedildi") ||
            message.includes("güncellendi") ||
            message.includes("eklendi") ||
            message.includes("pasifleştirildi")
              ? "form-success"
              : "form-alert"
          }
        >
          {message}
        </p>
      ) : null}

      {isLoading ? (
        <div className="skeleton-list animate-pulse" style={{ padding: "20px 0" }}>
          <div className="skeleton-row" style={{ height: "40px", marginBottom: "8px" }} />
          <div className="skeleton-row" style={{ height: "48px", marginBottom: "8px" }} />
          <div className="skeleton-row" style={{ height: "48px", marginBottom: "8px" }} />
        </div>
      ) : null}

      {!isLoading && activeTab === "profile" ? (
        <ProfileTab
          form={profileForm}
          profile={profile}
          saveState={saveStateByKey.profile ?? "idle"}
          setForm={setProfileForm}
          onSubmit={saveProfile}
        />
      ) : null}

      {!isLoading && activeTab === "finance" ? (
        <FinanceTab
          form={financeForm}
          saveState={saveStateByKey.finance ?? "idle"}
          selectedVehicle={selectedVehicle}
          setForm={setFinanceForm}
          vehicles={vehicles}
          onSubmit={saveFinance}
        />
      ) : null}

      {!isLoading && activeTab === "categories" ? (
        <CategoriesTab
          categories={categories}
          editingCategoryId={editingCategoryId}
          editingCategoryName={editingCategoryName}
          editingCategoryType={editingCategoryType}
          newCategoryName={newCategoryName}
          newCategoryType={newCategoryType}
          saveStateByKey={saveStateByKey}
          setEditingCategoryName={setEditingCategoryName}
          setEditingCategoryType={setEditingCategoryType}
          setNewCategoryName={setNewCategoryName}
          setNewCategoryType={setNewCategoryType}
          onAdd={addCategory}
          onCancelEdit={() => setEditingCategoryId(null)}
          onDelete={deleteCategory}
          onEdit={startEditCategory}
          onRestoreDefaults={() =>
            runSave("restore-categories", async () => {
              await wait(250);
              return "Varsayılan kategoriler sistem şablonundan okunuyor. Eksik kategori seed işlemi backend hazır olduğunda uygulanacak.";
            })
          }
          onUpdate={updateCategory}
        />
      ) : null}

      {!isLoading && activeTab === "notifications" ? (
        <NotificationsTab
          settings={adapterData.notificationSettings}
          saveState={saveStateByKey.notifications ?? "idle"}
          updateNotification={updateNotification}
          onSubmit={saveNotificationSettings}
        />
      ) : null}

      {!isLoading && activeTab === "security" ? (
        <SecurityTab
          saveStateByKey={saveStateByKey}
          security={adapterData.securitySettings}
          sessions={adapterData.sessions}
          onAction={saveSecuritySettings}
        />
      ) : null}

      {!isLoading && activeTab === "subscription" ? (
        <SubscriptionTab profile={profile} />
      ) : null}
    </div>
  );
}

function ProfileTab({
  form,
  profile,
  saveState,
  setForm,
  onSubmit,
}: {
  form: ProfileForm;
  profile: UserProfile | null;
  saveState: SaveState;
  setForm: (form: ProfileForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="settings-grid">
      <form className="panel data-form" onSubmit={onSubmit}>
        <PanelTitle eyebrow="Profil" title="Kullanıcı bilgileri" />
        <div className="settings-form-grid">
          <label>
            Ad soyad
            <input
              required
              value={form.fullName}
              onChange={(event) =>
                setForm({ ...form, fullName: event.target.value })
              }
            />
          </label>
          <label>
            Telefon
            <input
              inputMode="tel"
              value={form.phone}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
              placeholder="+90 5xx xxx xx xx"
            />
          </label>
          <label>
            E-posta
            <input disabled readOnly type="email" value={form.email} />
          </label>
          <label>
            Varsayılan dil
            <select disabled value="tr-TR">
              <option value="tr-TR">Türkçe</option>
            </select>
          </label>
          <label>
            Para birimi
            <select disabled value="TRY">
              <option value="TRY">TRY</option>
            </select>
          </label>
          <label>
            Saat dilimi
            <select
              required
              value={form.timezone}
              onChange={(event) =>
                setForm({ ...form, timezone: event.target.value })
              }
            >
              <option value="Europe/Istanbul">Europe/Istanbul</option>
              <option value="UTC">UTC</option>
            </select>
          </label>
        </div>
        <SaveButton saveState={saveState}>Profili kaydet</SaveButton>
      </form>

      <aside className="panel settings-summary">
        <PanelTitle eyebrow="Hesap" title="Profil durumu" />
        <InfoRow label="Rol" value={profile?.role ?? "-"} />
        <InfoRow
          label="Abonelik"
          value={profile?.subscriptionStatus ?? "TRIAL"}
        />
        <InfoRow label="Şifre" value="Güvenlik sekmesinden değiştirilebilir" />
      </aside>
    </section>
  );
}

function FinanceTab({
  form,
  saveState,
  selectedVehicle,
  setForm,
  vehicles,
  onSubmit,
}: {
  form: FinanceForm;
  saveState: SaveState;
  selectedVehicle?: Vehicle;
  setForm: (form: FinanceForm) => void;
  vehicles: Vehicle[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="settings-grid">
      <form className="panel data-form" onSubmit={onSubmit}>
        <PanelTitle eyebrow="Finans" title="Varsayımlar ve hesaplama metodu" />
        <div className="settings-form-grid">
          <label>
            Varsayılan araç
            <select
              required
              value={form.defaultVehicleId}
              onChange={(event) =>
                setForm({ ...form, defaultVehicleId: event.target.value })
              }
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
            Günlük net kâr hedefi
            <input
              inputMode="decimal"
              min="0"
              value={form.dailyTargetNetProfit}
              onChange={(event) =>
                setForm({
                  ...form,
                  dailyTargetNetProfit: event.target.value,
                })
              }
              placeholder="1500"
            />
          </label>
          <label>
            Sabit gider dağıtım yöntemi
            <select
              required
              value={form.fixedCostAllocationMethod}
              onChange={(event) =>
                setForm({
                  ...form,
                  fixedCostAllocationMethod: event.target
                    .value as FixedCostAllocationMethod,
                })
              }
            >
              {Object.entries(fixedCostAllocationLabels).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>
          <label>
            Yakıt hesaplama yöntemi
            <select
              required
              value={form.fuelCalculationMethod}
              onChange={(event) =>
                setForm({ ...form, fuelCalculationMethod: event.target.value })
              }
            >
              <option value="LAST_FUEL_AND_VEHICLE_AVERAGE">
                Son yakıt fiyatı + araç ortalaması
              </option>
              <option value="FULL_TANK">Full depo tüketim verisi</option>
              <option value="MANUAL">Manuel varsayım</option>
            </select>
          </label>
        </div>

        <div className="settings-toggle-list">
          <ToggleRow
            checked={form.depreciationIncluded}
            label="Amortisman net kâra dahil edilsin"
            note={
              selectedVehicle?.annualDepreciationAmount
                ? "Araç amortisman ayarından hesaplanır."
                : "Önce amortisman ekranında değer kaybı girilmeli."
            }
            onChange={(checked) =>
              setForm({ ...form, depreciationIncluded: checked })
            }
          />
          <ToggleRow
            checked={form.maintenanceReserveIncluded}
            label="Bakım rezervi net kâra dahil edilsin"
            note="Bakım kayıtlarındaki km başı rezerv motoru kullanılır."
            onChange={(checked) =>
              setForm({ ...form, maintenanceReserveIncluded: checked })
            }
          />
          <ToggleRow
            checked={form.missingCostWarningsEnabled}
            label="Eksik gider uyarıları açık"
            note="Yakıt, bakım, paket ve sabit gider varsayımı eksikse uyarı gösterilir."
            onChange={(checked) =>
              setForm({ ...form, missingCostWarningsEnabled: checked })
            }
          />
        </div>

        <SaveButton saveState={saveState}>Finans ayarlarını kaydet</SaveButton>
      </form>

      <aside className="panel settings-summary">
        <PanelTitle eyebrow="Etkisi" title="Dashboard ve raporlar" />
        <InfoRow
          label="Araç"
          value={selectedVehicle ? formatVehicleLabel(selectedVehicle) : "-"}
        />
        <InfoRow
          label="Amortisman"
          value={form.depreciationIncluded ? "Dahil" : "Nakit bazlı"}
        />
        <InfoRow
          label="Yakıt"
          value="Sefer yakıt etkisi finans motorundan hesaplanır"
        />
      </aside>
    </section>
  );
}

function CategoriesTab({
  categories,
  editingCategoryId,
  editingCategoryName,
  editingCategoryType,
  newCategoryName,
  newCategoryType,
  saveStateByKey,
  setEditingCategoryName,
  setEditingCategoryType,
  setNewCategoryName,
  setNewCategoryType,
  onAdd,
  onCancelEdit,
  onDelete,
  onEdit,
  onRestoreDefaults,
  onUpdate,
}: {
  categories: Category[];
  editingCategoryId: string | null;
  editingCategoryName: string;
  editingCategoryType: ExpenseType;
  newCategoryName: string;
  newCategoryType: ExpenseType;
  saveStateByKey: Partial<Record<string, SaveState>>;
  setEditingCategoryName: (value: string) => void;
  setEditingCategoryType: (value: ExpenseType) => void;
  setNewCategoryName: (value: string) => void;
  setNewCategoryType: (value: ExpenseType) => void;
  onAdd: (event: FormEvent<HTMLFormElement>) => void;
  onCancelEdit: () => void;
  onDelete: (category: Category) => void;
  onEdit: (category: Category) => void;
  onRestoreDefaults: () => void;
  onUpdate: (category: Category) => void;
}) {
  return (
    <section className="settings-grid wide">
      <form className="panel data-form" onSubmit={onAdd}>
        <PanelTitle eyebrow="Kategoriler" title="Kategori ekle" />
        <div className="settings-form-grid compact">
          <label>
            Kategori adı
            <input
              required
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="Köprü geçişi"
            />
          </label>
          <label>
            Gider tipi
            <select
              required
              value={newCategoryType}
              onChange={(event) =>
                setNewCategoryType(event.target.value as ExpenseType)
              }
            >
              {Object.entries(expenseTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <SaveButton saveState={saveStateByKey.category ?? "idle"}>
            Kategori ekle
          </SaveButton>
        </div>
      </form>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Kategori yönetimi</p>
            <h2>Gelir, gider ve hızlı presetler</h2>
          </div>
          <button
            className="secondary-button"
            onClick={onRestoreDefaults}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="button-icon" />
            Varsayılanları geri yükle
          </button>
        </div>

        <div className="settings-preset-grid">
          <PresetBlock
            title="Gelir kategorileri"
            values={incomeCategoryPresets}
          />
          <PresetBlock
            title="Hızlı gider presetleri"
            values={quickExpensePresets}
          />
        </div>

        <div className="data-table settings-category-table" role="table">
          <div className="data-table-row data-table-head settings-category-row">
            <span>Kategori</span>
            <span>Tip</span>
            <span>Kaynak</span>
            <span>Durum</span>
            <span>İşlem</span>
          </div>
          {categories.map((category) => (
            <div
              className="data-table-row settings-category-row"
              key={category.id}
            >
              <span>
                {editingCategoryId === category.id ? (
                  <input
                    value={editingCategoryName}
                    onChange={(event) =>
                      setEditingCategoryName(event.target.value)
                    }
                  />
                ) : (
                  <strong>{category.name}</strong>
                )}
              </span>
              <span>
                {editingCategoryId === category.id ? (
                  <select
                    value={editingCategoryType}
                    onChange={(event) =>
                      setEditingCategoryType(event.target.value as ExpenseType)
                    }
                  >
                    {Object.entries(expenseTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : (
                  expenseTypeLabels[category.expenseType ?? "VARIABLE"]
                )}
              </span>
              <span>{category.isSystem ? "Sistem" : "Özel"}</span>
              <span>{category.isActive ? "Aktif" : "Pasif"}</span>
              <span className="table-actions">
                {editingCategoryId === category.id ? (
                  <>
                    <button
                      className="primary-button"
                      onClick={() => onUpdate(category)}
                      type="button"
                    >
                      Kaydet
                    </button>
                    <button
                      className="secondary-button"
                      onClick={onCancelEdit}
                      type="button"
                    >
                      Vazgeç
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="secondary-button"
                      disabled={category.isSystem}
                      onClick={() => onEdit(category)}
                      type="button"
                    >
                      Düzenle
                    </button>
                    <button
                      className="icon-button danger"
                      disabled={category.isSystem || !category.isActive}
                      onClick={() => onDelete(category)}
                      type="button"
                      aria-label={`${category.name} kategorisini sil`}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </>
                )}
              </span>
            </div>
          ))}
          {categories.length === 0 ? (
            <div className="data-table-row settings-category-row">
              <span>
                <strong>Kategori kaydı yok</strong>
              </span>
              <span>Varsayılan seed bekleniyor</span>
              <span>Sistem</span>
              <span>Pasif</span>
              <span>Varsayılanları geri yükle</span>
            </div>
          ) : null}
        </div>
      </section>
    </section>
  );
}

function NotificationsTab({
  settings,
  saveState,
  updateNotification,
  onSubmit,
}: {
  settings: NotificationSettings;
  saveState: SaveState;
  updateNotification: <Key extends keyof NotificationSettings>(
    key: Key,
    value: NotificationSettings[Key],
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="panel data-form" onSubmit={onSubmit}>
      <PanelTitle eyebrow="Bildirimler" title="Hatırlatıcı tercihleri" />
      <div className="settings-toggle-list">
        <ToggleRow
          checked={settings.maintenanceReminder}
          label="Bakım hatırlatması"
          note="Km yaklaşınca bakım bildirimi üretir."
          onChange={(checked) =>
            updateNotification("maintenanceReminder", checked)
          }
        />
        <ToggleRow
          checked={settings.packageEnding}
          label="Paket bitiş bildirimi"
          note="Çalışma paketi bitişi yaklaşınca uyarır."
          onChange={(checked) => updateNotification("packageEnding", checked)}
        />
        <ToggleRow
          checked={settings.legalDueReminder}
          label="Sigorta / MTV / muayene hatırlatması"
          note="Sabit gider vade alanlarından beslenir."
          onChange={(checked) =>
            updateNotification("legalDueReminder", checked)
          }
        />
        <ToggleRow
          checked={settings.dailySummary}
          label="Günlük özet bildirimi"
          note="Gün sonu brüt gelir, net kâr ve km özetini gönderir."
          onChange={(checked) => updateNotification("dailySummary", checked)}
        />
        <ToggleRow
          checked={settings.goalAlert}
          label="Hedef uyarısı"
          note="Günlük net kâr hedefinden sapmayı bildirir."
          onChange={(checked) => updateNotification("goalAlert", checked)}
        />
        <ToggleRow
          checked={settings.exportReady}
          label="Dışa aktarma hazır bildirimi"
          note="PDF/Excel dosyası hazır olduğunda bildirim üretir."
          onChange={(checked) => updateNotification("exportReady", checked)}
        />
      </div>
      <SaveButton saveState={saveState}>Bildirimleri kaydet</SaveButton>
    </form>
  );
}

function SecurityTab({
  saveStateByKey,
  security,
  sessions,
  onAction,
}: {
  saveStateByKey: Partial<Record<string, SaveState>>;
  security: SecuritySettings;
  sessions: SettingsAdapterData["sessions"];
  onAction: (action: keyof SecuritySettings) => void;
}) {
  return (
    <section className="settings-grid">
      <section className="panel">
        <PanelTitle eyebrow="Güvenlik" title="Aktif oturumlar ve cihazlar" />
        <div className="settings-session-list">
          {sessions.map((session) => (
            <div className="settings-session-row" key={session.id}>
              <Laptop aria-hidden="true" />
              <div>
                <strong>{session.device}</strong>
                <span>
                  {session.location} · {session.lastSeen}
                </span>
              </div>
              <b>{session.current ? "Bu cihaz" : "Aktif"}</b>
            </div>
          ))}
        </div>
      </section>

      <section className="panel settings-action-panel">
        <PanelTitle eyebrow="Hesap güvenliği" title="Güvenlik işlemleri" />
        <ActionButton
          icon={KeyRound}
          label="Şifre değiştir"
          loading={
            saveStateByKey["security-requirePasswordChange"] === "loading"
          }
          note="Şifre değişim formu backend hazır olduğunda aktif kaydedilecek."
          onClick={() => onAction("requirePasswordChange")}
        />
        <ActionButton
          icon={RefreshCw}
          label="Tüm oturumlardan çık"
          loading={saveStateByKey["security-logoutAllRequested"] === "loading"}
          note={
            security.logoutAllRequested
              ? "Oturum kapatma talebi kaydedildi."
              : "Mevcut token yönetimi backend oturum iptaliyle bağlanacak."
          }
          onClick={() => onAction("logoutAllRequested")}
        />
        <ActionButton
          icon={Save}
          label="Verilerimi dışa aktar"
          loading={saveStateByKey["security-exportRequested"] === "loading"}
          note={
            security.exportRequested
              ? "Talep kaydedildi."
              : "Dışa aktarma ekranına da yönlendirebilirsin."
          }
          onClick={() => onAction("exportRequested")}
        />
        <ActionButton
          danger
          icon={Trash2}
          label="Hesabı sil"
          loading={saveStateByKey["security-deleteRequested"] === "loading"}
          note={
            security.deleteRequested
              ? "Silme talebi kaydedildi."
              : "KVKK silme talebi onay akışıyla tamamlanacak."
          }
          onClick={() => onAction("deleteRequested")}
        />
      </section>
    </section>
  );
}

function SubscriptionTab({ profile }: { profile: UserProfile | null }) {
  return (
    <section className="settings-grid">
      <section className="panel">
        <PanelTitle eyebrow="Abonelik" title="Mevcut plan" />
        <div className="subscription-card">
          <span>Plan</span>
          <strong>{profile?.subscriptionStatus ?? "TRIAL"}</strong>
          <small>
            Deneme süresi:{" "}
            {profile?.trialEndsAt
              ? formatDate(profile.trialEndsAt)
              : "Tanımlı değil"}
          </small>
        </div>
        <div className="form-actions">
          <button className="primary-button" type="button">
            Plan yükselt
          </button>
          <button className="secondary-button" type="button">
            Fatura bilgileri
          </button>
        </div>
      </section>

      <section className="panel">
        <PanelTitle eyebrow="Ödeme" title="Fatura ve ödeme geçmişi" />
        <div className="settings-placeholder-list">
          <InfoRow
            label="Fatura bilgileri"
            value="Ödeme altyapısı bağlandığında düzenlenebilir"
          />
          <InfoRow label="Ödeme geçmişi" value="Henüz ödeme kaydı yok" />
          <InfoRow
            label="Filo planı"
            value="Araç başı fiyatlama için hazır alan"
          />
        </div>
      </section>
    </section>
  );
}

function PanelTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="panel-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
    </div>
  );
}

function SaveButton({
  children,
  saveState,
}: {
  children: ReactNode;
  saveState: SaveState;
}) {
  return (
    <button
      className="primary-button"
      disabled={saveState === "loading"}
      type="submit"
    >
      {saveState === "loading" ? (
        <Loader2 aria-hidden="true" className="button-icon spin-icon" />
      ) : saveState === "success" ? (
        <CheckCircle2 aria-hidden="true" className="button-icon" />
      ) : (
        <Save aria-hidden="true" className="button-icon" />
      )}
      {saveState === "loading" ? "Kaydediliyor" : children}
    </button>
  );
}

function ToggleRow({
  checked,
  label,
  note,
  onChange,
}: {
  checked: boolean;
  label: string;
  note: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="settings-toggle-row">
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>
        <strong>{label}</strong>
        <small>{note}</small>
      </span>
    </label>
  );
}

function PresetBlock({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="settings-preset-block">
      <strong>{title}</strong>
      <div>
        {values.map((value) => (
          <span className="status-pill compact" key={value}>
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function ActionButton({
  danger,
  icon: Icon,
  label,
  loading,
  note,
  onClick,
}: {
  danger?: boolean;
  icon: LucideIcon;
  label: string;
  loading: boolean;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      className={danger ? "settings-action danger" : "settings-action"}
      disabled={loading}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" />
      <span>
        <strong>{loading ? "İşleniyor" : label}</strong>
        <small>{note}</small>
      </span>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="expense-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatVehicleLabel(vehicle: Vehicle) {
  const name = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");

  return name ? `${vehicle.plateNumber} - ${name}` : vehicle.plateNumber;
}

function normalizeDecimal(value: string) {
  const normalizedValue = value.trim().replace(",", ".");

  return normalizedValue || undefined;
}

function removeEmptyValues(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
