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
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { api, setToken } from "@/src/api/client";
import { C, R, S } from "@/src/theme/colors";

export default function OtpScreen() {
  const router = useRouter();
  const { email, devCode } = useLocalSearchParams<{ email: string; devCode?: string }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (code.length !== 6) {
      setErr("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const res = await api.verifyCode(String(email), code);
      await setToken(res.token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(res.onboarded ? "/(tabs)/discover" : "/onboarding/profile");
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErr("Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, padding: S.xl }}>
          <Pressable onPress={() => router.back()} testID="otp-back">
            <Text style={{ color: C.brand, fontSize: 16, fontWeight: "600" }}>← Back</Text>
          </Pressable>
          <Text style={styles.h1}>Check your inbox</Text>
          <Text style={styles.sub}>
            We sent a 6-digit code to{"\n"}
            <Text style={styles.email}>{email}</Text>
          </Text>
          <TextInput
            testID="otp-input"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            placeholderTextColor={C.onSurfaceTertiary}
            keyboardType="number-pad"
            style={styles.input}
            maxLength={6}
          />
          {devCode ? (
            <View style={styles.devBox} testID="dev-code-banner">
              <Text style={styles.devTitle}>Dev mode</Text>
              <Text style={styles.devText}>
                SMTP isn&apos;t configured. Your code is{" "}
                <Text style={styles.devCode}>{devCode}</Text>
              </Text>
            </View>
          ) : null}
          {err && <Text style={styles.err} testID="otp-error">{err}</Text>}
        </View>
        <Pressable
          testID="otp-verify-button"
          onPress={submit}
          disabled={loading}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.ctaText}>{loading ? "Verifying…" : "Verify"}</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.surface },
  h1: { fontSize: 28, fontWeight: "800", color: C.onSurface, marginTop: S.xl },
  sub: { fontSize: 14, color: C.onSurfaceSecondary, marginTop: S.sm, marginBottom: S.xl, lineHeight: 20 },
  email: { fontWeight: "700", color: C.onSurface },
  input: {
    backgroundColor: C.surfaceSecondary,
    borderRadius: R.md,
    fontSize: 32,
    letterSpacing: 12,
    textAlign: "center",
    paddingVertical: S.lg,
    color: C.onSurface,
    borderWidth: 1,
    borderColor: C.border,
  },
  devBox: {
    marginTop: S.lg,
    padding: S.lg,
    backgroundColor: C.brandTint,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.brand,
  },
  devTitle: { fontSize: 12, fontWeight: "800", color: C.onBrandTint, letterSpacing: 1, marginBottom: 4 },
  devText: { fontSize: 14, color: C.onBrandTint },
  devCode: { fontWeight: "900", letterSpacing: 4, fontSize: 18 },
  err: { color: C.error, marginTop: S.md, fontSize: 14 },
  cta: {
    margin: S.xl,
    backgroundColor: C.brand,
    paddingVertical: S.lg,
    borderRadius: R.pill,
    alignItems: "center",
  },
  ctaText: { color: C.onBrand, fontSize: 17, fontWeight: "700" },
});
