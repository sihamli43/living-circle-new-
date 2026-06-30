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
  safe: { flex: 1, backgroundColor: "#0F0F1E" },
  header: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    paddingHorizontal: S.lg, paddingVertical: S.md,
    borderBottomWidth: 1, borderBottomColor: "rgba(0,217,255,0.2)",
    backgroundColor: "#0F0F1E",
  },
  locationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,217,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.4)",
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
    backgroundColor: "rgba(106,5,114,0.25)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(168,85,247,0.4)",
  },
  botBannerEmoji: { fontSize: 22 },
  botBannerTitle: { color: "#C084FC", fontWeight: "800", fontSize: 13, letterSpacing: 0.2 },
  botBannerSub: { color: "rgba(192,132,252,0.7)", fontSize: 11, marginTop: 2 },
  headerName: { fontSize: 16, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.3 },
  localityCtx: { fontSize: 12, color: C.cyan, fontWeight: "600", marginTop: 2 },
  headerSub: { fontSize: 12, color: C.cyan, fontWeight: "600", marginTop: 2 },
  safetyBanner: {
    flexDirection: "row", alignItems: "center", gap: S.sm,
    backgroundColor: "rgba(255,0,110,0.1)",
    paddingHorizontal: S.lg, paddingVertical: S.md,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,0,110,0.25)",
  },
  safetyBannerText: {
    flex: 1, fontSize: 12, color: "#FF99C2", lineHeight: 17, fontWeight: "500",
  },
  bubbleWrap: { maxWidth: "78%" },
  bubble: { paddingHorizontal: S.lg, paddingVertical: S.md, borderRadius: R.md },
  bubbleMine: {
    backgroundColor: "rgba(0,217,255,0.15)", borderBottomRightRadius: 4,
    borderWidth: 1, borderColor: "rgba(0,217,255,0.35)",
  },
  bubbleTheirs: {
    backgroundColor: "rgba(255,255,255,0.06)", borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  bubbleText: { fontSize: 15, color: "#FFFFFF", lineHeight: 20 },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: S.md,
    paddingHorizontal: S.lg, paddingVertical: S.md,
    borderTopWidth: 1, borderTopColor: "rgba(0,217,255,0.2)", backgroundColor: "#0F0F1E",
  },
  input: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: R.lg,
    paddingHorizontal: S.lg, paddingVertical: S.md, fontSize: 15, color: "#FFFFFF",
    maxHeight: 100, borderWidth: 1, borderColor: C.borderCyan,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#FF006E", alignItems: "center", justifyContent: "center",
    shadowColor: "#FF006E", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 6,
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "flex-end", padding: S.lg, paddingTop: 80 },
  menu: { backgroundColor: "#1A1A2E", borderRadius: R.md, padding: S.sm, minWidth: 200, borderWidth: 1, borderColor: C.borderCyan, shadowColor: "#00D9FF", shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.md, paddingHorizontal: S.md },
  menuText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
});
