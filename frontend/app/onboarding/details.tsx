import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Chip, ChipRow } from "@/src/components/OnboardScreen";
import { MonthYearPicker, PickerField } from "@/src/components/Pickers";
import { api } from "@/src/api/client";
import { ACTIVE_LOCALITIES, C, R, S } from "@/src/theme/colors";

// ── Indian states list ────────────────────────────────────────────────────────
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  // UTs
  "Delhi", "Jammu & Kashmir", "Ladakh", "Chandigarh", "Puducherry",
  "Andaman & Nicobar Islands", "Dadra & Nagar Haveli", "Lakshadweep",
];

const LANGS = ["Hindi", "English", "Tamil", "Telugu", "Kannada", "Malayalam", "Marathi", "Bengali", "Gujarati", "Punjabi"];

// ── Searchable picker modal ───────────────────────────────────────────────────
function PickerModal({
  visible,
  title,
  items,
  selected,
  multi,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  items: string[];
  selected: string | string[];
  multi?: boolean;
  onClose: () => void;
  onSelect: (val: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => (q.trim() ? items.filter((i) => i.toLowerCase().includes(q.toLowerCase())) : items),
    [items, q]
  );

  const isSelected = (item: string) =>
    multi ? (selected as string[]).includes(item) : selected === item;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={pm.backdrop}>
        <View style={pm.sheet}>
          <View style={pm.header}>
            <Text style={pm.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={C.onSurface} />
            </Pressable>
          </View>

          <View style={pm.searchRow}>
            <Ionicons name="search" size={16} color={C.onSurfaceTertiary} style={{ marginRight: 8 }} />
            <TextInput
              style={pm.searchInput}
              value={q}
              onChangeText={setQ}
              placeholder={`Search ${title.toLowerCase()}...`}
              placeholderTextColor={C.onSurfaceTertiary}
              autoFocus
            />
            {q.length > 0 && (
              <Pressable onPress={() => setQ("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={C.onSurfaceTertiary} />
              </Pressable>
            )}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(i) => i}
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
            renderItem={({ item }) => {
              const sel = isSelected(item);
              return (
                <Pressable
                  style={[pm.item, sel && pm.itemSelected]}
                  onPress={() => {
                    onSelect(item);
                    if (!multi) { setQ(""); onClose(); }
                  }}
                >
                  <Text style={[pm.itemText, sel && pm.itemTextSelected]}>{item}</Text>
                  {sel && <Ionicons name="checkmark" size={18} color={C.cyan} />}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text style={pm.empty}>No results for "{q}"</Text>
            }
          />

          {multi && (
            <Pressable style={pm.doneBtn} onPress={() => { setQ(""); onClose(); }}>
              <Text style={pm.doneBtnText}>
                Done {(selected as string[]).length > 0 ? `(${(selected as string[]).length} selected)` : ""}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function Details() {
  const router = useRouter();
  const [languages, setLanguages] = useState<string[]>([]);
  const [bmin, setBmin] = useState("10000");
  const [bmax, setBmax] = useState("25000");
  const [localities, setLocalities] = useState<string[]>([]);
  const [moveIn, setMoveIn] = useState("");
  const [listingType, setListingType] = useState<"has_place" | "looking" | null>(null);
  const [bio, setBio] = useState("");
  const [workLocality, setWorkLocality] = useState<string | null>(null);
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  // Geocoded work location
  const [workText, setWorkText] = useState("");
  const [workLat, setWorkLat] = useState<number | null>(null);
  const [workLng, setWorkLng] = useState<number | null>(null);
  const [workSuggestions, setWorkSuggestions] = useState<any[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [modalOpen, setModalOpen] = useState<null | "locality" | "state" | "movein">(null);

  useEffect(() => {
    api.me().then((m) => {
      if (m.languages?.length) setLanguages(m.languages);
      if (m.budget_min) setBmin(String(m.budget_min));
      if (m.budget_max) setBmax(String(m.budget_max));
      if (m.localities?.length) setLocalities(m.localities);
      if (m.move_in) setMoveIn(m.move_in);
      if (m.listing_type) setListingType(m.listing_type);
      if (m.bio) setBio(m.bio);
      if (m.work_locality) setWorkLocality(m.work_locality);
      if (m.state) setState(m.state);
      if (m.city) setCity(m.city);
      if (m.work_location) setWorkText(m.work_location);
      if (m.work_lat) setWorkLat(m.work_lat);
      if (m.work_lng) setWorkLng(m.work_lng);
    }).catch(() => {});
  }, []);

  const handleWorkTextChange = (t: string) => {
    setWorkText(t);
    setWorkLat(null);
    setWorkLng(null);
    setWorkSuggestions([]);
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    if (t.trim().length < 3) return;
    geocodeTimer.current = setTimeout(async () => {
      setGeocoding(true);
      try {
        const res = await api.geocode(t);
        setWorkSuggestions(res ?? []);
      } catch {}
      finally { setGeocoding(false); }
    }, 600);
  };

  const selectWorkSuggestion = (s: any) => {
    setWorkText(s.short || s.name);
    setWorkLat(s.lat);
    setWorkLng(s.lng);
    setWorkSuggestions([]);
  };

  const toggleLang = (l: string) =>
    setLanguages((p) => (p.includes(l) ? p.filter((x) => x !== l) : [...p, l]));

  const toggleLocality = (l: string) =>
    setLocalities((p) => (p.includes(l) ? p.filter((x) => x !== l) : [...p, l]));

  const valid =
    languages.length > 0 &&
    Number(bmin) > 0 &&
    Number(bmax) > Number(bmin) &&
    localities.length > 0 &&
    moveIn.trim() &&
    listingType &&
    state.trim() &&
    city.trim();

  const onNext = async () => {
    if (!valid) return;
    await api.updateMe({
      state: state.trim(),
      city: city.trim(),
      languages,
      budget_min: Number(bmin),
      budget_max: Number(bmax),
      localities,
      move_in: moveIn,
      listing_type: listingType,
      bio: bio.trim() || null,
      work_location: workText.trim() || null,
      work_lat: workLat || null,
      work_lng: workLng || null,
      work_locality: workLocality || null,
      hometown: "Bangalore",
    });
    router.push("/onboarding/lifestyle");
  };

  const fmtMoveIn = moveIn
    ? new Date(`${moveIn}T00:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <Screen
      testID="onboard-details"
      title="A few more details"
      subtitle="Step 2 of 4"
      step={2} total={4}
      onBack={() => router.back()}
      cta="Continue"
      ctaDisabled={!valid}
      onCta={onNext}
    >
      {/* ── Home State & City ─────────────────────────────── */}
      <View style={styles.cityBanner}>
        <Text style={styles.cityBannerText}>
          🏠 Where are you originally from? Used for roommate matching.
        </Text>
      </View>

      <Text style={styles.label}>Home State <Text style={styles.req}>*</Text></Text>
      <Pressable
        style={styles.dropdownBtn}
        onPress={() => setModalOpen("state")}
        testID="state-picker"
      >
        <Ionicons name="location-outline" size={16} color={state ? C.cyan : C.onSurfaceTertiary} />
        <Text style={[styles.dropdownText, !state && styles.placeholder]}>
          {state || "Select your home state"}
        </Text>
        <Ionicons name="chevron-down" size={16} color={C.onSurfaceTertiary} />
      </Pressable>

      <Text style={styles.label}>Home City / Town <Text style={styles.req}>*</Text></Text>
      <TextInput
        value={city}
        onChangeText={setCity}
        placeholder="e.g. Mumbai, Chennai, Patna..."
        placeholderTextColor={C.onSurfaceTertiary}
        style={styles.input}
        testID="city-input"
      />
      {state && city && (
        <View style={styles.homePill}>
          <Text style={styles.homePillText}>🏙️ {city}, {state}</Text>
        </View>
      )}

      {/* ── Languages ────────────────────────────────────── */}
      <Text style={styles.label}>Languages <Text style={styles.req}>*</Text></Text>
      <ChipRow>
        {LANGS.map((l) => (
          <Chip key={l} label={l} active={languages.includes(l)} onPress={() => toggleLang(l)} testID={`lang-${l}`} />
        ))}
      </ChipRow>

      {/* ── Budget ───────────────────────────────────────── */}
      <Text style={styles.label}>Monthly budget (₹) <Text style={styles.req}>*</Text></Text>
      <View style={{ flexDirection: "row", gap: S.md }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.smallLabel}>Min</Text>
          <TextInput testID="bmin-input" value={bmin} onChangeText={(t) => setBmin(t.replace(/\D/g, ""))} keyboardType="number-pad" style={styles.input} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.smallLabel}>Max</Text>
          <TextInput testID="bmax-input" value={bmax} onChangeText={(t) => setBmax(t.replace(/\D/g, ""))} keyboardType="number-pad" style={styles.input} />
        </View>
      </View>

      {/* ── Preferred Localities ─────────────────────────── */}
      <Text style={styles.label}>Preferred Localities in Bangalore <Text style={styles.req}>*</Text></Text>
      <Text style={styles.hintText}>Select one or more areas you'd like to live in</Text>
      <Pressable
        style={styles.dropdownBtn}
        onPress={() => setModalOpen("locality")}
        testID="locality-picker"
      >
        <Ionicons name="map-outline" size={16} color={localities.length ? C.cyan : C.onSurfaceTertiary} />
        <Text style={[styles.dropdownText, !localities.length && styles.placeholder]}>
          {localities.length === 0
            ? "Choose localities..."
            : localities.length === 1
            ? localities[0]
            : `${localities[0]} +${localities.length - 1} more`}
        </Text>
        <Ionicons name="chevron-down" size={16} color={C.onSurfaceTertiary} />
      </Pressable>
      {localities.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}>
          {localities.map((l) => (
            <Pressable key={l} onPress={() => toggleLocality(l)} style={styles.selectedChip}>
              <Text style={styles.selectedChipText}>{l}</Text>
              <Ionicons name="close-circle" size={13} color={C.cyan} style={{ marginLeft: 3 }} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* ── Move-in date ─────────────────────────────────── */}
      <Text style={styles.label}>Move-in date <Text style={styles.req}>*</Text></Text>
      <PickerField
        testID="movein-picker"
        label="Month & Year"
        value={fmtMoveIn}
        placeholder="Select month and year"
        onPress={() => setModalOpen("movein")}
      />

      {/* ── Listing type ─────────────────────────────────── */}
      <Text style={styles.label}>What brings you here? <Text style={styles.req}>*</Text></Text>
      <View style={{ gap: S.md }}>
        <Pressable
          testID="listingtype-has-place"
          onPress={() => setListingType("has_place")}
          style={[styles.bigChoice, listingType === "has_place" && styles.bigChoiceActive]}
        >
          <Text style={[styles.bigTitle, listingType === "has_place" && { color: C.onBrandTint }]}>I have a place 🏠</Text>
          <Text style={styles.bigSub}>Looking for a roommate to fill a room.</Text>
        </Pressable>
        <Pressable
          testID="listingtype-looking"
          onPress={() => setListingType("looking")}
          style={[styles.bigChoice, listingType === "looking" && styles.bigChoiceActive]}
        >
          <Text style={[styles.bigTitle, listingType === "looking" && { color: C.onBrandTint }]}>I&apos;m looking for a place 🔍</Text>
          <Text style={styles.bigSub}>Need a room + roommate.</Text>
        </Pressable>
      </View>

      {/* ── Bio ──────────────────────────────────────────── */}
      <Text style={styles.label}>Tell us more <Text style={styles.optional}>(optional)</Text></Text>
      <TextInput
        testID="bio-input"
        value={bio}
        onChangeText={setBio}
        placeholder="Short bio — interests, what kind of roommate you're looking for, etc."
        placeholderTextColor={C.onSurfaceTertiary}
        multiline
        numberOfLines={4}
        maxLength={400}
        style={[styles.input, { height: 96, textAlignVertical: "top", paddingTop: S.md }]}
      />
      <Text style={styles.charCount}>{bio.length}/400</Text>

      {/* ── Work location ─────────────────────────────────── */}
      <Text style={styles.label}>
        Where do you work? <Text style={styles.optional}>(optional)</Text>
      </Text>
      <Text style={styles.hintText}>🗺️ Shows commute distance on the Location Explorer after matching</Text>
      <View style={styles.geocodeRow}>
        <TextInput
          value={workText}
          onChangeText={handleWorkTextChange}
          placeholder="e.g. RMZ Infinity, Outer Ring Road..."
          placeholderTextColor={C.onSurfaceTertiary}
          style={[styles.input, { flex: 1 }]}
          testID="work-location-input"
        />
        {geocoding && <ActivityIndicator size="small" color={C.cyan} style={{ marginLeft: 8 }} />}
        {workLat && <Ionicons name="checkmark-circle" size={20} color="#00F5A0" style={{ marginLeft: 8 }} />}
      </View>

      {/* Suggestions dropdown */}
      {workSuggestions.length > 0 && (
        <View style={styles.suggestionBox}>
          {workSuggestions.slice(0, 4).map((s, i) => (
            <Pressable key={i} style={styles.suggestionItem} onPress={() => selectWorkSuggestion(s)}>
              <Ionicons name="location-outline" size={14} color={C.coral} />
              <Text style={styles.suggestionText} numberOfLines={2}>{s.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {workLat && workLng && (
        <View style={styles.workConfirmed}>
          <Text style={styles.workConfirmedText}>✅ Location pinned · {workLat.toFixed(4)}, {workLng.toFixed(4)}</Text>
        </View>
      )}

      {/* ── Modals ───────────────────────────────────────── */}
      <PickerModal
        visible={modalOpen === "state"}
        title="Home State"
        items={INDIAN_STATES}
        selected={state}
        onClose={() => setModalOpen(null)}
        onSelect={(v) => { setState(v); setModalOpen(null); }}
      />

      <PickerModal
        visible={modalOpen === "locality"}
        title="Preferred Localities"
        items={ACTIVE_LOCALITIES}
        selected={localities}
        multi
        onClose={() => setModalOpen(null)}
        onSelect={toggleLocality}
      />

      <MonthYearPicker
        testID="movein-modal"
        visible={modalOpen === "movein"}
        initial={moveIn}
        onClose={() => setModalOpen(null)}
        onSelect={(v) => { setMoveIn(v); setModalOpen(null); }}
      />
    </Screen>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  label: { fontSize: 14, color: C.onSurfaceSecondary, marginTop: S.lg, marginBottom: S.sm, fontWeight: "600" },
  smallLabel: { fontSize: 12, color: C.onSurfaceTertiary, marginBottom: 4 },
  req: { color: C.coral, fontWeight: "700" },
  optional: { fontSize: 12, color: C.onSurfaceTertiary, fontWeight: "500" },
  hintText: { fontSize: 12, color: C.cyan, fontWeight: "600", marginBottom: S.sm, lineHeight: 17 },
  cityBanner: {
    backgroundColor: C.brandTint, borderRadius: R.md, padding: S.md,
    borderWidth: 1, borderColor: C.border, marginBottom: S.sm,
  },
  cityBannerText: { fontSize: 13, color: C.onBrandTint, fontWeight: "600", lineHeight: 18 },
  input: {
    backgroundColor: C.surfaceSecondary, borderRadius: R.md,
    paddingHorizontal: S.lg, paddingVertical: S.md, fontSize: 16, color: C.onSurface,
    borderWidth: 1, borderColor: C.border,
  },
  dropdownBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.surfaceSecondary, borderRadius: R.md,
    paddingHorizontal: S.lg, paddingVertical: 14,
    borderWidth: 1, borderColor: C.borderCyan,
  },
  dropdownText: { flex: 1, fontSize: 15, color: C.onSurface, fontWeight: "600" },
  placeholder: { color: C.onSurfaceTertiary, fontWeight: "400" },
  homePill: {
    alignSelf: "flex-start", marginTop: 8,
    backgroundColor: "rgba(0,217,255,0.1)", borderRadius: R.pill,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: C.borderCyan,
  },
  homePillText: { color: C.cyan, fontSize: 13, fontWeight: "700" },
  selectedChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(0,217,255,0.12)", borderRadius: R.pill,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: C.borderCyan,
  },
  selectedChipText: { color: C.cyan, fontSize: 12, fontWeight: "600" },
  bigChoice: { backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg },
  bigChoiceActive: { backgroundColor: C.brandTint, borderColor: C.brand },
  bigTitle: { fontSize: 16, fontWeight: "700", color: C.onSurface },
  bigSub: { fontSize: 13, color: C.onSurfaceSecondary, marginTop: 4 },
  charCount: { fontSize: 11, color: C.onSurfaceTertiary, textAlign: "right", marginTop: 4 },
  geocodeRow: { flexDirection: "row", alignItems: "center" },
  suggestionBox: {
    marginTop: 4, backgroundColor: C.surfaceTertiary,
    borderRadius: R.md, borderWidth: 1, borderColor: C.borderCoral, overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 12, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  suggestionText: { flex: 1, color: C.onSurfaceSecondary, fontSize: 13, lineHeight: 18 },
  workConfirmed: {
    marginTop: 6, backgroundColor: "rgba(0,245,160,0.08)", borderRadius: R.md,
    padding: 8, borderWidth: 1, borderColor: "rgba(0,245,160,0.3)",
  },
  workConfirmedText: { color: "#00F5A0", fontSize: 12, fontWeight: "600" },
});

// ── Picker modal styles ───────────────────────────────────────────────────────
const pm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "80%", borderWidth: 1, borderColor: C.borderCyan,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 20, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title: { color: C.onSurface, fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },
  searchRow: {
    flexDirection: "row", alignItems: "center",
    margin: 12, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: C.surfaceTertiary, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
  },
  searchInput: { flex: 1, color: C.onSurface, fontSize: 15 },
  item: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  itemSelected: { backgroundColor: "rgba(0,217,255,0.08)" },
  itemText: { color: C.onSurfaceSecondary, fontSize: 15 },
  itemTextSelected: { color: C.cyan, fontWeight: "700" },
  empty: { color: C.onSurfaceTertiary, textAlign: "center", padding: 24, fontSize: 14 },
  doneBtn: {
    margin: 12, backgroundColor: C.cyan, borderRadius: R.pill,
    paddingVertical: 14, alignItems: "center",
  },
  doneBtnText: { color: "#0F0F1E", fontWeight: "800", fontSize: 15 },
});
