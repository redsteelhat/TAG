import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import {
  clearStoredValues,
  getStoredJson,
  getStoredString,
  removeStoredValue,
  setStoredJson,
  setStoredString,
  storageKeys,
} from "./src/storage/local-storage";
import {
  listTripDrafts,
  removeTripDraft,
  saveTripDraft,
  TripDraft,
  TripDraftPayload,
} from "./src/storage/offline-drafts";

const reportRows = [
  ["Gunluk net kar", "1.460 TL"],
  ["Haftalik net kar", "8.920 TL"],
  ["Aylik net kar", "34.700 TL"],
  ["Paket break-even", "Asildi"],
];

const mainTabs: Array<{ key: MainTab; label: string; icon: string }> = [
  { key: "today", label: "Bugun", icon: "B" },
  { key: "record", label: "Kayit", icon: "K" },
  { key: "reports", label: "Rapor", icon: "R" },
  { key: "vehicles", label: "Arac", icon: "A" },
];

type AuthMode = "login" | "register";
type MainTab = "today" | "record" | "reports" | "vehicles";
type FuelType = "DIESEL" | "GASOLINE" | "LPG" | "HYBRID" | "ELECTRIC" | "OTHER";
type PaymentMethod = "CASH" | "CARD" | "DIGITAL" | "MIXED" | "OTHER";
type ShiftStatus = "ACTIVE" | "COMPLETED" | "CANCELED";

interface AuthUser {
  id: string;
  email: string;
  fullName?: string | null;
}

interface AuthResponse {
  data: {
    user?: AuthUser;
    accessToken: string;
    refreshToken: string;
  };
}

interface ApiErrorResponse {
  message?: string | string[];
}

interface Vehicle {
  id: string;
  plateNumber: string;
  brand?: string | null;
  model?: string | null;
  modelYear?: number | null;
  fuelType: FuelType;
  averageConsumptionLPer100Km: string;
  odometerKm?: string | null;
  isActive: boolean;
}

interface AuthFormState {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

interface VehicleFormState {
  plateNumber: string;
  brand: string;
  model: string;
  modelYear: string;
  fuelType: FuelType;
  averageConsumptionLPer100Km: string;
  odometerKm: string;
}

interface QuickTripFormState {
  grossIncome: string;
  tripKm: string;
  deadheadKm: string;
  durationMinutes: string;
  paymentMethod: PaymentMethod;
  note: string;
}

interface ShiftFormState {
  startOdometerKm: string;
  endOdometerKm: string;
  note: string;
}

interface Trip {
  id: string;
  durationMinutes?: number | null;
  totalIncome: string;
  totalKm: string;
  estimatedFuelCost: string;
  trueNetProfit: string;
}

interface Shift {
  id: string;
  startedAt: string;
  endedAt?: string | null;
  startOdometerKm?: string | null;
  endOdometerKm?: string | null;
  totalKm?: string | null;
  activeMinutes?: number | null;
  status: ShiftStatus;
  grossIncome: string;
  trueNetProfit: string;
  note?: string | null;
}

interface ShiftsResponse {
  data: Shift[];
}

interface TripsResponse {
  data: Trip[];
  meta: {
    total: number;
  };
}

interface DailyIncomeSummary {
  grossIncome: number;
  netProfit: number;
  totalKm: number;
  estimatedFuelCost: number;
  activeMinutes: number;
  tripCount: number;
}

interface QuickTripDraftInput {
  payload: TripDraftPayload;
  totalKm: string;
}

const initialFormState: AuthFormState = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
};

const initialVehicleFormState: VehicleFormState = {
  plateNumber: "",
  brand: "",
  model: "",
  modelYear: "",
  fuelType: "GASOLINE",
  averageConsumptionLPer100Km: "7.50",
  odometerKm: "",
};

const initialQuickTripFormState: QuickTripFormState = {
  deadheadKm: "",
  durationMinutes: "",
  grossIncome: "",
  note: "",
  paymentMethod: "DIGITAL",
  tripKm: "",
};

const initialShiftFormState: ShiftFormState = {
  endOdometerKm: "",
  note: "",
  startOdometerKm: "",
};

const fuelOptions: Array<{ label: string; value: FuelType }> = [
  { label: "Benzin", value: "GASOLINE" },
  { label: "Dizel", value: "DIESEL" },
  { label: "LPG", value: "LPG" },
  { label: "Hibrit", value: "HYBRID" },
  { label: "Elektrik", value: "ELECTRIC" },
  { label: "Diger", value: "OTHER" },
];

const paymentMethodOptions: Array<{ label: string; value: PaymentMethod }> = [
  { label: "Dijital", value: "DIGITAL" },
  { label: "Nakit", value: "CASH" },
  { label: "Kart", value: "CARD" },
  { label: "Karma", value: "MIXED" },
  { label: "Diger", value: "OTHER" },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const [storedToken, storedUser, storedVehicle] = await Promise.all([
        getStoredString(storageKeys.accessToken),
        getStoredJson<AuthUser>(storageKeys.user),
        getStoredJson<Vehicle>(storageKeys.selectedVehicle),
      ]);

      setAccessToken(storedToken);
      setUser(storedUser);
      setSelectedVehicle(storedVehicle);
      setIsBooting(false);
    }

    restoreSession().catch(() => setIsBooting(false));
  }, []);

  async function handleAuthenticated(response: AuthResponse) {
    const nextUser = response.data.user ?? null;

    await Promise.all([
      setStoredString(storageKeys.accessToken, response.data.accessToken),
      setStoredString(storageKeys.refreshToken, response.data.refreshToken),
      nextUser
        ? setStoredJson(storageKeys.user, nextUser)
        : removeStoredValue(storageKeys.user),
    ]);

    setAccessToken(response.data.accessToken);
    setUser(nextUser);
    setSelectedVehicle(null);
  }

  async function handleVehicleSelected(vehicle: Vehicle) {
    await setStoredJson(storageKeys.selectedVehicle, vehicle);
    setSelectedVehicle(vehicle);
  }

  async function handleChangeVehicle() {
    await removeStoredValue(storageKeys.selectedVehicle);
    setSelectedVehicle(null);
  }

  async function handleLogout() {
    await clearStoredValues([
      storageKeys.accessToken,
      storageKeys.refreshToken,
      storageKeys.user,
      storageKeys.selectedVehicle,
    ]);

    setAccessToken(null);
    setUser(null);
    setSelectedVehicle(null);
  }

  if (isBooting) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.loadingScreen}>
          <ActivityIndicator color="#115e59" />
          <Text style={styles.loadingText}>Oturum kontrol ediliyor</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!accessToken) {
    return (
      <AuthScreen
        apiBaseUrl={getApiBaseUrl()}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  if (!selectedVehicle) {
    return (
      <VehicleSelectionScreen
        accessToken={accessToken}
        apiBaseUrl={getApiBaseUrl()}
        onLogout={handleLogout}
        onVehicleSelected={handleVehicleSelected}
      />
    );
  }

  return (
    <DashboardScreen
      accessToken={accessToken}
      onChangeVehicle={handleChangeVehicle}
      onLogout={handleLogout}
      selectedVehicle={selectedVehicle}
      user={user}
    />
  );
}

function AuthScreen({
  apiBaseUrl,
  onAuthenticated,
}: {
  apiBaseUrl: string;
  onAuthenticated: (response: AuthResponse) => Promise<void>;
}) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<AuthFormState>(initialFormState);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copy = useMemo(
    () =>
      mode === "login"
        ? {
            eyebrow: "Mobil uygulama",
            title: "Hesabina giris yap",
            detail: "Gunluk net karini ve paket durumunu hizli takip et.",
            button: "Giris Yap",
            loading: "Giris yapiliyor",
            switchText: "Hesabin yok mu?",
            switchAction: "Kayit ol",
          }
        : {
            eyebrow: "Ilk kurulum",
            title: "Surucu hesabini olustur",
            detail: "Arac ve paket gideri takibine baslamak icin hesap ac.",
            button: "Kayit Ol",
            loading: "Hesap olusturuluyor",
            switchText: "Zaten hesabin var mi?",
            switchAction: "Giris yap",
          },
    [mode],
  );

  function updateField(field: keyof AuthFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function switchMode() {
    setMode((current) => (current === "login" ? "register" : "login"));
    setForm(initialFormState);
    setMessage(null);
  }

  async function submit() {
    if (!form.email.trim() || !form.password) {
      setMessage("E-posta ve sifre zorunlu.");
      return;
    }

    if (form.password.length < 8) {
      setMessage("Sifre en az 8 karakter olmali.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await postJson<AuthResponse>(
        `${apiBaseUrl}/auth/${mode}`,
        mode === "login"
          ? {
              email: form.email.trim(),
              password: form.password,
              deviceName: getDeviceName(),
            }
          : {
              fullName: form.fullName.trim() || undefined,
              email: form.email.trim(),
              phone: form.phone.trim() || undefined,
              password: form.password,
              deviceName: getDeviceName(),
            },
      );

      await onAuthenticated(response);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : mode === "login"
            ? "Giris yapilamadi."
            : "Kayit olusturulamadi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.authContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.authHeader}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>TF</Text>
            </View>
            <Text style={styles.brandName}>TAG Finans</Text>
          </View>

          <View style={styles.authIntro}>
            <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
            <Text style={styles.authTitle}>{copy.title}</Text>
            <Text style={styles.authDetail}>{copy.detail}</Text>
          </View>

          <View style={styles.authCard}>
            {mode === "register" ? (
              <TextField
                autoComplete="name"
                label="Ad soyad"
                onChangeText={(value) => updateField("fullName", value)}
                placeholder="Ali Yilmaz"
                value={form.fullName}
              />
            ) : null}

            <TextField
              autoCapitalize="none"
              autoComplete="email"
              inputMode="email"
              label="E-posta"
              onChangeText={(value) => updateField("email", value)}
              placeholder="surucu@example.com"
              value={form.email}
            />

            {mode === "register" ? (
              <TextField
                autoComplete="tel"
                inputMode="tel"
                label="Telefon"
                onChangeText={(value) => updateField("phone", value)}
                placeholder="+905551112233"
                value={form.phone}
              />
            ) : null}

            <TextField
              autoCapitalize="none"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              label="Sifre"
              onChangeText={(value) => updateField("password", value)}
              placeholder="En az 8 karakter"
              secureTextEntry
              value={form.password}
            />

            {message ? <Text style={styles.formAlert}>{message}</Text> : null}

            <Pressable
              disabled={isSubmitting}
              onPress={submit}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || isSubmitting) && styles.primaryButtonPressed,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>{copy.button}</Text>
              )}
            </Pressable>

            <View style={styles.authSwitchRow}>
              <Text style={styles.authSwitchText}>{copy.switchText}</Text>
              <Pressable onPress={switchMode}>
                <Text style={styles.authSwitchAction}>{copy.switchAction}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TextField({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        placeholderTextColor="#91a0aa"
        style={styles.input}
        {...props}
      />
    </View>
  );
}

function VehicleSelectionScreen({
  accessToken,
  apiBaseUrl,
  onLogout,
  onVehicleSelected,
}: {
  accessToken: string;
  apiBaseUrl: string;
  onLogout: () => Promise<void>;
  onVehicleSelected: (vehicle: Vehicle) => Promise<void>;
}) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState<VehicleFormState>(initialVehicleFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadVehicles().catch((error) => {
      setMessage(
        error instanceof Error ? error.message : "Araclar yuklenemedi.",
      );
      setIsLoading(false);
    });
  }, []);

  async function loadVehicles() {
    setIsLoading(true);
    setMessage(null);

    const response = await getJson<{ data: Vehicle[] }>(
      `${apiBaseUrl}/vehicles`,
      accessToken,
    );

    setVehicles(response.data);
    setShowCreateForm(response.data.length === 0);
    setIsLoading(false);
  }

  function updateField(field: keyof VehicleFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function selectVehicle(vehicle: Vehicle) {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await postJson<{ data: Vehicle }>(
        `${apiBaseUrl}/vehicles/${vehicle.id}/set-active`,
        {},
        accessToken,
      );

      await onVehicleSelected(response.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Arac secilemedi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createVehicle() {
    if (!form.plateNumber.trim()) {
      setMessage("Plaka zorunlu.");
      return;
    }

    if (!form.averageConsumptionLPer100Km.trim()) {
      setMessage("Ortalama tuketim zorunlu.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await postJson<{ data: Vehicle }>(
        `${apiBaseUrl}/vehicles`,
        {
          plateNumber: form.plateNumber.trim(),
          brand: form.brand.trim() || undefined,
          model: form.model.trim() || undefined,
          modelYear: form.modelYear ? Number(form.modelYear) : undefined,
          fuelType: form.fuelType,
          averageConsumptionLPer100Km: form.averageConsumptionLPer100Km.trim(),
          odometerKm: form.odometerKm.trim() || undefined,
        },
        accessToken,
      );

      await onVehicleSelected(response.data);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Arac olusturulamadi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.eyebrow}>Ilk kurulum</Text>
            <Text style={styles.title}>Arac secimi</Text>
            <Text style={styles.userLine}>
              Gunluk net kar hesaplari secili araca gore tutulur.
            </Text>
          </View>
          <Pressable onPress={onLogout} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>Cikis</Text>
          </Pressable>
        </View>

        {message ? <Text style={styles.formAlert}>{message}</Text> : null}

        {isLoading ? (
          <View style={styles.section}>
            <ActivityIndicator color="#115e59" />
            <Text style={styles.emptyText}>Araclar yukleniyor</Text>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Kayitli araclar</Text>
              <Pressable onPress={loadVehicles} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Yenile</Text>
              </Pressable>
            </View>

            {vehicles.length > 0 ? (
              vehicles.map((vehicle) => (
                <Pressable
                  disabled={isSubmitting}
                  key={vehicle.id}
                  onPress={() => selectVehicle(vehicle)}
                  style={({ pressed }) => [
                    styles.vehicleCard,
                    vehicle.isActive && styles.vehicleCardActive,
                    pressed && styles.vehicleCardPressed,
                  ]}
                >
                  <View style={styles.vehiclePlate}>
                    <Text style={styles.vehiclePlateText}>
                      {vehicle.plateNumber}
                    </Text>
                  </View>
                  <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleName}>
                      {formatVehicleName(vehicle)}
                    </Text>
                    <Text style={styles.vehicleMeta}>
                      {formatFuelType(vehicle.fuelType)} -{" "}
                      {vehicle.averageConsumptionLPer100Km} lt/100 km
                    </Text>
                  </View>
                  {vehicle.isActive ? (
                    <Text style={styles.activeTag}>Aktif</Text>
                  ) : null}
                </Pressable>
              ))
            ) : (
              <Text style={styles.emptyText}>
                Henuz arac yok. Baslamak icin ilk aracini ekle.
              </Text>
            )}

            <Pressable
              onPress={() => setShowCreateForm((current) => !current)}
              style={styles.outlineButton}
            >
              <Text style={styles.outlineButtonText}>
                {showCreateForm ? "Formu kapat" : "Yeni arac ekle"}
              </Text>
            </Pressable>
          </View>
        )}

        {showCreateForm ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yeni arac</Text>
            <TextField
              autoCapitalize="characters"
              label="Plaka"
              onChangeText={(value) => updateField("plateNumber", value)}
              placeholder="34ABC123"
              value={form.plateNumber}
            />
            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <TextField
                  label="Marka"
                  onChangeText={(value) => updateField("brand", value)}
                  placeholder="Toyota"
                  value={form.brand}
                />
              </View>
              <View style={styles.formColumn}>
                <TextField
                  label="Model"
                  onChangeText={(value) => updateField("model", value)}
                  placeholder="Corolla"
                  value={form.model}
                />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <TextField
                  inputMode="numeric"
                  label="Model yili"
                  onChangeText={(value) => updateField("modelYear", value)}
                  placeholder="2020"
                  value={form.modelYear}
                />
              </View>
              <View style={styles.formColumn}>
                <TextField
                  inputMode="decimal"
                  label="Km sayaci"
                  onChangeText={(value) => updateField("odometerKm", value)}
                  placeholder="85000"
                  value={form.odometerKm}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Yakit tipi</Text>
            <View style={styles.optionGrid}>
              {fuelOptions.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => updateField("fuelType", option.value)}
                  style={[
                    styles.optionButton,
                    form.fuelType === option.value && styles.optionButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      form.fuelType === option.value &&
                        styles.optionButtonTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextField
              inputMode="decimal"
              label="Ortalama tuketim"
              onChangeText={(value) =>
                updateField("averageConsumptionLPer100Km", value)
              }
              placeholder="7.50"
              value={form.averageConsumptionLPer100Km}
            />

            <Pressable
              disabled={isSubmitting}
              onPress={createVehicle}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || isSubmitting) && styles.primaryButtonPressed,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Araci Kaydet ve Sec
                </Text>
              )}
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function DashboardScreen({
  accessToken,
  onChangeVehicle,
  onLogout,
  selectedVehicle,
  user,
}: {
  accessToken: string;
  onChangeVehicle: () => Promise<void>;
  onLogout: () => Promise<void>;
  selectedVehicle: Vehicle;
  user: AuthUser | null;
}) {
  const [activeTab, setActiveTab] = useState<MainTab>("today");

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appShell}>
        <ScrollView contentContainerStyle={styles.containerWithTabs}>
          <View style={styles.header}>
            <View style={styles.headerTitleBlock}>
              <Text style={styles.eyebrow}>{getTabEyebrow(activeTab)}</Text>
              <Text style={styles.title}>{getTabTitle(activeTab)}</Text>
              <Text style={styles.userLine}>
                {user?.fullName || user?.email || "Surucu"}
              </Text>
              <Text style={styles.vehicleLine}>
                {selectedVehicle.plateNumber} -{" "}
                {formatVehicleName(selectedVehicle)}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable onPress={onChangeVehicle} style={styles.logoutButton}>
                <Text style={styles.logoutButtonText}>Arac</Text>
              </Pressable>
              <Pressable onPress={onLogout} style={styles.logoutButton}>
                <Text style={styles.logoutButtonText}>Cikis</Text>
              </Pressable>
            </View>
          </View>

          {activeTab === "today" ? (
            <TodayTabContent
              accessToken={accessToken}
              apiBaseUrl={getApiBaseUrl()}
              selectedVehicle={selectedVehicle}
            />
          ) : null}
          {activeTab === "record" ? (
            <RecordTabContent
              accessToken={accessToken}
              apiBaseUrl={getApiBaseUrl()}
              selectedVehicle={selectedVehicle}
            />
          ) : null}
          {activeTab === "reports" ? <ReportsTabContent /> : null}
          {activeTab === "vehicles" ? (
            <VehiclesTabContent
              onChangeVehicle={onChangeVehicle}
              selectedVehicle={selectedVehicle}
            />
          ) : null}
        </ScrollView>

        <View style={styles.bottomTabBar}>
          {mainTabs.map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={styles.tabButton}
              >
                <View
                  style={[
                    styles.tabIcon,
                    isActive ? styles.tabIconActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabIconText,
                      isActive ? styles.tabIconTextActive : null,
                    ]}
                  >
                    {tab.icon}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    isActive ? styles.tabLabelActive : null,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

function TodayTabContent({
  accessToken,
  apiBaseUrl,
  selectedVehicle,
}: {
  accessToken: string;
  apiBaseUrl: string;
  selectedVehicle: Vehicle;
}) {
  const [summary, setSummary] = useState<DailyIncomeSummary>({
    activeMinutes: 0,
    estimatedFuelCost: 0,
    grossIncome: 0,
    netProfit: 0,
    totalKm: 0,
    tripCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDailySummary().catch((error) => {
      setMessage(
        error instanceof Error ? error.message : "Gunluk gelir yuklenemedi.",
      );
      setIsLoading(false);
    });
  }, [selectedVehicle.id]);

  async function loadDailySummary() {
    setIsLoading(true);
    setMessage(null);

    const today = getLocalDateInputValue();
    const [tripsResponse, shiftsResponse] = await Promise.all([
      getJson<TripsResponse>(
        `${apiBaseUrl}/trips${buildQueryString({
          endDate: today,
          page: 1,
          pageSize: 100,
          sortBy: "tripDate",
          sortDirection: "desc",
          startDate: today,
          vehicleId: selectedVehicle.id,
        })}`,
        accessToken,
      ),
      getJson<ShiftsResponse>(
        `${apiBaseUrl}/shifts${buildQueryString({
          endDate: today,
          page: 1,
          pageSize: 50,
          sortBy: "startedAt",
          sortDirection: "desc",
          startDate: today,
          vehicleId: selectedVehicle.id,
        })}`,
        accessToken,
      ),
    ]);

    setSummary(calculateDailyIncomeSummary(tripsResponse, shiftsResponse));
    setIsLoading(false);
  }

  const netPerKm =
    summary.totalKm > 0 ? summary.netProfit / summary.totalKm : 0;
  const hourlyNet =
    summary.activeMinutes > 0
      ? summary.netProfit / (summary.activeMinutes / 60)
      : 0;
  const allocatedCost = Math.max(
    summary.grossIncome - summary.netProfit - summary.estimatedFuelCost,
    0,
  );
  const breakEvenStatus =
    summary.tripCount === 0
      ? "Kayit bekliyor"
      : summary.netProfit >= 0
        ? "Karda"
        : "Zararda";
  const metricRows = [
    ["Bugunku brut gelir", formatMoney(summary.grossIncome)],
    ["Sefer sayisi", String(summary.tripCount)],
    ["Km basi net", `${formatNumber(netPerKm)} TL`],
    ["Saatlik net", formatMoney(hourlyNet)],
  ];
  const expenseRows = [
    ["Tahmini yakit", formatMoney(summary.estimatedFuelCost)],
    ["Paket/sabit gider payi", formatMoney(allocatedCost)],
    ["Toplam km", `${formatNumber(summary.totalKm)} km`],
  ];

  return (
    <>
      <View style={styles.heroCard}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{breakEvenStatus}</Text>
        </View>
        <Text style={styles.heroLabel}>Net kar</Text>
        <Text style={styles.heroValue}>
          {isLoading ? "..." : formatMoney(summary.netProfit)}
        </Text>
        <Text style={styles.heroDetail}>
          {isLoading
            ? "Bugunun sefer ve vardiya kayitlari yukleniyor."
            : `${formatMoney(summary.grossIncome)} brut gelir, ${formatMoney(
                summary.estimatedFuelCost,
              )} tahmini yakit maliyeti ile hesaplandi.`}
        </Text>
      </View>

      {message ? <Text style={styles.formAlert}>{message}</Text> : null}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Gunluk gelir ozeti</Text>
        <Pressable onPress={loadDailySummary} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Yenile</Text>
        </Pressable>
      </View>

      <View style={styles.metricGrid}>
        {metricRows.map(([label, value]) => (
          <View key={label} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={styles.metricValue}>{isLoading ? "..." : value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gider kirilimi</Text>
        {expenseRows.map(([name, amount]) => (
          <View key={name} style={styles.expenseRow}>
            <Text style={styles.expenseName}>{name}</Text>
            <Text style={styles.expenseAmount}>
              {isLoading ? "..." : amount}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aktif calisma</Text>
        <View style={styles.expenseRow}>
          <Text style={styles.expenseName}>Sure</Text>
          <Text style={styles.expenseAmount}>
            {isLoading ? "..." : formatDuration(summary.activeMinutes)}
          </Text>
        </View>
        <View style={styles.expenseRow}>
          <Text style={styles.expenseName}>Arac</Text>
          <Text style={styles.expenseAmount}>
            {selectedVehicle.plateNumber}
          </Text>
        </View>
      </View>
    </>
  );
}

function RecordTabContent({
  accessToken,
  apiBaseUrl,
  selectedVehicle,
}: {
  accessToken: string;
  apiBaseUrl: string;
  selectedVehicle: Vehicle;
}) {
  const [form, setForm] = useState<QuickTripFormState>(
    initialQuickTripFormState,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tripDrafts, setTripDrafts] = useState<TripDraft[]>([]);
  const [isDraftLoading, setIsDraftLoading] = useState(true);
  const [isSyncingDrafts, setIsSyncingDrafts] = useState(false);
  const [lastTrip, setLastTrip] = useState<Trip | null>(null);
  const [shiftForm, setShiftForm] = useState<ShiftFormState>(() => ({
    ...initialShiftFormState,
    startOdometerKm: selectedVehicle.odometerKm ?? "",
  }));
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [lastCompletedShift, setLastCompletedShift] = useState<Shift | null>(
    null,
  );
  const [shiftMessage, setShiftMessage] = useState<string | null>(null);
  const [isShiftLoading, setIsShiftLoading] = useState(true);
  const [isShiftSubmitting, setIsShiftSubmitting] = useState(false);

  useEffect(() => {
    setShiftForm({
      ...initialShiftFormState,
      startOdometerKm: selectedVehicle.odometerKm ?? "",
    });
    setLastCompletedShift(null);
    loadTripDrafts().catch(() => setIsDraftLoading(false));
    loadActiveShift().catch((error) => {
      setShiftMessage(
        error instanceof Error ? error.message : "Aktif vardiya yuklenemedi.",
      );
      setIsShiftLoading(false);
    });
  }, [selectedVehicle.id]);

  function updateField(field: keyof QuickTripFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateShiftField(field: keyof ShiftFormState, value: string) {
    setShiftForm((current) => ({ ...current, [field]: value }));
  }

  async function loadTripDrafts() {
    setIsDraftLoading(true);

    const drafts = await listTripDrafts();

    setTripDrafts(
      drafts.filter((draft) => draft.payload?.vehicleId === selectedVehicle.id),
    );
    setIsDraftLoading(false);
  }

  async function loadActiveShift() {
    setIsShiftLoading(true);
    setShiftMessage(null);

    const response = await getJson<ShiftsResponse>(
      `${apiBaseUrl}/shifts?vehicleId=${encodeURIComponent(
        selectedVehicle.id,
      )}&status=ACTIVE&page=1&pageSize=1&sortBy=startedAt&sortDirection=desc`,
      accessToken,
    );

    const nextActiveShift = response.data[0] ?? null;

    setActiveShift(nextActiveShift);
    setShiftForm((current) => ({
      ...current,
      endOdometerKm: nextActiveShift?.endOdometerKm ?? "",
      note: nextActiveShift?.note ?? current.note,
      startOdometerKm:
        nextActiveShift?.startOdometerKm ??
        current.startOdometerKm ??
        selectedVehicle.odometerKm ??
        "",
    }));
    setIsShiftLoading(false);
  }

  async function submitQuickTrip() {
    const draftInput = buildQuickTripDraftInput();

    if (!draftInput) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await postJson<{ data: Trip }>(
        `${apiBaseUrl}/trips`,
        { ...draftInput.payload },
        accessToken,
      );

      setLastTrip(response.data);
      setForm(initialQuickTripFormState);
      setMessage("Sefer kaydi eklendi.");
    } catch (error) {
      await saveCurrentTripDraft(draftInput);
      setMessage(
        `Sefer gonderilemedi, offline taslak kaydedildi. ${
          error instanceof Error ? error.message : ""
        }`.trim(),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function buildQuickTripDraftInput(): QuickTripDraftInput | null {
    const grossIncome = normalizeDecimalInput(form.grossIncome);
    const tripKm = normalizeDecimalInput(form.tripKm);
    const deadheadKm = normalizeDecimalInput(form.deadheadKm);
    const durationMinutes = form.durationMinutes.trim()
      ? Number(form.durationMinutes)
      : undefined;

    if (!grossIncome || Number(grossIncome) <= 0) {
      setMessage("Gelir 0 TL uzerinde olmali.");
      return null;
    }

    if (!tripKm || Number(tripKm) < 0) {
      setMessage("Sefer km zorunlu.");
      return null;
    }

    if (deadheadKm && Number(deadheadKm) < 0) {
      setMessage("Bos km negatif olamaz.");
      return null;
    }

    if (
      durationMinutes !== undefined &&
      (!Number.isInteger(durationMinutes) || durationMinutes < 0)
    ) {
      setMessage("Sure dakika olarak pozitif tam sayi olmali.");
      return null;
    }

    const payload: TripDraftPayload = {
      deadheadKm: deadheadKm || undefined,
      durationMinutes,
      grossIncome,
      note: form.note.trim() || undefined,
      paymentMethod: form.paymentMethod,
      shiftId: activeShift?.id,
      tripDate: getLocalDateInputValue(),
      tripKm,
      vehicleId: selectedVehicle.id,
    };

    return {
      payload,
      totalKm: String(toNumber(tripKm) + toNumber(deadheadKm)),
    };
  }

  async function saveCurrentTripDraft(draftInput?: QuickTripDraftInput) {
    const nextDraftInput = draftInput ?? buildQuickTripDraftInput();

    if (!nextDraftInput) {
      return;
    }

    const draft = await saveTripDraft({
      grossIncome: nextDraftInput.payload.grossIncome,
      note: nextDraftInput.payload.note,
      payload: nextDraftInput.payload,
      totalKm: nextDraftInput.totalKm,
    });

    setTripDrafts((current) => [draft, ...current]);
    setForm(initialQuickTripFormState);

    if (!draftInput) {
      setMessage("Sefer offline taslak olarak kaydedildi.");
    }
  }

  async function syncTripDrafts() {
    if (tripDrafts.length === 0) {
      setMessage("Gonderilecek offline taslak yok.");
      return;
    }

    setIsSyncingDrafts(true);
    setMessage(null);

    let syncedCount = 0;

    try {
      for (const draft of tripDrafts) {
        const response = await postJson<{ data: Trip }>(
          `${apiBaseUrl}/trips`,
          { ...draft.payload },
          accessToken,
        );

        await removeTripDraft(draft.id);
        setLastTrip(response.data);
        syncedCount += 1;
      }

      setTripDrafts([]);
      setMessage(`${syncedCount} offline taslak gonderildi.`);
    } catch (error) {
      await loadTripDrafts();
      setMessage(
        error instanceof Error
          ? `Taslak gonderimi durdu: ${error.message}`
          : "Taslaklar gonderilemedi.",
      );
    } finally {
      setIsSyncingDrafts(false);
    }
  }

  const totalKmPreview =
    toNumber(normalizeDecimalInput(form.tripKm)) +
    toNumber(normalizeDecimalInput(form.deadheadKm));

  async function startShift() {
    const startOdometerKm = normalizeDecimalInput(shiftForm.startOdometerKm);

    if (startOdometerKm && Number(startOdometerKm) < 0) {
      setShiftMessage("Baslangic km negatif olamaz.");
      return;
    }

    setIsShiftSubmitting(true);
    setShiftMessage(null);

    try {
      const response = await postJson<{ data: Shift }>(
        `${apiBaseUrl}/shifts`,
        {
          note: shiftForm.note.trim() || undefined,
          startOdometerKm: startOdometerKm || undefined,
          startedAt: new Date().toISOString(),
          status: "ACTIVE",
          vehicleId: selectedVehicle.id,
        },
        accessToken,
      );

      setActiveShift(response.data);
      setLastCompletedShift(null);
      setShiftForm((current) => ({
        ...current,
        endOdometerKm: "",
        startOdometerKm:
          response.data.startOdometerKm ?? current.startOdometerKm,
      }));
      setShiftMessage("Vardiya baslatildi.");
    } catch (error) {
      setShiftMessage(
        error instanceof Error ? error.message : "Vardiya baslatilamadi.",
      );
    } finally {
      setIsShiftSubmitting(false);
    }
  }

  async function finishShift() {
    if (!activeShift) {
      setShiftMessage("Aktif vardiya bulunamadi.");
      return;
    }

    const endOdometerKm = normalizeDecimalInput(shiftForm.endOdometerKm);
    const startOdometerKm = normalizeDecimalInput(
      shiftForm.startOdometerKm || activeShift.startOdometerKm || "",
    );

    if (!endOdometerKm) {
      setShiftMessage("Bitis km zorunlu.");
      return;
    }

    if (Number(endOdometerKm) < 0) {
      setShiftMessage("Bitis km negatif olamaz.");
      return;
    }

    if (startOdometerKm && Number(endOdometerKm) < Number(startOdometerKm)) {
      setShiftMessage("Bitis km baslangic kmden kucuk olamaz.");
      return;
    }

    setIsShiftSubmitting(true);
    setShiftMessage(null);

    try {
      const response = await patchJson<{ data: Shift }>(
        `${apiBaseUrl}/shifts/${activeShift.id}`,
        {
          endedAt: new Date().toISOString(),
          endOdometerKm,
          note: shiftForm.note.trim() || activeShift.note || undefined,
          startOdometerKm: startOdometerKm || undefined,
          status: "COMPLETED",
        },
        accessToken,
      );

      setActiveShift(null);
      setLastCompletedShift(response.data);
      setShiftForm({
        ...initialShiftFormState,
        startOdometerKm: response.data.endOdometerKm ?? "",
      });
      setShiftMessage("Vardiya bitirildi.");
    } catch (error) {
      setShiftMessage(
        error instanceof Error ? error.message : "Vardiya bitirilemedi.",
      );
    } finally {
      setIsShiftSubmitting(false);
    }
  }

  return (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Hizli sefer ekle</Text>
            <Text style={styles.sectionSubtitle}>
              {selectedVehicle.plateNumber} icin 10 saniyelik gelir kaydi.
            </Text>
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formColumn}>
            <TextField
              inputMode="decimal"
              keyboardType="decimal-pad"
              label="Gelir"
              onChangeText={(value) => updateField("grossIncome", value)}
              placeholder="450"
              value={form.grossIncome}
            />
          </View>
          <View style={styles.formColumn}>
            <TextField
              inputMode="decimal"
              keyboardType="decimal-pad"
              label="Sefer km"
              onChangeText={(value) => updateField("tripKm", value)}
              placeholder="18"
              value={form.tripKm}
            />
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formColumn}>
            <TextField
              inputMode="decimal"
              keyboardType="decimal-pad"
              label="Bos km"
              onChangeText={(value) => updateField("deadheadKm", value)}
              placeholder="4"
              value={form.deadheadKm}
            />
          </View>
          <View style={styles.formColumn}>
            <TextField
              inputMode="numeric"
              keyboardType="number-pad"
              label="Sure dk"
              onChangeText={(value) => updateField("durationMinutes", value)}
              placeholder="32"
              value={form.durationMinutes}
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>Odeme tipi</Text>
        <View style={styles.optionGrid}>
          {paymentMethodOptions.map((option) => {
            const isActive = form.paymentMethod === option.value;

            return (
              <Pressable
                key={option.value}
                onPress={() => updateField("paymentMethod", option.value)}
                style={[
                  styles.optionButton,
                  isActive ? styles.optionButtonActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    isActive ? styles.optionButtonTextActive : null,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextField
          label="Not"
          multiline
          onChangeText={(value) => updateField("note", value)}
          placeholder="Yogun trafik, ekstra bekleme..."
          style={[styles.input, styles.textArea]}
          value={form.note}
        />

        <View style={styles.quickTripPreview}>
          <View>
            <Text style={styles.shiftLabel}>Toplam km</Text>
            <Text style={styles.shiftValue}>
              {formatNumber(totalKmPreview)} km
            </Text>
          </View>
          <View style={styles.autoCalcBadge}>
            <Text style={styles.autoCalcBadgeText}>
              Yakit otomatik hesaplanir
            </Text>
          </View>
        </View>

        {message ? (
          <Text
            style={[
              styles.formAlert,
              isSuccessMessage(message) ? styles.formSuccess : null,
            ]}
          >
            {message}
          </Text>
        ) : null}

        <Pressable
          disabled={isSubmitting}
          onPress={submitQuickTrip}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || isSubmitting) && styles.primaryButtonPressed,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Seferi Kaydet</Text>
          )}
        </Pressable>

        <Pressable
          disabled={isSubmitting}
          onPress={() => saveCurrentTripDraft()}
          style={styles.outlineButton}
        >
          <Text style={styles.outlineButtonText}>Offline Taslak Kaydet</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Offline taslaklar</Text>
            <Text style={styles.sectionSubtitle}>
              Baglanti yokken seferleri cihazda sakla, sonra API'ye gonder.
            </Text>
          </View>
          <Pressable
            disabled={isSyncingDrafts || tripDrafts.length === 0}
            onPress={syncTripDrafts}
            style={[
              styles.secondaryButton,
              (isSyncingDrafts || tripDrafts.length === 0) &&
                styles.disabledButton,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {isSyncingDrafts ? "Gonderiliyor" : "Gonder"}
            </Text>
          </Pressable>
        </View>

        {isDraftLoading ? (
          <View style={styles.draftRow}>
            <ActivityIndicator color="#115e59" />
            <Text style={styles.emptyText}>Taslaklar yukleniyor</Text>
          </View>
        ) : tripDrafts.length > 0 ? (
          tripDrafts.map((draft) => (
            <View key={draft.id} style={styles.draftRow}>
              <View style={styles.draftInfo}>
                <Text style={styles.expenseName}>
                  {formatMoney(toNumber(draft.grossIncome))} gelir
                </Text>
                <Text style={styles.draftMeta}>
                  {formatNumber(toNumber(draft.totalKm))} km -{" "}
                  {formatDateTime(draft.createdAt)}
                </Text>
              </View>
              <Text style={styles.activeTag}>Bekliyor</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>
            Bekleyen offline sefer taslagi yok.
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Son sefer ozeti</Text>
        {lastTrip ? (
          <>
            <View style={styles.expenseRow}>
              <Text style={styles.expenseName}>Toplam gelir</Text>
              <Text style={styles.expenseAmount}>
                {formatMoney(toNumber(lastTrip.totalIncome))}
              </Text>
            </View>
            <View style={styles.expenseRow}>
              <Text style={styles.expenseName}>Toplam km</Text>
              <Text style={styles.expenseAmount}>
                {formatNumber(toNumber(lastTrip.totalKm))} km
              </Text>
            </View>
            <View style={styles.expenseRow}>
              <Text style={styles.expenseName}>Tahmini yakit</Text>
              <Text style={styles.expenseAmount}>
                {formatMoney(toNumber(lastTrip.estimatedFuelCost))}
              </Text>
            </View>
            <View style={styles.expenseRow}>
              <Text style={styles.expenseName}>Gercek net kar</Text>
              <Text style={styles.expenseAmount}>
                {formatMoney(toNumber(lastTrip.trueNetProfit))}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>
            Kayit sonrasi API hesapladigi gelir, km, yakit ve net kar burada
            gorunur.
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diger hizli kayitlar</Text>
        <View style={styles.actionGrid}>
          {["Gider Ekle", "Yakit Ekle", "Paket Ekle", "Bakim Ekle"].map(
            (action) => (
              <Pressable key={action} style={styles.actionButton}>
                <Text style={styles.actionText}>{action}</Text>
              </Pressable>
            ),
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vardiya modu</Text>
        {isShiftLoading ? (
          <View style={styles.shiftPanel}>
            <View>
              <Text style={styles.shiftLabel}>Durum</Text>
              <Text style={styles.shiftValue}>Yukleniyor</Text>
            </View>
            <ActivityIndicator color="#115e59" />
          </View>
        ) : (
          <>
            <View style={styles.shiftPanel}>
              <View>
                <Text style={styles.shiftLabel}>Durum</Text>
                <Text style={styles.shiftValue}>
                  {activeShift ? "Aktif" : "Hazir"}
                </Text>
                {activeShift ? (
                  <Text style={styles.shiftDetail}>
                    {formatDateTime(activeShift.startedAt)}
                  </Text>
                ) : null}
              </View>
              <View style={styles.autoCalcBadge}>
                <Text style={styles.autoCalcBadgeText}>
                  {activeShift ? "Vardiya acik" : "Baslatmaya hazir"}
                </Text>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <TextField
                  editable={!activeShift}
                  inputMode="decimal"
                  keyboardType="decimal-pad"
                  label="Baslangic km"
                  onChangeText={(value) =>
                    updateShiftField("startOdometerKm", value)
                  }
                  placeholder="85000"
                  value={shiftForm.startOdometerKm}
                />
              </View>
              <View style={styles.formColumn}>
                <TextField
                  editable={Boolean(activeShift)}
                  inputMode="decimal"
                  keyboardType="decimal-pad"
                  label="Bitis km"
                  onChangeText={(value) =>
                    updateShiftField("endOdometerKm", value)
                  }
                  placeholder="85142"
                  value={shiftForm.endOdometerKm}
                />
              </View>
            </View>

            <TextField
              label="Vardiya notu"
              onChangeText={(value) => updateShiftField("note", value)}
              placeholder="Aksam yogunlugu, hedef..."
              value={shiftForm.note}
            />

            {shiftMessage ? (
              <Text
                style={[
                  styles.formAlert,
                  shiftMessage.includes("baslatildi") ||
                  shiftMessage.includes("bitirildi")
                    ? styles.formSuccess
                    : null,
                ]}
              >
                {shiftMessage}
              </Text>
            ) : null}

            <Pressable
              disabled={isShiftSubmitting}
              onPress={activeShift ? finishShift : startShift}
              style={({ pressed }) => [
                styles.shiftButtonWide,
                activeShift ? styles.dangerButton : null,
                (pressed || isShiftSubmitting) && styles.primaryButtonPressed,
              ]}
            >
              {isShiftSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.shiftButtonText}>
                  {activeShift ? "Vardiyayi Bitir" : "Vardiyaya Basla"}
                </Text>
              )}
            </Pressable>

            {lastCompletedShift ? (
              <View style={styles.shiftResultPanel}>
                <View style={styles.expenseRow}>
                  <Text style={styles.expenseName}>Sure</Text>
                  <Text style={styles.expenseAmount}>
                    {formatDuration(lastCompletedShift.activeMinutes ?? 0)}
                  </Text>
                </View>
                <View style={styles.expenseRow}>
                  <Text style={styles.expenseName}>Toplam km</Text>
                  <Text style={styles.expenseAmount}>
                    {formatNumber(toNumber(lastCompletedShift.totalKm))} km
                  </Text>
                </View>
                <View style={styles.expenseRow}>
                  <Text style={styles.expenseName}>Vardiya geliri</Text>
                  <Text style={styles.expenseAmount}>
                    {formatMoney(toNumber(lastCompletedShift.grossIncome))}
                  </Text>
                </View>
                <View style={styles.expenseRow}>
                  <Text style={styles.expenseName}>Net kar</Text>
                  <Text style={styles.expenseAmount}>
                    {formatMoney(toNumber(lastCompletedShift.trueNetProfit))}
                  </Text>
                </View>
              </View>
            ) : null}
          </>
        )}
      </View>
    </>
  );
}

function ReportsTabContent() {
  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rapor ozeti</Text>
        {reportRows.map(([label, value]) => (
          <View key={label} style={styles.reportRow}>
            <Text style={styles.reportLabel}>{label}</Text>
            <Text style={styles.reportValue}>{value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Karlilik trendi</Text>
        <View style={styles.trendBars}>
          {[44, 72, 58, 86, 64, 92, 76].map((height, index) => (
            <View key={index} style={styles.trendBarTrack}>
              <View style={[styles.trendBarFill, { height }]} />
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

function VehiclesTabContent({
  onChangeVehicle,
  selectedVehicle,
}: {
  onChangeVehicle: () => Promise<void>;
  selectedVehicle: Vehicle;
}) {
  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Secili arac</Text>
        <View style={[styles.vehicleCard, styles.vehicleCardActive]}>
          <View style={styles.vehiclePlate}>
            <Text style={styles.vehiclePlateText}>
              {selectedVehicle.plateNumber}
            </Text>
          </View>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleName}>
              {formatVehicleName(selectedVehicle)}
            </Text>
            <Text style={styles.vehicleMeta}>
              {formatFuelType(selectedVehicle.fuelType)} -{" "}
              {selectedVehicle.averageConsumptionLPer100Km} lt/100 km
            </Text>
          </View>
          <Text style={styles.activeTag}>Aktif</Text>
        </View>

        <Pressable onPress={onChangeVehicle} style={styles.outlineButton}>
          <Text style={styles.outlineButtonText}>Arac Degistir</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Arac maliyetleri</Text>
        <View style={styles.expenseRow}>
          <Text style={styles.expenseName}>Yakit varsayimi</Text>
          <Text style={styles.expenseAmount}>
            {selectedVehicle.averageConsumptionLPer100Km} lt
          </Text>
        </View>
        <View style={styles.expenseRow}>
          <Text style={styles.expenseName}>Km sayaci</Text>
          <Text style={styles.expenseAmount}>
            {selectedVehicle.odometerKm ?? "-"}
          </Text>
        </View>
      </View>
    </>
  );
}

function getTabEyebrow(tab: MainTab) {
  if (tab === "record") {
    return "Kayit";
  }

  if (tab === "reports") {
    return "Analiz";
  }

  if (tab === "vehicles") {
    return "Arac";
  }

  return "Bugun";
}

function getTabTitle(tab: MainTab) {
  if (tab === "record") {
    return "Hizli islem";
  }

  if (tab === "reports") {
    return "Raporlar";
  }

  if (tab === "vehicles") {
    return "Arac profili";
  }

  return "Gercek net kar";
}

function calculateDailyIncomeSummary(
  tripsResponse: TripsResponse,
  shiftsResponse: ShiftsResponse,
): DailyIncomeSummary {
  const tripTotals = tripsResponse.data.reduce(
    (totals, trip) => ({
      activeMinutes: totals.activeMinutes + (trip.durationMinutes ?? 0),
      estimatedFuelCost:
        totals.estimatedFuelCost + toNumber(trip.estimatedFuelCost),
      grossIncome: totals.grossIncome + toNumber(trip.totalIncome),
      netProfit: totals.netProfit + toNumber(trip.trueNetProfit),
      totalKm: totals.totalKm + toNumber(trip.totalKm),
    }),
    {
      activeMinutes: 0,
      estimatedFuelCost: 0,
      grossIncome: 0,
      netProfit: 0,
      totalKm: 0,
    },
  );
  const shiftActiveMinutes = shiftsResponse.data.reduce(
    (total, shift) => total + (shift.activeMinutes ?? 0),
    0,
  );

  return {
    ...tripTotals,
    activeMinutes: shiftActiveMinutes || tripTotals.activeMinutes,
    tripCount: tripsResponse.meta.total,
  };
}

function buildQueryString(query: Record<string, string | number | undefined>) {
  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );

  return params.length > 0 ? `?${params.join("&")}` : "";
}

async function getJson<TResponse>(url: string, accessToken?: string) {
  const response = await fetch(url, {
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    method: "GET",
  });

  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new Error(formatApiError(payload));
  }

  return payload as TResponse;
}

async function postJson<TResponse>(
  url: string,
  body: Record<string, unknown>,
  accessToken?: string,
) {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    method: "POST",
  });

  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new Error(formatApiError(payload));
  }

  return payload as TResponse;
}

async function patchJson<TResponse>(
  url: string,
  body: Record<string, unknown>,
  accessToken?: string,
) {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    method: "PATCH",
  });

  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new Error(formatApiError(payload));
  }

  return payload as TResponse;
}

function formatApiError(payload: unknown) {
  const error = payload as ApiErrorResponse | undefined;

  if (Array.isArray(error?.message)) {
    return error.message.join(" ");
  }

  return error?.message ?? "Islem tamamlanamadi.";
}

function getLocalDateInputValue() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;

  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function normalizeDecimalInput(value: string) {
  return value.trim().replace(",", ".");
}

function toNumber(value: string | number | null | undefined) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    currency: "TRY",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  return `${hours}s ${remainingMinutes}d`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function isSuccessMessage(message: string) {
  return (
    message.includes("eklendi") ||
    message.includes("kaydedildi") ||
    message.includes("gonderildi")
  );
}

function getApiBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:3001/api/v1";
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `http://${window.location.hostname}:3001/api/v1`;
  }

  return "http://localhost:3001/api/v1";
}

function getDeviceName() {
  if (Platform.OS === "ios") {
    return "Expo iOS";
  }

  if (Platform.OS === "android") {
    return "Expo Android";
  }

  return "Expo Web";
}

function formatVehicleName(vehicle: Vehicle) {
  const name = [vehicle.brand, vehicle.model, vehicle.modelYear]
    .filter(Boolean)
    .join(" ");

  return name || "Arac profili";
}

function formatFuelType(fuelType: FuelType) {
  const option = fuelOptions.find((fuel) => fuel.value === fuelType);

  return option?.label ?? "Diger";
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f7f8",
  },
  appShell: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  loadingScreen: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    color: "#62717c",
    fontSize: 13,
    fontWeight: "700",
  },
  authContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 18,
    paddingBottom: 32,
  },
  authHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: "#115e59",
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  brandMarkText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  brandName: {
    color: "#152028",
    fontSize: 18,
    fontWeight: "900",
  },
  authIntro: {
    marginBottom: 18,
  },
  authTitle: {
    color: "#152028",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 6,
  },
  authDetail: {
    color: "#62717c",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  authCard: {
    backgroundColor: "#ffffff",
    borderColor: "#d9e2e6",
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: "#34444f",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 7,
  },
  input: {
    backgroundColor: "#f8fafb",
    borderColor: "#cfd9de",
    borderRadius: 8,
    borderWidth: 1,
    color: "#152028",
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 13,
  },
  textArea: {
    minHeight: 82,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  formAlert: {
    backgroundColor: "#fff1f1",
    borderColor: "#fecaca",
    borderRadius: 8,
    borderWidth: 1,
    color: "#991b1b",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginBottom: 14,
    padding: 10,
  },
  formSuccess: {
    backgroundColor: "#e7f6f3",
    borderColor: "#99d8cc",
    color: "#115e59",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#115e59",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryButtonPressed: {
    opacity: 0.82,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  authSwitchRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginTop: 18,
  },
  authSwitchText: {
    color: "#62717c",
    fontSize: 14,
    fontWeight: "700",
  },
  authSwitchAction: {
    color: "#115e59",
    fontSize: 14,
    fontWeight: "900",
  },
  container: {
    padding: 18,
    paddingBottom: 32,
  },
  containerWithTabs: {
    padding: 18,
    paddingBottom: 110,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitleBlock: {
    flex: 1,
  },
  eyebrow: {
    color: "#62717c",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  title: {
    color: "#152028",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4,
  },
  userLine: {
    color: "#62717c",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
  },
  vehicleLine: {
    color: "#115e59",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 6,
  },
  headerActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  bottomTabBar: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d9e2e6",
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    gap: 4,
    justifyContent: "space-around",
    left: 0,
    minHeight: 78,
    paddingBottom: 10,
    paddingHorizontal: 8,
    paddingTop: 8,
    position: "absolute",
    right: 0,
  },
  tabButton: {
    alignItems: "center",
    flex: 1,
    gap: 5,
    justifyContent: "center",
    minHeight: 58,
  },
  tabIcon: {
    alignItems: "center",
    backgroundColor: "#edf2f4",
    borderRadius: 8,
    height: 32,
    justifyContent: "center",
    width: 38,
  },
  tabIconActive: {
    backgroundColor: "#115e59",
  },
  tabIconText: {
    color: "#62717c",
    fontSize: 13,
    fontWeight: "900",
  },
  tabIconTextActive: {
    color: "#ffffff",
  },
  tabLabel: {
    color: "#62717c",
    fontSize: 11,
    fontWeight: "800",
  },
  tabLabelActive: {
    color: "#115e59",
  },
  logoutButton: {
    backgroundColor: "#e7f6f3",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  logoutButtonText: {
    color: "#115e59",
    fontSize: 12,
    fontWeight: "900",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#e7f6f3",
    borderRadius: 8,
    marginBottom: 18,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  badgeText: {
    color: "#115e59",
    fontSize: 12,
    fontWeight: "800",
  },
  heroCard: {
    backgroundColor: "#101820",
    borderRadius: 8,
    marginBottom: 14,
    padding: 18,
  },
  heroLabel: {
    color: "#b9d8d3",
    fontSize: 13,
    fontWeight: "700",
  },
  heroValue: {
    color: "#ffffff",
    fontSize: 38,
    fontWeight: "900",
    marginTop: 8,
  },
  heroDetail: {
    color: "#d8e5e8",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    backgroundColor: "#ffffff",
    borderColor: "#d9e2e6",
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    padding: 14,
  },
  metricLabel: {
    color: "#62717c",
    fontSize: 12,
    fontWeight: "700",
  },
  metricValue: {
    color: "#152028",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 8,
  },
  section: {
    backgroundColor: "#ffffff",
    borderColor: "#d9e2e6",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  sectionTitle: {
    color: "#152028",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  sectionSubtitle: {
    color: "#62717c",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: -6,
  },
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: "#edf2f4",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  secondaryButtonText: {
    color: "#115e59",
    fontSize: 12,
    fontWeight: "900",
  },
  outlineButton: {
    alignItems: "center",
    borderColor: "#b7c6cc",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  outlineButtonText: {
    color: "#115e59",
    fontSize: 14,
    fontWeight: "900",
  },
  emptyText: {
    color: "#62717c",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
    marginTop: 8,
  },
  vehicleCard: {
    alignItems: "center",
    backgroundColor: "#f8fafb",
    borderColor: "#d9e2e6",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
    minHeight: 78,
    padding: 12,
  },
  vehicleCardActive: {
    backgroundColor: "#e7f6f3",
    borderColor: "#115e59",
  },
  vehicleCardPressed: {
    opacity: 0.82,
  },
  vehiclePlate: {
    alignItems: "center",
    backgroundColor: "#101820",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 86,
    paddingHorizontal: 10,
  },
  vehiclePlateText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    color: "#152028",
    fontSize: 15,
    fontWeight: "900",
  },
  vehicleMeta: {
    color: "#62717c",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
  },
  activeTag: {
    color: "#115e59",
    fontSize: 12,
    fontWeight: "900",
  },
  draftRow: {
    alignItems: "center",
    backgroundColor: "#edf2f4",
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 8,
    minHeight: 58,
    padding: 12,
  },
  draftInfo: {
    flex: 1,
  },
  draftMeta: {
    color: "#62717c",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  formRow: {
    flexDirection: "row",
    gap: 10,
  },
  formColumn: {
    flex: 1,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  optionButton: {
    alignItems: "center",
    backgroundColor: "#edf2f4",
    borderColor: "#d9e2e6",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 42,
    minWidth: 86,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  optionButtonActive: {
    backgroundColor: "#115e59",
    borderColor: "#115e59",
  },
  optionButtonText: {
    color: "#34444f",
    fontSize: 13,
    fontWeight: "800",
  },
  optionButtonTextActive: {
    color: "#ffffff",
  },
  quickTripPreview: {
    alignItems: "center",
    backgroundColor: "#edf2f4",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    minHeight: 66,
    padding: 12,
  },
  autoCalcBadge: {
    backgroundColor: "#e7f6f3",
    borderRadius: 8,
    maxWidth: 150,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  autoCalcBadgeText: {
    color: "#115e59",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  shiftPanel: {
    alignItems: "center",
    backgroundColor: "#edf2f4",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 72,
    padding: 12,
  },
  shiftLabel: {
    color: "#62717c",
    fontSize: 12,
    fontWeight: "800",
  },
  shiftValue: {
    color: "#152028",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 4,
  },
  shiftDetail: {
    color: "#62717c",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  shiftButton: {
    alignItems: "center",
    backgroundColor: "#115e59",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 94,
    paddingHorizontal: 14,
  },
  shiftButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  shiftButtonWide: {
    alignItems: "center",
    backgroundColor: "#115e59",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 14,
  },
  dangerButton: {
    backgroundColor: "#b91c1c",
  },
  shiftResultPanel: {
    marginTop: 12,
  },
  reportRow: {
    alignItems: "center",
    borderBottomColor: "#edf2f4",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
  },
  reportLabel: {
    color: "#62717c",
    fontSize: 13,
    fontWeight: "800",
  },
  reportValue: {
    color: "#152028",
    fontSize: 15,
    fontWeight: "900",
  },
  trendBars: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 10,
    height: 120,
    justifyContent: "space-between",
  },
  trendBarTrack: {
    alignItems: "center",
    backgroundColor: "#edf2f4",
    borderRadius: 8,
    flex: 1,
    height: 104,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  trendBarFill: {
    backgroundColor: "#115e59",
    borderRadius: 8,
    width: "100%",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: "#edf2f4",
    borderRadius: 8,
    flexBasis: "48%",
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 54,
    padding: 10,
  },
  actionText: {
    color: "#115e59",
    fontSize: 13,
    fontWeight: "900",
  },
  expenseRow: {
    alignItems: "center",
    backgroundColor: "#edf2f4",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    padding: 12,
  },
  expenseName: {
    color: "#62717c",
    fontWeight: "700",
  },
  expenseAmount: {
    color: "#152028",
    fontWeight: "900",
  },
});
