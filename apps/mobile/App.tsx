import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

const ACCESS_TOKEN_KEY = 'tag.accessToken';
const REFRESH_TOKEN_KEY = 'tag.refreshToken';
const USER_KEY = 'tag.user';

const metrics = [
  ['Bugunku net kar', '1.460 TL'],
  ['Km basi net', '14,20 TL'],
  ['Saatlik net', '243 TL'],
  ['Toplam km', '103 km']
];

const quickActions = ['Sefer Ekle', 'Gider Ekle', 'Yakit Ekle', 'Vardiya'];

const expenses = [
  ['Yakit', '820 TL'],
  ['Paket payi', '700 TL'],
  ['Sabit gider', '420 TL']
];

type AuthMode = 'login' | 'register';

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

interface AuthFormState {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

const initialFormState: AuthFormState = {
  fullName: '',
  email: '',
  phone: '',
  password: ''
};

export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const [storedToken, storedUser] = await Promise.all([
        getStoredItem(ACCESS_TOKEN_KEY),
        getStoredItem(USER_KEY)
      ]);

      setAccessToken(storedToken);
      setUser(parseStoredUser(storedUser));
      setIsBooting(false);
    }

    restoreSession().catch(() => setIsBooting(false));
  }, []);

  async function handleAuthenticated(response: AuthResponse) {
    const nextUser = response.data.user ?? null;

    await Promise.all([
      setStoredItem(ACCESS_TOKEN_KEY, response.data.accessToken),
      setStoredItem(REFRESH_TOKEN_KEY, response.data.refreshToken),
      nextUser
        ? setStoredItem(USER_KEY, JSON.stringify(nextUser))
        : deleteStoredItem(USER_KEY)
    ]);

    setAccessToken(response.data.accessToken);
    setUser(nextUser);
  }

  async function handleLogout() {
    await Promise.all([
      deleteStoredItem(ACCESS_TOKEN_KEY),
      deleteStoredItem(REFRESH_TOKEN_KEY),
      deleteStoredItem(USER_KEY)
    ]);

    setAccessToken(null);
    setUser(null);
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

  return <DashboardScreen onLogout={handleLogout} user={user} />;
}

function AuthScreen({
  apiBaseUrl,
  onAuthenticated
}: {
  apiBaseUrl: string;
  onAuthenticated: (response: AuthResponse) => Promise<void>;
}) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [form, setForm] = useState<AuthFormState>(initialFormState);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copy = useMemo(
    () =>
      mode === 'login'
        ? {
            eyebrow: 'Mobil uygulama',
            title: 'Hesabina giris yap',
            detail: 'Gunluk net karini ve paket durumunu hizli takip et.',
            button: 'Giris Yap',
            loading: 'Giris yapiliyor',
            switchText: 'Hesabin yok mu?',
            switchAction: 'Kayit ol'
          }
        : {
            eyebrow: 'Ilk kurulum',
            title: 'Surucu hesabini olustur',
            detail: 'Arac ve paket gideri takibine baslamak icin hesap ac.',
            button: 'Kayit Ol',
            loading: 'Hesap olusturuluyor',
            switchText: 'Zaten hesabin var mi?',
            switchAction: 'Giris yap'
          },
    [mode]
  );

  function updateField(field: keyof AuthFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function switchMode() {
    setMode((current) => (current === 'login' ? 'register' : 'login'));
    setForm(initialFormState);
    setMessage(null);
  }

  async function submit() {
    if (!form.email.trim() || !form.password) {
      setMessage('E-posta ve sifre zorunlu.');
      return;
    }

    if (form.password.length < 8) {
      setMessage('Sifre en az 8 karakter olmali.');
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await postJson<AuthResponse>(
        `${apiBaseUrl}/auth/${mode}`,
        mode === 'login'
          ? {
              email: form.email.trim(),
              password: form.password,
              deviceName: getDeviceName()
            }
          : {
              fullName: form.fullName.trim() || undefined,
              email: form.email.trim(),
              phone: form.phone.trim() || undefined,
              password: form.password,
              deviceName: getDeviceName()
            }
      );

      await onAuthenticated(response);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : mode === 'login'
            ? 'Giris yapilamadi.'
            : 'Kayit olusturulamadi.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
            {mode === 'register' ? (
              <TextField
                autoComplete="name"
                label="Ad soyad"
                onChangeText={(value) => updateField('fullName', value)}
                placeholder="Ali Yilmaz"
                value={form.fullName}
              />
            ) : null}

            <TextField
              autoCapitalize="none"
              autoComplete="email"
              inputMode="email"
              label="E-posta"
              onChangeText={(value) => updateField('email', value)}
              placeholder="surucu@example.com"
              value={form.email}
            />

            {mode === 'register' ? (
              <TextField
                autoComplete="tel"
                inputMode="tel"
                label="Telefon"
                onChangeText={(value) => updateField('phone', value)}
                placeholder="+905551112233"
                value={form.phone}
              />
            ) : null}

            <TextField
              autoCapitalize="none"
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              label="Sifre"
              onChangeText={(value) => updateField('password', value)}
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
                (pressed || isSubmitting) && styles.primaryButtonPressed
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

function DashboardScreen({
  onLogout,
  user
}: {
  onLogout: () => Promise<void>;
  user: AuthUser | null;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.eyebrow}>Bugun</Text>
            <Text style={styles.title}>Gercek net kar</Text>
            <Text style={styles.userLine}>
              {user?.fullName || user?.email || 'Surucu'}
            </Text>
          </View>
          <Pressable onPress={onLogout} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>Cikis</Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Break-even asildi</Text>
          </View>
          <Text style={styles.heroLabel}>Net kar</Text>
          <Text style={styles.heroValue}>1.460 TL</Text>
          <Text style={styles.heroDetail}>
            Yakit, paket, sabit gider ve bakim rezervi dusuldu.
          </Text>
        </View>

        <View style={styles.metricGrid}>
          {metrics.map(([label, value]) => (
            <View key={label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{label}</Text>
              <Text style={styles.metricValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hizli kayit</Text>
          <View style={styles.actionGrid}>
            {quickActions.map((action) => (
              <Pressable key={action} style={styles.actionButton}>
                <Text style={styles.actionText}>{action}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gider kirilimi</Text>
          {expenses.map(([name, amount]) => (
            <View key={name} style={styles.expenseRow}>
              <Text style={styles.expenseName}>{name}</Text>
              <Text style={styles.expenseAmount}>{amount}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

async function postJson<TResponse>(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json'
    },
    method: 'POST'
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
    return error.message.join(' ');
  }

  return error?.message ?? 'Islem tamamlanamadi.';
}

function getApiBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3001/api/v1';
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `http://${window.location.hostname}:3001/api/v1`;
  }

  return 'http://localhost:3001/api/v1';
}

function getDeviceName() {
  if (Platform.OS === 'ios') {
    return 'Expo iOS';
  }

  if (Platform.OS === 'android') {
    return 'Expo Android';
  }

  return 'Expo Web';
}

function parseStoredUser(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    return null;
  }
}

async function getStoredItem(key: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function setStoredItem(key: string, value: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function deleteStoredItem(key: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7f8'
  },
  flex: {
    flex: 1
  },
  loadingScreen: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24
  },
  loadingText: {
    color: '#62717c',
    fontSize: 13,
    fontWeight: '700'
  },
  authContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 18,
    paddingBottom: 32
  },
  authHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: '#115e59',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  brandMarkText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900'
  },
  brandName: {
    color: '#152028',
    fontSize: 18,
    fontWeight: '900'
  },
  authIntro: {
    marginBottom: 18
  },
  authTitle: {
    color: '#152028',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 6
  },
  authDetail: {
    color: '#62717c',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10
  },
  authCard: {
    backgroundColor: '#ffffff',
    borderColor: '#d9e2e6',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16
  },
  inputGroup: {
    marginBottom: 14
  },
  inputLabel: {
    color: '#34444f',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7
  },
  input: {
    backgroundColor: '#f8fafb',
    borderColor: '#cfd9de',
    borderRadius: 8,
    borderWidth: 1,
    color: '#152028',
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 13
  },
  formAlert: {
    backgroundColor: '#fff1f1',
    borderColor: '#fecaca',
    borderRadius: 8,
    borderWidth: 1,
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 14,
    padding: 10
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#115e59',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16
  },
  primaryButtonPressed: {
    opacity: 0.82
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900'
  },
  authSwitchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginTop: 18
  },
  authSwitchText: {
    color: '#62717c',
    fontSize: 14,
    fontWeight: '700'
  },
  authSwitchAction: {
    color: '#115e59',
    fontSize: 14,
    fontWeight: '900'
  },
  container: {
    padding: 18,
    paddingBottom: 32
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 16
  },
  headerTitleBlock: {
    flex: 1
  },
  eyebrow: {
    color: '#62717c',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase'
  },
  title: {
    color: '#152028',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4
  },
  userLine: {
    color: '#62717c',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6
  },
  logoutButton: {
    backgroundColor: '#e7f6f3',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  logoutButtonText: {
    color: '#115e59',
    fontSize: 12,
    fontWeight: '900'
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e7f6f3',
    borderRadius: 8,
    marginBottom: 18,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  badgeText: {
    color: '#115e59',
    fontSize: 12,
    fontWeight: '800'
  },
  heroCard: {
    backgroundColor: '#101820',
    borderRadius: 8,
    marginBottom: 14,
    padding: 18
  },
  heroLabel: {
    color: '#b9d8d3',
    fontSize: 13,
    fontWeight: '700'
  },
  heroValue: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '900',
    marginTop: 8
  },
  heroDetail: {
    color: '#d8e5e8',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderColor: '#d9e2e6',
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    padding: 14
  },
  metricLabel: {
    color: '#62717c',
    fontSize: 12,
    fontWeight: '700'
  },
  metricValue: {
    color: '#152028',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 8
  },
  section: {
    backgroundColor: '#ffffff',
    borderColor: '#d9e2e6',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14
  },
  sectionTitle: {
    color: '#152028',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#edf2f4',
    borderRadius: 8,
    flexBasis: '48%',
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 54,
    padding: 10
  },
  actionText: {
    color: '#115e59',
    fontSize: 13,
    fontWeight: '900'
  },
  expenseRow: {
    alignItems: 'center',
    backgroundColor: '#edf2f4',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    padding: 12
  },
  expenseName: {
    color: '#62717c',
    fontWeight: '700'
  },
  expenseAmount: {
    color: '#152028',
    fontWeight: '900'
  }
});
