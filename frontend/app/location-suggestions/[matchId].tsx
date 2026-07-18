import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/src/api/client";
import { C, R, S } from "@/src/theme/colors";

interface Suggestion {
  name: string;
  avg_rent: number;
  vibe: string;
  safety_score: number;
  amenities: string[];
  score: number;
  home_distance_km_me: number | null;
  home_distance_km_match: number | null;
  commute_min_me: number | null;
  commute_min_match: number | null;
}

function NeighborhoodCard({ item, rank }: { item: Suggestion; rank: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankBadgeText}>#{rank}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardVibe}>{item.vibe}</Text>
        </View>
        <View style={styles.scoreWrap}>
          <Text style={styles.scoreNum}>{item.score}</Text>
          <Text style={styles.scoreLabel}>match</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statEmoji}>💰</Text>
          <Text style={styles.statText}>₹{item.avg_rent.toLocaleString()}/mo avg</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statEmoji}>🛡️</Text>
          <Text style={styles.statText}>{item.safety_score}/10 safety</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        {item.commute_min_me != null && (
          <View style={styles.stat}>
            <Text style={styles.statEmoji}>🚗</Text>
            <Text style={styles.statText}>You: {item.commute_min_me} min</Text>
          </View>
        )}
        {item.commute_min_match != null && (
          <View style={styles.stat}>
            <Text style={styles.statEmoji}>🚗</Text>
            <Text style={styles.statText}>Them: {item.commute_min_match} min</Text>
          </View>
        )}
      </View>

      <View style={styles.amenityRow}>
        {item.amenities.map((a, i) => (
          <View key={i} style={styles.amenityChip}>
            <Text style={styles.amenityChipText}>{a}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function LocationSuggestionsScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const [data, setData] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setData(await api.suggestLocations(matchId));
      } catch (e: any) {
        setError(e.message ?? "Could not load suggestions");
      }
    })();
  }, [matchId]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>🏘️ Best areas for both of you</Text>
          <Text style={styles.headerSub}>Ranked by commute, rent &amp; safety</Text>
        </View>
      </View>

      {!data && !error ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.cyan} />
          <Text style={styles.loadingText}>Finding the best spots…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 40 }}>🏘️</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: S.xxxl }}>
          {(data || []).map((item, i) => (
            <NeighborhoodCard key={item.name} item={item} rank={i + 1} />
          ))}
          <Text style={styles.disclaimer}>
            Estimates based on locality distance &amp; typical rent — not a substitute for visiting in person.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  loadingText: { color: C.onSurfaceSecondary, fontSize: 15, fontWeight: "600" },
  errorText: { color: C.onSurfaceSecondary, fontSize: 15, textAlign: "center" },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16,
    backgroundColor: C.surfaceSecondary,
    borderBottomWidth: 1, borderBottomColor: C.borderCyan,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.surfaceGlass, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: C.onSurface, fontSize: 16, fontWeight: "800" },
  headerSub: { color: C.onSurfaceTertiary, fontSize: 12, marginTop: 2 },

  card: {
    backgroundColor: C.surfaceSecondary, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border, padding: S.lg, marginBottom: S.md, gap: S.sm,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: S.md },
  rankBadge: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: C.brandTint,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.brand,
  },
  rankBadgeText: { color: C.brand, fontWeight: "900", fontSize: 13 },
  cardName: { color: C.onSurface, fontSize: 17, fontWeight: "800" },
  cardVibe: { color: C.onSurfaceTertiary, fontSize: 12, marginTop: 1 },
  scoreWrap: { alignItems: "center" },
  scoreNum: { color: C.success, fontSize: 20, fontWeight: "900" },
  scoreLabel: { color: C.onSurfaceTertiary, fontSize: 10 },
  statsRow: { flexDirection: "row", gap: S.lg },
  stat: { flexDirection: "row", alignItems: "center", gap: 5 },
  statEmoji: { fontSize: 14 },
  statText: { color: C.onSurfaceSecondary, fontSize: 12, fontWeight: "600" },
  amenityRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  amenityChip: {
    backgroundColor: C.surfaceTertiary, borderRadius: R.pill,
    paddingHorizontal: S.md, paddingVertical: 4, borderWidth: 1, borderColor: C.border,
  },
  amenityChipText: { color: C.onSurfaceSecondary, fontSize: 11, fontWeight: "600" },
  disclaimer: { color: C.onSurfaceTertiary, fontSize: 11, textAlign: "center", marginTop: S.lg, lineHeight: 16 },
});
