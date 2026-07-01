import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface Amenity {
  type: string;
  name: string;
  distance_km: number;
  drive_min: number;
  transit_min: number;
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
  drive_min: number | null;
  transit_min: number | null;
  walk_min: number | null;
  work_location: string | null;
  work_lat: number | null;
  work_lng: number | null;
  work_distance_km: number | null;
  work_drive_min: number | null;
  work_transit_min: number | null;
  work_walk_min: number | null;
  amenities: Amenity[];
}

// ── Amenity config ────────────────────────────────────────────────────────────

const AMENITY_CFG: Record<string, { emoji: string; label: string; color: string }> = {
  metro:       { emoji: "🚇", label: "Metro",       color: "#A855F7" },
  bus:         { emoji: "🚌", label: "Bus Stop",    color: "#F97316" },
  medical:     { emoji: "💊", label: "Pharmacy",    color: "#EF4444" },
  supermarket: { emoji: "🛒", label: "Supermarket", color: "#22C55E" },
  restaurant:  { emoji: "🍽️", label: "Restaurant", color: "#EAB308" },
  gym:         { emoji: "🏋️", label: "Gym",        color: "#3B82F6" },
  school:      { emoji: "🎓", label: "School",      color: "#14B8A6" },
  hospital:    { emoji: "🏥", label: "Hospital",    color: "#DC2626" },
};

const AMENITY_ORDER = ["metro", "bus", "medical", "supermarket", "restaurant", "gym", "school", "hospital"];

// ── Leaflet map HTML ──────────────────────────────────────────────────────────

function buildLeafletHtml(data: LocationData, activeAmenity: Amenity | null): string {
  const center = [data.match_lat, data.match_lng];

  const amenityMarkersJs = data.amenities.slice(0, 20).map((a) => {
    const cfg = AMENITY_CFG[a.type] ?? { emoji: "📍", color: "#00D9FF" };
    const isActive = activeAmenity?.name === a.name;
    const glow = isActive ? `box-shadow:0 0 24px ${cfg.color},0 0 48px ${cfg.color}88;border:3px solid white;` : `box-shadow:0 0 12px ${cfg.color}88;`;
    const size = isActive ? 44 : 34;
    const icon = `L.divIcon({
      html: '<div style="width:${size}px;height:${size}px;border-radius:50%;background:${cfg.color};display:flex;align-items:center;justify-content:center;font-size:${isActive ? 20 : 16}px;${glow}">${cfg.emoji}</div>',
      iconSize:[${size},${size}],iconAnchor:[${size / 2},${size / 2}],className:''
    })`;
    return `L.marker([${a.lat},${a.lng}],{icon:${icon}}).addTo(map).bindPopup("<b>${a.name}</b><br>${a.distance_km} km · 🚗${a.drive_min}m 🚶${a.walk_min}m");`;
  }).join("\n");

  const routeJs = data.my_lat && data.my_lng ? `
    L.polyline([[${data.my_lat},${data.my_lng}],[${data.match_lat},${data.match_lng}]],{
      color:'#00D9FF',weight:2.5,opacity:0.8,dashArray:'8,6'
    }).addTo(map);
  ` : "";

  const activeRouteJs = activeAmenity ? `
    L.polyline([[${data.match_lat},${data.match_lng}],[${activeAmenity.lat},${activeAmenity.lng}]],{
      color:'#FF006E',weight:2.5,opacity:0.9,dashArray:'6,4'
    }).addTo(map);
  ` : "";

  const workMarkerJs = data.work_lat && data.work_lng ? `
    L.marker([${data.work_lat},${data.work_lng}],{icon:L.divIcon({
      html:'<div style="width:38px;height:38px;border-radius:50%;background:#F59E0B;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 14px #F59E0BAA;border:2px solid white;">💼</div>',
      iconSize:[38,38],iconAnchor:[19,19],className:''
    })}).addTo(map).bindPopup("<b>Your Work</b><br>${data.work_location ?? 'Work location'}");
  ` : "";

  const myMarkerJs = data.my_lat && data.my_lng ? `
    L.marker([${data.my_lat},${data.my_lng}],{icon:L.divIcon({
      html:'<div style="width:40px;height:40px;border-radius:50%;background:#00D9FF;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 0 18px #00D9FFAA,0 0 32px #00D9FF44;border:2px solid white;">🏠</div>',
      iconSize:[40,40],iconAnchor:[20,20],className:''
    })}).addTo(map).bindPopup("<b>Your Area</b><br>${data.my_locality ?? ''}");
  ` : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0F0F1E}
  #map{width:100%;height:100vh}
  .leaflet-control-attribution{display:none}
  .leaflet-popup-content-wrapper{background:#1A1A2E;color:#fff;border:1px solid rgba(0,217,255,.4);border-radius:12px}
  .leaflet-popup-tip{background:#1A1A2E}
  .leaflet-popup-content{color:#fff;font-family:system-ui,sans-serif}
</style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map',{center:[${center[0]},${center[1]}],zoom:14,zoomControl:true});
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:20}).addTo(map);

// Match location marker (coral)
L.marker([${data.match_lat},${data.match_lng}],{icon:L.divIcon({
  html:'<div style="width:44px;height:44px;border-radius:50%;background:#FF006E;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 0 20px #FF006EAA,0 0 40px #FF006E44;border:2px solid white;">📍</div>',
  iconSize:[44,44],iconAnchor:[22,22],className:''
})}).addTo(map).bindPopup("<b>${data.match_name}</b><br>${data.match_locality ?? 'Bangalore'}").openPopup();

${myMarkerJs}
${workMarkerJs}
${routeJs}
${activeRouteJs}
${amenityMarkersJs}
</script>
</body>
</html>`;
}

// ── Leaflet Map Component ─────────────────────────────────────────────────────

function LeafletMap({ data, activeAmenity }: { data: LocationData; activeAmenity: Amenity | null }) {
  if (Platform.OS !== "web") {
    return (
      <View style={styles.mapPlaceholder}>
        <Text style={{ fontSize: 48 }}>🗺️</Text>
        <Text style={styles.mapPlaceholderText}>Map view available on web</Text>
      </View>
    );
  }
  const html = buildLeafletHtml(data, activeAmenity);
  return (
    <View style={styles.mapContainer}>
      {/* @ts-ignore */}
      <iframe srcDoc={html} style={{ width: "100%", height: "100%", border: "none" }} title="Location Map" />
    </View>
  );
}

// ── Travel time pill ──────────────────────────────────────────────────────────

function TravelPill({ emoji, min, color }: { emoji: string; min: number; color: string }) {
  return (
    <View style={[styles.travelPill, { backgroundColor: color + "18", borderColor: color + "60" }]}>
      <Text style={styles.travelPillEmoji}>{emoji}</Text>
      <Text style={[styles.travelPillText, { color }]}>{min} min</Text>
    </View>
  );
}

// ── Distance card ─────────────────────────────────────────────────────────────

function DistanceCard({
  icon, title, color, distKm, driveMin, transitMin, walkMin,
}: {
  icon: string; title: string; color: string;
  distKm: number; driveMin?: number | null; transitMin?: number | null; walkMin?: number | null;
}) {
  return (
    <View style={[styles.distCard, { borderColor: color + "80", shadowColor: color }]}>
      <Text style={styles.distCardIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.distCardTitle}>{title}</Text>
        <Text style={[styles.distCardKm, { color }]}>{distKm} km</Text>
        <View style={styles.travelRow}>
          {driveMin != null   && <TravelPill emoji="🚗" min={driveMin}   color="#00D9FF" />}
          {transitMin != null && <TravelPill emoji="🚌" min={transitMin} color="#A855F7" />}
          {walkMin != null    && <TravelPill emoji="🚶" min={walkMin}    color="#22C55E" />}
        </View>
      </View>
    </View>
  );
}

// ── Amenity row ───────────────────────────────────────────────────────────────

function AmenityRow({
  item, isActive, onPress,
}: { item: Amenity; isActive: boolean; onPress: () => void }) {
  const cfg = AMENITY_CFG[item.type] ?? { emoji: "📍", label: item.type, color: C.cyan };
  const openMaps = () => {
    if (Platform.OS === "web") {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`, "_blank");
    }
  };
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.amenityRow,
        { borderLeftColor: cfg.color },
        isActive && { backgroundColor: cfg.color + "18", borderColor: cfg.color + "60" },
      ]}
    >
      <View style={[styles.amenityIcon, { backgroundColor: cfg.color + "22" }]}>
        <Text style={{ fontSize: 18 }}>{cfg.emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.amenityName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.amenityType}>{cfg.label}</Text>
        {isActive && (
          <View style={styles.travelRow}>
            <TravelPill emoji="🚗" min={item.drive_min}   color="#00D9FF" />
            <TravelPill emoji="🚌" min={item.transit_min} color="#A855F7" />
            <TravelPill emoji="🚶" min={item.walk_min}    color="#22C55E" />
          </View>
        )}
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text style={[styles.amenityKm, { color: cfg.color }]}>{item.distance_km} km</Text>
        <Pressable onPress={openMaps} style={styles.dirBtn}>
          <Ionicons name="navigate" size={11} color="#0F0F1E" />
          <Text style={styles.dirBtnText}>Go</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ── Filter chips ──────────────────────────────────────────────────────────────

function FilterChips({ active, onToggle }: { active: Set<string>; onToggle: (t: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 4 }}>
      {AMENITY_ORDER.map((t) => {
        const cfg = AMENITY_CFG[t];
        const on = active.has(t);
        return (
          <Pressable key={t} onPress={() => onToggle(t)} style={[styles.filterChip, on && { backgroundColor: cfg.color + "28", borderColor: cfg.color }]}>
            <Text style={{ fontSize: 13 }}>{cfg.emoji}</Text>
            <Text style={[styles.filterChipText, on && { color: cfg.color }]}>{cfg.label}</Text>
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
  const [activeAmenity, setActiveAmenity] = useState<Amenity | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      try {
        const res = await api.matchLocation(matchId);
        setData(res);
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
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
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  }, []);

  const handleRequestLocation = async () => {
    if (requesting || requested) return;
    setRequesting(true);
    try {
      await api.requestLocation(matchId);
      setRequested(true);
    } catch {}
    finally { setRequesting(false); }
  };

  const filteredAmenities = (data?.amenities ?? []).filter((a) => activeTypes.has(a.type));

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
        <Text style={styles.loadingText}>Loading neighborhood map...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Text style={{ fontSize: 48 }}>📍</Text>
        <Text style={styles.errorText}>{error ?? "Location unavailable"}</Text>
        <Pressable style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>📍 {data.match_name}</Text>
          {data.match_locality && (
            <Text style={styles.headerSub}>{data.match_locality}, Bangalore</Text>
          )}
        </View>
        <Pressable
          onPress={handleRequestLocation}
          style={[styles.requestBtn, requested && styles.requestBtnDone]}
        >
          {requesting ? (
            <ActivityIndicator size="small" color={C.coral} />
          ) : (
            <Text style={styles.requestBtnText}>
              {requested ? "✓ Sent" : "📤 Request"}
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* ── Map ── */}
          <LeafletMap data={data} activeAmenity={activeAmenity} />

          {/* ── Distance cards ── */}
          <View style={styles.distRow}>
            {data.distance_km != null && (
              <DistanceCard
                icon="📏"
                title="Distance to match"
                color={C.cyan}
                distKm={data.distance_km}
                driveMin={data.drive_min}
                transitMin={data.transit_min}
                walkMin={data.walk_min}
              />
            )}
            {data.work_distance_km != null && (
              <DistanceCard
                icon="💼"
                title={data.work_location ? `To ${data.work_location.split(",")[0]}` : "To your work"}
                color="#F59E0B"
                distKm={data.work_distance_km}
                driveMin={data.work_drive_min}
                transitMin={data.work_transit_min}
                walkMin={data.work_walk_min}
              />
            )}
          </View>

          {data.work_distance_km == null && (
            <View style={styles.workHint}>
              <Ionicons name="briefcase-outline" size={14} color={C.onSurfaceTertiary} />
              <Text style={styles.workHintText}>
                Add your work location in Profile → Settings to see commute distance
              </Text>
            </View>
          )}
        </Animated.View>

        {/* ── Sticky section ── */}
        <View style={styles.stickySection}>
          <Text style={styles.sectionTitle}>NEARBY AMENITIES</Text>
          <FilterChips active={activeTypes} onToggle={toggleType} />
        </View>

        {/* ── Amenity list ── */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 48 }}>
          {Object.keys(grouped).length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No amenities match your filter</Text>
            </View>
          ) : (
            Object.entries(grouped).map(([type, items]) => {
              const cfg = AMENITY_CFG[type];
              return (
                <View key={type} style={{ marginTop: 16 }}>
                  <Text style={[styles.amenitySectionTitle, { color: cfg.color }]}>
                    {cfg.emoji} {cfg.label}s nearby
                  </Text>
                  {items.slice(0, 3).map((item, i) => (
                    <AmenityRow
                      key={i}
                      item={item}
                      isActive={activeAmenity?.name === item.name}
                      onPress={() => setActiveAmenity((p) => p?.name === item.name ? null : item)}
                    />
                  ))}
                </View>
              );
            })
          )}
          <Text style={styles.disclaimer}>
            Map © OpenStreetMap · CartoDB · Distances approximate · Times estimated for Bangalore traffic
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  loadingText: { color: C.onSurfaceSecondary, fontSize: 15, marginTop: 12 },
  errorText: { color: C.onSurfaceSecondary, fontSize: 15, textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: C.surfaceGlass, borderRadius: R.pill, borderWidth: 1, borderColor: C.borderCyan },
  retryText: { color: C.cyan, fontWeight: "700" },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16,
    backgroundColor: C.surfaceSecondary,
    borderBottomWidth: 1, borderBottomColor: C.borderCyan,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.surfaceGlass, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: C.onSurface, fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },
  headerSub: { color: C.cyan, fontSize: 12, marginTop: 2 },
  requestBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: R.pill, borderWidth: 1.5, borderColor: C.coral,
    backgroundColor: "rgba(255,0,110,0.1)",
    shadowColor: C.coral, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 6,
  },
  requestBtnDone: { borderColor: C.success, backgroundColor: "rgba(0,245,160,0.1)", shadowColor: C.success },
  requestBtnText: { color: C.coral, fontWeight: "800", fontSize: 13 },

  // Map
  mapContainer: { height: 340, borderBottomWidth: 1, borderBottomColor: C.borderCyan, overflow: "hidden" },
  mapPlaceholder: { height: 280, margin: 16, borderRadius: 16, backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.borderCyan, alignItems: "center", justifyContent: "center", gap: 12 },
  mapPlaceholderText: { color: C.onSurfaceSecondary, fontSize: 14 },

  // Distance cards
  distRow: { flexDirection: "row", padding: 16, gap: 12 },
  distCard: {
    flex: 1, flexDirection: "row", gap: 10,
    backgroundColor: C.surfaceSecondary, borderRadius: R.lg,
    borderWidth: 1, padding: 14,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  distCardIcon: { fontSize: 22, marginTop: 2 },
  distCardTitle: { color: C.onSurfaceTertiary, fontSize: 11, fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4 },
  distCardKm: { fontSize: 24, fontWeight: "900", letterSpacing: 0.5, marginBottom: 6 },
  travelRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  travelPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.pill, borderWidth: 1 },
  travelPillEmoji: { fontSize: 11 },
  travelPillText: { fontSize: 11, fontWeight: "700" },

  // Work hint
  workHint: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginTop: -4, marginBottom: 4, padding: 12, backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border },
  workHintText: { flex: 1, color: C.onSurfaceTertiary, fontSize: 12, lineHeight: 17 },

  // Sticky section
  stickySection: { backgroundColor: C.bg, paddingTop: 12, paddingBottom: 6 },
  sectionTitle: { color: C.cyan, fontSize: 12, fontWeight: "900", letterSpacing: 1.5, marginHorizontal: 16, marginBottom: 8 },
  filterScroll: { flexGrow: 0 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.pill, backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border },
  filterChipText: { color: C.onSurfaceSecondary, fontSize: 12, fontWeight: "600" },

  // Amenity
  amenitySectionTitle: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 8 },
  amenityRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.surfaceSecondary, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border, borderLeftWidth: 3,
    padding: 12, marginBottom: 6,
  },
  amenityIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  amenityName: { color: C.onSurface, fontSize: 14, fontWeight: "700" },
  amenityType: { color: C.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  amenityKm: { fontSize: 14, fontWeight: "900" },
  dirBtn: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: C.cyan, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 4 },
  dirBtnText: { color: "#0F0F1E", fontSize: 11, fontWeight: "800" },

  // Empty / disclaimer
  emptyBox: { padding: 24, backgroundColor: C.surfaceSecondary, borderRadius: R.lg, alignItems: "center", marginTop: 16 },
  emptyText: { color: C.onSurfaceTertiary, fontSize: 14 },
  disclaimer: { color: C.onSurfaceTertiary, fontSize: 11, textAlign: "center", marginTop: 28, lineHeight: 16 },
});
