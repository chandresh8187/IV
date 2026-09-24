import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { Pencil, Send, Trash2 } from 'lucide-react-native';
import moment from 'moment';
import { useSelector } from 'react-redux';
import { COLORS, UI } from '../../assets/Colors';
import { socket } from '../../socket/socket';
import {
  deleteChatMessageApi,
  editChatMessageApi,
  getChatApi,
  markChatReadApi,
  sendChatMessageApi,
} from '../../api/chatApi';

const formatMessageTime = value => {
  const date = moment(value, 'YYYY-MM-DD HH:mm:ss', true);
  if (!date.isValid()) return '';
  return date.isSame(moment(), 'day')
    ? date.format('h:mm A')
    : date.format('DD MMM YYYY, h:mm A');
};

export default function ChatScreen() {
  const headerHeight = useHeaderHeight();
  const user = useSelector(state => state.auth.user);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const list = useRef(null);
  const load = useCallback(async () => {
    const result = await getChatApi();
    const loaded = Array.isArray(result?.data?.messages)
      ? result.data.messages
      : [];
    setMessages(loaded);
    setUsers(Array.isArray(result?.data?.users) ? result.data.users : []);
    await markChatReadApi(loaded[loaded.length - 1]?.id || 0);
  }, []);
  useEffect(() => {
    const markActive = () => socket.emit('chat_active', { active: true });
    markActive();
    socket.on('connect', markActive);
    load().catch(() => {});
    const created = m => {
      setMessages(v => (v.some(x => x.id === m.id) ? v : [...v, m]));
      if (Number(m?.user_id) !== Number(user?.id))
        markChatReadApi(Number(m.id)).catch(() => {});
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
    socket.on('chat_message_created', created);
    socket.on('chat_message_updated', updated);
    socket.on('chat_message_deleted', deleted);
    socket.on('chat_presence_updated', presence);
    return () => {
      socket.emit('chat_active', { active: false });
      socket.off('connect', markActive);
      socket.off('chat_message_created', created);
      socket.off('chat_message_updated', updated);
      socket.off('chat_message_deleted', deleted);
      socket.off('chat_presence_updated', presence);
    };
  }, [load, user?.id]);
  const save = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      if (editing) await editChatMessageApi(editing.id, text);
      else await sendChatMessageApi(text);
      setText('');
      setEditing(null);
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
    Number(item.user_id) === Number(user?.id) || user?.role === 'superadmin';

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
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        data={messages}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() =>
          list.current?.scrollToEnd({ animated: true })
        }
        renderItem={({ item }) => {
          const own = Number(item.user_id) === Number(user?.id);
          return (
            <View style={[styles.bubble, own && styles.own]}>
              <Text style={styles.name}>{item.user_name}</Text>
              <Text style={styles.message}>{item.message}</Text>
              <View style={styles.meta}>
                <Text style={styles.time}>
                  {formatMessageTime(item.created_at)}
                  {item.edited_at ? ' · edited' : ''}
                </Text>
                {canChange(item) && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      onPress={() => {
                        setEditing(item);
                        setText(item.message);
                      }}
                    >
                      <Pencil size={15} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => remove(item)}>
                      <Trash2 size={15} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                )}
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
      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          onFocus={() =>
            setTimeout(() => list.current?.scrollToEnd({ animated: true }), 250)
          }
          placeholder="Message the plant team"
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
  name: { fontWeight: '700', fontSize: 12, color: COLORS.primary },
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
