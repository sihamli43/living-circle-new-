import { useEffect, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Screen, Chip, ChipRow } from "@/src/components/OnboardScreen";
import { Avatar } from "@/src/components/Avatar";
import { api } from "@/src/api/client";
import { pickImage } from "@/src/utils/pickImage";
import { C, R, S } from "@/src/theme/colors";
import { TextInput } from "react-native";

const GENDERS = ["Female", "Male", "Non-binary", "Other"];
const OCCS = [
  { v: "student", label: "Student" },
  { v: "professional", label: "Professional" },
];

export default function ProfileBasics() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [occupation, setOccupation] = useState<string | null>(null);
  const [org, setOrg] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    api.me().then((m) => {
      if (m.name) setName(m.name);
      if (m.age) setAge(String(m.age));
      if (m.gender) setGender(m.gender);
      if (m.occupation) setOccupation(m.occupation);
      if (m.org) setOrg(m.org);
      if (m.photo) setPhoto(m.photo);
    }).catch(() => {});
  }, []);

  const valid = !!(name.trim() && age && Number(age) >= 18 && gender && occupation && org.trim());

  const onNext = async () => {
    if (!valid) return;
    await api.updateMe({
      name: name.trim(), age: Number(age), gender, occupation, org: org.trim(), photo,
    });
    router.push("/onboarding/details");
  };

  const choose = async (source: "library" | "camera") => {
    setShowSource(false);
    const uri = await pickImage(source);
    if (uri) setPhoto(uri);
  };

  return (
    <Screen
      testID="onboard-profile"
      title="Tell us about you"
      subtitle="Step 1 of 4"
      step={1} total={4}
      cta="Continue" ctaDisabled={!valid} onCta={onNext}
    >
      <View style={styles.photoWrap}>
        <Pressable
          testID="photo-picker"
          onPress={() => setShowSource(true)}
          style={styles.photoBtn}
        >
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photoImg} />
          ) : (
            <Avatar name={name || "?"} size={120} />
          )}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={16} color={C.onBrand} />
          </View>
        </Pressable>
        <Text style={styles.photoHint}>
          {photo ? "Tap to change photo" : "Tap to add profile photo (optional)"}
        </Text>
      </View>

      <Text style={styles.localityHint}>
        Popular in your area: Koramangala, Indiranagar, Whitefield.
      </Text>

      <Text style={styles.label}>Full name</Text>
      <TextInput testID="name-input" value={name} onChangeText={setName} placeholder="e.g. Priya Iyer" placeholderTextColor={C.onSurfaceTertiary} style={styles.input} />
      <Text style={styles.label}>Age</Text>
      <TextInput testID="age-input" value={age} onChangeText={(t) => setAge(t.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" placeholder="25" placeholderTextColor={C.onSurfaceTertiary} style={styles.input} />
      <Text style={styles.label}>Gender</Text>
      <ChipRow>
        {GENDERS.map((g) => (
          <Chip key={g} label={g} active={gender === g} onPress={() => setGender(g)} testID={`gender-${g}`} />
        ))}
      </ChipRow>
      <Text style={styles.label}>I am a</Text>
      <ChipRow>
        {OCCS.map((o) => (
          <Chip key={o.v} label={o.label} active={occupation === o.v} onPress={() => setOccupation(o.v)} testID={`occ-${o.v}`} />
        ))}
      </ChipRow>
      <Text style={styles.label}>{occupation === "student" ? "College" : "Company"}</Text>
      <TextInput testID="org-input" value={org} onChangeText={setOrg} placeholder={occupation === "student" ? "IIT Bombay" : "Razorpay"} placeholderTextColor={C.onSurfaceTertiary} style={styles.input} />

      <Modal visible={showSource} transparent animationType="fade" onRequestClose={() => setShowSource(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowSource(false)}>
          <View style={styles.sourceSheet}>
            <Pressable style={styles.sourceItem} onPress={() => choose("library")} testID="pick-library">
              <Ionicons name="images-outline" size={22} color={C.brand} />
              <Text style={styles.sourceText}>Choose from gallery</Text>
            </Pressable>
            <Pressable style={styles.sourceItem} onPress={() => choose("camera")} testID="pick-camera">
              <Ionicons name="camera-outline" size={22} color={C.brand} />
              <Text style={styles.sourceText}>Take a photo</Text>
            </Pressable>
            {photo && (
              <Pressable style={styles.sourceItem} onPress={() => { setPhoto(null); setShowSource(false); }} testID="pick-remove">
                <Ionicons name="trash-outline" size={22} color={C.error} />
                <Text style={[styles.sourceText, { color: C.error }]}>Remove photo</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoWrap: { alignItems: "center", marginBottom: S.lg },
  photoBtn: { position: "relative" },
  photoImg: { width: 120, height: 120, borderRadius: 60 },
  cameraBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.brand, alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: C.surface,
  },
  photoHint: { color: C.onSurfaceSecondary, fontSize: 13, marginTop: S.sm },
  localityHint: { fontSize: 12, color: C.coral, fontWeight: "600", textAlign: "center", marginBottom: S.sm },
  label: { fontSize: 14, color: C.onSurfaceSecondary, marginTop: S.lg, marginBottom: S.sm, fontWeight: "600" },
  input: {
    backgroundColor: C.surfaceSecondary, borderRadius: R.md,
    paddingHorizontal: S.lg, paddingVertical: S.md,
    fontSize: 16, color: C.onSurface, borderWidth: 1, borderColor: C.border,
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sourceSheet: { backgroundColor: C.surface, padding: S.lg, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sourceItem: { flexDirection: "row", alignItems: "center", gap: S.lg, paddingVertical: S.lg, paddingHorizontal: S.md },
  sourceText: { fontSize: 16, fontWeight: "600", color: C.onSurface },
});
