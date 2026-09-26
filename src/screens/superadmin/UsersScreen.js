import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { formatDisplayDate } from '../../utils/format';
import {
  Plus,
  UserPlus,
  Users,
  ShieldCheck,
  X,
  LockKeyhole,
  KeyRound,
  RotateCcw,
} from 'lucide-react-native';

import {
  getUsersApi,
  getUserPermissionsApi,
  registerUserApi,
  setUserStatusApi,
  updateUserPermissionsApi,
  updateUserApi,
  resetUserPasswordApi,
} from '../../api/userApi';
import { COLORS, PAPER_THEME, UI } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';
import { hasPermission } from '../../utils/permissions';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'supervisor',
  assigned_shift: 'day',
};

const PasswordLockIcon = () => <LockKeyhole size={20} color={COLORS.gray} />;

export default function UsersScreen() {
  const queryClient = useQueryClient();
  const loggedUser = useSelector(state => state.auth.user);
  const { contentMaxWidth } = useResponsive();

  const isSuperAdmin =
    String(loggedUser?.role || '')
      .toLowerCase()
      .trim() === 'superadmin';
  const canManageUsers = hasPermission(loggedUser, 'users.manage');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [permissionUser, setPermissionUser] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  const {
    data: usersData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['users'],
    queryFn: getUsersApi,
  });

  const registerMutation = useMutation({
    mutationFn: body =>
      editingId
        ? updateUserApi({ id: editingId, body })
        : registerUserApi(body),
    onSuccess: res => {
      Alert.alert('Success', res?.message || 'User registered successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
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
    },
    onError: error =>
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Could not update user status',
      ),
  });

  const admins = usersData?.data?.admins || [];
  const superadmins = usersData?.data?.superadmins || [];
  const plantManagers =
    usersData?.data?.plant_managers ||
    usersData?.data?.plantManagers ||
    usersData?.data?.users?.filter(item => item.role === 'plant_manager') ||
    [];
  const supervisors = usersData?.data?.supervisors || [];
  const labour = usersData?.data?.labour || [];
  const activeSupervisors = supervisors.filter(
    item =>
      String(item.status || '').toLowerCase() === 'active' &&
      Number(item.is_shift_active) === 1,
  );
  const allUsers = usersData?.data?.users || [
    ...superadmins,
    ...plantManagers,
    ...admins,
    ...supervisors,
    ...labour,
  ];
  const normalizedSearch = searchText.trim().toLowerCase();
  const filterUsers = items =>
    items.filter(item => {
      const matchesStatus =
        statusFilter === 'all' || item.status === statusFilter;
      const matchesSearch =
        !normalizedSearch ||
        [item.name, item.email, item.role, item.assigned_shift]
          .filter(Boolean)
          .some(value =>
            String(value).toLowerCase().includes(normalizedSearch),
          );
      return matchesStatus && matchesSearch;
    });
  const filteredSuperadmins = filterUsers(superadmins);
  const filteredPlantManagers = filterUsers(plantManagers);
  const filteredAdmins = filterUsers(admins);
  const filteredSupervisors = filterUsers(supervisors);
  const filteredLabour = filterUsers(labour);
  const activeAccountCount = allUsers.filter(
    item => item.status === 'active',
  ).length;
  const inactiveAccountCount = allUsers.filter(
    item => item.status === 'inactive',
  ).length;

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
    if (
      !form.name ||
      !form.email ||
      (!editingId && !form.password) ||
      !form.role
    ) {
      Alert.alert('Required', 'Please fill all required fields');
      return;
    }

    const body = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
    };

    if (!editingId) body.password = form.password;

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
                ? 'View active staff and manage feature access'
                : canManageUsers
                ? 'View active staff and manage accounts'
                : 'View supervisors'}
            </Text>
          </View>

          {canManageUsers && (
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
        <Text style={styles.sectionTitle}>Supervisors On Current Shift</Text>

        {activeSupervisors.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No enabled supervisor is assigned to the current shift
            </Text>
          </View>
        ) : (
          activeSupervisors.map(item => (
            <View key={item.id} style={styles.activeCard}>
              <View style={styles.avatar}>
                <Users size={22} color={COLORS.primary} />
              </View>

              <View style={styles.flex}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                <Text style={styles.shiftText}>
                  {item.active_shift_name?.toUpperCase()} shift •{' '}
                  {formatUserDate(item.active_shift_date)}
                </Text>
              </View>

              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            </View>
          ))
        )}

        <View style={styles.summaryGrid}>
          <SummaryCard
            label="Enabled"
            value={activeAccountCount}
            tone="green"
          />
          <SummaryCard
            label="Inactive"
            value={inactiveAccountCount}
            tone="gray"
          />
          <SummaryCard
            label="On shift"
            value={activeSupervisors.length}
            tone="blue"
          />
        </View>

        <View style={styles.directoryTools}>
          <Text style={styles.directoryTitle}>User Directory</Text>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search name, email, role or shift"
            mode="outlined"
            dense
            style={styles.searchInput}
            outlineColor={COLORS.inputBorder}
            activeOutlineColor={COLORS.accent}
            textColor={COLORS.text}
            cursorColor={COLORS.accent}
            theme={PAPER_THEME}
            left={<TextInput.Icon icon="magnify" color={COLORS.gray} />}
          />
          <View style={styles.filterRow}>
            {[
              ['active', 'Enabled'],
              ['inactive', 'Inactive'],
              ['all', 'All'],
            ].map(([value, label]) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.filterBtn,
                  statusFilter === value && styles.filterBtnActive,
                ]}
                onPress={() => setStatusFilter(value)}
              >
                <Text
                  style={[
                    styles.filterText,
                    statusFilter === value && styles.filterTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {canManageUsers && (
          <>
            <Text style={styles.sectionTitle}>Superadmins</Text>

            {isLoading ? (
              <Loader />
            ) : filteredSuperadmins.length === 0 ? (
              <Empty text="No superadmins match this filter" />
            ) : (
              filteredSuperadmins.map(item => (
                <UserCard key={item.id} item={item} type="superadmin" />
              ))
            )}

            <Text style={styles.sectionTitle}>Plant Managers</Text>

            {isLoading ? (
              <Loader />
            ) : filteredPlantManagers.length === 0 ? (
              <Empty text="No plant managers match this filter" />
            ) : (
              filteredPlantManagers.map(item => (
                <UserCard
                  key={item.id}
                  item={item}
                  type="plant_manager"
                  onEdit={() => openEdit(item)}
                  onAccess={isSuperAdmin ? () => setPermissionUser(item) : null}
                  onPassword={isSuperAdmin ? () => setPasswordUser(item) : null}
                  onStatus={() =>
                    statusMutation.mutate({
                      id: item.id,
                      status:
                        item.status === 'inactive' ? 'active' : 'inactive',
                    })
                  }
                />
              ))
            )}
          </>
        )}

        {canManageUsers && (
          <>
            <Text style={styles.sectionTitle}>Admins</Text>

            {isLoading ? (
              <Loader />
            ) : filteredAdmins.length === 0 ? (
              <Empty text="No admins match this filter" />
            ) : (
              filteredAdmins.map(item => (
                <UserCard
                  key={item.id}
                  item={item}
                  type="admin"
                  onEdit={() => openEdit(item)}
                  onAccess={isSuperAdmin ? () => setPermissionUser(item) : null}
                  onPassword={isSuperAdmin ? () => setPasswordUser(item) : null}
                  onStatus={() =>
                    statusMutation.mutate({
                      id: item.id,
                      status:
                        item.status === 'inactive' ? 'active' : 'inactive',
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
        ) : filteredSupervisors.length === 0 ? (
          <Empty text="No supervisors match this filter" />
        ) : (
          filteredSupervisors.map(item => (
            <UserCard
              key={item.id}
              item={item}
              type="supervisor"
              onEdit={canManageUsers ? () => openEdit(item) : null}
              onAccess={isSuperAdmin ? () => setPermissionUser(item) : null}
              onPassword={isSuperAdmin ? () => setPasswordUser(item) : null}
              onStatus={
                canManageUsers
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
        <Text style={styles.sectionTitle}>Labour</Text>
        {filteredLabour.length === 0 ? <Empty text="No labour users match this filter" /> : filteredLabour.map(item => (
          <UserCard key={item.id} item={item} type="labour" onEdit={canManageUsers ? () => openEdit(item) : null} onAccess={isSuperAdmin ? () => setPermissionUser(item) : null} onPassword={isSuperAdmin ? () => setPasswordUser(item) : null} onStatus={canManageUsers ? () => statusMutation.mutate({ id: item.id, status: item.status === 'inactive' ? 'active' : 'inactive' }) : null} />
        ))}
      </ScrollView>

      {canManageUsers && (
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
      {isSuperAdmin && (
        <PermissionModal
          user={permissionUser}
          onClose={() => setPermissionUser(null)}
        />
      )}
      {isSuperAdmin && <PasswordModal user={passwordUser} onClose={() => setPasswordUser(null)} />}
    </View>
  );
}

function UserCard({ item, type, onEdit, onStatus, onAccess, onPassword }) {
  const isAdmin = type === 'admin';
  const isPlantManager = type === 'plant_manager';
  const isSuperAdmin = type === 'superadmin';
  const isManagement = isAdmin || isPlantManager || isSuperAdmin;

  return (
    <View style={styles.userCard}>
      <View style={styles.userIdentityRow}>
        <View style={styles.avatar}>
          {isManagement ? (
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
          <View style={styles.accountMetaRow}>
            <View
              style={[
                styles.accountDot,
                item.status === 'inactive' && styles.accountDotInactive,
              ]}
            />
            <Text
              style={[
                styles.accountStatusText,
                item.status === 'inactive' && styles.accountStatusTextInactive,
              ]}
            >
              {item.status === 'inactive'
                ? 'Inactive account'
                : 'Enabled account'}
            </Text>
          </View>
          {item.created_at && (
            <Text style={styles.grayText}>
              Joined: {formatUserDate(item.created_at)}
            </Text>
          )}
          <Text
            style={
              Number(item.notifications_registered) === 1
                ? styles.greenText
                : styles.grayText
            }
          >
            Notifications:{' '}
            {Number(item.notifications_registered) === 1
              ? 'Registered'
              : 'Not registered'}
          </Text>
          {isManagement ? (
            <Text style={styles.grayText}>
              {isSuperAdmin
                ? 'Protected superadmin account'
                : isPlantManager
                ? 'Manager user'
                : 'Admin user'}
            </Text>
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
      {(onEdit || onStatus || onAccess || onPassword) && (
        <View style={styles.userActions}>
          {onAccess && (
            <TouchableOpacity style={styles.userAccessBtn} onPress={onAccess}>
              <KeyRound size={14} color={COLORS.accent} />
              <Text style={styles.userAccessText}>ACCESS</Text>
            </TouchableOpacity>
          )}
          {onEdit && (
            <TouchableOpacity style={styles.userEditBtn} onPress={onEdit}>
              <Text style={styles.userEditText}>EDIT</Text>
            </TouchableOpacity>
          )}
          {onPassword && (
            <TouchableOpacity style={styles.userAccessBtn} onPress={onPassword}>
              <LockKeyhole size={14} color={COLORS.accent} />
              <Text style={styles.userAccessText}>PASSWORD</Text>
            </TouchableOpacity>
          )}
          {onStatus && (
            <TouchableOpacity style={styles.userStatusBtn} onPress={onStatus}>
              <Text style={styles.userStatusText}>
                {item.status === 'inactive' ? 'ACTIVATE' : 'DEACTIVATE'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function PasswordModal({ user, onClose }) {
  const [password, setPassword] = useState('');
  const mutation = useMutation({
    mutationFn: () => resetUserPasswordApi({ id: user.id, password }),
    onSuccess: response => {
      Alert.alert('Password Updated', response?.message || 'Password updated successfully');
      setPassword('');
      onClose();
    },
    onError: error => Alert.alert('Error', error?.response?.data?.message || 'Could not update password'),
  });

  useEffect(() => {
    if (!user) setPassword('');
  }, [user]);

  const save = () => {
    if (!password || password.length > 72) {
      Alert.alert('Required', 'Enter a password with 72 characters or fewer');
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal visible={Boolean(user)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.centeredOverlay}>
        <View style={styles.passwordModalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <View style={styles.modalIconBox}><LockKeyhole size={22} color={COLORS.primary} /></View>
              <View style={styles.modalTitleText}><Text style={styles.modalTitle}>Set New Password</Text><Text style={styles.modalDesc}>{user?.name}</Text></View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}><X size={22} color={COLORS.primary} /></TouchableOpacity>
          </View>
          <View style={styles.formCard}>
            <TextInput label="New Password" value={password} onChangeText={setPassword} maxLength={72} secureTextEntry mode="outlined" autoFocus theme={PAPER_THEME} />
            <Text style={styles.passwordHint}>Any nonempty password up to 72 characters is accepted.</Text>
            <TouchableOpacity style={[styles.saveBtn, mutation.isPending && styles.disabled]} disabled={mutation.isPending} onPress={save}>
              {mutation.isPending ? <ActivityIndicator color={COLORS.white} /> : <><LockKeyhole size={20} color={COLORS.white} /><Text style={styles.saveText}>SAVE PASSWORD</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SummaryCard({ label, value, tone }) {
  const toneStyle = {
    green: { backgroundColor: COLORS.tealSoft, color: COLORS.green },
    gray: { backgroundColor: COLORS.surfaceMuted, color: COLORS.gray },
    blue: { backgroundColor: COLORS.lightBlue, color: COLORS.primary },
  }[tone];

  return (
    <View style={styles.summaryCard}>
      <View
        style={[
          styles.summaryIcon,
          { backgroundColor: toneStyle.backgroundColor },
        ]}
      >
        <Users size={18} color={toneStyle.color} />
      </View>
      <Text style={[styles.summaryValue, { color: toneStyle.color }]}>
        {value}
      </Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function formatUserDate(value) {
  return formatDisplayDate(value);
}

function PermissionModal({ user, onClose }) {
  const queryClient = useQueryClient();
  const { formMaxWidth } = useResponsive();
  const [draft, setDraft] = useState({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: () => getUserPermissionsApi(user.id),
    enabled: Boolean(user?.id),
  });

  const permissions = useMemo(
    () => data?.data?.permissions || [],
    [data?.data?.permissions],
  );

  useEffect(() => {
    if (!user) {
      setDraft({});
      return;
    }

    if (permissions.length) {
      setDraft(
        Object.fromEntries(
          permissions.map(permission => [permission.key, permission.override]),
        ),
      );
    }
  }, [permissions, user]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateUserPermissionsApi({
        id: user.id,
        overrides: permissions.map(permission => ({
          key: permission.key,
          allowed: draft[permission.key] ?? null,
        })),
      }),
    onSuccess: response => {
      Alert.alert('Access Updated', response?.message || 'Permissions saved');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({
        queryKey: ['user-permissions', user.id],
      });
      onClose();
    },
    onError: error =>
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Could not update user access',
      ),
  });

  const groupedPermissions = permissions.reduce((groups, permission) => {
    if (!groups[permission.group]) groups[permission.group] = [];
    groups[permission.group].push(permission);
    return groups;
  }, {});

  const effectiveAllowed = permission => {
    const override = draft[permission.key];
    return override == null ? permission.default_allowed : override;
  };

  return (
    <Modal
      visible={Boolean(user)}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleRow}>
            <View style={styles.modalIconBox}>
              <KeyRound size={22} color={COLORS.primary} />
            </View>
            <View style={styles.modalTitleText}>
              <Text style={styles.modalTitle}>Feature Access</Text>
              <Text style={styles.modalDesc}>
                {user?.name} · {String(user?.role || '').replaceAll('_', ' ')}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <Loader />
        ) : isError ? (
          <Empty text="Could not load this user's access" />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.permissionBody,
              centeredContent(formMaxWidth),
            ]}
          >
            <View style={styles.permissionIntro}>
              <Text style={styles.permissionIntroTitle}>
                Role defaults + custom access
              </Text>
              <Text style={styles.permissionIntroText}>
                Switches show effective access. Changes here override only this
                user.
              </Text>
              <TouchableOpacity
                style={styles.resetAccessBtn}
                onPress={() =>
                  setDraft(
                    Object.fromEntries(
                      permissions.map(permission => [permission.key, null]),
                    ),
                  )
                }
              >
                <RotateCcw size={15} color={COLORS.primary} />
                <Text style={styles.resetAccessText}>USE ROLE DEFAULTS</Text>
              </TouchableOpacity>
            </View>

            {Object.entries(groupedPermissions).map(([group, items]) => (
              <View key={group} style={styles.permissionGroup}>
                <Text style={styles.permissionGroupTitle}>{group}</Text>
                {items.map(permission => {
                  const allowed = effectiveAllowed(permission);
                  const customized = draft[permission.key] != null;
                  return (
                    <View key={permission.key} style={styles.permissionRow}>
                      <View style={styles.permissionCopy}>
                        <View style={styles.permissionLabelRow}>
                          <Text style={styles.permissionLabel}>
                            {permission.label}
                          </Text>
                          {customized && (
                            <Text style={styles.customBadge}>CUSTOM</Text>
                          )}
                        </View>
                        <Text style={styles.permissionDescription}>
                          {permission.description}
                        </Text>
                      </View>
                      <Switch
                        value={allowed}
                        onValueChange={value =>
                          setDraft(current => ({
                            ...current,
                            [permission.key]: value,
                          }))
                        }
                        trackColor={{
                          false: COLORS.borderStrong,
                          true: COLORS.accent,
                        }}
                        thumbColor={COLORS.white}
                      />
                    </View>
                  );
                })}
              </View>
            ))}

            <TouchableOpacity
              style={[
                styles.saveBtn,
                saveMutation.isPending && styles.disabled,
              ]}
              disabled={saveMutation.isPending}
              onPress={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <KeyRound size={20} color={COLORS.white} />
                  <Text style={styles.saveText}>SAVE FEATURE ACCESS</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
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
                  Create plant manager, admin, supervisor or labour
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
                maxLength={72}
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
                left={<TextInput.Icon icon={PasswordLockIcon} />}
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
                Any nonempty password up to 72 characters is accepted.
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
                <ChoiceButton
                  title="Labour"
                  active={form.role === 'labour'}
                  onPress={() => updateForm('role', 'labour')}
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
  centeredOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(10, 20, 40, 0.48)',
  },
  passwordModalCard: {
    overflow: 'hidden',
    borderRadius: UI.radius,
    backgroundColor: COLORS.white,
  },
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
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 18,
    elevation: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: { color: COLORS.text, fontSize: 27, fontWeight: '700' },
  description: { color: COLORS.gray, fontSize: 13, marginTop: 4 },

  addBtn: {
    width: 50,
    height: 50,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },

  activeCard: {
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 15,
    elevation: 1,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  userCard: {
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 15,
    elevation: 1,
    marginBottom: 12,
    alignItems: 'stretch',
  },
  userIdentityRow: { flexDirection: 'row', alignItems: 'flex-start' },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  userName: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  userEmail: { color: COLORS.gray, fontSize: 12, marginTop: 3 },

  shiftText: {
    color: COLORS.text,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },

  greenText: {
    color: COLORS.green,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },

  grayText: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },

  activeBadge: {
    backgroundColor: COLORS.tealSoft,
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  activeBadgeText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '600',
  },

  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  summaryCard: {
    borderWidth: 0,
    borderColor: COLORS.border,
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 12,
    elevation: 1,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryValue: {
    fontVariant: ['tabular-nums'],
    fontSize: 21,
    fontWeight: '700',
  },
  summaryLabel: { color: COLORS.gray, fontSize: 12, fontWeight: '600' },

  directoryTools: {
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 14,
    marginTop: 18,
    elevation: 1,
  },
  directoryTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  searchInput: { backgroundColor: COLORS.white, fontSize: 13 },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  filterBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: UI.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: { color: COLORS.gray, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: COLORS.white },

  accountMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  accountDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.green,
    marginRight: 5,
  },
  accountDotInactive: { backgroundColor: COLORS.gray },
  accountStatusText: { color: COLORS.green, fontSize: 12, fontWeight: '600' },
  accountStatusTextInactive: { color: COLORS.gray },

  emptyCard: {
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 18,
    elevation: 1,
  },

  emptyText: { color: COLORS.gray, fontWeight: '600' },
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
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  modalTitleText: {
    flex: 1,
  },

  modalTitle: { color: COLORS.text, fontSize: 22, fontWeight: '700' },
  modalDesc: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },

  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBody: { padding: 16, paddingBottom: 32 },

  formCard: {
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 18,
    elevation: 1,
  },

  input: {
    backgroundColor: COLORS.white,
    marginBottom: 14,
    fontSize: 15,
  },

  passwordHint: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '400',
    marginTop: -7,
    marginBottom: 16,
    paddingHorizontal: 4,
  },

  fieldLabel: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },

  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },

  choiceBtn: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: COLORS.bg,
    borderRadius: UI.radiusSmall,
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
    fontWeight: '600',
    fontSize: 13,
  },

  choiceTextActive: { color: COLORS.white },

  saveBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    flexDirection: 'row',
    gap: 8,
  },

  saveText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  userAccessBtn: {
    flex: 1,
    minWidth: 72,
    minHeight: 44,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  userAccessText: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  userEditBtn: {
    flex: 1,
    minWidth: 72,
    minHeight: 44,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userEditText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  userStatusBtn: {
    flex: 1,
    minWidth: 72,
    minHeight: 44,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  userStatusText: { color: COLORS.danger, fontSize: 12, fontWeight: '600' },

  permissionBody: { padding: 16, paddingBottom: 36 },
  permissionIntro: {
    backgroundColor: COLORS.lightBlue,
    borderRadius: UI.radiusSmall,
    padding: 16,
    marginBottom: 16,
  },
  permissionIntroTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  permissionIntroText: {
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  resetAccessBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderRadius: UI.radiusSmall,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 12,
  },
  resetAccessText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  permissionGroup: {
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    paddingHorizontal: 15,
    paddingTop: 15,
    marginBottom: 14,
    elevation: 1,
  },
  permissionGroupTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  permissionRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 12,
  },
  permissionCopy: { flex: 1 },
  permissionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  permissionLabel: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  customBadge: {
    color: COLORS.accent,
    backgroundColor: COLORS.warningSoft,
    borderRadius: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 12,
    fontWeight: '600',
  },
  permissionDescription: {
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
});
