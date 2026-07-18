import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  FlatList, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { api } from "@/src/api/client";
import { AppLogo } from "@/src/components/AppLogo";
import { Avatar } from "@/src/components/Avatar";
import { PressableScale } from "@/src/components/PressableScale";
import { LUXE, LUXE_SHADOW, R, S } from "@/src/theme/colors";

const LIFESTYLE_META: Record<string, { emoji: string; label: string; color: string }> = {
  food:               { emoji: "🍽️", label: "Food", color: LUXE.coral },
  smoking:            { emoji: "🚭", label: "Smoking", color: LUXE.teal },
  drinking:           { emoji: "🍺", label: "Drinking", color: LUXE.gold },
  sleep:              { emoji: "🌙", label: "Sleep", color: LUXE.coral },
  cleanliness:        { emoji: "🧹", label: "Cleanliness", color: LUXE.teal },
  guests:             { emoji: "🤝", label: "Guests", color: LUXE.gold },
  pets:               { emoji: "🐾", label: "Pets", color: LUXE.coral },
  religion:           { emoji: "🙏", label: "Religion", color: LUXE.teal },
  work_timing:        { emoji: "⏰", label: "Work hours", color: LUXE.gold },
  cooking:            { emoji: "👨‍🍳", label: "Cooking", color: LUXE.coral },
  noise:              { emoji: "🎵", label: "Noise level", color: LUXE.teal },
  relationship_status:{ emoji: "💑", label: "Relationship", color: LUXE.gold },
  overnight_guests:   { emoji: "🛏️", label: "Overnight guests", color: LUXE.coral },
  sharing_habits:     { emoji: "🤲", label: "Sharing", color: LUXE.teal },
};

const CHIP_COLORS = [LUXE.coral, LUXE.teal, LUXE.goldDeep];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function UnmatchButton({ matchId, onPress }: { matchId: string; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      testID={`unmatch-${matchId}`}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.95, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
      style={[styles.xBtn, animStyle]}
      hitSlop={8}
    >
      <Ionicons name="close" size={18} color={LUXE.textSecondary} />
    </AnimatedPressable>
  );
}

function MatchCard({
  item,
  onUnmatch,
  onViewProfile,
  onViewLocation,
  onChat,
}: {
  item: any;
  onUnmatch: () => void;
  onViewProfile: () => void;
  onViewLocation: () => void;
  onChat: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const user = item.user;

  return (
    <View
      // @ts-ignore — web-only hover handlers
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={[
        styles.card,
        LUXE_SHADOW,
        Platform.OS === "web" && hovered ? ({ boxShadow: "0 16px 40px rgba(21,19,28,0.16)" } as any) : {},
      ]}
    >
      <UnmatchButton matchId={item.match_id} onPress={onUnmatch} />

      <Avatar name={user.name} photo={user.photo} size={96} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "100%" }}>
        <Text style={styles.name} numberOfLines={1}>{user.name}, {user.age}</Text>
      </View>
      <View style={styles.compatBadge}>
        <Text style={styles.compatText}>
          {user.compatibility != null ? `${user.compatibility}%` : "New"}
        </Text>
        <Text style={styles.compatTextLabel}>
          {user.compatibility != null ? "compatible" : "user"}
        </Text>
      </View>
      {user.shared?.length > 0 && (
        <View style={styles.sharedChips}>
          {user.shared.slice(0, 3).map((s: string, i: number) => (
            <View key={i} style={[styles.sharedChip, { borderColor: CHIP_COLORS[i % 3] }]}>
              <Text style={[styles.sharedChipText, { color: CHIP_COLORS[i % 3] }]} numberOfLines={1}>{s}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.actions}>
        <PressableScale
          testID={`view-profile-${item.match_id}`}
          onPress={onViewProfile}
          style={[styles.actionBtn, styles.viewBtn]}
        >
          <Ionicons name="person-outline" size={14} color={LUXE.text} />
          <Text style={styles.viewBtnText}>Profile</Text>
        </PressableScale>
        <PressableScale
          testID={`location-${item.match_id}`}
          onPress={onViewLocation}
          style={[styles.actionBtn, styles.mapBtn]}
        >
          <Text style={{ fontSize: 13 }}>📍</Text>
          <Text style={styles.mapBtnText}>Map</Text>
        </PressableScale>
        <PressableScale
          testID={`chat-${item.match_id}`}
          onPress={onChat}
          style={{ flex: 1 }}
        >
          <LinearGradient colors={[LUXE.coral, LUXE.teal]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.chatBtn}>
            <Ionicons name="chatbubble" size={14} color="#FFFFFF" />
            <Text style={styles.chatBtnText}>Chat</Text>
          </LinearGradient>
        </PressableScale>
      </View>
    </View>
  );
}

export default function Matches() {
  const router = useRouter();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [profileMatch, setProfileMatch] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMatches(await api.matches());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const doUnmatch = async () => {
    if (!confirmId) return;
    const id = confirmId;
    setConfirmId(null);
    setMatches((p) => p.filter((m) => m.match_id !== id));
    try { await api.unmatch(id); } catch { load(); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <AppLogo size={28} />
          <View>
            <Text style={styles.h1}>Your Matches</Text>
            <Text style={styles.sub}>{matches.length} mutual {matches.length === 1 ? "match" : "matches"}</Text>
          </View>
        </View>
      </View>
      {loading ? (
        <Text style={styles.empty}>Loading…</Text>
      ) : matches.length === 0 ? (
        <View style={styles.emptyWrap} testID="matches-empty">
          <Ionicons name="heart-outline" size={64} color={LUXE.borderStrong} />
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySub}>Head to Discover and start swiping!</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => m.match_id}
          contentContainerStyle={{ padding: S.lg, gap: S.lg }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
              <MatchCard
                item={item}
                onUnmatch={() => setConfirmId(item.match_id)}
                onViewProfile={() => setProfileMatch(item)}
                onViewLocation={() => router.push(`/location/${item.match_id}`)}
                onChat={() => router.push({ pathname: "/chat/[id]", params: { id: item.match_id, name: item.user.name } })}
              />
            </Animated.View>
          )}
        />
      )}

      <Modal visible={!!confirmId} transparent animationType="fade" onRequestClose={() => setConfirmId(null)}>
        <View style={styles.confirmBackdrop}>
          <View style={[styles.confirmBox, LUXE_SHADOW]} testID="unmatch-confirm">
            <Ionicons name="alert-circle" size={36} color={LUXE.error} />
            <Text style={styles.confirmTitle}>Unmatch?</Text>
            <Text style={styles.confirmText}>
              Are you sure you want to unmatch? This action can&apos;t be undone — your chat history will be deleted too.
            </Text>
            <View style={{ flexDirection: "row", gap: S.md, marginTop: S.lg, width: "100%" }}>
              <PressableScale testID="unmatch-cancel" onPress={() => setConfirmId(null)} style={[styles.confirmBtn, styles.confirmCancel]}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </PressableScale>
              <PressableScale testID="unmatch-confirm-btn" onPress={doUnmatch} style={[styles.confirmBtn, styles.confirmDestructive]}>
                <Text style={styles.confirmDestructiveText}>Unmatch</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>

      <ProfileModal
        match={profileMatch}
        onClose={() => setProfileMatch(null)}
        onMessage={() => {
          if (!profileMatch) return;
          router.push({ pathname: "/chat/[id]", params: { id: profileMatch.match_id, name: profileMatch.user.name } });
          setProfileMatch(null);
        }}
        onViewLocation={() => {
          if (!profileMatch) return;
          router.push(`/location/${profileMatch.match_id}`);
          setProfileMatch(null);
        }}
      />
    </SafeAreaView>
  );
}

function ProfileModal({
  match, onClose, onMessage, onViewLocation,
}: { match: any | null; onClose: () => void; onMessage: () => void; onViewLocation: () => void }) {
  const user = match?.user;
  return (
    <Modal visible={!!match} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: LUXE.bg }}>
        {user && (
          <ScrollView contentContainerStyle={{ paddingBottom: S.xxxl }} testID="profile-modal">
            {/* ── Hero photo ── */}
            <View style={styles.pmHero}>
              {user.photo ? (
                <Image
                  source={{ uri: user.photo.startsWith("data:") ? user.photo : `data:image/jpeg;base64,${user.photo}` }}
                  style={StyleSheet.absoluteFill as any}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient colors={[LUXE.coral, LUXE.teal]} style={StyleSheet.absoluteFill} />
              )}
              <LinearGradient colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.45)"]} style={StyleSheet.absoluteFill} />
              <SafeAreaView edges={["top"]} style={styles.pmHeroTop}>
                <Pressable onPress={onClose} testID="profile-modal-close" hitSlop={8} style={styles.pmBackBtn}>
                  <Ionicons name="close" size={22} color="#FFFFFF" />
                </Pressable>
              </SafeAreaView>
            </View>

            {/* ── White content card ── */}
            <View style={[styles.pmCard, LUXE_SHADOW]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Text style={styles.pmName}>{user.name}, {user.age}</Text>
              </View>
              <Text style={styles.pmLocation}>
                {user.current_city
                  ? `🏙️ ${[user.current_locality, user.current_city].filter(Boolean).join(", ")}`
                  : user.city && user.state ? `${user.city}, ${user.state}` : user.hometown || ""}
              </Text>
              <Text style={styles.pmMeta}>
                {user.occupation === "student" ? "Student" : "Professional"}
                {user.org ? ` · ${user.org}` : ""}
              </Text>
              {user.compatibility != null && (
                <View style={styles.pmCompat}>
                  <Text style={styles.pmCompatText}>{user.compatibility}% compatible</Text>
                </View>
              )}

              {user.bio ? (
                <Section title="About">
                  <Text style={styles.bio}>{user.bio}</Text>
                </Section>
              ) : null}

              <Section title="The basics">
                <Row icon="location-outline" label="Currently living in" value={user.current_city ? [user.current_locality, user.current_city, user.current_state].filter(Boolean).join(", ") : "—"} />
                <Row icon="home-outline" label="Originally from" value={user.city && user.state ? `${user.city}, ${user.state}` : user.city || user.state || user.hometown} />
                <Row icon="home-outline" label="Looking" value={user.listing_type === "has_place" ? "Has a place" : "Looking for a place"} />
                <Row icon="cash-outline" label="Budget" value={`₹${user.budget_min?.toLocaleString()}–${user.budget_max?.toLocaleString()}`} />
                <Row icon="navigate-outline" label="Localities" value={(user.localities || []).join(", ")} />
                <Row icon="calendar-outline" label="Move-in" value={user.move_in} />
                <Row icon="language-outline" label="Languages" value={(user.languages || []).join(", ")} />
              </Section>

              <Section title="Lifestyle">
                <View style={styles.lifestyleGrid}>
                  {Object.entries(user.lifestyle || {})
                    .filter(([, v]) => v)
                    .map(([k, v]) => {
                      const meta = LIFESTYLE_META[k] ?? { emoji: "✨", label: k.replace(/_/g, " "), color: LUXE.coral };
                      return (
                        <View key={k} style={[styles.lifestyleTile, { borderColor: meta.color + "40" }]}>
                          <Text style={styles.lifestyleTileEmoji}>{meta.emoji}</Text>
                          <Text style={[styles.lifestyleTileLabel, { color: meta.color }]} numberOfLines={1}>{meta.label}</Text>
                          <Text style={styles.lifestyleTileValue} numberOfLines={2}>{String(v)}</Text>
                        </View>
                      );
                    })}
                </View>
              </Section>

            </View>
          </ScrollView>
        )}

        {/* ── Sticky action bar ── */}
        {user && (
          <View style={styles.pmActionBar}>
            <PressableScale testID="profile-modal-location" onPress={onViewLocation} style={styles.pmSecondaryBtn}>
              <Text style={{ fontSize: 15 }}>📍</Text>
              <Text style={styles.pmSecondaryBtnText}>View Location</Text>
            </PressableScale>
            <PressableScale testID="profile-modal-message" onPress={onMessage} style={{ flex: 1 }}>
              <LinearGradient colors={[LUXE.coral, LUXE.teal]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pmPrimaryBtn}>
                <Ionicons name="chatbubble" size={16} color="#FFFFFF" />
                <Text style={styles.pmPrimaryBtnText}>Message</Text>
              </LinearGradient>
            </PressableScale>
          </View>
        )}
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <View style={{ marginTop: S.xl }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap: 8 }}>{children}</View>
    </View>
  );
}

function Row({ icon, label, value }: { icon: any; label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}><Ionicons name={icon} size={16} color={LUXE.coral} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: LUXE.bg },
  header: { paddingHorizontal: S.xl, paddingTop: S.md, paddingBottom: S.md },
  brandRow: { flexDirection: "row", alignItems: "center", gap: S.md },
  h1: { fontSize: 24, fontWeight: "900", color: LUXE.text, letterSpacing: 0.5 },
  sub: { fontSize: 13, color: LUXE.textTertiary, marginTop: 2 },
  card: {
    backgroundColor: LUXE.card, borderRadius: R.lg,
    padding: S.lg, alignItems: "center", gap: 6,
    borderWidth: 1, borderColor: LUXE.cardBorder,
  },
  xBtn: {
    position: "absolute", top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: LUXE.coralTint, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: LUXE.border, zIndex: 5,
  },
  name: { fontSize: 18, fontWeight: "800", color: LUXE.text, marginTop: S.sm, letterSpacing: 0.3 },
  compatBadge: {
    flexDirection: "row", alignItems: "baseline", gap: 4,
    backgroundColor: LUXE.coralTint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill,
    borderWidth: 1, borderColor: LUXE.coral,
  },
  compatText: { fontSize: 14, color: LUXE.coral, fontWeight: "900" },
  compatTextLabel: { fontSize: 11, color: LUXE.coral, fontWeight: "700" },
  sharedChips: {
    flexDirection: "row", flexWrap: "wrap", justifyContent: "center",
    gap: 6, marginTop: S.sm, paddingHorizontal: S.sm,
  },
  sharedChip: {
    backgroundColor: LUXE.bg,
    borderWidth: 1,
    borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 4,
    maxWidth: 160,
  },
  sharedChipText: { fontSize: 11, fontWeight: "700" },
  lifestyleGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: S.md, marginTop: S.sm,
  },
  lifestyleTile: {
    width: "47%",
    backgroundColor: LUXE.bg,
    borderWidth: 1,
    borderRadius: R.md, padding: S.md,
    gap: 4,
  },
  lifestyleTileEmoji: { fontSize: 22 },
  lifestyleTileLabel: {
    fontSize: 11, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  lifestyleTileValue: { fontSize: 14, color: LUXE.text, fontWeight: "600" },
  actions: { flexDirection: "row", gap: S.sm, marginTop: S.md, width: "100%" },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, paddingVertical: S.sm, borderRadius: R.pill, borderWidth: 1,
  },
  viewBtn: { borderColor: LUXE.border, backgroundColor: LUXE.bg },
  viewBtnText: { color: LUXE.text, fontWeight: "700", fontSize: 13 },
  mapBtn: { borderColor: LUXE.goldDeep, backgroundColor: LUXE.goldTint },
  mapBtnText: { color: LUXE.goldDeep, fontWeight: "700", fontSize: 13 },
  chatBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: S.sm, borderRadius: R.pill },
  chatBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  empty: { textAlign: "center", color: LUXE.textTertiary, marginTop: 40 },
  emptyWrap: { alignItems: "center", padding: S.xxl, marginTop: 40 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: LUXE.text, marginTop: S.lg, letterSpacing: 0.5 },
  emptySub: { fontSize: 14, color: LUXE.textSecondary, marginTop: S.sm },

  confirmBackdrop: { flex: 1, backgroundColor: "rgba(21,19,28,0.6)", alignItems: "center", justifyContent: "center", padding: S.xl },
  confirmBox: { backgroundColor: LUXE.card, padding: S.xl, borderRadius: R.lg, alignItems: "center", width: "100%", maxWidth: 360 },
  confirmTitle: { fontSize: 20, fontWeight: "800", color: LUXE.text, marginTop: S.md },
  confirmText: { fontSize: 14, color: LUXE.textSecondary, textAlign: "center", marginTop: S.sm, lineHeight: 20 },
  confirmBtn: { flex: 1, paddingVertical: S.md, borderRadius: R.pill, alignItems: "center" },
  confirmCancel: { backgroundColor: LUXE.bg, borderWidth: 1, borderColor: LUXE.border },
  confirmCancelText: { color: LUXE.text, fontWeight: "700" },
  confirmDestructive: { backgroundColor: LUXE.coral },
  confirmDestructiveText: { color: "#FFFFFF", fontWeight: "700" },

  pmHero: { height: 280, justifyContent: "flex-start" },
  pmHeroTop: { paddingHorizontal: S.lg },
  pmBackBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center", justifyContent: "center", marginTop: S.sm,
  },

  pmCard: {
    backgroundColor: LUXE.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    marginTop: -20, padding: S.xl, minHeight: 200, gap: 4,
  },
  pmName: { fontSize: 26, fontWeight: "900", color: LUXE.text, letterSpacing: 0.3 },
  pmLocation: { fontSize: 14, color: LUXE.textSecondary, fontWeight: "600" },
  pmMeta: { fontSize: 14, color: LUXE.textSecondary, marginTop: 2 },
  pmCompat: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
    backgroundColor: LUXE.coralTint, paddingHorizontal: S.md, paddingVertical: 4,
    borderRadius: R.pill, marginTop: S.md, borderWidth: 1, borderColor: LUXE.coral,
  },
  pmCompatText: { color: LUXE.coral, fontWeight: "800", fontSize: 13 },
  sectionTitle: { fontSize: 12, color: LUXE.textTertiary, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: S.sm },
  bio: { fontSize: 14, color: LUXE.textSecondary, lineHeight: 20, fontStyle: "italic", marginBottom: S.sm },
  row: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: 6 },
  rowIcon: { width: 32, height: 32, borderRadius: R.sm, backgroundColor: LUXE.coralTint, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 12, color: LUXE.textTertiary, textTransform: "capitalize" },
  rowValue: { fontSize: 15, color: LUXE.text, fontWeight: "600" },

  pmActionBar: {
    flexDirection: "row", gap: S.md, padding: S.lg,
    borderTopWidth: 1, borderTopColor: LUXE.border, backgroundColor: LUXE.card,
  },
  pmSecondaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingHorizontal: S.lg, borderRadius: R.pill, borderWidth: 1.5, borderColor: LUXE.coral,
  },
  pmSecondaryBtnText: { color: LUXE.coral, fontWeight: "700", fontSize: 14 },
  pmPrimaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: S.md, borderRadius: R.pill,
  },
  pmPrimaryBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
});
