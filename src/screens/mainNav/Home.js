import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';

import { Card } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const navigation = useNavigation(); // Fixed typo

  // Helper function to format currency
  const formatCurrency = value => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Helper function to format numbers with commas
  const formatNumber = value => {
    return new Intl.NumberFormat('en-IN').format(value);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome</Text>
          <Text style={styles.company}>IV Square Structure</Text>
          <Text style={styles.company}>India Pvt.Ltd</Text>
        </View>

        <Image
          source={require('../../assets/Image/IV_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Production Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Production Overview</Text>

        <View style={styles.cardRow}>
          <DashboardCard title="Production (Day)" value="26" unit="TON" />
          <DashboardCard title="Production (Night)" value="18.5" unit="TON" />
        </View>

        <View style={styles.cardRow}>
          <DashboardCard title="Total Production" value="44.5" unit="TON" />
          <DashboardCard
            title="Total Amount"
            value={formatCurrency(15000000)}
            unit=""
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.actionGrid}>
          <ActionButton
            title="Live Production"
            onPress={() => navigation.navigate('LiveProduction')}
          />
          <ActionButton
            title="Rate Calculator"
            onPress={() => console.log('Rate Calculator pressed')}
          />
          <ActionButton
            title="Reports"
            onPress={() => console.log('Reports pressed')}
          />
          <ActionButton
            title="Materials"
            onPress={() => console.log('Materials pressed')}
          />
        </View>
      </View>
    </ScrollView>
  );
}

/* Dashboard Card Component */
const DashboardCard = ({ title, value, unit }) => {
  return (
    <Card style={styles.dashboardCard}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      {unit ? <Text style={styles.cardUnit}>{unit}</Text> : null}
    </Card>
  );
};

/* Action Button Component */
const ActionButton = ({ title, onPress }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.actionButton}
      accessibilityLabel={title}
      accessibilityRole="button"
    >
      <Text style={styles.actionText}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#232B5D',
    paddingTop: 20,
    paddingHorizontal: 22,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcome: {
    color: '#C7D2FE',
    fontSize: 15,
  },
  company: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 5,
  },
  logo: {
    width: 100,
    height: 100,
    tintColor: '#39A9E6',
  },
  section: {
    marginTop: 25,
    paddingHorizontal: 22,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#232B5D',
    marginBottom: 15,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  dashboardCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#232B5D',
    marginTop: 10,
  },
  cardUnit: {
    fontSize: 14,
    color: '#39A9E6',
    marginTop: 5,
    fontWeight: '600',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 22,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionText: {
    color: '#232B5D',
    fontWeight: '600',
    fontSize: 15,
    textAlign: 'center',
  },
});
