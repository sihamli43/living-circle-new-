import { useCallback, useEffect, useRef, useState } from "react";
import { storage } from "@/src/utils/storage";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, chatWsUrl } from "@/src/api/client";
import { Avatar } from "@/src/components/Avatar";
import { C, R, S } from "@/src/theme/colors";

const TYPING_IDLE_MS = 2000;

export default function Chat() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [other, setOther] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [text, setText] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Persist banner dismissal per chat session.
  useEffect(() => {
    storage.getItem<boolean>(`safety_banner_${id}`, false).then((v) => {
      if (v) setBannerDismissed(true);
    });
  }, [id]);
  const listRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial load: message history + the other participant's profile. Live
  // updates after this come from the WebSocket, not repeated polling.
  const load = useCallback(async () => {
    try {
      const [msgs, meMe, list] = await Promise.all([
        api.messages(String(id)),
        api.me(),
        api.matches(),
      ]);
      setMessages(msgs);
      setMe(meMe);
      const m = list.find((x: any) => x.match_id === id);
      if (m) setOther(m.user);
    } catch {}
  }, [id]);

  const sendWs = (payload: object) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  };

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;

    const connect = async () => {
      const url = await chatWsUrl(String(id));
      if (cancelled) return;
      ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data.type === "message") {
            setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
          } else if (data.type === "typing") {
            setOtherTyping(true);
            if (typingStopTimeoutRef.current) clearTimeout(typingStopTimeoutRef.current);
            typingStopTimeoutRef.current = setTimeout(() => setOtherTyping(false), TYPING_IDLE_MS + 500);
          } else if (data.type === "typing_stop") {
            setOtherTyping(false);
          } else if (data.type === "read") {
            setReadIds((prev) => new Set(prev).add(data.message_id));
          }
        } catch {}
      };
    };
    connect();

    return () => {
      cancelled = true;
      ws?.close();
      wsRef.current = null;
    };
  }, [id]);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    // Tell the other participant we've seen their latest message.
    const last = messages[messages.length - 1];
    if (last && me && last.sender_id !== me.user_id) {
      sendWs({ type: "read", message_id: last.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, me]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    sendWs({ type: "typing_stop" });
    try {
      const msg = await api.sendMessage(String(id), t);
      setMessages((p) => [...p, msg]);
    } catch {}
  };

  const onChangeText = (t: string) => {
    setText(t);
    if (!typingTimeoutRef.current) {
      sendWs({ type: "typing" });
    } else {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
      sendWs({ type: "typing_stop" });
    }, TYPING_IDLE_MS);
  };

  const block = async () => {
    if (!other) return;
    await api.block(other.user_id);
    setShowMenu(false);
    router.back();
  };

  const report = async () => {
    if (!other) return;
    await api.report(other.user_id);
    setShowMenu(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} testID="chat-back">
          <Ionicons name="chevron-back" size={26} color={C.onSurface} />
        </Pressable>
        <Avatar name={other?.name || String(name)} photo={other?.photo} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{other?.name || name}</Text>
          {other?.localities?.length ? (
            <Text style={styles.localityCtx} testID="chat-locality">
              Matches with someone in {other.localities[0]}
            </Text>
          ) : null}
          {other?.compatibility != null && (
            <Text style={styles.headerSub} testID="chat-compat">
              {other.compatibility}% compatible
              {other.shared?.length ? ` · ${other.shared[0]}` : ""}
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => router.push(`/location/${id}`)}
          testID="chat-location"
          style={styles.locationBtn}
        >
          <Text style={styles.locationBtnText}>📍</Text>
        </Pressable>
        <Pressable onPress={() => setShowMenu(true)} testID="chat-menu">
          <Ionicons name="ellipsis-vertical" size={22} color={C.onSurface} />
        </Pressable>
      </View>

      {/* Bot banner */}
      {other?.is_bot && (
        <View style={styles.botBanner}>
          <Text style={styles.botBannerEmoji}>🤖</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.botBannerTitle}>Test Bot — All Features Enabled</Text>
            <Text style={styles.botBannerSub}>Messages are instant auto-replies. Maps, lifestyle & photos work normally.</Text>
          </View>
        </View>
      )}

      {/* Safety banner */}
      {!bannerDismissed && !other?.is_bot && (
        <View style={styles.safetyBanner}>
          <Ionicons name="shield-checkmark" size={15} color={C.coral} />
          <Text style={styles.safetyBannerText}>
            🛡️ Never share your phone, address, or bank details in chat
          </Text>
          <Pressable
            onPress={() => {
              setBannerDismissed(true);
              storage.setItem(`safety_banner_${id}`, true);
            }}
            hitSlop={8}
            testID="dismiss-safety-banner"
          >
            <Ionicons name="close" size={16} color={C.coral} />
          </Pressable>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: S.lg, gap: S.sm, paddingBottom: S.lg }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: C.onSurfaceTertiary, marginTop: 40 }}>
              You matched! Say hi to {other?.name || name} 👋
            </Text>
          }
          renderItem={({ item }) => {
            const mine = me && item.sender_id === me.user_id;
            return (
              <View style={[styles.bubbleWrap, mine ? { alignSelf: "flex-end" } : { alignSelf: "flex-start" }]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.bubbleText, mine && { color: C.onBrand }]}>{item.text}</Text>
                </View>
                {mine && (
                  <Text style={styles.readReceipt} testID={`read-${item.id}`}>
                    {readIds.has(item.id) ? "✓✓ Read" : "✓ Sent"}
                  </Text>
                )}
              </View>
            );
          }}
          ListFooterComponent={
            otherTyping ? (
              <View style={[styles.bubbleWrap, { alignSelf: "flex-start" }]} testID="typing-indicator">
                <View style={[styles.bubble, styles.bubbleTheirs]}>
                  <Text style={styles.bubbleText}>{other?.name || "They"} is typing…</Text>
                </View>
              </View>
            ) : null
          }
        />
        <View style={styles.inputBar}>
          <TextInput
            testID="chat-input"
            value={text}
            onChangeText={onChangeText}
            placeholder="Type a message…"
            placeholderTextColor={C.onSurfaceTertiary}
            style={styles.input}
            multiline
          />
          <Pressable testID="chat-send" onPress={send} style={styles.sendBtn} disabled={!text.trim()}>
            <Ionicons name="send" size={20} color={C.onBrand} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowMenu(false)}>
          <View style={styles.menu}>
            <Pressable style={styles.menuItem} onPress={report} testID="chat-report">
              <Ionicons name="flag-outline" size={20} color={C.warning} />
              <Text style={[styles.menuText, { color: C.warning }]}>Report user</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={block} testID="chat-block">
              <Ionicons name="ban-outline" size={20} color={C.error} />
              <Text style={[styles.menuText, { color: C.error }]}>Block user</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    paddingHorizontal: S.lg, paddingVertical: S.md,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  locationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(23,162,184,0.1)",
    borderWidth: 1,
    borderColor: "rgba(23,162,184,0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  locationBtnText: { fontSize: 18 },
  botBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(255,193,7,0.12)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,193,7,0.4)",
  },
  botBannerEmoji: { fontSize: 22 },
  botBannerTitle: { color: "#8A6200", fontWeight: "800", fontSize: 13, letterSpacing: 0.2 },
  botBannerSub: { color: "rgba(138,98,0,0.75)", fontSize: 11, marginTop: 2 },
  headerName: { fontSize: 16, fontWeight: "800", color: C.onSurface, letterSpacing: 0.3 },
  localityCtx: { fontSize: 12, color: C.cyan, fontWeight: "600", marginTop: 2 },
  headerSub: { fontSize: 12, color: C.cyan, fontWeight: "600", marginTop: 2 },
  safetyBanner: {
    flexDirection: "row", alignItems: "center", gap: S.sm,
    backgroundColor: "rgba(255,82,82,0.1)",
    paddingHorizontal: S.lg, paddingVertical: S.md,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,82,82,0.25)",
  },
  safetyBannerText: {
    flex: 1, fontSize: 12, color: C.coral, lineHeight: 17, fontWeight: "500",
  },
  bubbleWrap: { maxWidth: "78%" },
  bubble: { paddingHorizontal: S.lg, paddingVertical: S.md, borderRadius: R.md },
  bubbleMine: {
    backgroundColor: C.brand, borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: C.surfaceSecondary, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: C.border,
  },
  bubbleText: { fontSize: 15, color: C.onSurface, lineHeight: 20 },
  readReceipt: { fontSize: 10, color: C.onSurfaceTertiary, marginTop: 2, alignSelf: "flex-end" },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: S.md,
    paddingHorizontal: S.lg, paddingVertical: S.md,
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg,
  },
  input: {
    flex: 1, backgroundColor: C.surfaceSecondary, borderRadius: R.lg,
    paddingHorizontal: S.lg, paddingVertical: S.md, fontSize: 15, color: C.onSurface,
    maxHeight: 100, borderWidth: 1, borderColor: C.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.brand, alignItems: "center", justifyContent: "center",
    shadowColor: C.brand, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "flex-end", padding: S.lg, paddingTop: 80 },
  menu: { backgroundColor: C.surface, borderRadius: R.md, padding: S.sm, minWidth: 200, borderWidth: 1, borderColor: C.border, shadowColor: C.onSurface, shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.md, paddingHorizontal: S.md },
  menuText: { fontSize: 15, fontWeight: "600", color: C.onSurface },
});
