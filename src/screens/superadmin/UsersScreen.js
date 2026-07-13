import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Plus, UserPlus, Users, ShieldCheck, X } from 'lucide-react-native';

import {
  getActiveSupervisorsApi,
  getUsersApi,
  registerUserApi,
} from '../../api/userApi';
import { socket } from '../../socket/socket';
import { COLORS, PAPER_THEME } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'supervisor',
  assigned_shift: 'day',
};

export default function UsersScreen() {
  const queryClient = useQueryClient();
  const loggedUser = useSelector(state => state.auth.user);
  const { contentMaxWidth } = useResponsive();

  const isSuperAdmin = loggedUser?.role === 'superadmin';

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const {
    data: usersData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['users'],
    queryFn: getUsersApi,
  });

  const { data: activeData } = useQuery({
    queryKey: ['active-supervisors'],
    queryFn: getActiveSupervisorsApi,
  });

  const registerMutation = useMutation({
    mutationFn: registerUserApi,
    onSuccess: res => {
      Alert.alert('Success', res?.message || 'User registered successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['active-supervisors'] });
      closeModal();
    },
    onError: error => {
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Something went wrong',
      );
    },
  });

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleShiftUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['active-supervisors'] });
    };

    socket.on('shift_updated', handleShiftUpdate);

    return () => {
      socket.off('shift_updated', handleShiftUpdate);
    };
  }, [queryClient]);

  const admins = usersData?.data?.admins || [];
  const supervisors = usersData?.data?.supervisors || [];
  const activeSupervisors = activeData?.data || [];

  const closeModal = () => {
    setModalVisible(false);
    setForm(emptyForm);
  };

  const updateForm = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleRegister = () => {
    if (!form.name || !form.email || !form.password || !form.role) {
      Alert.alert('Required', 'Please fill all required fields');
      return;
    }

    const body = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password.trim(),
      role: form.role,
    };

    if (form.role === 'supervisor') {
      body.assigned_shift = form.assigned_shift;
    }

    registerMutation.mutate(body);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <View style={[styles.headerCard, centeredContent(contentMaxWidth)]}>
          <View>
            <Text style={styles.title}>Users</Text>
            <Text style={styles.description}>
              {isSuperAdmin
                ? 'Manage admins and supervisors'
                : 'View supervisors'}
            </Text>
          </View>

          {isSuperAdmin && (
            <TouchableOpacity
              style={styles.addBtn}
              activeOpacity={0.85}
              onPress={() => setModalVisible(true)}
            >
              <Plus size={24} color={COLORS.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          { padding: 16 },
          centeredContent(contentMaxWidth),
        ]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <Text style={styles.sectionTitle}>Active Supervisors</Text>

        {activeSupervisors.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No active supervisor right now</Text>
          </View>
        ) : (
          activeSupervisors.map(item => (
            <View key={item.shift_id} style={styles.activeCard}>
              <View style={styles.avatar}>
                <Users size={22} color={COLORS.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{item.supervisor_name}</Text>
                <Text style={styles.userEmail}>{item.supervisor_email}</Text>
                <Text style={styles.shiftText}>
                  {item.shift_name?.toUpperCase()} shift • {item.shift_date}
                </Text>
              </View>

              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            </View>
          ))
        )}

        {isSuperAdmin && (
          <>
            <Text style={styles.sectionTitle}>Admins</Text>

            {isLoading ? (
              <Loader />
            ) : admins.length === 0 ? (
              <Empty text="No admin users found" />
            ) : (
              admins.map(item => (
                <UserCard key={item.id} item={item} type="admin" />
              ))
            )}
          </>
        )}

        <Text style={styles.sectionTitle}>Supervisors</Text>

        {isLoading ? (
          <Loader />
        ) : supervisors.length === 0 ? (
          <Empty text="No supervisors found" />
        ) : (
          supervisors.map(item => (
            <UserCard key={item.id} item={item} type="supervisor" />
          ))
        )}
      </ScrollView>

      {isSuperAdmin && (
        <RegisterModal
          visible={modalVisible}
          onClose={closeModal}
          form={form}
          updateForm={updateForm}
          loading={registerMutation.isPending}
          onSubmit={handleRegister}
        />
      )}
    </View>
  );
}

function UserCard({ item, type }) {
  const isAdmin = type === 'admin';

  return (
    <View style={styles.userCard}>
      <View style={styles.avatar}>
        {isAdmin ? (
          <ShieldCheck size={22} color={COLORS.primary} />
        ) : (
          <Users size={22} color={COLORS.primary} />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>

        <Text style={styles.shiftText}>Role: {item.role}</Text>

        {isAdmin ? (
          <Text style={styles.grayText}>Admin user</Text>
        ) : (
          <>
            <Text style={styles.shiftText}>
              Assigned: {item.assigned_shift || '-'}
            </Text>

            {item.is_shift_active ? (
              <Text style={styles.greenText}>
                Running: {item.active_shift_name} shift
              </Text>
            ) : (
              <Text style={styles.grayText}>Not active</Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}

function RegisterModal({
  visible,
  onClose,
  form,
  updateForm,
  loading,
  onSubmit,
}) {
  const { formMaxWidth } = useResponsive();

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>Register User</Text>
            <Text style={styles.modalDesc}>Create admin or supervisor</Text>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.modalBody,
            centeredContent(formMaxWidth),
          ]}
        >
          <View style={styles.formCard}>
            <TextInput
              label="Full Name"
              value={form.name}
              onChangeText={v => updateForm('name', v)}
              mode="outlined"
              style={styles.input}
              outlineColor={COLORS.inputBorder}
              activeOutlineColor={COLORS.accent}
              textColor={COLORS.text}
              theme={PAPER_THEME}
            />

            <TextInput
              label="Email"
              value={form.email}
              onChangeText={v => updateForm('email', v)}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              outlineColor={COLORS.inputBorder}
              activeOutlineColor={COLORS.accent}
              textColor={COLORS.text}
              theme={PAPER_THEME}
            />

            <TextInput
              label="Password"
              value={form.password}
              onChangeText={v => updateForm('password', v)}
              mode="outlined"
              secureTextEntry
              style={styles.input}
              outlineColor={COLORS.inputBorder}
              activeOutlineColor={COLORS.accent}
              textColor={COLORS.text}
              theme={PAPER_THEME}
            />

            <Text style={styles.fieldLabel}>Role</Text>

            <View style={styles.choiceRow}>
              <ChoiceButton
                title="Supervisor"
                active={form.role === 'supervisor'}
                onPress={() => updateForm('role', 'supervisor')}
              />

              <ChoiceButton
                title="Admin"
                active={form.role === 'admin'}
                onPress={() => updateForm('role', 'admin')}
              />
            </View>

            {form.role === 'supervisor' && (
              <>
                <Text style={styles.fieldLabel}>Assigned Shift</Text>

                <View style={styles.choiceRow}>
                  <ChoiceButton
                    title="Day"
                    active={form.assigned_shift === 'day'}
                    onPress={() => updateForm('assigned_shift', 'day')}
                  />

                  <ChoiceButton
                    title="Night"
                    active={form.assigned_shift === 'night'}
                    onPress={() => updateForm('assigned_shift', 'night')}
                  />

                  <ChoiceButton
                    title="Both"
                    active={form.assigned_shift === 'both'}
                    onPress={() => updateForm('assigned_shift', 'both')}
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, loading && { opacity: 0.6 }]}
              disabled={loading}
              onPress={onSubmit}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <UserPlus size={20} color={COLORS.white} />
                  <Text style={styles.saveText}>REGISTER USER</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function ChoiceButton({ title, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.choiceBtn, active && styles.choiceBtnActive]}
      onPress={onPress}
    >
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function Empty({ text }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function Loader() {
  return (
    <View style={styles.loaderBox}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: 16,
  },

  headerWrap: {
    paddingHorizontal: 16,
  },

  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 18,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: { color: COLORS.primary, fontSize: 27, fontWeight: '900' },
  description: { color: COLORS.gray, fontSize: 13, marginTop: 4 },

  addBtn: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 20,
    marginBottom: 12,
  },

  activeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 15,
    elevation: 3,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  userCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 15,
    elevation: 3,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  userName: { color: COLORS.primary, fontSize: 16, fontWeight: '900' },
  userEmail: { color: COLORS.gray, fontSize: 12, marginTop: 3 },

  shiftText: {
    color: COLORS.text,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '700',
  },

  greenText: {
    color: COLORS.green,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '800',
  },

  grayText: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '700',
  },

  activeBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  activeBadgeText: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '900',
  },

  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 18,
    elevation: 2,
  },

  emptyText: { color: COLORS.gray, fontWeight: '700' },
  loaderBox: { padding: 30 },

  modalSafe: { flex: 1, backgroundColor: COLORS.bg },

  modalHeader: {
    backgroundColor: COLORS.white,
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  modalTitle: { color: COLORS.primary, fontSize: 24, fontWeight: '900' },
  modalDesc: { color: COLORS.gray, fontSize: 14, marginTop: 3 },

  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBody: { padding: 16 },

  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 18,
    elevation: 3,
  },

  input: { backgroundColor: COLORS.white, marginBottom: 14 },

  fieldLabel: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
    marginTop: 4,
  },

  choiceRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },

  choiceBtn: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  choiceBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  choiceText: {
    color: COLORS.gray,
    fontWeight: '900',
    fontSize: 13,
  },

  choiceTextActive: { color: COLORS.white },

  saveBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    flexDirection: 'row',
    gap: 8,
  },

  saveText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
});
