import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
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
import {
  Plus,
  UserPlus,
  Users,
  ShieldCheck,
  X,
  LockKeyhole,
} from 'lucide-react-native';

import {
  getActiveSupervisorsApi,
  getUsersApi,
  registerUserApi,
  setUserStatusApi,
  updateUserApi,
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

const PasswordLockIcon = () => (
  <LockKeyhole size={20} color={COLORS.gray} />
);

export default function UsersScreen() {
  const queryClient = useQueryClient();
  const loggedUser = useSelector(state => state.auth.user);
  const { contentMaxWidth } = useResponsive();

  const isSuperAdmin =
    String(loggedUser?.role || '')
      .toLowerCase()
      .trim() === 'superadmin';

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
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
    mutationFn: body =>
      editingId ? updateUserApi({ id: editingId, body }) : registerUserApi(body),
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

  const statusMutation = useMutation({
    mutationFn: setUserStatusApi,
    onSuccess: res => {
      Alert.alert('Success', res?.message || 'User status updated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['active-supervisors'] });
    },
    onError: error =>
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Could not update user status',
      ),
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
  const plantManagers =
    usersData?.data?.plant_managers ||
    usersData?.data?.plantManagers ||
    usersData?.data?.users?.filter(item => item.role === 'plant_manager') ||
    [];
  const supervisors = usersData?.data?.supervisors || [];
  const activeSupervisors = activeData?.data || [];

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openEdit = item => {
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      email: item.email || '',
      password: '',
      role: item.role || 'supervisor',
      assigned_shift: item.assigned_shift || 'day',
    });
    setModalVisible(true);
  };

  const updateForm = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleRegister = () => {
    if (!form.name || !form.email || (!editingId && !form.password) || !form.role) {
      Alert.alert('Required', 'Please fill all required fields');
      return;
    }

    const body = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
    };

    if (!editingId) body.password = form.password.trim();

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
                ? 'Manage plant managers, admins and supervisors'
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
          styles.listContent,
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

              <View style={styles.flex}>
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
            <Text style={styles.sectionTitle}>Plant Managers</Text>

            {isLoading ? (
              <Loader />
            ) : plantManagers.length === 0 ? (
              <Empty text="No plant managers found" />
            ) : (
              plantManagers.map(item => (
                <UserCard
                  key={item.id}
                  item={item}
                  type="plant_manager"
                  onEdit={() => openEdit(item)}
                  onStatus={() =>
                    statusMutation.mutate({
                      id: item.id,
                      status: item.status === 'inactive' ? 'active' : 'inactive',
                    })
                  }
                />
              ))
            )}
          </>
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
                <UserCard
                  key={item.id}
                  item={item}
                  type="admin"
                  onEdit={() => openEdit(item)}
                  onStatus={() =>
                    statusMutation.mutate({
                      id: item.id,
                      status: item.status === 'inactive' ? 'active' : 'inactive',
                    })
                  }
                />
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
            <UserCard
              key={item.id}
              item={item}
              type="supervisor"
              onEdit={isSuperAdmin ? () => openEdit(item) : null}
              onStatus={
                isSuperAdmin
                  ? () =>
                      statusMutation.mutate({
                        id: item.id,
                        status:
                          item.status === 'inactive' ? 'active' : 'inactive',
                      })
                  : null
              }
            />
          ))
        )}
      </ScrollView>

      {isSuperAdmin && (
        <RegisterModal
          visible={modalVisible}
          editingId={editingId}
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

function UserCard({ item, type, onEdit, onStatus }) {
  const isAdmin = type === 'admin';
  const isPlantManager = type === 'plant_manager';

  return (
    <View style={styles.userCard}>
      <View style={styles.avatar}>
        {isAdmin || isPlantManager ? (
          <ShieldCheck size={22} color={COLORS.primary} />
        ) : (
          <Users size={22} color={COLORS.primary} />
        )}
      </View>

      <View style={styles.flex}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>

        <Text style={styles.shiftText}>
          Role: {item.role?.replaceAll('_', ' ')}
        </Text>
        {isAdmin && <Text style={styles.grayText}>Admin user</Text>}
        {isPlantManager ? (
          <Text style={styles.grayText}>Manager user</Text>
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
      {onEdit && (
        <View style={styles.userActions}>
          <TouchableOpacity style={styles.userEditBtn} onPress={onEdit}>
            <Text style={styles.userEditText}>EDIT</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.userStatusBtn} onPress={onStatus}>
            <Text style={styles.userStatusText}>
              {item.status === 'inactive' ? 'ACTIVATE' : 'DEACTIVATE'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function RegisterModal({
  visible,
  editingId,
  onClose,
  form,
  updateForm,
  loading,
  onSubmit,
}) {
  const { formMaxWidth } = useResponsive();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShowPassword(false);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.modalSafe}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <View style={styles.modalIconBox}>
                <UserPlus size={22} color={COLORS.primary} />
              </View>

              <View style={styles.modalTitleText}>
                <Text style={styles.modalTitle}>
                  {editingId ? 'Edit User' : 'Register User'}
                </Text>
                <Text style={styles.modalDesc}>
                  Create plant manager, admin or supervisor
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
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
                cursorColor={COLORS.accent}
                selectionColor={COLORS.lightBlue}
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
                cursorColor={COLORS.accent}
                selectionColor={COLORS.lightBlue}
                theme={PAPER_THEME}
              />

              <TextInput
                label={editingId ? 'Password (unchanged)' : 'Password'}
                value={form.password}
                editable={!editingId}
                onChangeText={v => updateForm('password', v)}
                mode="outlined"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                style={styles.input}
                outlineColor={COLORS.inputBorder}
                activeOutlineColor={COLORS.accent}
                textColor={COLORS.text}
                cursorColor={COLORS.accent}
                selectionColor={COLORS.lightBlue}
                theme={PAPER_THEME}
                left={
                  <TextInput.Icon
                    icon={PasswordLockIcon}
                  />
                }
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    color={COLORS.primary}
                    forceTextInputFocus={false}
                    onPress={() => setShowPassword(prev => !prev)}
                    accessibilityLabel={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  />
                }
              />

              <Text style={styles.passwordHint}>
                Use at least 6 characters for a stronger password.
              </Text>

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

                <ChoiceButton
                  title="Plant Manager"
                  active={form.role === 'plant_manager'}
                  onPress={() => updateForm('role', 'plant_manager')}
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
                style={[styles.saveBtn, loading && styles.disabled]}
                disabled={loading}
                onPress={onSubmit}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <UserPlus size={20} color={COLORS.white} />
                    <Text style={styles.saveText}>
                      {editingId ? 'UPDATE USER' : 'REGISTER USER'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  flex: { flex: 1 },
  listContent: { padding: 16 },
  disabled: { opacity: 0.6 },
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
    borderRadius: 12,
    padding: 18,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: { color: COLORS.primary, fontSize: 27, fontWeight: '800' },
  description: { color: COLORS.gray, fontSize: 13, marginTop: 4 },

  addBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 12,
  },

  activeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  userCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  userName: { color: COLORS.primary, fontSize: 16, fontWeight: '800' },
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
    fontWeight: '800',
  },

  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 18,
    elevation: 2,
  },

  emptyText: { color: COLORS.gray, fontWeight: '700' },
  loaderBox: { padding: 30 },

  modalSafe: { flex: 1, backgroundColor: COLORS.bg },

  keyboardView: {
    flex: 1,
  },

  modalHeader: {
    backgroundColor: COLORS.white,
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  modalTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },

  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  modalTitleText: {
    flex: 1,
  },

  modalTitle: { color: COLORS.primary, fontSize: 22, fontWeight: '800' },
  modalDesc: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },

  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBody: { padding: 16, paddingBottom: 32 },

  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 18,
    elevation: 2,
  },

  input: {
    backgroundColor: COLORS.white,
    marginBottom: 14,
    fontSize: 15,
  },

  passwordHint: {
    color: COLORS.gray,
    fontSize: 11,
    fontWeight: '600',
    marginTop: -7,
    marginBottom: 16,
    paddingHorizontal: 4,
  },

  fieldLabel: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
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
    borderRadius: 12,
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
    fontWeight: '800',
    fontSize: 13,
  },

  choiceTextActive: { color: COLORS.white },

  saveBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    flexDirection: 'row',
    gap: 8,
  },

  saveText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  userActions: { alignItems: 'stretch', gap: 6, marginLeft: 8 },
  userEditBtn: {
    minWidth: 72,
    minHeight: 34,
    borderRadius: 9,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userEditText: { color: COLORS.primary, fontSize: 10, fontWeight: '800' },
  userStatusBtn: {
    minWidth: 72,
    minHeight: 34,
    borderRadius: 9,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  userStatusText: { color: COLORS.danger, fontSize: 8.5, fontWeight: '800' },
});
