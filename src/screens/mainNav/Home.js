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

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#232B5D" barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
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
            <DashboardCard title="Today's Dip" value="128" unit="PCS" />

            <DashboardCard title="GI Weight" value="18.5" unit="TON" />
          </View>

          <View style={styles.cardRow}>
            <DashboardCard title="Temperature" value="452" unit="°C" />

            <DashboardCard title="Coating Avg" value="87" unit="%" />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.actionGrid}>
            <ActionButton title="Production Entry" />
            <ActionButton title="Weight Calculator" />
            <ActionButton title="Reports" />
            <ActionButton title="Quality Check" />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>

          <Card style={styles.activityCard}>
            <View style={styles.activityItem}>
              <View style={styles.dot} />

              <View>
                <Text style={styles.activityTitle}>Batch #204 Completed</Text>

                <Text style={styles.activityTime}>10 mins ago</Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={styles.dot} />

              <View>
                <Text style={styles.activityTitle}>
                  Zinc Consumption Updated
                </Text>

                <Text style={styles.activityTime}>45 mins ago</Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={styles.dot} />

              <View>
                <Text style={styles.activityTitle}>
                  Temperature Alert Normal
                </Text>

                <Text style={styles.activityTime}>1 hour ago</Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

/* Dashboard Card */
const DashboardCard = ({ title, value, unit }) => {
  return (
    <Card style={styles.dashboardCard}>
      <Text style={styles.cardTitle}>{title}</Text>

      <Text style={styles.cardValue}>{value}</Text>

      <Text style={styles.cardUnit}>{unit}</Text>
    </Card>
  );
};

/* Action Button */
const ActionButton = ({ title }) => {
  return (
    <TouchableOpacity style={styles.actionButton}>
      <Text style={styles.actionText}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  header: {
    backgroundColor: '#232B5D',
    paddingTop: 60,
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
    paddingHorizontal: 20,
    marginTop: 25,
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
    fontSize: 30,
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
    textAlign: 'center',
  },

  activityCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 30,
  },

  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#39A9E6',
    marginRight: 15,
  },

  activityTitle: {
    color: '#232B5D',
    fontSize: 15,
    fontWeight: '600',
  },

  activityTime: {
    color: '#6B7280',
    marginTop: 4,
    fontSize: 13,
  },
});
