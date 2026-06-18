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
      <LinearGradient colors={[C.brandTint, C.surface]} style={styles.hero}>
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
  safe: { flex: 1, backgroundColor: C.surface },
  hero: { paddingHorizontal: S.xl, paddingVertical: S.xxl, alignItems: "flex-start" },
  brand: { fontSize: 32, fontWeight: "800", color: C.brand, letterSpacing: -0.5 },
  tag: { fontSize: 16, color: C.onSurfaceSecondary, marginTop: S.sm },
  body: { flex: 1, paddingTop: S.xxl },
  h1: { fontSize: 24, fontWeight: "700", color: C.onSurface },
  sub: { fontSize: 14, color: C.onSurfaceSecondary, marginTop: S.sm, marginBottom: S.xl },
  input: {
    backgroundColor: C.surfaceSecondary,
    borderRadius: R.md,
    paddingHorizontal: S.lg,
    paddingVertical: S.lg,
    fontSize: 17,
    color: C.onSurface,
    borderWidth: 1,
    borderColor: C.border,
  },
  err: { color: C.error, marginTop: S.md, fontSize: 14 },
  checkRow: {
    flexDirection: "row", alignItems: "flex-start", gap: S.md,
    marginTop: S.lg,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.surfaceSecondary,
    alignItems: "center", justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: C.brand, borderColor: C.brand },
  checkLabel: { flex: 1, fontSize: 14, color: C.onSurfaceSecondary, lineHeight: 20 },
  checkLink: { color: C.brand, fontWeight: "700", textDecorationLine: "underline" },
  cta: {
    margin: S.xl,
    marginBottom: S.sm,
    backgroundColor: C.brand,
    paddingVertical: S.lg,
    borderRadius: R.pill,
    alignItems: "center",
  },
  ctaDisabled: { backgroundColor: C.borderStrong },
  ctaText: { color: C.onBrand, fontSize: 17, fontWeight: "700" },
  legalFooter: {
    textAlign: "center",
    fontSize: 11,
    color: C.onSurfaceTertiary,
    marginBottom: S.lg,
  },
});
