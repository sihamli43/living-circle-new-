import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { MatchCelebration } from "@/src/components/MatchCelebration";
import { MatchSafetyWarning } from "@/src/components/MatchSafetyWarning";
import { AppLogo } from "@/src/components/AppLogo";
import { PressableScale } from "@/src/components/PressableScale";
import { api } from "@/src/api/client";
import { Avatar } from "@/src/components/Avatar";
import { Chip, ChipRow } from "@/src/components/OnboardScreen";
import { ACTIVE_CITY, ACTIVE_LOCALITIES, C, CARD_SHADOW, R, S, paletteFor } from "@/src/theme/colors";

const { width: W, height: H } = Dimensions.get("window");
const SWIPE_THRESHOLD = W * 0.28;

type Profile = any;

function isBangaloreProfile(p: Profile) {
  const locs: string[] = p.localities || [];
  return (
    p.hometown === ACTIVE_CITY &&
    locs.some((l) => ACTIVE_LOCALITIES.includes(l))
  );
}

function Card({
  p,
  onSwipeDone,
  onTopOf,
  index,
}: {
  p: Profile;
  onSwipeDone: (id: string, dir: "like" | "pass") => void;
  onTopOf: boolean;
  index: number;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const entrance = useSharedValue(onTopOf ? 0 : 1);
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    if (onTopOf) {
      entrance.value = 0;
      entrance.value = withSpring(1, { damping: 14, stiffness: 120 });
    }
  }, [onTopOf, entrance, p.user_id]);

  const animatedStyle = useAnimatedStyle(() => {
    const rot = interpolate(tx.value, [-W, 0, W], [-5, 0, 5], Extrapolation.CLAMP);
    const dragOpacity = interpolate(
      Math.abs(tx.value),
      [0, SWIPE_THRESHOLD],
      [1, 0.85],
      Extrapolation.CLAMP
    );
    const enterScale = interpolate(entrance.value, [0, 1], [0.95, 1], Extrapolation.CLAMP);
    const enterTranslateY = interpolate(entrance.value, [0, 1], [24, 0], Extrapolation.CLAMP);
    return {
      opacity: dragOpacity,
      transform: [
        { translateX: tx.value },
        { translateY: ty.value + enterTranslateY },
        { rotateZ: `${rot}deg` },
        { scale: (onTopOf ? enterScale : 1 - index * 0.04) },
      ],
    };
  });

  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [0, SWIPE_THRESHOLD * 0.5], [0, 1], Extrapolation.CLAMP),
  }));
  const passStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-SWIPE_THRESHOLD * 0.5, 0], [1, 0], Extrapolation.CLAMP),
  }));

  const fly = (dir: 1 | -1) => {
    Haptics.impactAsync(dir > 0 ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Rigid);
    tx.value = withTiming(dir * W * 1.4, { duration: 280 });
    ty.value = withTiming(60 * dir, { duration: 280 }, () => {
      runOnJS(onSwipeDone)(p.user_id, dir > 0 ? "like" : "pass");
    });
  };

  const pan = Gesture.Pan()
    .enabled(onTopOf)
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY * 0.35;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        const dir = e.translationX > 0 ? 1 : -1;
        runOnJS(fly)(dir as 1 | -1);
      } else {
        tx.value = withSpring(0);
        ty.value = withSpring(0);
      }
    });

  const [c1, c2] = paletteFor(p.user_id || p.name || "x");

  // On discover cards: ONLY show the user's profile photo (not room photos).
  // Room photos are revealed after matching.
  const heroPhoto: string | undefined = p.photo || undefined;
  const hasRoomPhotos =
    p.listing_type === "has_place" && (p.listing?.photos?.length ?? 0) > 0;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        testID={`swipe-card-${p.user_id}`}
        style={[styles.card, CARD_SHADOW, animatedStyle, { zIndex: 100 - index }]}
      >
        <LinearGradient colors={[c1, c2]} style={StyleSheet.absoluteFill} />
        {heroPhoto ? (
          <Image
            source={{ uri: heroPhoto.startsWith("data:") ? heroPhoto : `data:image/jpeg;base64,${heroPhoto}` }}
            style={StyleSheet.absoluteFill as any}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Avatar name={p.name} photo={null} size={120} />
          </View>
        )}

        {/* Room photo lock banner */}
        {hasRoomPhotos && (
          <View style={styles.photosLockedBanner} pointerEvents="none">
            <Ionicons name="lock-closed" size={14} color={C.onBrand} />
            <Text style={styles.photosLockedText}>📸 Room photos visible after match</Text>
          </View>
        )}

        {p.compatibility != null ? (
          <View style={styles.compatBadge} testID={`compat-${p.user_id}`}>
            <Ionicons name="flame" size={11} color={C.coral} />
            <Text style={styles.compatBadgeText} numberOfLines={1}>{p.compatibility}% match</Text>
          </View>
        ) : (
          <View style={styles.compatBadge} testID={`compat-${p.user_id}`}>
            <Text style={styles.compatBadgeText} numberOfLines={1}>New user</Text>
          </View>
        )}


        <Animated.View style={[styles.stamp, styles.likeStamp, likeStyle]}>
          <Text style={styles.stampText}>LIKE</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.passStamp, passStyle]}>
          <Text style={styles.stampText}>PASS</Text>
        </Animated.View>

        <LinearGradient
          colors={["transparent", "rgba(17,24,39,0.55)", "rgba(17,24,39,0.96)"]}
          style={styles.scrim}
        >
          <View style={styles.info}>
            <View style={styles.headerRow}>
              <View style={styles.avatarRing}>
                <Avatar name={p.name} photo={p.photo} size={48} />
              </View>
              <View style={{ flex: 1, minWidth: 0, paddingRight: 72 }}>
                <Text style={styles.name} numberOfLines={1} testID={`card-name-${p.user_id}`}>
                  {p.name}, {p.age}
                </Text>
                <View style={styles.subRow}>
                  {p.listing_type === "has_place" && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>Has a place</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.metaBlock}>
              <Text style={styles.meta} numberOfLines={1}>
                {p.occupation === "student" ? "Student" : "Professional"}{p.org ? ` · ${p.org}` : ""}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {p.hometown ? `From ${p.hometown}` : ""}
                {p.budget_min && p.budget_max ? ` · ₹${p.budget_min.toLocaleString()}–${p.budget_max.toLocaleString()}` : ""}
              </Text>
              {p.localities?.length ? (
                <Text style={styles.metaMuted} numberOfLines={1}>📍 {p.localities.join(", ")}</Text>
              ) : null}
            </View>

            {p.bio ? (
              <Text style={styles.bio} numberOfLines={2}>&ldquo;{p.bio}&rdquo;</Text>
            ) : null}

            <View style={styles.lifestyleRow}>
              {p.lifestyle?.food && <Pill text={`🍽 ${p.lifestyle.food}`} />}
              {p.lifestyle?.sleep && <Pill text={`🌙 ${p.lifestyle.sleep}`} />}
              {p.lifestyle?.cleanliness && <Pill text={`✨ ${p.lifestyle.cleanliness}`} />}
              {p.lifestyle?.smoking === "No" && <Pill text="🚭 Non-smoker" />}
              {p.lifestyle?.pets && <Pill text={`🐾 ${p.lifestyle.pets}`} />}
              {p.lifestyle?.work_timing && <Pill text={`🕐 ${p.lifestyle.work_timing}`} />}
              {p.lifestyle?.cooking && <Pill text={`🍳 ${p.lifestyle.cooking}`} />}
              {p.lifestyle?.noise && <Pill text={`🎵 ${p.lifestyle.noise}`} />}
              {p.lifestyle?.overnight_guests && <Pill text={`🛏 ${p.lifestyle.overnight_guests}`} />}
              {p.lifestyle?.sharing_habits && <Pill text={`🤝 ${p.lifestyle.sharing_habits}`} />}
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </GestureDetector>
  );
}

function Pill({ text }: { text: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{text}</Text>
    </View>
  );
}

export default function Discover() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<any>({});
  const [showFilters, setShowFilters] = useState(false);
  const [matchModal, setMatchModal] = useState<any>(null);
  // pendingMatch holds the match data while safety warning is shown.
  const [pendingMatch, setPendingMatch] = useState<any>(null);
  const [showSafetyWarning, setShowSafetyWarning] = useState(false);

  const load = useCallback(async (f: any = {}) => {
    setLoading(true);
    try {
      const list = await api.discover(f);
      const bangaloreOnly = list.filter(isBangaloreProfile);
      setProfiles(bangaloreOnly);
      setIdx(0);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filters);
  }, [load, filters]);

  const swipingRef = useRef<string | null>(null);

  const handleSwipe = useCallback(
    async (id: string, dir: "like" | "pass") => {
      if (swipingRef.current === id) return;
      swipingRef.current = id;
      setIdx((p) => p + 1);
      try {
        const res = await api.swipe(id, dir);
        if (res?.match) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          // Show safety warning first, then celebration.
          setPendingMatch(res.match);
          setShowSafetyWarning(true);
        }
      } catch {} finally {
        setTimeout(() => {
          if (swipingRef.current === id) swipingRef.current = null;
        }, 350);
      }
    },
    []
  );

  const remaining = profiles.slice(idx, idx + 3).reverse();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.surface }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <AppLogo size={28} />
            <Text style={styles.brand}>Living Circle</Text>
          </View>
          <PressableScale
            testID="filter-button"
            onPress={() => setShowFilters(true)}
            style={styles.filterBtn}
          >
            <Ionicons name="options-outline" size={22} color={C.brand} />
          </PressableScale>
        </View>

        <View style={styles.bannerPrimary}>
          <Text style={styles.bannerPrimaryText}>
            🏙️ Living in Bangalore? Discover your perfect roommate here.
          </Text>
        </View>
        <View style={styles.bannerAccent}>
          <Text style={styles.bannerAccentText}>🏙️ Discover roommates in Bangalore</Text>
        </View>

        <View style={styles.deck}>
          {loading ? (
            <Text style={styles.empty}>Loading profiles…</Text>
          ) : remaining.length === 0 ? (
            <View style={styles.emptyWrap} testID="discover-empty">
              <Ionicons name="home-outline" size={64} color={C.borderStrong} />
              <Text style={styles.emptyTitle}>You&apos;ve seen everyone!</Text>
              <Text style={styles.emptySub}>Try widening your filters in Bangalore.</Text>
              <PressableScale
                testID="reset-filters"
                style={styles.refreshBtn}
                onPress={() => {
                  setFilters({});
                  load({});
                }}
              >
                <Text style={styles.refreshText}>Reset filters</Text>
              </PressableScale>
            </View>
          ) : (
            remaining.map((p, i) => (
              <Card
                key={p.user_id}
                p={p}
                onSwipeDone={handleSwipe}
                onTopOf={i === remaining.length - 1}
                index={remaining.length - 1 - i}
              />
            ))
          )}
        </View>

        {remaining.length > 0 && !loading && (
          <View style={styles.actions}>
            <PressableScale
              testID="pass-button"
              style={[styles.actionBtn, CARD_SHADOW, { borderColor: C.error }]}
              onPress={() => handleSwipe(profiles[idx].user_id, "pass")}
            >
              <Ionicons name="close" size={32} color={C.error} />
            </PressableScale>
            <PressableScale
              testID="like-button"
              style={[styles.actionBtn, CARD_SHADOW, { borderColor: C.brand, backgroundColor: C.brand }]}
              onPress={() => handleSwipe(profiles[idx].user_id, "like")}
            >
              <Ionicons name="heart" size={30} color={C.onBrand} />
            </PressableScale>
          </View>
        )}
      </SafeAreaView>

      <MatchSafetyWarning
        visible={showSafetyWarning}
        onAcknowledge={() => {
          setShowSafetyWarning(false);
          setMatchModal(pendingMatch);
          setPendingMatch(null);
        }}
      />

      <FilterSheet
        visible={showFilters}
        initial={filters}
        onClose={() => setShowFilters(false)}
        onApply={(f) => {
          setFilters(f);
          setShowFilters(false);
        }}
      />

      <MatchModal match={matchModal} onClose={() => setMatchModal(null)} />
    </GestureHandlerRootView>
  );
}

function FilterSheet({
  visible,
  initial,
  onClose,
  onApply,
}: {
  visible: boolean;
  initial: any;
  onClose: () => void;
  onApply: (f: any) => void;
}) {
  const [bmin, setBmin] = useState(initial.budget_min ? String(initial.budget_min) : "");
  const [bmax, setBmax] = useState(initial.budget_max ? String(initial.budget_max) : "");
  const [locality, setLocality] = useState(initial.locality || "");
  const [food, setFood] = useState<string | null>(initial.food || null);
  const [gender, setGender] = useState<string | null>(initial.gender || null);
  const [listingType, setListingType] = useState<string | null>(initial.listing_type || null);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={[styles.sheet, CARD_SHADOW]} testID="filter-sheet">
          <View style={styles.sheetHandle} />
          <ScrollView contentContainerStyle={{ padding: S.xl }}>
            <Text style={styles.h1}>Filters</Text>

            <Text style={styles.filterLabel}>Budget (₹)</Text>
            <View style={{ flexDirection: "row", gap: S.md }}>
              <TextInput
                testID="filter-bmin"
                value={bmin} onChangeText={(t) => setBmin(t.replace(/\D/g, ""))}
                keyboardType="number-pad"
                placeholder="Min"
                placeholderTextColor={C.onSurfaceTertiary}
                style={[styles.fInput, { flex: 1 }]}
              />
              <TextInput
                testID="filter-bmax"
                value={bmax} onChangeText={(t) => setBmax(t.replace(/\D/g, ""))}
                keyboardType="number-pad"
                placeholder="Max"
                placeholderTextColor={C.onSurfaceTertiary}
                style={[styles.fInput, { flex: 1 }]}
              />
            </View>

            <Text style={styles.filterLabel}>Locality</Text>
            <ChipRow>
              {ACTIVE_LOCALITIES.map((loc) => (
                <Chip
                  key={loc}
                  label={loc}
                  active={locality === loc}
                  onPress={() => setLocality(locality === loc ? "" : loc)}
                  testID={`filter-loc-${loc}`}
                />
              ))}
            </ChipRow>

            <Text style={styles.filterLabel}>Food preference</Text>
            <ChipRow>
              {["Veg", "Non-veg", "Eggetarian", "Jain", "Vegan"].map((f) => (
                <Chip key={f} label={f} active={food === f} onPress={() => setFood(food === f ? null : f)} testID={`filter-food-${f}`} />
              ))}
            </ChipRow>

            <Text style={styles.filterLabel}>Gender</Text>
            <ChipRow>
              {["Female", "Male", "Non-binary"].map((g) => (
                <Chip key={g} label={g} active={gender === g} onPress={() => setGender(gender === g ? null : g)} testID={`filter-gender-${g}`} />
              ))}
            </ChipRow>

            <Text style={styles.filterLabel}>Listing type</Text>
            <ChipRow>
              <Chip label="Has a place" active={listingType === "has_place"} onPress={() => setListingType(listingType === "has_place" ? null : "has_place")} testID="filter-has-place" />
              <Chip label="Looking" active={listingType === "looking"} onPress={() => setListingType(listingType === "looking" ? null : "looking")} testID="filter-looking" />
            </ChipRow>
          </ScrollView>
          <View style={{ flexDirection: "row", padding: S.lg, gap: S.md }}>
            <PressableScale
              testID="filter-clear"
              style={[styles.cta, { flex: 1, backgroundColor: C.surfaceTertiary }]}
              onPress={() => onApply({})}
            >
              <Text style={[styles.ctaText, { color: C.onSurface }]}>Clear</Text>
            </PressableScale>
            <PressableScale
              testID="filter-apply"
              style={[styles.cta, { flex: 2 }]}
              onPress={() =>
                onApply({
                  budget_min: bmin || undefined,
                  budget_max: bmax || undefined,
                  locality: locality || undefined,
                  food: food || undefined,
                  gender: gender || undefined,
                  listing_type: listingType || undefined,
                })
              }
            >
              <Text style={styles.ctaText}>Apply</Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MatchModal({ match, onClose }: { match: any; onClose: () => void }) {
  return <MatchCelebration match={match} onClose={onClose} />;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: S.xl,
    paddingVertical: S.md,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: S.sm },
  brand: { fontSize: 20, fontWeight: "800", color: C.brand, letterSpacing: -0.5 },
  filterBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.brandTint,
    alignItems: "center", justifyContent: "center",
  },
  bannerPrimary: {
    marginHorizontal: S.xl,
    marginBottom: S.sm,
    backgroundColor: C.brandTint,
    borderRadius: R.md,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  bannerPrimaryText: { fontSize: 13, color: C.onBrandTint, fontWeight: "600", lineHeight: 18 },
  bannerAccent: {
    marginHorizontal: S.xl,
    marginBottom: S.sm,
    backgroundColor: C.coral,
    borderRadius: R.md,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
  },
  bannerAccentText: { fontSize: 13, color: C.onCoral, fontWeight: "700", textAlign: "center" },
  deck: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    position: "absolute",
    width: W * 0.9,
    height: H * 0.58,
    borderRadius: R.lg,
    backgroundColor: C.surfaceSecondary,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  avatarFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  photosLockedBanner: {
    position: "absolute",
    top: S.lg,
    left: S.lg,
    zIndex: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(30,58,138,0.88)",
    paddingHorizontal: S.md,
    paddingVertical: 6,
    borderRadius: R.pill,
  },
  photosLockedText: { color: C.onBrand, fontSize: 11, fontWeight: "700" },
  compatBadge: {
    position: "absolute",
    top: S.lg,
    right: S.lg,
    zIndex: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: S.md,
    paddingVertical: 5,
    borderRadius: R.pill,
    maxWidth: 120,
    borderWidth: 1,
    borderColor: C.border,
  },
  compatBadgeText: { color: C.onSurface, fontWeight: "800", fontSize: 11 },
  stamp: {
    position: "absolute", top: 40, padding: S.sm,
    borderWidth: 3, borderRadius: R.md, zIndex: 5,
  },
  likeStamp: { left: 24, borderColor: C.brand, transform: [{ rotate: "-12deg" }] },
  passStamp: { right: 24, borderColor: C.error, transform: [{ rotate: "12deg" }] },
  stampText: { fontSize: 32, fontWeight: "900", color: C.brand },
  scrim: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingTop: 120,
  },
  info: { padding: S.xl, paddingBottom: S.xl, gap: S.md },
  headerRow: { flexDirection: "row", alignItems: "center", gap: S.md },
  avatarRing: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.85)",
    alignItems: "center", justifyContent: "center", overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  name: { color: C.onSurfaceInverse, fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  subRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" },
  tag: { backgroundColor: C.coral, paddingHorizontal: S.md, paddingVertical: 4, borderRadius: R.pill },
  tagText: { color: C.onCoral, fontWeight: "700", fontSize: 11 },
  metaBlock: { gap: 2 },
  meta: { color: C.onSurfaceInverse, fontSize: 13, opacity: 0.95, lineHeight: 18 },
  metaMuted: { color: C.onSurfaceInverse, fontSize: 12, opacity: 0.75, lineHeight: 16 },
  lifestyleRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: S.sm },
  pill: {
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: S.md, paddingVertical: 5,
    borderRadius: R.pill,
  },
  pillText: { color: C.onSurfaceInverse, fontSize: 12, fontWeight: "600" },
  bio: {
    color: C.onSurfaceInverse, fontSize: 13, lineHeight: 19,
    fontStyle: "italic", opacity: 0.92, marginTop: 0,
  },
  actions: {
    flexDirection: "row", justifyContent: "center", gap: S.xl,
    paddingBottom: S.lg, paddingTop: S.sm,
  },
  actionBtn: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 1,
    backgroundColor: C.surface,
    alignItems: "center", justifyContent: "center",
  },
  empty: { textAlign: "center", color: C.onSurfaceSecondary, marginTop: 40 },
  emptyWrap: { alignItems: "center", padding: S.xxl },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: C.onSurface, marginTop: S.lg },
  emptySub: { fontSize: 14, color: C.onSurfaceSecondary, marginTop: S.sm },
  refreshBtn: { marginTop: S.xl, backgroundColor: C.brand, paddingHorizontal: S.xl, paddingVertical: S.md, borderRadius: R.pill },
  refreshText: { color: C.onBrand, fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "85%" },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.borderStrong, borderRadius: 2, alignSelf: "center", marginTop: S.md },
  h1: { fontSize: 24, fontWeight: "800", color: C.onSurface },
  filterLabel: { fontSize: 14, color: C.onSurfaceSecondary, marginTop: S.lg, marginBottom: S.sm, fontWeight: "600" },
  fInput: {
    backgroundColor: C.surfaceSecondary, borderRadius: R.md,
    paddingHorizontal: S.lg, paddingVertical: S.md, fontSize: 16, color: C.onSurface,
    borderWidth: 1, borderColor: C.border,
  },
  cta: { backgroundColor: C.brand, paddingVertical: S.lg, borderRadius: R.pill, alignItems: "center" },
  ctaText: { color: C.onBrand, fontSize: 16, fontWeight: "700" },
});
