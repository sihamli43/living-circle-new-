import { useState } from "react";
import { useRouter } from "expo-router";
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Chip, ChipRow } from "@/src/components/OnboardScreen";
import { api } from "@/src/api/client";
import { pickImage } from "@/src/utils/pickImage";
import { C, R, S } from "@/src/theme/colors";

const FURN = ["Furnished", "Semi-furnished", "Unfurnished"];
const AMEN = ["Lift", "Parking", "Power backup", "Water supply", "AC", "WiFi", "Washing machine"];
const PROP = ["PG", "Independent"];
const POSTED = ["Owner", "Broker", "Tenant"];

type Photo = { label: string; photo: string };

const REQUIRED_LABELS = ["Kitchen", "Bedroom/Room", "Bathroom", "Hall/Living area"] as const;
type RequiredLabel = typeof REQUIRED_LABELS[number];

const PHOTO_META: Record<RequiredLabel, { emoji: string; hint: string }> = {
  "Kitchen":          { emoji: "🍳", hint: "Show stove, counter & storage" },
  "Bedroom/Room":     { emoji: "🛏️", hint: "Full room view with bed & space" },
  "Bathroom":         { emoji: "🚿", hint: "Clean shot of bathroom & fixtures" },
  "Hall/Living area": { emoji: "🏠", hint: "Common area or living room" },
};

export default function ListingForm() {
  const router = useRouter();
  const [rent, setRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [maint, setMaint] = useState("");
  const [furn, setFurn] = useState<string | null>(null);
  const [amen, setAmen] = useState<string[]>([]);
  const [prop, setProp] = useState<string | null>(null);
  const [posted, setPosted] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [description, setDescription] = useState("");

  // Photo source modal state.
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const toggleAmen = (a: string) =>
    setAmen((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));

  const uploadedLabels = new Set(photos.map((p) => p.label));
  const allRequiredUploaded = REQUIRED_LABELS.every((l) => uploadedLabels.has(l));
  const valid = Number(rent) > 0 && Number(deposit) >= 0 && furn && prop && posted && allRequiredUploaded;

  // Photo slots: 3 required + everything beyond is "Other"
  const slots: { label: string; idx: number | null }[] = [];
  for (const lbl of REQUIRED_LABELS) {
    const idx = photos.findIndex((p) => p.label === lbl);
    slots.push({ label: lbl, idx: idx >= 0 ? idx : null });
  }
  photos.forEach((p, i) => {
    if (!REQUIRED_LABELS.includes(p.label)) {
      slots.push({ label: p.label, idx: i });
    }
  });

  const openPicker = (label: string, idx: number | null) => {
    setPendingLabel(label);
    setEditIdx(idx);
  };

  const closePicker = () => {
    setPendingLabel(null);
    setEditIdx(null);
  };

  const choose = async (source: "library" | "camera") => {
    if (!pendingLabel) return;
    const uri = await pickImage(source);
    if (!uri) { closePicker(); return; }
    setPhotos((prev) => {
      if (editIdx != null) {
        const next = [...prev];
        next[editIdx] = { label: pendingLabel, photo: uri };
        return next;
      }
      return [...prev, { label: pendingLabel, photo: uri }];
    });
    closePicker();
  };

  const removeAt = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    closePicker();
  };

  const onFinish = async () => {
    if (!valid) return;
    await api.updateMe({
      listing: {
        rent: Number(rent),
        deposit: Number(deposit || 0),
        maintenance: Number(maint || 0),
        furnished: furn,
        amenities: amen,
        property_type: prop,
        posted_by: posted,
        photos,
        description: description.trim() || null,
      },
      onboarded: true,
    });
    router.replace("/(tabs)/discover");
  };

  return (
    <Screen
      testID="onboard-listing"
      title="Tell us about your place"
      subtitle="Step 4 of 4"
      step={4} total={4}
      onBack={() => router.back()}
      cta="Finish & Discover"
      ctaDisabled={!valid}
      onCta={onFinish}
    >
      <Text style={styles.label}>Room photos <Text style={styles.requiredTag}>· all 4 required</Text></Text>
      <View style={styles.qualityBanner}>
        <Ionicons name="bulb-outline" size={15} color={C.coral} />
        <Text style={styles.qualityText}>
          Upload clear, well-lit photos of key areas. Good lighting helps roommates decide faster.
        </Text>
      </View>

      {/* Required photo checklist */}
      {REQUIRED_LABELS.map((label) => {
        const idx = photos.findIndex((p) => p.label === label);
        const uploaded = photos[idx] ?? null;
        const meta = PHOTO_META[label];
        const done = uploaded !== null;
        return (
          <Pressable
            key={label}
            testID={`photo-slot-${label}`}
            onPress={() => openPicker(label, done ? idx : null)}
            style={[styles.photoRow, done && styles.photoRowDone]}
          >
            {done ? (
              <Image source={{ uri: uploaded.photo }} style={styles.photoThumb} />
            ) : (
              <View style={styles.photoThumbEmpty}>
                <Text style={styles.photoThumbEmoji}>{meta.emoji}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.photoRowLabel}>{meta.emoji} {label}</Text>
                {done && <Ionicons name="checkmark-circle" size={16} color={C.success} />}
              </View>
              <Text style={styles.photoRowHint}>{done ? "Tap to replace" : meta.hint}</Text>
            </View>
            <Ionicons
              name={done ? "pencil" : "add-circle-outline"}
              size={22}
              color={done ? C.brand : C.onSurfaceTertiary}
            />
          </Pressable>
        );
      })}

      {/* Extra photos */}
      <Pressable
        testID="photo-add-other"
        onPress={() => openPicker("Other", null)}
        style={styles.addMoreBtn}
      >
        <Ionicons name="add-circle-outline" size={20} color={C.brand} />
        <Text style={styles.addMoreText}>Add extra photos (optional)</Text>
      </Pressable>

      <Text style={styles.photoCount}>
        {REQUIRED_LABELS.filter((l) => uploadedLabels.has(l)).length}/4 required ·{" "}
        {allRequiredUploaded ? "✓ all set" : "upload all 4 to continue"}
      </Text>

      <Text style={styles.label}>Monthly rent (₹)</Text>
      <TextInput testID="rent-input" value={rent} onChangeText={(t) => setRent(t.replace(/\D/g, ""))} keyboardType="number-pad" style={styles.input} placeholder="20000" placeholderTextColor={C.onSurfaceTertiary} />

      <Text style={styles.label}>Deposit (₹)</Text>
      <TextInput testID="deposit-input" value={deposit} onChangeText={(t) => setDeposit(t.replace(/\D/g, ""))} keyboardType="number-pad" style={styles.input} placeholder="40000" placeholderTextColor={C.onSurfaceTertiary} />

      <Text style={styles.label}>Maintenance (₹/month)</Text>
      <TextInput testID="maint-input" value={maint} onChangeText={(t) => setMaint(t.replace(/\D/g, ""))} keyboardType="number-pad" style={styles.input} placeholder="1500" placeholderTextColor={C.onSurfaceTertiary} />

      <Text style={styles.label}>Furnished status</Text>
      <ChipRow>{FURN.map((f) => <Chip key={f} label={f} active={furn === f} onPress={() => setFurn(f)} testID={`furn-${f}`} />)}</ChipRow>

      <Text style={styles.label}>Amenities</Text>
      <ChipRow>{AMEN.map((a) => <Chip key={a} label={a} active={amen.includes(a)} onPress={() => toggleAmen(a)} testID={`amen-${a}`} />)}</ChipRow>

      <Text style={styles.label}>Property type</Text>
      <ChipRow>{PROP.map((p) => <Chip key={p} label={p} active={prop === p} onPress={() => setProp(p)} testID={`prop-${p}`} />)}</ChipRow>

      <Text style={styles.label}>Posted by</Text>
      <ChipRow>{POSTED.map((p) => <Chip key={p} label={p} active={posted === p} onPress={() => setPosted(p)} testID={`posted-${p}`} />)}</ChipRow>

      <Text style={styles.label}>Describe the place <Text style={styles.optional}>(optional)</Text></Text>
      <TextInput
        testID="description-input"
        value={description}
        onChangeText={setDescription}
        placeholder="Vibe, locality, who you're looking for, anything important…"
        placeholderTextColor={C.onSurfaceTertiary}
        multiline
        numberOfLines={4}
        maxLength={500}
        style={[styles.input, { height: 110, textAlignVertical: "top", paddingTop: S.md }]}
      />
      <Text style={styles.charCount}>{description.length}/500</Text>

      <Modal visible={!!pendingLabel} transparent animationType="fade" onRequestClose={closePicker}>
        <Pressable style={styles.modalBackdrop} onPress={closePicker}>
          <View style={styles.sourceSheet}>
            <Text style={styles.sourceTitle}>{editIdx != null ? "Replace photo" : "Add photo"}: {pendingLabel}</Text>
            <Pressable style={styles.sourceItem} onPress={() => choose("library")} testID="pick-library">
              <Ionicons name="images-outline" size={22} color={C.brand} />
              <Text style={styles.sourceText}>Choose from gallery</Text>
            </Pressable>
            <Pressable style={styles.sourceItem} onPress={() => choose("camera")} testID="pick-camera">
              <Ionicons name="camera-outline" size={22} color={C.brand} />
              <Text style={styles.sourceText}>Take a photo</Text>
            </Pressable>
            {editIdx != null && (
              <Pressable style={styles.sourceItem} onPress={() => removeAt(editIdx)} testID="pick-remove">
                <Ionicons name="trash-outline" size={22} color={C.error} />
                <Text style={[styles.sourceText, { color: C.error }]}>Remove this photo</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, color: C.onSurfaceSecondary, marginTop: S.lg, marginBottom: S.sm, fontWeight: "600" },
  optional: { fontSize: 12, color: C.onSurfaceTertiary, fontWeight: "500" },
  requiredTag: { fontSize: 12, color: C.coral, fontWeight: "700" },
  input: {
    backgroundColor: C.surfaceSecondary, borderRadius: R.md, paddingHorizontal: S.lg, paddingVertical: S.md,
    fontSize: 16, color: C.onSurface, borderWidth: 1, borderColor: C.border,
  },
  hint: { fontSize: 12, color: C.onSurfaceTertiary, marginBottom: S.md },
  qualityBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: S.sm,
    backgroundColor: "#FFF7ED",
    borderRadius: R.md, padding: S.md, marginBottom: S.md,
    borderWidth: 1, borderColor: "#FED7AA",
  },
  qualityText: { flex: 1, fontSize: 12, color: "#92400E", lineHeight: 17 },
  photoRow: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    backgroundColor: C.surfaceSecondary,
    borderRadius: R.md, padding: S.md, marginBottom: S.sm,
    borderWidth: 1, borderColor: C.border,
  },
  photoRowDone: { borderColor: C.brand, backgroundColor: C.brandTint },
  photoThumb: { width: 72, height: 72, borderRadius: R.sm },
  photoThumbEmpty: {
    width: 72, height: 72, borderRadius: R.sm,
    backgroundColor: C.surfaceTertiary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.border, borderStyle: "dashed",
  },
  photoThumbEmoji: { fontSize: 28 },
  photoRowLabel: { fontSize: 14, fontWeight: "700", color: C.onSurface },
  photoRowHint: { fontSize: 12, color: C.onSurfaceSecondary, marginTop: 2 },
  addMoreBtn: {
    flexDirection: "row", alignItems: "center", gap: S.sm,
    paddingVertical: S.md, paddingHorizontal: S.md,
    borderRadius: R.md, borderWidth: 1, borderColor: C.border,
    borderStyle: "dashed", marginTop: S.sm,
  },
  addMoreText: { fontSize: 14, color: C.brand, fontWeight: "600" },
  photoCount: { fontSize: 12, color: C.onSurfaceTertiary, marginTop: S.sm, marginBottom: S.sm },
  charCount: { fontSize: 11, color: C.onSurfaceTertiary, textAlign: "right", marginTop: 4 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sourceSheet: { backgroundColor: C.surface, padding: S.lg, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sourceTitle: { fontSize: 14, fontWeight: "700", color: C.onSurface, padding: S.md, marginBottom: 4 },
  sourceItem: { flexDirection: "row", alignItems: "center", gap: S.lg, paddingVertical: S.lg, paddingHorizontal: S.md },
  sourceText: { fontSize: 16, fontWeight: "600", color: C.onSurface },
});
