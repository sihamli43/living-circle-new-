import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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
import * as WebBrowser from "expo-web-browser";
import { MatchCelebration } from "@/src/components/MatchCelebration";
import { MatchSafetyWarning } from "@/src/components/MatchSafetyWarning";
import { PaywallModal } from "@/src/components/PaywallModal";
import { AppLogo } from "@/src/components/AppLogo";
import { PressableScale } from "@/src/components/PressableScale";
import { api } from "@/src/api/client";
import { Avatar } from "@/src/components/Avatar";
import { Chip, ChipRow } from "@/src/components/OnboardScreen";
import { ACTIVE_LOCALITIES, LUXE, LUXE_SHADOW, LUXE_SHADOW_SM, R, S, paletteFor } from "@/src/theme/colors";

const { width: W, height: H } = Dimensions.get("window");
const SWIPE_THRESHOLD = W * 0.28;

const DISCOVER_HERO_BG =
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?crop=entropy&cs=srgb&fm=jpg&q=80&w=900";

type Profile = any;

function isBangaloreProfile(p: Profile) {
  const locs: string[] = p.localities || [];
  return locs.some((l) => ACTIVE_LOCALITIES.includes(l));
}

// Only Bangalore has real matching data today (backend CITY_LOCALITIES/LOCALITY_COORDS
// only cover Bangalore) — other cities are shown but disabled until that data exists.
const CITY_OPTIONS: { name: string; enabled: boolean }[] = [
  { name: "Bangalore", enabled: true },
  { name: "Mumbai", enabled: false },
  { name: "Delhi", enabled: false },
  { name: "Pune", enabled: false },
  { name: "Hyderabad", enabled: false },
];

function CityPickerModal({
  visible,
  selected,
  onClose,
  onSelect,
  onComingSoon,
}: {
  visible: boolean;
  selected: string;
  onClose: () => void;
  onSelect: (city: string) => void;
  onComingSoon: (city: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.cityBackdrop} onPress={onClose}>
        <View style={[styles.cityCard, LUXE_SHADOW]} testID="city-picker">
          <Text style={styles.cityCardTitle}>Choose your city</Text>
          {CITY_OPTIONS.map((c) => (
            <PressableScale
              key={c.name}
              testID={`city-opt-${c.name}`}
              style={[
                styles.cityRow,
                selected === c.name && styles.cityRowActive,
                !c.enabled && styles.cityRowDisabled,
              ]}
              onPress={() => (c.enabled ? onSelect(c.name) : onComingSoon(c.name))}
            >
              <Text style={[styles.cityRowText, !c.enabled && styles.cityRowTextDisabled]}>
                {c.name}
              </Text>
              {c.enabled ? (
                selected === c.name && <Ionicons name="checkmark" size={18} color={LUXE.coral} />
              ) : (
                <Text style={styles.cityComingSoonTag}>Coming Soon</Text>
              )}
            </PressableScale>
          ))}
        </View>
      </Pressable>
    </Modal>
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

  const heroPhoto: string | undefined = p.photo || undefined;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        testID={`swipe-card-${p.user_id}`}
        style={[styles.card, LUXE_SHADOW, animatedStyle, { zIndex: 100 - index }]}
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

        {p.compatibility != null ? (
          <View style={styles.compatBadge} testID={`compat-${p.user_id}`}>
            <Text style={styles.compatBadgeNum}>{p.compatibility}%</Text>
            <Text style={styles.compatBadgeLabel}> match</Text>
          </View>
        ) : (
          <View style={[styles.compatBadge]} testID={`compat-${p.user_id}`}>
            <Text style={styles.compatBadgeLabel}>New ✨</Text>
          </View>
        )}

        <Animated.View style={[styles.stamp, styles.likeStamp, likeStyle]}>
          <Text style={[styles.stampText, { color: LUXE.teal }]}>LIKE</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.passStamp, passStyle]}>
          <Text style={[styles.stampText, { color: LUXE.coral }]}>PASS</Text>
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
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.name} numberOfLines={1} testID={`card-name-${p.user_id}`}>
                    {p.name}, {p.age}
                  </Text>
                </View>
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
                {p.current_locality || p.current_city
                  ? `🏙️ ${[p.current_locality, p.current_city].filter(Boolean).join(", ")}`
                  : ""}
                {p.budget_min && p.budget_max ? ` · ₹${p.budget_min.toLocaleString()}–${p.budget_max.toLocaleString()}` : ""}
              </Text>
              {p.city || p.state ? (
                <Text style={styles.metaMuted} numberOfLines={1}>
                  🏠 Originally from {[p.city, p.state].filter(Boolean).join(", ")}
                </Text>
              ) : null}
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

function FilterPill({
  icon, label, active, onPress, testID,
}: { icon: string; label: string; active: boolean; onPress: () => void; testID?: string }) {
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      style={[styles.quickPill, active && styles.quickPillActive]}
    >
      <Text style={styles.quickPillIcon}>{icon}</Text>
      <Text style={[styles.quickPillText, active && styles.quickPillTextActive]} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name="chevron-down" size={12} color={active ? "#FFFFFF" : LUXE.textTertiary} />
    </PressableScale>
  );
}

export default function Discover() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<any>({});
  const [showFilters, setShowFilters] = useState(false);
  const [matchModal, setMatchModal] = useState<any>(null);
  // pendingMatch holds the match data while safety warning is shown.
  const [pendingMatch, setPendingMatch] = useState<any>(null);
  const [showSafetyWarning, setShowSafetyWarning] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedCity, setSelectedCity] = useState("Bangalore");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [comingSoonCity, setComingSoonCity] = useState<string | null>(null);

  const handleComingSoon = (city: string) => {
    setShowCityPicker(false);
    setComingSoonCity(city);
    setTimeout(() => setComingSoonCity(null), 2500);
  };

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
        if (res?.paywalled) {
          setShowPaywall(true);
        } else if (res?.match) {
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

  const handleUpgrade = async () => {
    try {
      const { checkout_url } = await api.createCheckout();
      await WebBrowser.openAuthSessionAsync(checkout_url, "livingcircle://billing/success");
      setShowPaywall(false);
    } catch {}
  };

  const remaining = profiles.slice(idx, idx + 3).reverse();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: LUXE.bg }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: LUXE.bg }} edges={["top"]}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <AppLogo size={26} />
            <Text style={styles.brand}>Living Circle</Text>
          </View>
          <PressableScale
            testID="filter-button"
            onPress={() => setShowFilters(true)}
            style={styles.filterBtn}
          >
            <Ionicons name="options-outline" size={20} color={LUXE.coral} />
          </PressableScale>
        </View>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Image source={{ uri: DISCOVER_HERO_BG }} style={StyleSheet.absoluteFill as any} resizeMode="cover" />
          <LinearGradient
            colors={[LUXE.coral + "E6", LUXE.teal + "CC"]}
            style={StyleSheet.absoluteFill}
          />
          <PressableScale testID="city-selector" onPress={() => setShowCityPicker(true)} style={styles.cityChip}>
            <Text style={styles.cityChipText}>🏙️ {selectedCity}</Text>
            <Ionicons name="chevron-down" size={12} color="#FFFFFF" />
          </PressableScale>
          <Text style={styles.heroTitle}>Discover Your Match</Text>
          {comingSoonCity && (
            <View style={styles.comingSoonBanner} testID="coming-soon-banner">
              <Text style={styles.comingSoonBannerText}>🚀 Coming to {comingSoonCity} soon!</Text>
            </View>
          )}
        </View>

        {/* ── Quick filter white card ── */}
        <View style={[styles.filterCard, LUXE_SHADOW_SM]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: S.lg }}>
            <FilterPill icon="🏙️" label={selectedCity} active onPress={() => setShowCityPicker(true)} testID="quick-filter-city" />
            <FilterPill icon="🍽" label={filters.food || "Food"} active={!!filters.food} onPress={() => setShowFilters(true)} testID="quick-filter-food" />
          </ScrollView>
        </View>

        {/* ── Swipe deck ── */}
        <View style={styles.deck}>
          {loading ? (
            <Text style={styles.empty}>Loading profiles…</Text>
          ) : remaining.length === 0 ? (
            <View style={styles.emptyWrap} testID="discover-empty">
              <Ionicons name="home-outline" size={64} color={LUXE.borderStrong} />
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
              style={[styles.actionBtn, LUXE_SHADOW_SM, { borderColor: LUXE.coral }]}
              onPress={() => handleSwipe(profiles[idx].user_id, "pass")}
            >
              <Ionicons name="close" size={30} color={LUXE.coral} />
            </PressableScale>
            <PressableScale
              testID="like-button"
              style={[styles.actionBtn, LUXE_SHADOW_SM, { borderColor: LUXE.teal, backgroundColor: LUXE.tealTint }]}
              onPress={() => handleSwipe(profiles[idx].user_id, "like")}
            >
              <Ionicons name="heart" size={28} color={LUXE.teal} />
            </PressableScale>
          </View>
        )}

        {/* ── Stats footer ── */}
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>1,000+ Matches</Text>
          <View style={styles.statsDot} />
          <Text style={styles.statsText}>500+ Users</Text>
          <View style={styles.statsDot} />
          <Text style={styles.statsText}>98% Compatible</Text>
        </View>

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

      <MatchModal
        match={matchModal}
        onKeepSwiping={() => setMatchModal(null)}
        onExplore={() => setMatchModal(null)}
      />

      <PaywallModal
        visible={showPaywall}
        onUpgrade={handleUpgrade}
        onClose={() => setShowPaywall(false)}
      />

      <CityPickerModal
        visible={showCityPicker}
        selected={selectedCity}
        onClose={() => setShowCityPicker(false)}
        onSelect={(city) => {
          setSelectedCity(city);
          setShowCityPicker(false);
        }}
        onComingSoon={handleComingSoon}
      />
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
  const [food, setFood] = useState<string | null>(initial.food || null);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={[styles.sheet, LUXE_SHADOW]} testID="filter-sheet">
          <View style={styles.sheetHandle} />
          <ScrollView contentContainerStyle={{ padding: S.xl }}>
            <Text style={styles.h1}>Filters</Text>

            <Text style={styles.filterLabel}>Food preference</Text>
            <ChipRow>
              {["Veg", "Non-veg", "Eggetarian", "Jain", "Vegan"].map((f) => (
                <Chip key={f} label={f} active={food === f} onPress={() => setFood(food === f ? null : f)} testID={`filter-food-${f}`} />
              ))}
            </ChipRow>
          </ScrollView>
          <View style={{ flexDirection: "row", padding: S.lg, gap: S.md }}>
            <PressableScale
              testID="filter-clear"
              style={[styles.cta, { flex: 1, backgroundColor: LUXE.bg }]}
              onPress={() => onApply({})}
            >
              <Text style={[styles.ctaText, { color: LUXE.text }]}>Clear</Text>
            </PressableScale>
            <PressableScale
              testID="filter-apply"
              style={[styles.cta, { flex: 2 }]}
              onPress={() => onApply({ food: food || undefined })}
            >
              <Text style={styles.ctaText}>Apply</Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MatchModal({
  match, onKeepSwiping, onExplore,
}: { match: any; onKeepSwiping: () => void; onExplore: () => void }) {
  const router = useRouter();
  return (
    <MatchCelebration
      match={match}
      onClose={onKeepSwiping}
      onExploreLocations={
        match?.match_id
          ? () => {
              onExplore();
              router.push(`/location-suggestions/${match.match_id}`);
            }
          : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: S.xl, paddingVertical: S.md,
    backgroundColor: LUXE.bg,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: S.sm },
  brand: { fontSize: 17, fontWeight: "900", color: LUXE.text, letterSpacing: 0.5 },
  filterBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: LUXE.card, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: LUXE.border,
  },

  hero: {
    marginHorizontal: S.xl, borderRadius: R.lg, overflow: "hidden",
    paddingHorizontal: S.lg, paddingVertical: S.lg, gap: 8,
  },
  cityChip: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.22)", borderRadius: R.pill,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  cityChipText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  heroTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "900", letterSpacing: 0.2 },
  comingSoonBanner: {
    backgroundColor: "rgba(255,255,255,0.9)", borderRadius: R.md,
    paddingVertical: 6, paddingHorizontal: S.md, alignSelf: "flex-start",
  },
  comingSoonBannerText: { fontSize: 12, color: LUXE.coral, fontWeight: "800" },

  filterCard: {
    marginHorizontal: S.xl, marginTop: S.md,
    backgroundColor: LUXE.card, borderRadius: R.lg, paddingVertical: S.sm,
    borderWidth: 1, borderColor: LUXE.cardBorder,
  },
  quickPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: LUXE.bg, borderRadius: R.pill,
    paddingHorizontal: S.md, paddingVertical: 8,
    borderWidth: 1, borderColor: LUXE.border, maxWidth: 150,
  },
  quickPillActive: { backgroundColor: LUXE.coral, borderColor: LUXE.coral },
  quickPillIcon: { fontSize: 13 },
  quickPillText: { fontSize: 12, fontWeight: "700", color: LUXE.text },
  quickPillTextActive: { color: "#FFFFFF" },

  cityBackdrop: { flex: 1, backgroundColor: "rgba(21,19,28,0.6)", alignItems: "center", justifyContent: "center", padding: S.xl },
  cityCard: {
    width: "100%", maxWidth: 340, backgroundColor: LUXE.card, borderRadius: R.lg,
    padding: S.lg, gap: 6,
  },
  cityCardTitle: { color: LUXE.text, fontSize: 16, fontWeight: "800", marginBottom: S.sm },
  cityRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: S.lg, paddingVertical: S.md, borderRadius: R.md,
    borderWidth: 1, borderColor: "transparent",
  },
  cityRowActive: { backgroundColor: LUXE.coralTint, borderColor: LUXE.coral },
  cityRowDisabled: { opacity: 0.5 },
  cityRowText: { color: LUXE.text, fontSize: 15, fontWeight: "600" },
  cityRowTextDisabled: { color: LUXE.textTertiary },
  cityComingSoonTag: {
    fontSize: 10, fontWeight: "800", color: LUXE.textTertiary,
    backgroundColor: LUXE.bg, borderRadius: R.pill,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  deck: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    position: "absolute", width: W * 0.88, height: H * 0.52,
    borderRadius: R.lg, backgroundColor: LUXE.card,
    overflow: "hidden", borderWidth: 1, borderColor: LUXE.cardBorder,
    ...LUXE_SHADOW,
  },
  avatarFallback: {
    ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center",
    backgroundColor: LUXE.card,
  },
  compatBadge: {
    position: "absolute", top: S.lg, right: S.lg, zIndex: 12,
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: S.md, paddingVertical: 5, borderRadius: R.pill,
  },
  compatBadgeNum: { color: LUXE.coral, fontWeight: "900", fontSize: 14 },
  compatBadgeLabel: { color: LUXE.text, fontWeight: "700", fontSize: 11, opacity: 0.9 },
  stamp: {
    position: "absolute", top: 40, padding: S.sm, borderWidth: 2.5, borderRadius: R.md, zIndex: 5,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  likeStamp: { left: 24, borderColor: LUXE.teal, transform: [{ rotate: "-12deg" }] },
  passStamp: { right: 24, borderColor: LUXE.coral, transform: [{ rotate: "12deg" }] },
  stampText: { fontSize: 32, fontWeight: "900", letterSpacing: 2 },
  scrim: { position: "absolute", bottom: 0, left: 0, right: 0, paddingTop: 120 },
  info: { padding: S.xl, paddingBottom: S.lg, gap: S.md },
  headerRow: { flexDirection: "row", alignItems: "center", gap: S.md },
  avatarRing: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.7)",
    alignItems: "center", justifyContent: "center", overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  name: { color: "#FFFFFF", fontSize: 22, fontWeight: "900", letterSpacing: 0.3 },
  subRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" },
  tag: { backgroundColor: LUXE.coral, paddingHorizontal: S.md, paddingVertical: 4, borderRadius: R.pill },
  tagText: { color: "#FFFFFF", fontWeight: "700", fontSize: 11 },
  metaBlock: { gap: 2 },
  meta: { color: "#FFFFFF", fontSize: 13, lineHeight: 18 },
  metaMuted: { color: "rgba(255,255,255,0.7)", fontSize: 12, lineHeight: 16 },
  lifestyleRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: S.sm },
  pill: {
    backgroundColor: "rgba(255,255,255,0.16)", paddingHorizontal: S.md, paddingVertical: 5,
    borderRadius: R.pill, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  pillText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  bio: { color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 19, fontStyle: "italic" },
  actions: { flexDirection: "row", justifyContent: "center", gap: S.xxl, paddingBottom: S.sm, paddingTop: S.sm },
  actionBtn: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: LUXE.card,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: LUXE.border,
  },
  empty: { textAlign: "center", color: LUXE.textTertiary, marginTop: 40 },
  emptyWrap: { alignItems: "center", padding: S.xxl },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: LUXE.text, marginTop: S.lg, letterSpacing: 0.5 },
  emptySub: { fontSize: 14, color: LUXE.textSecondary, marginTop: S.sm },
  refreshBtn: { marginTop: S.xl, backgroundColor: LUXE.coral, paddingHorizontal: S.xl, paddingVertical: S.md, borderRadius: R.pill },
  refreshText: { color: "#FFFFFF", fontWeight: "700" },

  statsRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: S.sm,
    paddingBottom: S.sm,
  },
  statsText: { fontSize: 11, fontWeight: "700", color: LUXE.textSecondary },
  statsDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: LUXE.textTertiary },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(21,19,28,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: LUXE.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "85%" },
  sheetHandle: { width: 40, height: 4, backgroundColor: LUXE.border, borderRadius: 2, alignSelf: "center", marginTop: S.md },
  h1: { fontSize: 24, fontWeight: "800", color: LUXE.text, letterSpacing: 0.5 },
  filterLabel: { fontSize: 14, color: LUXE.textSecondary, marginTop: S.lg, marginBottom: S.sm, fontWeight: "600" },
  cta: { backgroundColor: LUXE.coral, paddingVertical: S.lg, borderRadius: R.pill, alignItems: "center" },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
