import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { Avatar } from "@/src/components/Avatar";
import { C, R, S } from "@/src/theme/colors";

function formatTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export default function Messages() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const m = await api.matches();
      setItems(m);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.h1}>Messages</Text>
      </View>
      {loading ? (
        <Text style={styles.empty}>Loading…</Text>
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap} testID="messages-empty">
          <Ionicons name="chatbubbles-outline" size={64} color={C.borderStrong} />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySub}>Match with someone to start chatting!</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.match_id}
          contentContainerStyle={{ paddingVertical: S.sm }}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          renderItem={({ item }) => (
            <Pressable
              testID={`chat-item-${item.match_id}`}
              style={styles.row}
              onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.match_id, name: item.user.name } })}
            >
              <Avatar name={item.user.name} photo={item.user.photo} size={56} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={styles.name}>{item.user.name}</Text>
                  <Text style={styles.time}>{formatTime(item.last_message?.at || item.created_at)}</Text>
                </View>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.last_message?.text || (item.user.compatibility != null ? `${item.user.compatibility}% match — say hi 👋` : "New match — say hi 👋")}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.surface },
  header: { paddingHorizontal: S.xl, paddingTop: S.md, paddingBottom: S.md },
  h1: { fontSize: 28, fontWeight: "800", color: C.onSurface },
  row: { flexDirection: "row", alignItems: "center", gap: S.lg, paddingHorizontal: S.xl, paddingVertical: S.md },
  divider: { height: 1, backgroundColor: C.border, marginLeft: S.xl + 56 + S.lg },
  name: { fontSize: 16, fontWeight: "700", color: C.onSurface },
  preview: { fontSize: 13, color: C.onSurfaceSecondary, marginTop: 2 },
  time: { fontSize: 12, color: C.onSurfaceTertiary },
  empty: { textAlign: "center", color: C.onSurfaceSecondary, marginTop: 40 },
  emptyWrap: { alignItems: "center", padding: S.xxl, marginTop: 40 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: C.onSurface, marginTop: S.lg },
  emptySub: { fontSize: 14, color: C.onSurfaceSecondary, marginTop: S.sm },
});
