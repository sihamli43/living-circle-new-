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
import { api } from "@/src/api/client";
import { Avatar } from "@/src/components/Avatar";
import { C, R, S } from "@/src/theme/colors";

export default function Chat() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [other, setOther] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [text, setText] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Persist banner dismissal per chat session.
  useEffect(() => {
    storage.getItem<boolean>(`safety_banner_${id}`, false).then((v) => {
      if (v) setBannerDismissed(true);
    });
  }, [id]);
  const listRef = useRef<FlatList>(null);

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

  useEffect(() => {
    load();
    const t = setInterval(load, 3500);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    try {
      const msg = await api.sendMessage(String(id), t);
      setMessages((p) => [...p, msg]);
    } catch {}
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
        <Pressable onPress={() => setShowMenu(true)} testID="chat-menu">
          <Ionicons name="ellipsis-vertical" size={22} color={C.onSurface} />
        </Pressable>
      </View>

      {/* Safety banner */}
      {!bannerDismissed && (
        <View style={styles.safetyBanner}>
          <Ionicons name="shield-checkmark" size={15} color="#92400E" />
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
            <Ionicons name="close" size={16} color="#92400E" />
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
              </View>
            );
          }}
        />
        <View style={styles.inputBar}>
          <TextInput
            testID="chat-input"
            value={text}
            onChangeText={setText}
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
  safe: { flex: 1, backgroundColor: C.surface },
  header: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    paddingHorizontal: S.lg, paddingVertical: S.md,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerName: { fontSize: 16, fontWeight: "700", color: C.onSurface },
  localityCtx: { fontSize: 12, color: C.coral, fontWeight: "600", marginTop: 2 },
  headerSub: { fontSize: 12, color: C.brand, fontWeight: "600", marginTop: 2 },
  safetyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  safetyBannerText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
    lineHeight: 17,
    fontWeight: "500",
  },
  bubbleWrap: { maxWidth: "78%" },
  bubble: { paddingHorizontal: S.lg, paddingVertical: S.md, borderRadius: R.md },
  bubbleMine: { backgroundColor: C.brand, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: C.surfaceSecondary, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, color: C.onSurface, lineHeight: 20 },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: S.md,
    paddingHorizontal: S.lg, paddingVertical: S.md,
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface,
  },
  input: {
    flex: 1, backgroundColor: C.surfaceSecondary, borderRadius: R.lg,
    paddingHorizontal: S.lg, paddingVertical: S.md, fontSize: 15, color: C.onSurface,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.brand, alignItems: "center", justifyContent: "center",
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", alignItems: "flex-end", padding: S.lg, paddingTop: 80 },
  menu: { backgroundColor: C.surface, borderRadius: R.md, padding: S.sm, minWidth: 200, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.md, paddingHorizontal: S.md },
  menuText: { fontSize: 15, fontWeight: "600" },
});
