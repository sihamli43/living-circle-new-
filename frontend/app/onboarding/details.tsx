import { useEffect, useMemo, useState } from "react";
import {
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

// City lists for the states with enough coverage to make a dropdown useful.
// States not listed here fall back to free-text city entry below — INDIAN_STATES
// covers all 36 states/UTs, but this list only covers 12, and leaving the other
// 24 with an empty, unusable dropdown would dead-end onboarding for anyone from
// those states.
const STATE_CITIES: Record<string, string[]> = {
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruppur", "Erode", "Vellore", "Kanchipuram", "Tirunelveli", "Nagercoil", "Kanyakumari", "Thoothukudi", "Virudunagar", "Dindigul", "Theni", "Sivagangai", "Ramanathapuram", "Pudukottai", "Perambalur", "Cuddalore", "Villupuram", "Chengalpattu", "Ranipet", "Krishnagiri", "Hosur", "Dharmapuri", "Namakkal", "Karur", "Tiruchirappalli", "Ariyalur", "Kumbakonam", "Mayiladuthurai", "Thanjavur", "Nagapattinam", "Chidambaram", "Tiruvannamalai"],
  "Karnataka": ["Bangalore", "Mangalore", "Mysore", "Belgaum", "Hubli", "Tumkur", "Udupi", "Hassan", "Shimoga", "Chitradurga", "Davanagere", "Kolar", "Chikmagalur", "Kodagu", "Vijayapura", "Bagalkot", "Gadag", "Haveri", "Uttara Kannada", "Ballari", "Raichur", "Koppal", "Dakshina Kannada", "Mandya", "Chikballapur", "Ramanagara", "Kalaburagi", "Yadgir", "Bidar"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Aurangabad", "Nashik", "Kolhapur", "Satara", "Amravati", "Yavatmal", "Nanded", "Parbhani", "Jalgaon", "Dhule", "Jalna", "Akola", "Washim", "Sangli", "Solapur", "Beed", "Ratnagiri", "Sindhudurg", "Ahmednagar", "Buldhana", "Chandrapur", "Gondia", "Wardha", "Latur", "Hingoli", "Palghar", "Thane", "Raigad"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Ramagundam", "Khammam", "Mahbubnagar", "Sangareddy", "Medchal", "Vikarabad", "Tandur", "Narayankhed", "Chevella", "Shamshabad", "Yadadri Bhuvanagiri", "Bhongir", "Nalgonda", "Miryalaguda", "Suryapet", "Bhadradri Kothagudem", "Asifabad", "Mancherial", "Adilabad", "Nirmal", "Medak", "Kamareddy", "Jangaon", "Peddapalli", "Jayashankar Bhupalpally", "Mulugu"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Tirupati", "Nellore", "Kurnool", "Guntur", "Rajahmundry", "Ongole", "Tenali", "Naidupet", "Kaviti", "Macherla", "Kanigiri", "Darsi", "Bapatla", "Chirala", "Kavali", "Kodur", "Madanapalle", "Sullurpet", "Chittoor", "Kadapa"],
  "Delhi": ["Central Delhi", "South Delhi", "North Delhi", "East Delhi", "West Delhi", "New Delhi", "Saket"],
  "Punjab": ["Chandigarh", "Amritsar", "Ludhiana", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Moga", "Sangrur", "Firozpur", "Hoshiarpur", "Gurdaspur"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Junagadh", "Anand", "Bhavnagar", "Navsari", "Valsad", "Panchmahal", "Kheda", "Dohad", "Banaskantha", "Sabarkantha", "Aravalli", "Surendranagar", "Kutch", "Porbandar", "Jamnagar", "Devbhoomi Dwarka", "Morbi", "Gondal", "Visnagar", "Unjha", "Keshod", "Adipur", "Veraval"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Alwar", "Pali", "Nagaur", "Barmer", "Jaisalmer", "Churu", "Hanumangarh", "Ganganagar", "Jhunjhunu", "Sikar", "Shekhawati", "Tonk", "Bhilwara", "Baran", "Bundi", "Chittorgarh", "Rajsamand", "Pratapgarh", "Banswara", "Dungarpur", "Karauli", "Dholpur", "Sawai Madhopur", "Dausa"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Ujjain", "Gwalior", "Sagar", "Ratlam", "Satna", "Chhindwara", "Seoni", "Mandla", "Balaghat"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Meerut", "Allahabad", "Ghaziabad", "Noida", "Bareilly", "Aligarh", "Moradabad", "Saharanpur", "Mathura", "Firozabad", "Azamgarh", "Deoband", "Muzaffarnagar", "Hapur", "Bulandshahr", "Shamli", "Baghpat", "Bijnor", "Mawana", "Seohara", "Kairana", "Jansath", "Thakurdwara", "Nakur", "Charthawal", "Tauru", "Simbhaoli", "Pilkhuwa", "Loni", "Khatauli", "Kithor", "Khijrpur", "Gannaur", "Baraut", "Sardhana", "Modinagar", "Muradnagar", "Garhmukteshwar", "Anupshahr", "Gulaothi", "Syana", "Khurja", "Dibai", "Atrauli", "Akrabad", "Jattari", "Etah", "Tappal", "Hathras", "Sadabad", "Fatehpur Sikri", "Shikohabad", "Tundla"],
  "West Bengal": ["Kolkata", "Darjeeling", "Siliguri", "Asansol", "Durgapur", "Jhargram", "Jalpaiguri", "Malda", "Cooch Behar", "Alipurduar", "Dinajpur", "Purulia", "Bankura", "Birbhum", "Murshidabad", "Nadia", "North 24 Parganas", "South 24 Parganas", "Howrah", "Hooghly", "East Midnapore", "West Midnapore"],
};

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
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [currentState, setCurrentState] = useState("");
  const [currentCity, setCurrentCity] = useState("");
  const [currentLocality, setCurrentLocality] = useState("");

  const [modalOpen, setModalOpen] = useState<
    null | "locality" | "state" | "city" | "movein" | "currentState" | "currentCity" | "currentLocality"
  >(null);
  const cityOptions = STATE_CITIES[state];
  const currentCityOptions = STATE_CITIES[currentState];

  useEffect(() => {
    api.me().then((m) => {
      if (m.languages?.length) setLanguages(m.languages);
      if (m.budget_min) setBmin(String(m.budget_min));
      if (m.budget_max) setBmax(String(m.budget_max));
      if (m.localities?.length) setLocalities(m.localities);
      if (m.move_in) setMoveIn(m.move_in);
      if (m.listing_type) setListingType(m.listing_type);
      if (m.bio) setBio(m.bio);
      if (m.state) setState(m.state);
      if (m.city) setCity(m.city);
      if (m.current_state) setCurrentState(m.current_state);
      if (m.current_city) setCurrentCity(m.current_city);
      if (m.current_locality) setCurrentLocality(m.current_locality);
    }).catch(() => {});
  }, []);

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
    city.trim() &&
    currentState.trim() &&
    currentCity.trim() &&
    currentLocality.trim();

  const onNext = async () => {
    if (!valid) return;
    await api.updateMe({
      state: state.trim(),
      city: city.trim(),
      current_state: currentState.trim(),
      current_city: currentCity.trim(),
      current_locality: currentLocality.trim(),
      languages,
      budget_min: Number(bmin),
      budget_max: Number(bmax),
      localities,
      move_in: moveIn,
      listing_type: listingType,
      bio: bio.trim() || null,
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
      subtitle="Step 2 of 3"
      step={2} total={3}
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
      {cityOptions ? (
        <Pressable
          style={styles.dropdownBtn}
          onPress={() => setModalOpen("city")}
          testID="city-picker"
        >
          <Ionicons name="business-outline" size={16} color={city ? C.cyan : C.onSurfaceTertiary} />
          <Text style={[styles.dropdownText, !city && styles.placeholder]}>
            {city || "Select your home city"}
          </Text>
          <Ionicons name="chevron-down" size={16} color={C.onSurfaceTertiary} />
        </Pressable>
      ) : (
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder={state ? "e.g. your city or town..." : "Select a state first, or type your city..."}
          placeholderTextColor={C.onSurfaceTertiary}
          style={styles.input}
          testID="city-input"
        />
      )}
      {state && city && (
        <View style={styles.homePill}>
          <Text style={styles.homePillText}>🏙️ {city}, {state}</Text>
        </View>
      )}

      {/* ── Currently Living ──────────────────────────────── */}
      <View style={styles.cityBanner}>
        <Text style={styles.cityBannerText}>
          🏙️ Where do you live right now? Used for location-based roommate matching.
        </Text>
      </View>

      <Text style={styles.label}>Currently Living State <Text style={styles.req}>*</Text></Text>
      <Pressable
        style={styles.dropdownBtn}
        onPress={() => setModalOpen("currentState")}
        testID="current-state-picker"
      >
        <Ionicons name="location-outline" size={16} color={currentState ? C.cyan : C.onSurfaceTertiary} />
        <Text style={[styles.dropdownText, !currentState && styles.placeholder]}>
          {currentState || "Select your current state"}
        </Text>
        <Ionicons name="chevron-down" size={16} color={C.onSurfaceTertiary} />
      </Pressable>

      <Text style={styles.label}>Currently Living City <Text style={styles.req}>*</Text></Text>
      {currentCityOptions ? (
        <Pressable
          style={styles.dropdownBtn}
          onPress={() => setModalOpen("currentCity")}
          testID="current-city-picker"
        >
          <Ionicons name="business-outline" size={16} color={currentCity ? C.cyan : C.onSurfaceTertiary} />
          <Text style={[styles.dropdownText, !currentCity && styles.placeholder]}>
            {currentCity || "Select your current city"}
          </Text>
          <Ionicons name="chevron-down" size={16} color={C.onSurfaceTertiary} />
        </Pressable>
      ) : (
        <TextInput
          value={currentCity}
          onChangeText={setCurrentCity}
          placeholder={currentState ? "e.g. your city or town..." : "Select a state first, or type your city..."}
          placeholderTextColor={C.onSurfaceTertiary}
          style={styles.input}
          testID="current-city-input"
        />
      )}

      <Text style={styles.label}>Currently Living Locality <Text style={styles.req}>*</Text></Text>
      {currentCity === "Bangalore" ? (
        <Pressable
          style={styles.dropdownBtn}
          onPress={() => setModalOpen("currentLocality")}
          testID="current-locality-picker"
        >
          <Ionicons name="map-outline" size={16} color={currentLocality ? C.cyan : C.onSurfaceTertiary} />
          <Text style={[styles.dropdownText, !currentLocality && styles.placeholder]}>
            {currentLocality || "Select your locality"}
          </Text>
          <Ionicons name="chevron-down" size={16} color={C.onSurfaceTertiary} />
        </Pressable>
      ) : (
        <TextInput
          value={currentLocality}
          onChangeText={setCurrentLocality}
          placeholder="e.g., Indiranagar"
          placeholderTextColor={C.onSurfaceTertiary}
          style={styles.input}
          testID="current-locality-input"
        />
      )}
      {currentCity && (
        <View style={styles.homePill}>
          <Text style={styles.homePillText}>
            🏙️ {[currentLocality, currentCity, currentState].filter(Boolean).join(", ")}
          </Text>
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

      {/* ── Modals ───────────────────────────────────────── */}
      <PickerModal
        visible={modalOpen === "state"}
        title="Home State"
        items={INDIAN_STATES}
        selected={state}
        onClose={() => setModalOpen(null)}
        onSelect={(v) => {
          if (v !== state) setCity("");
          setState(v);
          setModalOpen(null);
        }}
      />

      <PickerModal
        visible={modalOpen === "city"}
        title="Home City"
        items={cityOptions ?? []}
        selected={city}
        onClose={() => setModalOpen(null)}
        onSelect={(v) => { setCity(v); setModalOpen(null); }}
      />

      <PickerModal
        visible={modalOpen === "currentState"}
        title="Currently Living State"
        items={INDIAN_STATES}
        selected={currentState}
        onClose={() => setModalOpen(null)}
        onSelect={(v) => {
          if (v !== currentState) { setCurrentCity(""); setCurrentLocality(""); }
          setCurrentState(v);
          setModalOpen(null);
        }}
      />

      <PickerModal
        visible={modalOpen === "currentCity"}
        title="Currently Living City"
        items={currentCityOptions ?? []}
        selected={currentCity}
        onClose={() => setModalOpen(null)}
        onSelect={(v) => {
          if (v !== currentCity) setCurrentLocality("");
          setCurrentCity(v);
          setModalOpen(null);
        }}
      />

      <PickerModal
        visible={modalOpen === "currentLocality"}
        title="Currently Living Locality"
        items={ACTIVE_LOCALITIES}
        selected={currentLocality}
        onClose={() => setModalOpen(null)}
        onSelect={(v) => { setCurrentLocality(v); setModalOpen(null); }}
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
    backgroundColor: "rgba(255,193,7,0.12)", borderRadius: R.pill,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: C.borderCoral,
  },
  homePillText: { color: "#8A6200", fontSize: 13, fontWeight: "700" },
  selectedChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,193,7,0.14)", borderRadius: R.pill,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: C.borderCoral,
  },
  selectedChipText: { color: "#8A6200", fontSize: 12, fontWeight: "600" },
  bigChoice: { backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg },
  bigChoiceActive: { backgroundColor: C.brandTint, borderColor: C.brand },
  bigTitle: { fontSize: 16, fontWeight: "700", color: C.onSurface },
  bigSub: { fontSize: 13, color: C.onSurfaceSecondary, marginTop: 4 },
  charCount: { fontSize: 11, color: C.onSurfaceTertiary, textAlign: "right", marginTop: 4 },
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
  itemSelected: { backgroundColor: "rgba(23,162,184,0.08)" },
  itemText: { color: C.onSurfaceSecondary, fontSize: 15 },
  itemTextSelected: { color: C.brand, fontWeight: "700" },
  empty: { color: C.onSurfaceTertiary, textAlign: "center", padding: 24, fontSize: 14 },
  doneBtn: {
    margin: 12, backgroundColor: C.brand, borderRadius: R.pill,
    paddingVertical: 14, alignItems: "center",
  },
  doneBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
});
