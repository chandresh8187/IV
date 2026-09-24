import React, { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Pencil, Reply, Send, Trash2, X } from 'lucide-react-native';
import moment from 'moment';
import { useSelector } from 'react-redux';
import { COLORS, UI } from '../../assets/Colors';
import { socket } from '../../socket/socket';
import {
  deleteChatMessageApi,
  editChatMessageApi,
  getChatApi,
  markChatReadApi,
  registerChatParticipantApi,
  sendChatMessageApi,
} from '../../api/chatApi';
import { getNotificationInstallationId } from '../../services/notificationRegistrationService';

const formatMessageTime = value => {
  const date = moment(value, 'YYYY-MM-DD HH:mm:ss', true);
  if (!date.isValid()) return '';
  return date.isSame(moment(), 'day')
    ? date.format('h:mm A')
    : date.format('DD MMM YYYY, h:mm A');
};
const CHAT_NAME_STORAGE_KEY = 'plant_chat_device_name';
const CHAT_MOBILE_STORAGE_KEY = 'plant_chat_device_mobile';

export default function ChatScreen() {
  const user = useSelector(state => state.auth.user);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(null);
  const [replying, setReplying] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [chatName, setChatName] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [mobile, setMobile] = useState('');
  const [installationId, setInstallationId] = useState('');
  const [identityReady, setIdentityReady] = useState(false);
  const [participantReady, setParticipantReady] = useState(false);
  const [participantId, setParticipantId] = useState(null);
  const [busy, setBusy] = useState(false);
  const list = useRef(null);
  const highlightTimer = useRef(null);
  useEffect(() => {
    Promise.all([AsyncStorage.getItem(CHAT_NAME_STORAGE_KEY), AsyncStorage.getItem(CHAT_MOBILE_STORAGE_KEY), getNotificationInstallationId()])
      .then(([value, savedMobile, deviceId]) => {
        const saved = String(value || '').trim();
        setChatName(saved);
        setNameDraft(saved);
        setMobile(String(savedMobile || ''));
        setInstallationId(deviceId);
      })
      .finally(() => setIdentityReady(true));
  }, []);
  useEffect(() => {
    if (identityReady && chatName && mobile && installationId) registerChatParticipantApi({ installation_id: installationId, display_name: chatName, mobile_number: mobile }).then(() => setParticipantReady(true)).catch(() => setParticipantReady(false));
  }, [chatName, identityReady, installationId, mobile]);
  const load = useCallback(async () => {
    const result = await getChatApi(installationId);
    const loaded = Array.isArray(result?.data?.messages)
      ? result.data.messages
      : [];
    setMessages(loaded);
    setUsers(Array.isArray(result?.data?.users) ? result.data.users : []);
    setParticipantId(result?.data?.participant_id || null);
    setTimeout(() => list.current?.scrollToEnd({ animated: false }), 100);
    await markChatReadApi(loaded[loaded.length - 1]?.id || 0, installationId);
  }, [installationId]);
  useEffect(() => {
    if (!identityReady || !chatName || !mobile || !participantReady) return undefined;
    const markActive = () => socket.emit('chat_active', { active: true });
    markActive();
    socket.on('connect', markActive);
    load().catch(() => {});
    const created = m => {
      setMessages(v => (v.some(x => x.id === m.id) ? v : [...v, m]));
      if (Number(m?.participant_id) !== Number(participantId))
        markChatReadApi(Number(m.id), installationId).catch(() => {});
    };
    const updated = m => setMessages(v => v.map(x => (x.id === m.id ? m : x)));
    const deleted = ({ id }) =>
      setMessages(v => v.filter(x => Number(x.id) !== Number(id)));
    const presence = ({ online_user_ids = [] }) =>
      setUsers(v =>
        v.map(x => ({
          ...x,
          online: online_user_ids.map(Number).includes(Number(x.id)),
        })),
      );
    const seen = ({ participant_id, last_read_message_id }) => {
      if (Number(participant_id) === Number(participantId)) return;
      setMessages(current => current.map(item => Number(item.id) <= Number(last_read_message_id) && Number(item.participant_id) !== Number(participant_id) ? { ...item, seen_count: Math.max(1, Number(item.seen_count || 0)) } : item));
    };
    socket.on('chat_message_created', created);
    socket.on('chat_message_updated', updated);
    socket.on('chat_message_deleted', deleted);
    socket.on('chat_presence_updated', presence);
    socket.on('chat_messages_seen', seen);
    return () => {
      clearTimeout(highlightTimer.current);
      socket.emit('chat_active', { active: false });
      socket.off('connect', markActive);
      socket.off('chat_message_created', created);
      socket.off('chat_message_updated', updated);
      socket.off('chat_message_deleted', deleted);
      socket.off('chat_presence_updated', presence);
      socket.off('chat_messages_seen', seen);
    };
  }, [chatName, identityReady, installationId, load, mobile, participantId, participantReady, user?.id]);
  const save = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      if (editing) await editChatMessageApi(editing.id, text);
      else await sendChatMessageApi(text, replying?.id || null, installationId);
      setText('');
      setEditing(null);
      setReplying(null);
    } catch (e) {
      Alert.alert(
        'Chat',
        e?.response?.data?.message || 'Could not save message.',
      );
    } finally {
      setBusy(false);
    }
  };
  const remove = item =>
    Alert.alert('Delete message', 'Delete this message permanently?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteChatMessageApi(item.id).catch(e =>
            Alert.alert(
              'Chat',
              e?.response?.data?.message || 'Could not delete message.',
            ),
          ),
      },
    ]);
  const canChange = item =>
    Number(item.participant_id) === Number(participantId) || user?.role === 'superadmin';
  const jumpToMessage = messageId => {
    const index = messages.findIndex(item => Number(item.id) === Number(messageId));
    if (index < 0) return Alert.alert('Chat', 'The original message is not in the loaded conversation.');
    list.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    setHighlightedId(Number(messageId));
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightedId(null), 1600);
  };
  const saveChatName = async () => {
    const name = nameDraft.trim().replace(/\s+/g, ' ');
    if (name.length < 2) return Alert.alert('Plant Chat', 'Enter at least 2 characters for your name.');
    if (!/^\d{10,15}$/.test(mobile.replace(/\D/g, ''))) return Alert.alert('Plant Chat', 'Enter a valid mobile number.');
    await registerChatParticipantApi({ installation_id: installationId, display_name: name, mobile_number: mobile });
    await AsyncStorage.setItem(CHAT_NAME_STORAGE_KEY, name);
    await AsyncStorage.setItem(CHAT_MOBILE_STORAGE_KEY, mobile.replace(/\D/g, ''));
    setChatName(name);
    setParticipantReady(true);
  };

  if (!identityReady) {
    return <View style={styles.identityLoading}><ActivityIndicator color={COLORS.primary} /></View>;
  }
  if (!chatName || !mobile) {
    return (
      <View style={styles.identityPage}>
        <View style={styles.identityCard}>
          <Text style={styles.identityTitle}>Who is using Plant Chat?</Text>
          <Text style={styles.identityHint}>This name is saved on this device and shown with messages sent from it.</Text>
          <TextInput value={nameDraft} onChangeText={setNameDraft} placeholder="Enter your name" placeholderTextColor={COLORS.gray} maxLength={60} autoCapitalize="words" style={styles.identityInput} />
          <TextInput value={mobile} onChangeText={setMobile} placeholder="Enter mobile number" placeholderTextColor={COLORS.gray} maxLength={15} keyboardType="phone-pad" style={styles.identityInput} />
          <TouchableOpacity style={styles.identityButton} onPress={saveChatName} disabled={nameDraft.trim().length < 2}><Text style={styles.identityButtonText}>Save and open chat</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior="padding"
      keyboardVerticalOffset={40}
    >
      <View style={styles.people}>
        <Text style={styles.section}>Plant users</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {users.map(item => (
            <View style={styles.person} key={item.id}>
              <View style={styles.avatar}>
                <Text>{item.name?.[0]?.toUpperCase()}</Text>
                <View
                  style={[
                    styles.dot,
                    item.online ? styles.online : styles.offline,
                  ]}
                />
              </View>
              <Text numberOfLines={1} style={styles.personName}>
                {item.name}
              </Text>
              <Text style={styles.status}>
                {item.online ? 'Online' : 'Offline'}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
      <FlatList
        ref={list}
        style={styles.messageList}
        keyboardShouldPersistTaps="handled"
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        onScrollToIndexFailed={({ index }) =>
          setTimeout(() => list.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 }), 150)
        }
        keyboardDismissMode="none"
        data={messages}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() =>
          list.current?.scrollToEnd({ animated: true })
        }
        renderItem={({ item }) => {
          const own = Number(item.participant_id) === Number(participantId);
          return (
            <View style={[styles.bubble, own && styles.own, Number(highlightedId) === Number(item.id) && styles.highlighted]}>
              <Text style={styles.name}>{item.user_name}</Text>
              <Text style={styles.role}>{String(item.user_role || '').replace(/_/g, ' ')}</Text>
              {item.reply_to_message_id && (
                <TouchableOpacity style={styles.replyQuote} onPress={() => jumpToMessage(item.reply_to_message_id)}>
                  <Text style={styles.replyAuthor}>{item.reply_user_name || 'Original message'}</Text>
                  <Text style={styles.replyText} numberOfLines={2}>{item.reply_message || 'Message unavailable'}</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.message}>{item.message}</Text>
              <View style={styles.meta}>
                <Text style={styles.time}>
                  {formatMessageTime(item.created_at)}
                  {item.edited_at ? ' · edited' : ''}
                  {own ? Number(item.seen_count) > 0 ? ' · Seen' : ' · Sent' : ''}
                </Text>
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => { setEditing(null); setText(''); setReplying(item); }}>
                      <Reply size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  {canChange(item) && (<>
                    <TouchableOpacity
                      onPress={() => {
                        setReplying(null);
                        setEditing(item);
                        setText(item.message);
                      }}
                    >
                      <Pencil size={15} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => remove(item)}>
                      <Trash2 size={15} color={COLORS.danger} />
                    </TouchableOpacity>
                  </>)}
                </View>
              </View>
            </View>
          );
        }}
      />
      {editing && (
        <View style={styles.editing}>
          <Text>Editing message</Text>
          <TouchableOpacity
            onPress={() => {
              setEditing(null);
              setText('');
            }}
          >
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
      {replying && !editing && (
        <View style={styles.replying}>
          <View style={styles.replyingText}><Text style={styles.replyAuthor}>Replying to {replying.user_name}</Text><Text numberOfLines={1}>{replying.message}</Text></View>
          <TouchableOpacity onPress={() => setReplying(null)}><X size={20} color={COLORS.gray} /></TouchableOpacity>
        </View>
      )}
      {/@[^\s@]*$/.test(text) && <View style={styles.mentions}>{users.filter(item => item.name?.toLowerCase().includes((text.match(/@([^\s@]*)$/)?.[1] || '').toLowerCase())).slice(0, 5).map(item => <TouchableOpacity key={item.id} onPress={() => setText(value => value.replace(/@[^\s@]*$/, `@${item.name} `))}><Text style={styles.mentionName}>@{item.name}</Text><Text style={styles.role}>{item.role}</Text></TouchableOpacity>)}</View>}
      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          onFocus={() =>
            setTimeout(() => list.current?.scrollToEnd({ animated: true }), 250)
          }
          placeholder={
            replying ? `Reply to ${replying.user_name}` : 'Type a message…'
          }
          placeholderTextColor={COLORS.gray}
          multiline
          maxLength={1000}
          blurOnSubmit={false}
          style={styles.input}
        />
        <TouchableOpacity
          disabled={busy || !text.trim()}
          onPress={save}
          style={styles.send}
        >
          <Send size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bg },
  identityLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  identityPage: { flex: 1, padding: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  identityCard: { width: '100%', maxWidth: 460, padding: 22, gap: 14, borderRadius: UI.radius, backgroundColor: COLORS.white, ...UI.shadow },
  identityTitle: { color: COLORS.text, fontSize: 21, fontWeight: '800' },
  identityHint: { color: COLORS.muted, fontSize: 13, lineHeight: 20 },
  identityInput: { minHeight: 48, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: UI.radiusSmall, paddingHorizontal: 13, color: COLORS.text },
  identityButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: UI.radiusSmall, backgroundColor: COLORS.primary },
  identityButtonText: { color: COLORS.white, fontWeight: '800' },
  messageList: { flex: 1 },
  people: {
    backgroundColor: COLORS.white,
    padding: 14,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  section: { fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  person: { width: 72, alignItems: 'center', marginRight: 10 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  online: { backgroundColor: '#22c55e' },
  offline: { backgroundColor: '#94a3b8' },
  personName: { fontSize: 11, color: COLORS.text, marginTop: 4 },
  status: { fontSize: 10, color: COLORS.gray },
  messages: { padding: 14, paddingBottom: 18, gap: 10 },
  bubble: {
    maxWidth: '86%',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  own: { alignSelf: 'flex-end', backgroundColor: COLORS.accentSoft },
  highlighted: { borderColor: COLORS.accent, borderWidth: 2, backgroundColor: '#fff3bf' },
  name: { fontWeight: '700', fontSize: 12, color: COLORS.primary },
  role: { color: COLORS.muted, fontSize: 10, textTransform: 'capitalize', marginTop: 1 },
  replyQuote: { backgroundColor: COLORS.surfaceMuted, borderLeftWidth: 3, borderLeftColor: COLORS.accent, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 7, marginTop: 7 },
  replyAuthor: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  replyText: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  message: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 21,
    marginVertical: 5,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 15,
  },
  time: { fontSize: 10, color: COLORS.gray },
  actions: { flexDirection: 'row', gap: 14 },
  editing: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: COLORS.accentSoft,
  },
  cancel: { color: COLORS.danger, fontWeight: '700' },
  replying: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: COLORS.accentSoft, borderLeftWidth: 4, borderLeftColor: COLORS.accent },
  replyingText: { flex: 1 },
  mentions: { maxHeight: 180, padding: 10, gap: 8, backgroundColor: COLORS.white, borderTopWidth: 1, borderColor: COLORS.border },
  mentionName: { color: COLORS.primary, fontWeight: '800' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: UI.radiusSmall,
    paddingHorizontal: 12,
    color: COLORS.text,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
