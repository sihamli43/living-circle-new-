import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { api } from "@/src/api/client";
import { C, GLOW_CYAN, R } from "@/src/theme/colors";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Amenity {
  type: string;
  name: string;
  distance_km: number;
  walk_min: number;
  lat: number;
  lng: number;
}

interface LocationData {
  match_name: string;
  match_locality: string | null;
  match_lat: number;
  match_lng: number;
  my_locality: string | null;
  my_lat: number | null;
  my_lng: number | null;
  distance_km: number | null;
  work_locality: string | null;
  work_distance_km: number | null;
  amenities: Amenity[];
}

// ── Amenity config ────────────────────────────────────────────────────────────

const AMENITY_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  metro:       { emoji: "🏢", label: "Metro",       color: "#A855F7" },
  bus:         { emoji: "🚌", label: "Bus Stop",    color: "#F97316" },
  medical:     { emoji: "💊", label: "Pharmacy",    color: "#EF4444" },
  supermarket: { emoji: "🛒", label: "Supermarket", color: "#22C55E" },
  restaurant:  { emoji: "🍽️", label: "Restaurant", color: "#EAB308" },
  gym:         { emoji: "🏋️", label: "Gym",        color: "#3B82F6" },
  school:      { emoji: "🎓", label: "School",      color: "#14B8A6" },
  hospital:    { emoji: "🏥", label: "Hospital",    color: "#DC2626" },
};

const AMENITY_ORDER = ["metro", "bus", "medical", "supermarket", "restaurant", "gym", "school", "hospital"];

// ── Map Component (Web only) ──────────────────────────────────────────────────

function MapEmbed({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  if (Platform.OS !== "web") {
    return (
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderIcon}>🗺️</Text>
        <Text style={styles.mapPlaceholderText}>Map view available on web</Text>
      </View>
    );
  }

  const bbox = 0.015;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - bbox},${lat - bbox},${lng + bbox},${lat + bbox}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <View style={styles.mapContainer}>
      {/* @ts-ignore – iframe is web-only */}
      <iframe
        src={src}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          borderRadius: 16,
          filter: "invert(90%) hue-rotate(200deg) brightness(0.85) saturate(1.4)",
        }}
        title={`Map of ${name}`}
        loading="lazy"
      />
      <View style={styles.mapOverlayBadge} pointerEvents="none">
        <Text style={styles.mapOverlayText}>📍 {name}</Text>
      </View>
      <TouchableOpacity
        style={styles.directionsBtn}
        onPress={() => {
          const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
          if (Platform.OS === "web") window.open(url, "_blank");
        }}
      >
        <Ionicons name="navigate" size={14} color="#0F0F1E" />
        <Text style={styles.directionsBtnText}>Get Directions</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Amenity Row ───────────────────────────────────────────────────────────────

function AmenityRow({ item, lat, lng }: { item: Amenity; lat: number; lng: number }) {
  const cfg = AMENITY_CONFIG[item.type] ?? { emoji: "📍", label: item.type, color: C.cyan };
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  const openMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`;
    if (Platform.OS === "web") window.open(url, "_blank");
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={openMaps}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.amenityRow, { borderLeftColor: cfg.color }]}
      >
        <View style={[styles.amenityIconWrap, { backgroundColor: cfg.color + "22" }]}>
          <Text style={styles.amenityEmoji}>{cfg.emoji}</Text>
        </View>
        <View style={styles.amenityInfo}>
          <Text style={styles.amenityName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.amenityMeta}>{cfg.label}</Text>
        </View>
        <View style={styles.amenityDist}>
          <Text style={styles.amenityDistKm}>{item.distance_km} km</Text>
          <Text style={styles.amenityDistMin}>🚶 {item.walk_min} min</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={C.onSurfaceTertiary} />
      </Pressable>
    </Animated.View>
  );
}

// ── Filter chips ──────────────────────────────────────────────────────────────

function FilterChips({
  active,
  onToggle,
}: {
  active: Set<string>;
  onToggle: (t: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
      {AMENITY_ORDER.map((t) => {
        const cfg = AMENITY_CONFIG[t];
        const isOn = active.has(t);
        return (
          <Pressable
            key={t}
            onPress={() => onToggle(t)}
            style={[
              styles.filterChip,
              isOn && { backgroundColor: cfg.color + "33", borderColor: cfg.color },
            ]}
          >
            <Text style={styles.filterChipEmoji}>{cfg.emoji}</Text>
            <Text style={[styles.filterChipText, isOn && { color: cfg.color }]}>{cfg.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function LocationScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();

  const [data, setData] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(AMENITY_ORDER));

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      try {
        const res = await api.matchLocation(matchId);
        setData(res);
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      } catch (e: any) {
        setError(e.message ?? "Failed to load location");
      } finally {
        setLoading(false);
      }
    })();
  }, [matchId]);

  const toggleType = useCallback((t: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }, []);

  const filteredAmenities = data?.amenities.filter((a) => activeTypes.has(a.type)) ?? [];

  // Group by type for section display
  const grouped = AMENITY_ORDER.reduce<Record<string, Amenity[]>>((acc, t) => {
    if (!activeTypes.has(t)) return acc;
    const items = filteredAmenities.filter((a) => a.type === t);
    if (items.length) acc[t] = items;
    return acc;
  }, {});

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.cyan} />
        <Text style={styles.loadingText}>Exploring your neighborhood...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorEmoji}>📍</Text>
        <Text style={styles.errorText}>{error ?? "Location unavailable"}</Text>
        <Pressable style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.onSurface} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>📍 Neighborhood</Text>
          {data.match_locality && (
            <Text style={styles.headerSub}>{data.match_locality}, Bangalore</Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Map */}
          <MapEmbed
            lat={data.match_lat}
            lng={data.match_lng}
            name={data.match_locality ?? "Location"}
          />

          {/* Distance cards */}
          <View style={styles.distanceRow}>
            {data.distance_km !== null && (
              <View style={[styles.distCard, GLOW_CYAN]}>
                <Text style={styles.distCardEmoji}>📏</Text>
                <Text style={styles.distCardValue}>{data.distance_km} km</Text>
                <Text style={styles.distCardLabel}>from you</Text>
              </View>
            )}
            {data.work_distance_km !== null && (
              <View style={[styles.distCard, { borderColor: C.coral + "80" }]}>
                <Text style={styles.distCardEmoji}>🏢</Text>
                <Text style={[styles.distCardValue, { color: C.coral }]}>{data.work_distance_km} km</Text>
                <Text style={styles.distCardLabel}>to your work</Text>
              </View>
            )}
            {data.work_distance_km === null && data.work_locality === null && (
              <View style={styles.workHint}>
                <Text style={styles.workHintText}>
                  💡 Add your work location in profile to see commute distance
                </Text>
              </View>
            )}
          </View>

          {/* Match info banner */}
          <View style={styles.matchBanner}>
            <View style={styles.matchBannerLeft}>
              <Text style={styles.matchBannerName}>{data.match_name}</Text>
              <Text style={styles.matchBannerSub}>
                {data.match_locality ?? "Bangalore"} · Living there
              </Text>
            </View>
            {data.my_locality && (
              <View style={styles.matchBannerRight}>
                <Text style={styles.matchBannerYouLabel}>You</Text>
                <Text style={styles.matchBannerYou}>{data.my_locality}</Text>
              </View>
            )}
          </View>

          {/* Filter chips */}
          <Text style={styles.sectionTitle}>Nearby Amenities</Text>
          <FilterChips active={activeTypes} onToggle={toggleType} />

          {/* Amenity list */}
          {Object.keys(grouped).length === 0 ? (
            <View style={styles.emptyAmenities}>
              <Text style={styles.emptyAmenitiesText}>No amenities found nearby</Text>
              <Text style={styles.emptyAmenitiesSub}>Try expanding the radius or checking back later</Text>
            </View>
          ) : (
            Object.entries(grouped).map(([type, items]) => {
              const cfg = AMENITY_CONFIG[type];
              return (
                <View key={type} style={styles.amenitySection}>
                  <Text style={[styles.amenitySectionTitle, { color: cfg.color }]}>
                    {cfg.emoji} {cfg.label}s
                  </Text>
                  {items.slice(0, 3).map((item, i) => (
                    <AmenityRow key={i} item={item} lat={data.match_lat} lng={data.match_lng} />
                  ))}
                </View>
              );
            })
          )}

          {/* Disclaimer */}
          <Text style={styles.disclaimer}>
            📍 Map data © OpenStreetMap contributors · Distances are approximate
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centered: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  loadingText: {
    color: C.onSurfaceSecondary,
    fontSize: 15,
    marginTop: 12,
  },
  errorEmoji: { fontSize: 48 },
  errorText: {
    color: C.onSurfaceSecondary,
    fontSize: 15,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: C.surfaceGlass,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.borderCyan,
  },
  retryText: { color: C.cyan, fontWeight: "700" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: C.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: C.borderCyan,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surfaceGlass,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    color: C.onSurface,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headerSub: {
    color: C.cyan,
    fontSize: 12,
    marginTop: 2,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  // Map
  mapContainer: {
    height: 300,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.borderCyan,
    position: "relative",
  },
  mapPlaceholder: {
    height: 280,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: C.surfaceSecondary,
    borderWidth: 1,
    borderColor: C.borderCyan,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  mapPlaceholderIcon: { fontSize: 48 },
  mapPlaceholderText: { color: C.onSurfaceSecondary, fontSize: 14 },
  mapOverlayBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(15,15,30,0.85)",
    borderRadius: R.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.borderCyan,
  },
  mapOverlayText: {
    color: C.onSurface,
    fontSize: 13,
    fontWeight: "700",
  },
  directionsBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.cyan,
    borderRadius: R.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  directionsBtnText: {
    color: "#0F0F1E",
    fontWeight: "800",
    fontSize: 13,
  },

  // Distance row
  distanceRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  distCard: {
    flex: 1,
    backgroundColor: C.surfaceSecondary,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.borderCyan,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  distCardEmoji: { fontSize: 22 },
  distCardValue: {
    color: C.cyan,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  distCardLabel: {
    color: C.onSurfaceTertiary,
    fontSize: 11,
    textAlign: "center",
  },
  workHint: {
    flex: 1,
    backgroundColor: C.surfaceSecondary,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    justifyContent: "center",
  },
  workHintText: {
    color: C.onSurfaceTertiary,
    fontSize: 12,
    lineHeight: 18,
  },

  // Match banner
  matchBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surfaceSecondary,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
  },
  matchBannerLeft: { flex: 1 },
  matchBannerName: {
    color: C.onSurface,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  matchBannerSub: {
    color: C.onSurfaceTertiary,
    fontSize: 12,
    marginTop: 3,
  },
  matchBannerRight: { alignItems: "flex-end" },
  matchBannerYouLabel: {
    color: C.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  matchBannerYou: {
    color: C.cyan,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },

  // Section title
  sectionTitle: {
    color: C.cyan,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 10,
    textTransform: "uppercase",
  },

  // Filter
  filterScroll: { flexGrow: 0 },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: R.pill,
    backgroundColor: C.surfaceSecondary,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 6,
  },
  filterChipEmoji: { fontSize: 13 },
  filterChipText: {
    color: C.onSurfaceSecondary,
    fontSize: 12,
    fontWeight: "600",
  },

  // Amenity section
  amenitySection: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  amenitySectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  amenityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surfaceSecondary,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 3,
    padding: 12,
    marginBottom: 6,
  },
  amenityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  amenityEmoji: { fontSize: 18 },
  amenityInfo: { flex: 1 },
  amenityName: {
    color: C.onSurface,
    fontSize: 14,
    fontWeight: "700",
  },
  amenityMeta: {
    color: C.onSurfaceTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  amenityDist: { alignItems: "flex-end" },
  amenityDistKm: {
    color: C.cyan,
    fontSize: 13,
    fontWeight: "800",
  },
  amenityDistMin: {
    color: C.onSurfaceTertiary,
    fontSize: 11,
    marginTop: 2,
  },

  // Empty
  emptyAmenities: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 24,
    backgroundColor: C.surfaceSecondary,
    borderRadius: R.lg,
    alignItems: "center",
    gap: 8,
  },
  emptyAmenitiesText: {
    color: C.onSurfaceSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  emptyAmenitiesSub: {
    color: C.onSurfaceTertiary,
    fontSize: 13,
    textAlign: "center",
  },

  // Disclaimer
  disclaimer: {
    color: C.onSurfaceTertiary,
    fontSize: 11,
    textAlign: "center",
    marginTop: 32,
    marginHorizontal: 16,
    lineHeight: 16,
  },
});
