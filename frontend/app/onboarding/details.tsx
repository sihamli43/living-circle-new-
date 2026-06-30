import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Chip, ChipRow } from "@/src/components/OnboardScreen";
import { MonthYearPicker, PickerField } from "@/src/components/Pickers";
import { api } from "@/src/api/client";
import { ACTIVE_CITY, ACTIVE_LOCALITIES, C, R, S } from "@/src/theme/colors";

const LANGS = ["Hindi", "English", "Tamil", "Telugu", "Kannada", "Malayalam", "Marathi", "Bengali", "Gujarati", "Punjabi"];

export default function Details() {
  const router = useRouter();
  const [hometown] = useState(ACTIVE_CITY);
  const [languages, setLanguages] = useState<string[]>([]);
  const [bmin, setBmin] = useState("10000");
  const [bmax, setBmax] = useState("25000");
  const [localities, setLocalities] = useState<string[]>([]);
  const [moveIn, setMoveIn] = useState("");
  const [listingType, setListingType] = useState<"has_place" | "looking" | null>(null);
  const [bio, setBio] = useState("");
  const [workLocality, setWorkLocality] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState<null | "locality" | "movein">(null);

  useEffect(() => {
    api.me().then((m) => {
      if (m.languages?.length) setLanguages(m.languages);
      if (m.budget_min) setBmin(String(m.budget_min));
      if (m.budget_max) setBmax(String(m.budget_max));
      if (m.localities?.length) {
        setLocalities(m.localities.filter((l: string) => ACTIVE_LOCALITIES.includes(l)));
      }
      if (m.move_in) setMoveIn(m.move_in);
      if (m.listing_type) setListingType(m.listing_type);
      if (m.bio) setBio(m.bio);
      if (m.work_locality) setWorkLocality(m.work_locality);
    }).catch(() => {});
  }, []);

  const toggleLang = (l: string) =>
    setLanguages((p) => (p.includes(l) ? p.filter((x) => x !== l) : [...p, l]));

  const toggleLoc = (l: string) =>
    setLocalities((p) => (p.includes(l) ? p.filter((x) => x !== l) : [...p, l]));

  const valid =
    hometown.trim() &&
    languages.length > 0 &&
    Number(bmin) > 0 &&
    Number(bmax) > Number(bmin) &&
    localities.length > 0 &&
    moveIn.trim() &&
    listingType;

  const onNext = async () => {
    if (!valid) return;
    await api.updateMe({
      hometown: hometown.trim(),
      languages,
      budget_min: Number(bmin),
      budget_max: Number(bmax),
      localities,
      move_in: moveIn,
      listing_type: listingType,
      bio: bio.trim() || null,
      work_locality: workLocality || null,
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
      <View style={styles.cityBanner}>
        <Text style={styles.cityBannerText}>
          We&apos;re currently live in Bangalore. More cities coming soon!
        </Text>
      </View>

      <Text style={styles.label}>Hometown</Text>
      <View style={styles.cityBox} testID="hometown-display">
        <Ionicons name="location" size={18} color={C.brand} />
        <Text style={styles.cityText}>{ACTIVE_CITY}</Text>
      </View>

      <Text style={styles.localityHint}>
        Popular in your area: Koramangala, Indiranagar, Whitefield.
      </Text>

      <Text style={styles.label}>Languages</Text>
      <ChipRow>
        {LANGS.map((l) => (
          <Chip key={l} label={l} active={languages.includes(l)} onPress={() => toggleLang(l)} testID={`lang-${l}`} />
        ))}
      </ChipRow>

      <Text style={styles.label}>Monthly budget (₹)</Text>
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

      <Text style={styles.label}>Preferred localities</Text>
      <ChipRow>
        {ACTIVE_LOCALITIES.map((l) => (
          <Chip
            key={l}
            label={l}
            active={localities.includes(l)}
            onPress={() => toggleLoc(l)}
            testID={`loc-${l}`}
          />
        ))}
      </ChipRow>

      <Text style={styles.label}>Move-in date</Text>
      <PickerField
        testID="movein-picker"
        label="Month & Year"
        value={fmtMoveIn}
        placeholder="Select month and year"
        onPress={() => setPickerOpen("movein")}
      />

      <Text style={styles.label}>What brings you here?</Text>
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

      <Text style={styles.label}>
        Where do you work? <Text style={styles.optional}>(optional)</Text>
      </Text>
      <Text style={styles.workHint}>
        🗺️ Used to show commute distance in Location Explorer after matching
      </Text>
      <ChipRow>
        {ACTIVE_LOCALITIES.map((l) => (
          <Chip
            key={l}
            label={l}
            active={workLocality === l}
            onPress={() => setWorkLocality((p) => (p === l ? null : l))}
            testID={`workloc-${l}`}
          />
        ))}
      </ChipRow>

      <MonthYearPicker
        testID="movein-modal"
        visible={pickerOpen === "movein"}
        initial={moveIn}
        onClose={() => setPickerOpen(null)}
        onSelect={(v) => {
          setMoveIn(v);
          setPickerOpen(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, color: C.onSurfaceSecondary, marginTop: S.lg, marginBottom: S.sm, fontWeight: "600" },
  smallLabel: { fontSize: 12, color: C.onSurfaceTertiary, marginBottom: 4 },
  optional: { fontSize: 12, color: C.onSurfaceTertiary, fontWeight: "500" },
  cityBanner: {
    backgroundColor: C.brandTint,
    borderRadius: R.md,
    padding: S.md,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: S.sm,
  },
  cityBannerText: { fontSize: 13, color: C.onBrandTint, fontWeight: "600", lineHeight: 18 },
  cityBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    backgroundColor: C.surfaceSecondary,
    borderRadius: R.md,
    padding: S.lg,
    borderWidth: 1,
    borderColor: C.border,
  },
  cityText: { fontSize: 16, color: C.onSurface, fontWeight: "700" },
  localityHint: { fontSize: 12, color: C.coral, fontWeight: "600", marginTop: S.sm, lineHeight: 17 },
  input: {
    backgroundColor: C.surfaceSecondary, borderRadius: R.md,
    paddingHorizontal: S.lg, paddingVertical: S.md, fontSize: 16, color: C.onSurface,
    borderWidth: 1, borderColor: C.border,
  },
  bigChoice: { backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg },
  bigChoiceActive: { backgroundColor: C.brandTint, borderColor: C.brand },
  bigTitle: { fontSize: 16, fontWeight: "700", color: C.onSurface },
  bigSub: { fontSize: 13, color: C.onSurfaceSecondary, marginTop: 4 },
  charCount: { fontSize: 11, color: C.onSurfaceTertiary, textAlign: "right", marginTop: 4 },
  workHint: { fontSize: 12, color: C.cyan, fontWeight: "600", marginBottom: S.sm, lineHeight: 17 },
});
