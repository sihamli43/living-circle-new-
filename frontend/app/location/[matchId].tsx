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
  far_warning?: string;
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
  atm:         { emoji: "💰", label: "ATM",         color: "#10B981" },
  hospital:    { emoji: "🏥", label: "Hospital",    color: "#DC2626" },
};

const AMENITY_ORDER = ["metro", "bus", "medical", "supermarket", "restaurant", "gym", "atm", "hospital"];

// ── Leaflet map (dark, Carto tiles, custom neon markers) ──────────────────────

function buildMapHtml(data: LocationData, activeAmenity: Amenity | null): string {
  const amenityMarkersJs = data.amenities.slice(0, 24).map((a) => {
    const cfg = AMENITY_CFG[a.type] ?? { emoji: "📍", color: "#00D9FF" };
    const isActive = activeAmenity?.name === a.name;
    const sz = isActive ? 44 : 32;
    const glow = isActive
      ? `box-shadow:0 0 22px ${cfg.color},0 0 44px ${cfg.color}66;border:2px solid #fff;`
      : `box-shadow:0 0 10px ${cfg.color}88;border:1.5px solid ${cfg.color}AA;`;
    return `L.marker([${a.lat},${a.lng}],{icon:L.divIcon({
      html:'<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${cfg.color};display:flex;align-items:center;justify-content:center;font-size:${sz < 40 ? 14 : 20}px;${glow}">${cfg.emoji}</div>',
      iconSize:[${sz},${sz}],iconAnchor:[${sz / 2},${sz / 2}],className:''
    })}).addTo(map).bindPopup('<b>${a.name.replace(/'/g, "\\'")}</b><br>${cfg.label} · ${a.distance_km} km<br>🚗${a.drive_min}m 🚌${a.transit_min}m 🚶${a.walk_min}m');`;
  }).join("\n");

  const routeLine = data.my_lat && data.my_lng
    ? `L.polyline([[${data.my_lat},${data.my_lng}],[${data.match_lat},${data.match_lng}]],{color:'#00D9FF',weight:2.5,opacity:0.85,dashArray:'9,6'}).addTo(map);`
    : "";

  const activeRouteLine = activeAmenity
    ? `L.polyline([[${data.match_lat},${data.match_lng}],[${activeAmenity.lat},${activeAmenity.lng}]],{color:'#FF006E',weight:2.5,opacity:0.9,dashArray:'6,4'}).addTo(map);`
    : "";

  const workMarker = data.work_lat && data.work_lng
    ? `L.marker([${data.work_lat},${data.work_lng}],{icon:L.divIcon({html:'<div style="width:40px;height:40px;border-radius:50%;background:#F59E0B;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 0 16px #F59E0BAA;border:2px solid #fff;">💼</div>',iconSize:[40,40],iconAnchor:[20,20],className:''})}).addTo(map).bindPopup('<b>Your Work</b><br>${(data.work_location ?? "Work").replace(/'/g, "\\'")}');`
    : "";

  const myMarker = data.my_lat && data.my_lng
    ? `L.marker([${data.my_lat},${data.my_lng}],{icon:L.divIcon({html:'<div style="width:42px;height:42px;border-radius:50%;background:#00D9FF;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 0 20px #00D9FFBB,0 0 40px #00D9FF44;border:2px solid #fff;">🏠</div>',iconSize:[42,42],iconAnchor:[21,21],className:''})}).addTo(map).bindPopup('<b>Your Area</b><br>${(data.my_locality ?? "").replace(/'/g, "\\'")}');`
    : "";

  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{background:#0F0F1E}
#map{width:100%;height:100vh}
.leaflet-control-attribution{display:none!important}
.leaflet-popup-content-wrapper{background:#1A1A2E;color:#fff;border:1px solid rgba(0,217,255,.5);border-radius:14px;box-shadow:0 0 20px rgba(0,217,255,.25)}
.leaflet-popup-tip{background:#1A1A2E}
.leaflet-popup-content{color:#e0e0e0;font-family:system-ui,sans-serif;font-size:13px;line-height:1.5}
.leaflet-popup-content b{color:#00D9FF;font-size:14px}
</style></head><body><div id="map"></div>
<script>
var map=L.map('map',{center:[${data.match_lat},${data.match_lng}],zoom:14});
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:20}).addTo(map);
L.marker([${data.match_lat},${data.match_lng}],{icon:L.divIcon({
  html:'<div style="width:46px;height:46px;border-radius:50%;background:#FF006E;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 0 22px #FF006EBB,0 0 44px #FF006E44;border:2px solid #fff;">📍</div>',
  iconSize:[46,46],iconAnchor:[23,23],className:''
})}).addTo(map).bindPopup('<b>${data.match_name.replace(/'/g, "\\'")}</b><br>${(data.match_locality ?? "Bangalore").replace(/'/g, "\\'")}').openPopup();
${myMarker}
${workMarker}
${routeLine}
${activeRouteLine}
${amenityMarkersJs}
</script></body></html>`;
}

function LeafletMap({ data, activeAmenity }: { data: LocationData; activeAmenity: Amenity | null }) {
  const html = buildMapHtml(data, activeAmenity);
  if (Platform.OS !== "web") {
    return (
      <View style={styles.mapPlaceholder}>
        <Text style={{ fontSize: 48 }}>🗺️</Text>
        <Text style={styles.mapPlaceholderText}>Map available on web</Text>
      </View>
    );
  }
  return (
    <View style={styles.mapContainer}>
      {/* @ts-ignore */}
      <iframe srcDoc={html} style={{ width: "100%", height: "100%", border: "none" }} title="Location Map" />
    </View>
  );
}

// ── Travel mode pill ──────────────────────────────────────────────────────────

function ModePill({ emoji, label, min, color }: { emoji: string; label: string; min: number; color: string }) {
  return (
    <View style={[styles.modePill, { borderColor: color + "60", backgroundColor: color + "18" }]}>
      <Text style={styles.modePillEmoji}>{emoji}</Text>
      <Text style={[styles.modePillLabel, { color: color + "BB" }]}>{label}</Text>
      <Text style={[styles.modePillMin, { color }]}>{min} min</Text>
    </View>
  );
}

// ── Distance card ─────────────────────────────────────────────────────────────

function DistanceCard({ icon, title, color, distKm, driveMin, transitMin, walkMin }: {
  icon: string; title: string; color: string;
  distKm: number; driveMin?: number | null; transitMin?: number | null; walkMin?: number | null;
}) {
  return (
    <View style={[styles.distCard, { borderColor: color + "70", shadowColor: color }]}>
      <Text style={styles.distCardEmoji}>{icon}</Text>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={styles.distCardTitle}>{title}</Text>
        <Text style={[styles.distCardKm, { color }]}>{distKm} km</Text>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          {driveMin   != null && <ModePill emoji="🚗" label="Drive"   min={driveMin}   color="#00D9FF" />}
          {transitMin != null && <ModePill emoji="🚌" label="Transit" min={transitMin} color="#A855F7" />}
          {walkMin    != null && <ModePill emoji="🚶" label="Walk"    min={walkMin}    color="#22C55E" />}
        </View>
      </View>
    </View>
  );
}

// ── Amenity card (collapsible) ────────────────────────────────────────────────

function AmenityCard({ item, isActive, onPress }: { item: Amenity; isActive: boolean; onPress: () => void }) {
  const cfg = AMENITY_CFG[item.type] ?? { emoji: "📍", label: item.type, color: C.cyan };
  const expandAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(expandAnim, { toValue: isActive ? 1 : 0, duration: 220, useNativeDriver: false }).start();
  }, [isActive]);

  const openMaps = () => {
    if (Platform.OS === "web") {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(item.name)}/@${item.lat},${item.lng},16z`, "_blank");
    }
  };

  return (
    <View style={[
      styles.amenityCard,
      { borderLeftColor: cfg.color },
      isActive && { borderColor: cfg.color + "80", backgroundColor: cfg.color + "0D" },
    ]}>
      {/* Compact row — always visible */}
      <Pressable style={styles.amenityCompact} onPress={onPress}>
        <View style={[styles.amenityIconWrap, { backgroundColor: cfg.color + "22" }]}>
          <Text style={{ fontSize: 20 }}>{cfg.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.amenityName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.amenityTypeLbl}>{cfg.label}</Text>
        </View>
        <View style={[styles.distBadge, { borderColor: cfg.color + "80" }]}>
          <Text style={[styles.distBadgeText, { color: cfg.color }]}>{item.distance_km} km</Text>
        </View>
        <Ionicons
          name={isActive ? "chevron-up" : "chevron-down"}
          size={16}
          color={C.onSurfaceTertiary}
          style={{ marginLeft: 6 }}
        />
      </Pressable>

      {/* Expanded detail */}
      {isActive && (
        <View style={styles.amenityExpanded}>
          {/* Radius warning */}
          {item.far_warning && (
            <View style={styles.farWarning}>
              <Text style={styles.farWarningText}>⚠️ {item.far_warning}</Text>
            </View>
          )}

          {/* Travel time grid */}
          <Text style={styles.travelTimesTitle}>⏱ Travel Time from here</Text>
          <View style={styles.modeGrid}>
            <View style={styles.modeCard}>
              <Text style={styles.modeCardEmoji}>🚗</Text>
              <Text style={styles.modeCardLabel}>Driving</Text>
              <Text style={[styles.modeCardMin, { color: "#00D9FF" }]}>{item.drive_min} min</Text>
            </View>
            <View style={styles.modeCard}>
              <Text style={styles.modeCardEmoji}>🚌</Text>
              <Text style={styles.modeCardLabel}>Transit</Text>
              <Text style={[styles.modeCardMin, { color: "#A855F7" }]}>{item.transit_min} min</Text>
            </View>
            <View style={styles.modeCard}>
              <Text style={styles.modeCardEmoji}>🚶</Text>
              <Text style={styles.modeCardLabel}>Walking</Text>
              <Text style={[styles.modeCardMin, { color: "#22C55E" }]}>{item.walk_min} min</Text>
            </View>
          </View>

          {/* Open in Maps button */}
          <Pressable style={styles.openMapsBtn} onPress={openMaps}>
            <Text style={styles.openMapsEmoji}>📍</Text>
            <Text style={styles.openMapsBtnText}>Open in Google Maps</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ── Filter chips ──────────────────────────────────────────────────────────────

function FilterChips({ active, onToggle, counts }: {
  active: Set<string>;
  onToggle: (t: string) => void;
  counts: Record<string, number>;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
      {AMENITY_ORDER.map((t) => {
        const cfg = AMENITY_CFG[t];
        const on = active.has(t);
        const cnt = counts[t] ?? 0;
        return (
          <Pressable key={t} onPress={() => onToggle(t)}
            style={[styles.filterChip, on && { backgroundColor: cfg.color + "28", borderColor: cfg.color }]}>
            <Text style={{ fontSize: 13 }}>{cfg.emoji}</Text>
            <Text style={[styles.filterChipText, on && { color: cfg.color }]}>{cfg.label}</Text>
            {cnt > 0 && <View style={[styles.filterBadge, { backgroundColor: cfg.color }]}><Text style={styles.filterBadgeText}>{cnt}</Text></View>}
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
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      } catch (e: any) {
        setError(e.message ?? "Location unavailable");
      } finally {
        setLoading(false);
      }
    })();
  }, [matchId]);

  const toggleType = useCallback((t: string) => {
    setActiveTypes((prev) => { const s = new Set(prev); s.has(t) ? s.delete(t) : s.add(t); return s; });
  }, []);

  const handleRequest = async () => {
    if (requesting || requested) return;
    setRequesting(true);
    try { await api.requestLocation(matchId); setRequested(true); } catch {}
    finally { setRequesting(false); }
  };

  const filteredAmenities = (data?.amenities ?? []).filter((a) => activeTypes.has(a.type));
  const grouped = AMENITY_ORDER.reduce<Record<string, Amenity[]>>((acc, t) => {
    if (!activeTypes.has(t)) return acc;
    const items = filteredAmenities.filter((a) => a.type === t);
    if (items.length) acc[t] = items;
    return acc;
  }, {});

  const typeCounts = AMENITY_ORDER.reduce<Record<string, number>>((acc, t) => {
    acc[t] = (data?.amenities ?? []).filter((a) => a.type === t).length;
    return acc;
  }, {});

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.cyan} />
        <Text style={styles.loadingText}>Scanning neighborhood...</Text>
        <Text style={styles.loadingSubText}>Searching metro, bus, pharmacy, ATM…</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Text style={{ fontSize: 48 }}>📍</Text>
        <Text style={styles.errorText}>{error ?? "Location unavailable"}</Text>
        <Pressable style={styles.backBtn2} onPress={() => router.back()}>
          <Text style={{ color: C.cyan, fontWeight: "700" }}>← Go Back</Text>
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
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>📍 {data.match_name}</Text>
          {data.match_locality && <Text style={styles.headerSub}>{data.match_locality}, Bangalore</Text>}
        </View>
        <Pressable onPress={handleRequest} style={[styles.requestBtn, requested && styles.requestBtnDone]}>
          {requesting
            ? <ActivityIndicator size="small" color={C.coral} />
            : <Text style={[styles.requestBtnText, requested && { color: C.success }]}>
                {requested ? "✓ Sent" : "📤 Request"}
              </Text>}
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} stickyHeaderIndices={[2]}>
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Map */}
          <LeafletMap data={data} activeAmenity={activeAmenity} />

          {/* Distance cards */}
          <View style={styles.distRow}>
            {data.distance_km != null && (
              <DistanceCard icon="📏" title="Distance to match" color={C.cyan}
                distKm={data.distance_km} driveMin={data.drive_min} transitMin={data.transit_min} walkMin={data.walk_min} />
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
              <Text style={styles.workHintText}>Add your work location in onboarding to see commute distance</Text>
            </View>
          )}
        </Animated.View>

        {/* Sticky amenities header */}
        <View style={styles.amenitiesHeader}>
          <Text style={styles.amenitiesTitle}>
            NEARBY AMENITIES
            <Text style={styles.amenitiesCount}> · {filteredAmenities.length} found</Text>
          </Text>
          <FilterChips active={activeTypes} onToggle={toggleType} counts={typeCounts} />
        </View>

        {/* Amenity list */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 56 }}>
          {Object.keys(grouped).length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 32 }}>🔍</Text>
              <Text style={styles.emptyText}>No amenities match your filter</Text>
              <Text style={styles.emptySub}>Try toggling more types above</Text>
            </View>
          ) : (
            Object.entries(grouped).map(([type, items]) => {
              const cfg = AMENITY_CFG[type];
              return (
                <View key={type} style={{ marginTop: 18 }}>
                  <Text style={[styles.groupTitle, { color: cfg.color }]}>
                    {cfg.emoji} {cfg.label}s
                  </Text>
                  {items.map((item, i) => (
                    <AmenityCard
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
            Map © OpenStreetMap · CartoDB · Distances approx · Times estimated for Bangalore conditions
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  loadingText: { color: C.onSurfaceSecondary, fontSize: 16, fontWeight: "700", marginTop: 8 },
  loadingSubText: { color: C.onSurfaceTertiary, fontSize: 13 },
  errorText: { color: C.onSurfaceSecondary, fontSize: 15, textAlign: "center" },
  backBtn2: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: C.surfaceGlass, borderRadius: R.pill, borderWidth: 1, borderColor: C.borderCyan, marginTop: 8 },

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
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill,
    borderWidth: 1.5, borderColor: C.coral, backgroundColor: "rgba(255,0,110,0.1)",
    shadowColor: C.coral, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },
  requestBtnDone: { borderColor: C.success, backgroundColor: "rgba(0,245,160,0.1)", shadowColor: C.success },
  requestBtnText: { color: C.coral, fontWeight: "800", fontSize: 13 },

  // Map
  mapContainer: { height: 320, borderBottomWidth: 1, borderBottomColor: C.borderCyan, overflow: "hidden" },
  mapPlaceholder: { height: 260, margin: 16, borderRadius: 16, backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.borderCyan, alignItems: "center", justifyContent: "center", gap: 10 },
  mapPlaceholderText: { color: C.onSurfaceTertiary, fontSize: 14 },

  // Distance cards
  distRow: { flexDirection: "row", padding: 14, gap: 12 },
  distCard: {
    flex: 1, flexDirection: "row", gap: 10,
    backgroundColor: C.surfaceSecondary, borderRadius: R.lg, borderWidth: 1, padding: 14,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.22, shadowRadius: 12, elevation: 6,
  },
  distCardEmoji: { fontSize: 22, marginTop: 2 },
  distCardTitle: { color: C.onSurfaceTertiary, fontSize: 10, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 4 },
  distCardKm: { fontSize: 26, fontWeight: "900", letterSpacing: 0.4, marginBottom: 6 },
  modePill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 4, borderRadius: R.pill, borderWidth: 1 },
  modePillEmoji: { fontSize: 10 },
  modePillLabel: { fontSize: 9, fontWeight: "600" },
  modePillMin: { fontSize: 11, fontWeight: "800" },

  // Work hint
  workHint: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 14, marginTop: -4, marginBottom: 6, padding: 12, backgroundColor: C.surfaceSecondary, borderRadius: R.md, borderWidth: 1, borderColor: C.border },
  workHintText: { flex: 1, color: C.onSurfaceTertiary, fontSize: 12 },

  // Amenities sticky header
  amenitiesHeader: { backgroundColor: C.bg, paddingTop: 12, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  amenitiesTitle: { color: C.cyan, fontSize: 11, fontWeight: "900", letterSpacing: 1.5, marginHorizontal: 16, marginBottom: 8 },
  amenitiesCount: { color: C.onSurfaceTertiary, fontWeight: "600", letterSpacing: 0 },
  filterContent: { paddingHorizontal: 16, paddingBottom: 6, gap: 8 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.pill, backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border },
  filterChipText: { color: C.onSurfaceTertiary, fontSize: 12, fontWeight: "600" },
  filterBadge: { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 2 },
  filterBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  // Amenity card
  groupTitle: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 8 },
  amenityCard: {
    backgroundColor: C.surfaceSecondary, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border, borderLeftWidth: 3,
    marginBottom: 8, overflow: "hidden",
  },
  amenityCompact: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  amenityIconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  amenityName: { color: C.onSurface, fontSize: 14, fontWeight: "700" },
  amenityTypeLbl: { color: C.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  distBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.md, borderWidth: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  distBadgeText: { fontSize: 13, fontWeight: "800" },

  // Expanded detail
  amenityExpanded: { padding: 14, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: "rgba(0,0,0,0.25)", gap: 10 },
  farWarning: { backgroundColor: "rgba(245,158,11,0.12)", borderWidth: 1, borderColor: "rgba(245,158,11,0.5)", borderRadius: R.md, padding: 10 },
  farWarningText: { color: "#FCD34D", fontSize: 12, fontWeight: "600" },
  travelTimesTitle: { color: C.onSurfaceTertiary, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  modeGrid: { flexDirection: "row", gap: 8 },
  modeCard: {
    flex: 1, backgroundColor: C.surfaceTertiary, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 10, alignItems: "center", gap: 3,
  },
  modeCardEmoji: { fontSize: 20 },
  modeCardLabel: { color: C.onSurfaceTertiary, fontSize: 10, fontWeight: "600" },
  modeCardMin: { fontSize: 14, fontWeight: "900" },
  openMapsBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.coral, borderRadius: R.md, paddingVertical: 11,
    shadowColor: C.coral, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },
  openMapsEmoji: { fontSize: 16 },
  openMapsBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  // Empty / disclaimer
  emptyBox: { padding: 28, alignItems: "center", gap: 8, marginTop: 20 },
  emptyText: { color: C.onSurfaceSecondary, fontSize: 15, fontWeight: "600" },
  emptySub: { color: C.onSurfaceTertiary, fontSize: 13 },
  disclaimer: { color: C.onSurfaceTertiary, fontSize: 11, textAlign: "center", marginTop: 28, lineHeight: 16 },
});
