import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  PackageOpen,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';

import {
  createItemApi,
  deleteItemApi,
  getItemsApi,
  updateItemApi,
} from '../../api/itemsApi';
import { COLORS, PAPER_THEME, UI } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';

const formatCreatedDetails = item => {
  const details = [];

  if (item?.created_by_name) details.push(`Added by ${item.created_by_name}`);

  if (item?.created_at) {
    const date = new Date(item.created_at);
    if (!Number.isNaN(date.getTime())) {
      details.push(
        date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      );
    }
  }

  return details.join(' · ');
};

export default function ItemsScreen() {
  const { contentMaxWidth } = useResponsive();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemName, setItemName] = useState('');
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const {
    data,
    isError,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['items'],
    queryFn: getItemsApi,
  });
  const items = Array.isArray(data?.data) ? data.data : [];
  const searchQuery = search.trim().toLowerCase();
  const visibleItems = searchQuery
    ? items.filter(item =>
        String(item.item_name || '')
          .toLowerCase()
          .includes(searchQuery),
      )
    : items;

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(''), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const finishSave = (response, fallbackMessage) => {
    Keyboard.dismiss();
    setItemName('');
    setFormError('');
    setEditingItem(null);
    setShowForm(false);
    setSuccessMessage(response?.message || fallbackMessage);
    queryClient.invalidateQueries({ queryKey: ['items'] });
  };

  const handleSaveError = error => {
    setFormError(
      error?.response?.data?.message ||
        'The item could not be saved. Please try again.',
    );
  };

  const createMutation = useMutation({
    mutationFn: createItemApi,
    onSuccess: response => finishSave(response, 'Item added successfully'),
    onError: handleSaveError,
  });

  const updateMutation = useMutation({
    mutationFn: updateItemApi,
    onSuccess: response => finishSave(response, 'Item updated successfully'),
    onError: handleSaveError,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteItemApi,
    onSuccess: response => {
      setSuccessMessage(response?.message || 'Item deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
    onError: error => {
      Alert.alert(
        'Could not delete item',
        error?.response?.data?.message || 'Please try again.',
      );
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const openForm = () => {
    setEditingItem(null);
    setItemName('');
    setFormError('');
    createMutation.reset();
    updateMutation.reset();
    setShowForm(true);
  };

  const openEditForm = item => {
    setEditingItem(item);
    setItemName(String(item?.item_name || ''));
    setFormError('');
    createMutation.reset();
    updateMutation.reset();
    setShowForm(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    Keyboard.dismiss();
    setShowForm(false);
    setEditingItem(null);
    setItemName('');
    setFormError('');
  };

  const confirmDelete = item => {
    closeForm();
    Alert.alert(
      'Delete item?',
      `“${item.item_name}” will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(item.id),
        },
      ],
    );
  };

  const saveItem = () => {
    if (isSaving) return;

    const normalizedName = itemName.trim().replace(/\s+/g, ' ');

    if (!normalizedName) {
      setFormError('Enter an item name.');
      return;
    }

    if (normalizedName.length > 150) {
      setFormError('Item name cannot exceed 150 characters.');
      return;
    }

    setFormError('');
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, itemName: normalizedName });
    } else {
      createMutation.mutate(normalizedName);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.container,
        centeredContent(contentMaxWidth),
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <Pressable style={styles.touchArea} onPress={closeForm}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <PackageOpen size={23} color={COLORS.accent} />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>Item master</Text>
            <Text style={styles.summaryText}>
              {items.length
                ? `${items.length} saved ${items.length === 1 ? 'item' : 'items'}`
                : 'Create your production item list'}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add item"
            activeOpacity={0.8}
            disabled={deleteMutation.isPending}
            style={styles.addButton}
            onPress={event => {
              event.stopPropagation();
              openForm();
            }}
          >
            <Plus size={18} color={COLORS.white} />
            <Text style={styles.addButtonText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {showForm ? (
          <Pressable
            style={styles.formCard}
            onPress={event => event.stopPropagation()}
          >
            <Text style={styles.formTitle}>
              {editingItem ? 'Edit item' : 'Add new item'}
            </Text>
            <TextInput
              autoFocus
              label="Item name"
              placeholder="For example, GI Pipe"
              mode="outlined"
              value={itemName}
              onChangeText={value => {
                setItemName(value);
                if (formError) setFormError('');
              }}
              maxLength={150}
              returnKeyType="done"
              onSubmitEditing={saveItem}
              error={Boolean(formError)}
              style={styles.input}
              outlineColor={COLORS.inputBorder}
              activeOutlineColor={COLORS.accent}
              textColor={COLORS.text}
              theme={PAPER_THEME}
            />
            <View style={styles.inputMeta}>
              <Text style={styles.errorText}>{formError}</Text>
              <Text style={styles.characterCount}>{itemName.length}/150</Text>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  editingItem ? 'Cancel editing item' : 'Cancel adding item'
                }
                activeOpacity={0.75}
                disabled={isSaving}
                style={styles.cancelButton}
                onPress={closeForm}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  editingItem ? 'Update item' : 'Save item'
                }
                activeOpacity={0.8}
                disabled={isSaving}
                style={[
                  styles.saveButton,
                  isSaving && styles.buttonDisabled,
                ]}
                onPress={saveItem}
              >
                {isSaving ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Save size={18} color={COLORS.white} />
                    <Text style={styles.saveButtonText}>
                      {editingItem ? 'Update Item' : 'Save Item'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        ) : null}

        {successMessage ? (
          <View style={styles.successBanner}>
            <CheckCircle2 size={19} color={COLORS.success} />
            <Text style={styles.successText}>{successMessage}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Dismiss success message"
              hitSlop={8}
              onPress={() => setSuccessMessage('')}
            >
              <X size={18} color={COLORS.success} />
            </TouchableOpacity>
          </View>
        ) : null}

        <TextInput
          label="Search items"
          mode="outlined"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          outlineColor={COLORS.inputBorder}
          activeOutlineColor={COLORS.accent}
          textColor={COLORS.text}
          theme={PAPER_THEME}
          left={<TextInput.Icon icon="magnify" color={COLORS.muted} />}
          right={
            search ? (
              <TextInput.Icon
                icon="close"
                color={COLORS.muted}
                forceTextInputFocus={false}
                onPress={() => setSearch('')}
              />
            ) : null
          }
        />

        <View style={styles.listHeading}>
          <Text style={styles.listTitle}>All items</Text>
          {!isLoading && !isError ? (
            <View style={styles.resultBadge}>
              <Text style={styles.resultText}>{visibleItems.length}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.listCard}>
          {isLoading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.stateText}>Loading your items...</Text>
            </View>
          ) : isError ? (
            <View style={styles.stateBox}>
              <View style={styles.emptyIcon}>
                <PackageOpen size={28} color={COLORS.danger} />
              </View>
              <Text style={styles.stateTitle}>Could not load items</Text>
              <Text style={styles.stateText}>
                Check your connection and try again.
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={refetch}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : visibleItems.length ? (
            visibleItems.map((item, index) => {
              const details = formatCreatedDetails(item);
              const isDeleting =
                deleteMutation.isPending &&
                Number(deleteMutation.variables) === Number(item.id);
              return (
                <View
                  key={item.id}
                  style={[
                    styles.itemRow,
                    index < visibleItems.length - 1 && styles.itemRowBorder,
                  ]}
                >
                  <View style={styles.itemIcon}>
                    <PackageOpen size={20} color={COLORS.accent} />
                  </View>
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemName}>{item.item_name}</Text>
                    {details ? (
                      <Text style={styles.itemMeta} numberOfLines={1}>
                        {details}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.rowActions}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${item.item_name}`}
                      activeOpacity={0.7}
                      disabled={isSaving || deleteMutation.isPending}
                      style={[styles.rowButton, styles.editButton]}
                      onPress={event => {
                        event.stopPropagation();
                        openEditForm(item);
                      }}
                    >
                      <Pencil size={17} color={COLORS.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${item.item_name}`}
                      activeOpacity={0.7}
                      disabled={isSaving || deleteMutation.isPending}
                      style={[styles.rowButton, styles.deleteButton]}
                      onPress={event => {
                        event.stopPropagation();
                        confirmDelete(item);
                      }}
                    >
                      {isDeleting ? (
                        <ActivityIndicator size="small" color={COLORS.danger} />
                      ) : (
                        <Trash2 size={17} color={COLORS.danger} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.stateBox}>
              <View style={styles.emptyIcon}>
                <PackageOpen size={30} color={COLORS.accent} />
              </View>
              <Text style={styles.stateTitle}>
                {items.length ? 'No matching items' : 'No items added yet'}
              </Text>
              <Text style={styles.stateText}>
                {items.length
                  ? 'Try another item name.'
                  : 'Tap Add Item to create your first item.'}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  container: {
    flexGrow: 1,
    padding: UI.pagePadding,
    paddingBottom: 40,
  },
  touchArea: { width: '100%', flexGrow: 1 },
  summaryCard: {
    minHeight: 76,
    padding: 14,
    borderRadius: UI.radius,
    borderWidth: 0,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    ...UI.shadow,
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightBlue,
  },
  summaryCopy: { flex: 1, marginLeft: 11, marginRight: 8 },
  summaryTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  summaryText: { color: COLORS.gray, fontSize: 12, marginTop: 3 },
  addButton: {
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: UI.radiusSmall,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
  },
  addButtonText: { color: COLORS.white, fontSize: 12.5, fontWeight: '600' },
  formCard: {
    padding: 16,
    marginTop: 14,
    borderRadius: UI.radius,
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    ...UI.shadow,
  },
  formTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 11,
  },
  successBanner: {
    minHeight: 48,
    paddingHorizontal: 14,
    marginTop: 14,
    borderRadius: UI.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: COLORS.tealSoft,
  },
  successText: {
    flex: 1,
    color: COLORS.success,
    fontSize: 13,
    fontWeight: '600',
  },
  searchInput: { marginTop: 16, backgroundColor: COLORS.white },
  listHeading: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 8,
  },
  listTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  resultBadge: {
    minWidth: 28,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightBlue,
  },
  resultText: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  listCard: {
    overflow: 'hidden',
    borderRadius: UI.radius,
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  itemRow: {
    minHeight: 70,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightBlue,
  },
  itemCopy: { flex: 1, minWidth: 0, marginLeft: 12, marginRight: 8 },
  itemName: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  itemMeta: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  rowActions: { flexDirection: 'row', gap: 7 },
  rowButton: {
    width: 44,
    height: 44,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: { backgroundColor: COLORS.lightBlue },
  deleteButton: { backgroundColor: COLORS.dangerSoft },
  stateBox: {
    minHeight: 230,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightBlue,
    marginBottom: 12,
  },
  stateTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  stateText: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 5,
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightBlue,
    marginTop: 14,
  },
  retryText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  input: { backgroundColor: COLORS.white },
  inputMeta: {
    minHeight: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 3,
    paddingTop: 5,
  },
  errorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  characterCount: { color: COLORS.muted, fontSize: 12 },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 7,
  },
  cancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: UI.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  cancelButtonText: { color: COLORS.gray, fontSize: 14, fontWeight: '600' },
  saveButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: UI.radiusSmall,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
  },
  saveButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  buttonDisabled: { opacity: 0.65 },
});
