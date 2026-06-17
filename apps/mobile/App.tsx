import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

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

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Bugun</Text>
            <Text style={styles.title}>Gercek net kar</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Break-even asildi</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
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
              <View key={action} style={styles.actionButton}>
                <Text style={styles.actionText}>{action}</Text>
              </View>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7f8'
  },
  container: {
    padding: 18,
    paddingBottom: 32
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16
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
  badge: {
    backgroundColor: '#e7f6f3',
    borderRadius: 999,
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
    borderRadius: 14,
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
    borderRadius: 10,
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
    borderRadius: 10,
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
    borderRadius: 10,
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 54,
    justifyContent: 'center',
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
    borderRadius: 10,
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
  },
});
