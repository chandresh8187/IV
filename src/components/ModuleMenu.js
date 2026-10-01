import React, { useState } from 'react';
import {
  ScrollView,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowUpRight, Factory, Search, Settings2, X } from 'lucide-react-native';
import { COLORS, UI } from '../assets/Colors';
import { centeredContent, useResponsive } from '../utils/responsive';

/** Permission filtering and navigation stay in the caller. */
export default function ModuleMenu({
  eyebrow,
  title,
  description,
  actions,
  sections,
  searchable = false,
  onSelect,
}) {
  const [search, setSearch] = useState('');
  const { isTablet, wideMaxWidth, width, fontScale } = useResponsive();
  const searchText = search.trim().toLowerCase();
  const columns = isTablet && fontScale <= 1.15
    ? 4
    : actions.length > 4 && width >= 380 && fontScale <= 1.15
    ? 3
    : 2;
  const HeadingIcon = actions.some(item => item.primary) ? Factory : Settings2;
  const availableSections = sections
    ? sections.map(section => ({
        ...section,
        actions: actions.filter(item => section.screens.includes(item.screen)),
      }))
    : [{ title: null, actions }];
  const visibleSections = availableSections.map(section => ({
    ...section,
    actions: section.actions.filter(item =>
      !searchText || [item.title, item.description, section.title].some(value =>
        String(value || '').toLowerCase().includes(searchText))),
  })).filter(section => section.actions.length);
  const visibleCount = visibleSections.reduce((count, section) => count + section.actions.length, 0);
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={centeredContent(wideMaxWidth)}>
          <View style={styles.heroTop}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <View style={styles.brandIcon}>
              <HeadingIcon size={21} color={COLORS.onHero} strokeWidth={1.6} />
            </View>
          </View>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={centeredContent(wideMaxWidth)}>
          <View style={styles.section}>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Your workspace</Text>
              <Text style={styles.sectionHint}>
                Choose an operation to continue
              </Text>
            </View>
            <Text style={styles.count}>{searchText ? `${visibleCount} found` : `${actions.length} modules`}</Text>
          </View>
          {searchable && <View style={styles.searchBox}>
            <Search size={19} color={COLORS.gray} />
            <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search production menus" placeholderTextColor={COLORS.gray} accessibilityLabel="Search production menus" autoCapitalize="none" returnKeyType="search" />
            {!!search && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear menu search" onPress={() => setSearch('')}><X size={19} color={COLORS.gray} /></TouchableOpacity>}
          </View>}
          {visibleSections.map(section => <View key={section.title || 'all'} style={styles.actionSection}>
            {section.title && <Text style={styles.groupTitle} accessibilityRole="header">{section.title}</Text>}
            <View style={styles.grid}>
            {section.actions.map(item => {
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={item.screen}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  accessibilityHint={item.description}
                  activeOpacity={0.75}
                  onPress={() => onSelect(item)}
                  style={[
                    styles.tile,
                    { width: `${100 / columns - 3}%` },
                    item.primary && styles.primaryTile,
                  ]}
                >
                  {item.primary && (
                    <View style={styles.entryBadge}>
                      <ArrowUpRight size={12} color={COLORS.white} />
                    </View>
                  )}
                  <View
                    style={[styles.icon, item.primary && styles.primaryIcon]}
                  >
                    <Icon
                      size={27}
                      color={item.primary ? COLORS.white : COLORS.accent}
                      strokeWidth={1.65}
                    />
                  </View>
                  <Text
                    style={[
                      styles.moduleTitle,
                      item.primary && styles.primaryTitle,
                    ]}
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
            </View>
          </View>)}
          {!actions.length && (
            <Text style={styles.empty}>
              No modules are available for your access permissions.
            </Text>
          )}
          {!!actions.length && !!searchText && !visibleCount && <Text style={styles.empty}>No menus match “{search.trim()}”.</Text>}
          <View style={styles.note}>
            <Text style={styles.noteTitle}>Configured for your role</Text>
            <Text style={styles.noteText}>
              These options follow your assigned access. Contact your superadmin
              if you need access to another feature.
            </Text>
          </View>
          <Text style={styles.footer}>
            IV Production · Built for your plant
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { flexGrow: 1 },
  hero: {
    backgroundColor: COLORS.hero,
    paddingHorizontal: UI.pagePadding,
    paddingTop: 14,
    paddingBottom: 46,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  eyebrow: {
    flex: 1,
    color: COLORS.onHero,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.7,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 8,
  },
  description: {
    color: COLORS.onHero,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 440,
  },
  sheet: {
    flex: 1,
    marginTop: -26,
    paddingHorizontal: UI.pagePadding,
    paddingBottom: 28,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    backgroundColor: COLORS.borderStrong,
    marginTop: 12,
    marginBottom: 22,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 22,
  },
  sectionCopy: { flex: 1 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600' },
  sectionHint: {
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, borderWidth: 1, borderColor: COLORS.border, borderRadius: UI.radiusSmall, backgroundColor: COLORS.white, marginBottom: 22 },
  searchInput: { flex: 1, minHeight: 46, color: COLORS.text, fontSize: 14 },
  count: {
    color: COLORS.accent,
    fontSize: 11,
    padding: 8,
    borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 14,
  },
  actionSection: { marginBottom: 24 },
  groupTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  tile: {
    minHeight: 128,
    paddingHorizontal: 9,
    paddingVertical: 18,
    borderRadius: UI.radius,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    ...UI.shadow,
  },
  primaryTile: { backgroundColor: COLORS.accent },
  entryBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryIcon: { backgroundColor: 'rgba(255,255,255,0.12)' },
  moduleTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    textAlign: 'center',
  },
  primaryTitle: { color: COLORS.white },
  note: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 22,
    marginTop: 28,
  },
  noteTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  noteText: { color: COLORS.gray, fontSize: 12, lineHeight: 19, marginTop: 7 },
  empty: { color: COLORS.gray, paddingVertical: 24, lineHeight: 21 },
  footer: {
    color: COLORS.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 28,
  },
});
