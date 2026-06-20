import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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
import { C, CARD_SHADOW, R, S } from "@/src/theme/colors";

const PHOTO_EMOJI: Record<string, string> = {
  "Kitchen": "🍳",
  "Bedroom/Room": "🛏️",
  "Bedroom": "🛏️",
  "Bathroom": "🚿",
  "Hall/Living area": "🏠",
  "Hall": "🏠",
  "Balcony": "🌅",
  "Other": "📷",
};

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
      <Ionicons name="close" size={18} color={C.onSurfaceSecondary} />
    </AnimatedPressable>
  );
}

export default function Matches() {
  const router = useRouter();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<any | null>(null);

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
          <Ionicons name="heart-outline" size={64} color={C.borderStrong} />
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySub}>Head to Discover and start swiping!</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => m.match_id}
          contentContainerStyle={{ padding: S.lg, gap: S.lg }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={[styles.card, CARD_SHADOW]}>
              <UnmatchButton matchId={item.match_id} onPress={() => setConfirmId(item.match_id)} />

              <Avatar name={item.user.name} photo={item.user.photo} size={84} />
              <Text style={styles.name} numberOfLines={1}>{item.user.name}</Text>
              <View style={styles.compatRow}>
                <Ionicons name="flame" size={12} color={C.coral} />
                <Text style={styles.compatText}>
                  {item.user.compatibility != null ? `${item.user.compatibility}% match` : "New user"}
                </Text>
              </View>
              {item.user.shared?.length > 0 && (
                <Text style={styles.shared} numberOfLines={2}>
                  {item.user.shared.slice(0, 2).join(" · ")}
                </Text>
              )}
              <View style={styles.actions}>
                <PressableScale
                  testID={`view-profile-${item.match_id}`}
                  onPress={() => setProfileUser(item.user)}
                  style={[styles.actionBtn, styles.viewBtn]}
                >
                  <Ionicons name="person-outline" size={14} color={C.brand} />
                  <Text style={styles.viewBtnText}>View profile</Text>
                </PressableScale>
                <PressableScale
                  testID={`chat-${item.match_id}`}
                  onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.match_id, name: item.user.name } })}
                  style={[styles.actionBtn, styles.chatBtn]}
                >
                  <Ionicons name="chatbubble" size={14} color={C.onBrand} />
                  <Text style={styles.chatBtnText}>Chat</Text>
                </PressableScale>
              </View>
            </Animated.View>
          )}
        />
      )}

      <Modal visible={!!confirmId} transparent animationType="fade" onRequestClose={() => setConfirmId(null)}>
        <View style={styles.confirmBackdrop}>
          <View style={[styles.confirmBox, CARD_SHADOW]} testID="unmatch-confirm">
            <Ionicons name="alert-circle" size={36} color={C.error} />
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

      <ProfileModal user={profileUser} onClose={() => setProfileUser(null)} />
    </SafeAreaView>
  );
}

function ProfileModal({ user, onClose }: { user: any | null; onClose: () => void }) {
  return (
    <Modal visible={!!user} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0F0F1E" }} edges={["top", "bottom"]}>
        <View style={styles.pmHeader}>
          <Pressable onPress={onClose} testID="profile-modal-close" hitSlop={8}>
            <Ionicons name="close" size={26} color={C.onSurface} />
          </Pressable>
          <Text style={styles.pmTitle}>Profile</Text>
          <View style={{ width: 26 }} />
        </View>
        {user && (
          <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: S.xxxl }} testID="profile-modal">
            <View style={{ alignItems: "center", marginBottom: S.lg }}>
              <Avatar name={user.name} photo={user.photo} size={120} />
              <Text style={styles.pmName}>{user.name}, {user.age}</Text>
              <Text style={styles.pmMeta}>
                {user.occupation === "student" ? "Student" : "Professional"}
                {user.org ? ` · ${user.org}` : ""}
              </Text>
              {user.compatibility != null && (
                <View style={styles.pmCompat}>
                  <Ionicons name="flame" size={14} color={C.coral} />
                  <Text style={styles.pmCompatText}>{user.compatibility}% compatible</Text>
                </View>
              )}
            </View>

            {user.bio ? (
              <Section title="About">
                <Text style={styles.bio}>{user.bio}</Text>
              </Section>
            ) : null}

            <Section title="The basics">
              <Row icon="location-outline" label="From" value={user.hometown} />
              <Row icon="home-outline" label="Looking" value={user.listing_type === "has_place" ? "Has a place" : "Looking for a place"} />
              <Row icon="cash-outline" label="Budget" value={`₹${user.budget_min?.toLocaleString()}–${user.budget_max?.toLocaleString()}`} />
              <Row icon="navigate-outline" label="Localities" value={(user.localities || []).join(", ")} />
              <Row icon="calendar-outline" label="Move-in" value={user.move_in} />
              <Row icon="language-outline" label="Languages" value={(user.languages || []).join(", ")} />
            </Section>

            <Section title="Lifestyle">
              {Object.entries(user.lifestyle || {})
                .filter(([, v]) => v)
                .map(([k, v]) => <Row key={k} icon="sparkles-outline" label={k.replace(/_/g, " ")} value={String(v)} />)}
            </Section>

            {user.listing_type === "has_place" && (user.listing?.photos?.length || user.listing?.description) ? (
              <Section title="The place">
                {user.listing?.description && <Text style={styles.bio}>{user.listing.description}</Text>}
                {user.listing?.rent ? (
                  <Row icon="cash-outline" label="Rent" value={`₹${user.listing.rent.toLocaleString()} / month`} />
                ) : null}
                {user.listing?.furnished && <Row icon="cube-outline" label="Furnished" value={user.listing.furnished} />}
                {user.listing?.property_type && <Row icon="business-outline" label="Type" value={user.listing.property_type} />}
                {user.listing?.amenities?.length > 0 && (
                  <Row icon="checkmark-circle-outline" label="Amenities" value={user.listing.amenities.join(", ")} />
                )}

                {(user.listing?.photos || []).length > 0 && (
                  <>
                    <Text style={styles.photoSectionLabel}>Room photos</Text>
                    <View style={styles.photoGrid}>
                      {(user.listing.photos as any[]).map((p: any, i: number) => {
                        const emoji = PHOTO_EMOJI[p.label as keyof typeof PHOTO_EMOJI] ?? "🏠";
                        return (
                          <View key={i} style={styles.photoCard}>
                            <Image
                              source={{ uri: p.photo.startsWith("data:") ? p.photo : `data:image/jpeg;base64,${p.photo}` }}
                              style={styles.photoImg}
                              resizeMode="cover"
                            />
                            <View style={styles.photoLabel}>
                              <Text style={styles.photoLabelText}>{emoji} {p.label}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </>
                )}
              </Section>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
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
      <View style={styles.rowIcon}><Ionicons name={icon} size={16} color={C.onBrandTint} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: S.xl, paddingTop: S.md, paddingBottom: S.md },
  brandRow: { flexDirection: "row", alignItems: "center", gap: S.md },
  h1: { fontSize: 24, fontWeight: "900", color: "#FFFFFF", letterSpacing: 0.5 },
  sub: { fontSize: 13, color: C.onSurfaceTertiary, marginTop: 2 },
  card: {
    backgroundColor: "#1A1A2E", borderRadius: R.lg,
    padding: S.lg, alignItems: "center", gap: 6,
    borderWidth: 1.5, borderColor: "rgba(0,217,255,0.2)",
    shadowColor: "#00D9FF", shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  xBtn: {
    position: "absolute", top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(255,0,110,0.12)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.borderCoral, zIndex: 5,
  },
  name: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", marginTop: S.sm, letterSpacing: 0.3 },
  compatRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  compatText: { fontSize: 13, color: C.cyan, fontWeight: "800" },
  shared: { fontSize: 12, color: C.onSurfaceTertiary, textAlign: "center", marginTop: 4 },
  actions: { flexDirection: "row", gap: S.sm, marginTop: S.md, width: "100%" },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, paddingVertical: S.sm, borderRadius: R.pill, borderWidth: 1,
  },
  viewBtn: { borderColor: C.borderCyan, backgroundColor: "rgba(0,217,255,0.07)" },
  viewBtnText: { color: C.cyan, fontWeight: "700", fontSize: 13 },
  chatBtn: { borderColor: "#FF006E", backgroundColor: "#FF006E" },
  chatBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  empty: { textAlign: "center", color: C.onSurfaceTertiary, marginTop: 40 },
  emptyWrap: { alignItems: "center", padding: S.xxl, marginTop: 40 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#FFFFFF", marginTop: S.lg, letterSpacing: 0.5 },
  emptySub: { fontSize: 14, color: C.onSurfaceTertiary, marginTop: S.sm },

  confirmBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center", padding: S.xl },
  confirmBox: { backgroundColor: "#1A1A2E", padding: S.xl, borderRadius: R.lg, alignItems: "center", width: "100%", maxWidth: 360, borderWidth: 1, borderColor: C.borderCoral },
  confirmTitle: { fontSize: 20, fontWeight: "800", color: "#FFFFFF", marginTop: S.md },
  confirmText: { fontSize: 14, color: C.onSurfaceSecondary, textAlign: "center", marginTop: S.sm, lineHeight: 20 },
  confirmBtn: { flex: 1, paddingVertical: S.md, borderRadius: R.pill, alignItems: "center" },
  confirmCancel: { backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: C.border },
  confirmCancelText: { color: "#FFFFFF", fontWeight: "700" },
  confirmDestructive: { backgroundColor: "#FF006E" },
  confirmDestructiveText: { color: "#FFFFFF", fontWeight: "700" },

  pmHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: S.lg, paddingVertical: S.md,
    borderBottomWidth: 1, borderBottomColor: C.borderCyan,
  },
  pmTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  pmName: { fontSize: 24, fontWeight: "900", color: "#FFFFFF", marginTop: S.md, letterSpacing: 0.3 },
  pmMeta: { fontSize: 14, color: C.onSurfaceSecondary, marginTop: 2 },
  pmCompat: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(0,217,255,0.12)", paddingHorizontal: S.md, paddingVertical: 4,
    borderRadius: R.pill, marginTop: S.md, borderWidth: 1, borderColor: C.borderCyan,
  },
  pmCompatText: { color: C.cyan, fontWeight: "800", fontSize: 13 },
  sectionTitle: { fontSize: 12, color: C.onSurfaceTertiary, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: S.sm },
  bio: { fontSize: 14, color: C.onSurfaceSecondary, lineHeight: 20, fontStyle: "italic", marginBottom: S.sm },
  row: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: 6 },
  rowIcon: { width: 32, height: 32, borderRadius: R.sm, backgroundColor: "rgba(0,217,255,0.1)", alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 12, color: C.onSurfaceTertiary, textTransform: "capitalize" },
  rowValue: { fontSize: 15, color: "#FFFFFF", fontWeight: "600" },
  photoSectionLabel: {
    fontSize: 12, color: C.cyan, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 0.8,
    marginTop: S.lg, marginBottom: S.sm,
  },
  photoGrid: { gap: S.md, marginTop: S.sm },
  photoCard: {
    width: "100%", aspectRatio: 4 / 3,
    borderRadius: R.md, overflow: "hidden",
    backgroundColor: "#1A1A2E",
    borderWidth: 1.5, borderColor: C.borderCyan,
    shadowColor: "#00D9FF", shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  photoImg: { width: "100%", height: "100%" },
  photoLabel: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingVertical: S.sm, paddingHorizontal: S.md,
  },
  photoLabelText: { color: C.cyan, fontWeight: "700", fontSize: 14 },
});
