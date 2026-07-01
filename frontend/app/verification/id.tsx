import { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { C, R, S } from "@/src/theme/colors";

type VerifStatus = "idle" | "loading" | "verified" | "pending" | "error";

export default function IDVerificationScreen() {
  const router = useRouter();
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [status, setStatus] = useState<VerifStatus>("idle");
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const pickFromGallery = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow photo access to upload your ID."); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.85, base64: true,
    });
    if (!res.canceled) setImage(res.assets[0]);
  }, []);

  const takePhoto = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow camera access to photograph your ID."); return; }
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [4, 3], quality: 0.85, base64: true,
    });
    if (!res.canceled) setImage(res.assets[0]);
  }, []);

  const submit = useCallback(async () => {
    if (!image?.base64) return;
    setStatus("loading");
    try {
      const data = await api.verifyId(`data:image/jpeg;base64,${image.base64}`);
      if (data.status === "verified") {
        setStatus("verified");
        setResultMsg(data.message ?? "Your ID is verified!");
        setTimeout(() => router.back(), 2500);
      } else {
        setStatus("pending");
        setResultMsg(data.message ?? "Your ID will be reviewed within 24 hours.");
      }
    } catch (e: any) {
      setStatus("error");
      setResultMsg(e.message ?? "Upload failed. Please try again.");
    }
  }, [image, router]);

  const isLoading = status === "loading";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>🆔 ID Verification</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>🛡️</Text>
          <Text style={styles.heroTitle}>Verify your identity</Text>
          <Text style={styles.heroSub}>
            Verified members get <Text style={{ color: C.cyan, fontWeight: "800" }}>40% more matches</Text> and unlock the Verified badge.
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsCard}>
          <Text style={styles.cardTitle}>✅ Benefits</Text>
          {[
            ["🎯", "40% more matches from other verified users"],
            ["🛡️", "Build instant trust with potential roommates"],
            ["⭐", "Verified badge on your profile"],
            ["📈", "Priority in discover feed"],
          ].map(([icon, text]) => (
            <View key={text} style={styles.benefitRow}>
              <Text style={{ fontSize: 18 }}>{icon}</Text>
              <Text style={styles.benefitText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Upload area */}
        {!image ? (
          <View style={styles.uploadCard}>
            <Ionicons name="cloud-upload-outline" size={48} color={C.onSurfaceTertiary} />
            <Text style={styles.uploadTitle}>Upload your government ID</Text>
            <Text style={styles.uploadSub}>Aadhaar · PAN · Driving Licence · Passport</Text>
            <View style={styles.btnRow}>
              <Pressable style={styles.primaryBtn} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Camera</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={pickFromGallery}>
                <Ionicons name="image-outline" size={18} color={C.cyan} />
                <Text style={styles.secondaryBtnText}>Gallery</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.previewCard}>
            <Image source={{ uri: image.uri }} style={styles.previewImg} resizeMode="cover" />
            <Pressable style={styles.changePill} onPress={() => { setImage(null); setStatus("idle"); }}>
              <Ionicons name="refresh-outline" size={14} color={C.cyan} />
              <Text style={styles.changePillText}>Change photo</Text>
            </Pressable>
          </View>
        )}

        {/* Status result */}
        {(status === "verified" || status === "pending" || status === "error") && resultMsg && (
          <View style={[
            styles.resultCard,
            status === "verified" ? styles.resultVerified :
            status === "pending"  ? styles.resultPending  : styles.resultError,
          ]}>
            <Text style={styles.resultIcon}>
              {status === "verified" ? "✅" : status === "pending" ? "⏳" : "❌"}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultTitle}>
                {status === "verified" ? "Verified!" : status === "pending" ? "Under Review" : "Upload Failed"}
              </Text>
              <Text style={styles.resultMsg}>{resultMsg}</Text>
            </View>
          </View>
        )}

        {/* Submit button */}
        {image && status !== "verified" && (
          <Pressable
            style={[styles.submitBtn, isLoading && { opacity: 0.7 }]}
            onPress={submit}
            disabled={isLoading}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>Submit for Verification</Text>
                </>
            }
          </Pressable>
        )}

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.cardTitle}>💡 Photo tips</Text>
          {[
            "Good, even lighting — no flash glare",
            "All four corners of the ID visible",
            "Text must be clearly readable",
            "No blurring or shadows on the ID",
          ].map((t) => (
            <View key={t} style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={15} color={C.success} />
              <Text style={styles.tipText}>{t}</Text>
            </View>
          ))}
        </View>

        {/* Privacy note */}
        <View style={styles.privacyCard}>
          <Ionicons name="lock-closed-outline" size={18} color={C.coral} />
          <Text style={styles.privacyText}>
            Your ID photo is encrypted in transit and used only for verification. It is never shared with other users or stored longer than necessary.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: S.lg, paddingVertical: 14,
    backgroundColor: C.surfaceSecondary,
    borderBottomWidth: 1, borderBottomColor: C.borderCyan,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.surfaceGlass, borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: C.onSurface, letterSpacing: 0.3 },

  scroll: { padding: S.xl, gap: 16, paddingBottom: S.xxxl },

  // Hero
  heroCard: {
    backgroundColor: C.surfaceSecondary, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.borderCyan,
    padding: 24, alignItems: "center", gap: 10,
    shadowColor: C.cyan, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.18, shadowRadius: 16,
  },
  heroEmoji: { fontSize: 40 },
  heroTitle: { fontSize: 20, fontWeight: "900", color: C.onSurface, letterSpacing: 0.3 },
  heroSub: { fontSize: 14, color: C.onSurfaceSecondary, textAlign: "center", lineHeight: 20 },

  // Benefits
  benefitsCard: {
    backgroundColor: "rgba(0,217,255,0.07)", borderRadius: R.lg,
    borderWidth: 1, borderColor: "rgba(0,217,255,0.35)", padding: 18, gap: 10,
  },
  cardTitle: { fontSize: 13, fontWeight: "800", color: C.cyan, letterSpacing: 0.5, marginBottom: 4 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  benefitText: { flex: 1, fontSize: 13, color: C.onSurfaceSecondary, lineHeight: 18 },

  // Upload
  uploadCard: {
    backgroundColor: C.surfaceSecondary, borderRadius: R.lg,
    borderWidth: 2, borderColor: C.border, borderStyle: "dashed",
    padding: 32, alignItems: "center", gap: 12,
  },
  uploadTitle: { fontSize: 16, fontWeight: "700", color: C.onSurface },
  uploadSub: { fontSize: 12, color: C.onSurfaceTertiary, textAlign: "center" },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.coral, paddingHorizontal: 22, paddingVertical: 12,
    borderRadius: R.pill,
    shadowColor: C.coral, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 10,
    elevation: 8,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  secondaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "transparent", paddingHorizontal: 22, paddingVertical: 12,
    borderRadius: R.pill, borderWidth: 1.5, borderColor: C.borderCyan,
  },
  secondaryBtnText: { color: C.cyan, fontWeight: "700", fontSize: 14 },

  // Preview
  previewCard: {
    borderRadius: R.lg, overflow: "hidden",
    borderWidth: 2, borderColor: C.borderCyan,
  },
  previewImg: { width: "100%", height: 240 },
  changePill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.surfaceSecondary, justifyContent: "center",
    paddingVertical: 10,
  },
  changePillText: { color: C.cyan, fontSize: 13, fontWeight: "700" },

  // Result
  resultCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    borderRadius: R.lg, borderWidth: 1.5, padding: 16,
  },
  resultVerified: { backgroundColor: "rgba(0,245,160,0.1)", borderColor: C.success },
  resultPending:  { backgroundColor: "rgba(234,179,8,0.1)",  borderColor: "#EAB308" },
  resultError:    { backgroundColor: "rgba(239,68,68,0.1)",  borderColor: C.error },
  resultIcon: { fontSize: 22 },
  resultTitle: { fontSize: 14, fontWeight: "800", color: C.onSurface, marginBottom: 4 },
  resultMsg: { fontSize: 13, color: C.onSurfaceSecondary, lineHeight: 18 },

  // Submit
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: C.coral, paddingVertical: 16, borderRadius: R.pill,
    borderWidth: 2, borderColor: C.borderCyan,
    shadowColor: C.coral, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.65, shadowRadius: 14,
    elevation: 10,
  },
  submitBtnText: { color: "#fff", fontWeight: "900", fontSize: 15, letterSpacing: 0.4 },

  // Tips
  tipsCard: {
    backgroundColor: "rgba(157,78,221,0.08)", borderRadius: R.lg,
    borderWidth: 1, borderColor: "rgba(157,78,221,0.35)", padding: 18, gap: 10,
  },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  tipText: { flex: 1, fontSize: 13, color: C.onSurfaceSecondary },

  // Privacy
  privacyCard: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    backgroundColor: "rgba(255,0,110,0.06)", borderRadius: R.lg,
    borderWidth: 1, borderColor: "rgba(255,0,110,0.25)", padding: 16,
  },
  privacyText: { flex: 1, fontSize: 12, color: C.onSurfaceTertiary, lineHeight: 18 },
});
