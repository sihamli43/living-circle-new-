import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api } from "@/src/api/client";
import { C, R, S } from "@/src/theme/colors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) {
      setErr("Enter a valid email address");
      return;
    }
    if (!agreed) {
      setErr("Please agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await api.sendCode(e);
      router.push({
        pathname: "/auth/otp",
        params: { email: e, devCode: res.dev_code ?? "" },
      });
    } catch (ex: any) {
      const msg = String(ex?.message || "");
      if (msg.startsWith("429")) setErr("Please wait a minute before requesting another code.");
      else if (msg.includes("cannot log in")) setErr("This email cannot be used for sign-in.");
      else setErr("Couldn't send the code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <LinearGradient colors={["#FD5564", "#FF7847", "#231E2E"]} style={styles.hero}>
        <Text style={styles.brand} testID="brand-name">Living Circle</Text>
        <Text style={styles.tag}>Find your people, find your place.</Text>
      </LinearGradient>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.body}
      >
        <View style={{ flex: 1, paddingHorizontal: S.xl }}>
          <Text style={styles.h1}>Enter your email</Text>
          <Text style={styles.sub}>We&apos;ll send you a 6-digit sign-in code.</Text>
          <TextInput
            testID="email-input"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={C.onSurfaceTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            style={styles.input}
          />
          {err && <Text testID="email-error" style={styles.err}>{err}</Text>}

          {/* Terms & Privacy consent checkbox */}
          <Pressable
            testID="terms-agree-checkbox"
            onPress={() => setAgreed((v) => !v)}
            style={styles.checkRow}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Ionicons name="checkmark" size={14} color={C.onBrand} />}
            </View>
            <Text style={styles.checkLabel}>
              I agree to the{" "}
              <Text
                style={styles.checkLink}
                onPress={() => router.push("/legal/terms")}
              >
                Terms of Service
              </Text>
              {" "}and{" "}
              <Text
                style={styles.checkLink}
                onPress={() => router.push("/legal/privacy")}
              >
                Privacy Policy
              </Text>
            </Text>
          </Pressable>
        </View>

        <Pressable
          testID="email-continue-button"
          onPress={submit}
          disabled={loading}
          style={({ pressed }) => [
            styles.cta,
            (!agreed) && styles.ctaDisabled,
            pressed && agreed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.ctaText}>{loading ? "Sending…" : "Continue"}</Text>
        </Pressable>

        <Text style={styles.legalFooter}>
          © 2026 Living Circle · Bangalore, India
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#181520" },
  hero: { paddingHorizontal: S.xl, paddingVertical: S.xxl, alignItems: "flex-start" },
  brand: { fontSize: 32, fontWeight: "900", color: "#FFFFFF", letterSpacing: 1 },
  tag: { fontSize: 16, color: C.onSurfaceSecondary, marginTop: S.sm },
  body: { flex: 1, paddingTop: S.xxl },
  h1: { fontSize: 24, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.3 },
  sub: { fontSize: 14, color: C.onSurfaceSecondary, marginTop: S.sm, marginBottom: S.xl },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: R.md,
    paddingHorizontal: S.lg,
    paddingVertical: S.lg,
    fontSize: 17,
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(253,85,100,0.35)",
  },
  err: { color: C.error, marginTop: S.md, fontSize: 14 },
  checkRow: {
    flexDirection: "row", alignItems: "flex-start", gap: S.md,
    marginTop: S.lg,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: "rgba(253,85,100,0.45)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center", justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: "#FD5564", borderColor: "#FD5564" },
  checkLabel: { flex: 1, fontSize: 14, color: "#FFFFFF", lineHeight: 20 },
  checkLink: { color: "#FF9A53", fontWeight: "700", textDecorationLine: "underline" },
  cta: {
    margin: S.xl,
    marginBottom: S.sm,
    backgroundColor: "#FD5564",
    paddingVertical: S.lg,
    borderRadius: R.pill,
    alignItems: "center",
    shadowColor: "#FD5564",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  ctaDisabled: { backgroundColor: "rgba(255,255,255,0.15)", shadowOpacity: 0 },
  ctaText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  legalFooter: {
    textAlign: "center",
    fontSize: 11,
    color: C.onSurfaceTertiary,
    marginBottom: S.lg,
  },
});
