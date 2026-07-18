import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
import { AppLogo } from "@/src/components/AppLogo";
import { AnimatedHeroBg } from "@/src/components/AnimatedHeroBg";
import { LUXE, LUXE_SHADOW, R, S } from "@/src/theme/colors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

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
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <AnimatedHeroBg />
          <LinearGradient
            colors={["rgba(5,5,10,0.25)", "rgba(5,5,10,0.55)"]}
            style={StyleSheet.absoluteFill}
          />
          <AppLogo size={44} showText={false} />
          <Text style={styles.heroTitle} testID="brand-name">
            Find Your Perfect{"\n"}
            <Text style={styles.heroTitleAccent}>ROOMMATE</Text>
          </Text>
          <Text style={styles.heroSub}>Match based on lifestyle, not luck.</Text>
        </View>

        {/* ── White card ── */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.cardWrap}
        >
          <View style={[styles.card, LUXE_SHADOW]}>
            <Text style={styles.h1}>Enter your email</Text>
            <Text style={styles.sub}>We&apos;ll send you a 6-digit sign-in code.</Text>
            <TextInput
              testID="email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={LUXE.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              style={styles.input}
            />
            {err && <Text testID="email-error" style={styles.err}>{err}</Text>}

            <Pressable
              testID="terms-agree-checkbox"
              onPress={() => setAgreed((v) => !v)}
              style={styles.checkRow}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkLabel}>
                I agree to the{" "}
                <Text style={styles.checkLink} onPress={() => router.push("/legal/terms")}>
                  Terms of Service
                </Text>
                {" "}and{" "}
                <Text style={styles.checkLink} onPress={() => router.push("/legal/privacy")}>
                  Privacy Policy
                </Text>
              </Text>
            </Pressable>

            <Pressable
              testID="email-continue-button"
              onPress={submit}
              disabled={loading}
              style={({ pressed }) => [{ opacity: pressed && agreed ? 0.9 : 1, marginTop: S.xl }]}
            >
              <LinearGradient
                colors={agreed ? [LUXE.coral, LUXE.teal] : ["#D8D5DE", "#D8D5DE"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>{loading ? "Sending…" : "Send Code"}</Text>
              </LinearGradient>
            </Pressable>

            <View style={styles.statsRow}>
              <Stat value="1,000+" label="Users" />
              <View style={styles.statsDivider} />
              <Stat value="500+" label="Matches" />
              <View style={styles.statsDivider} />
              <Stat value="98%" label="Compatible" />
            </View>

            <Text style={styles.legalFooter}>
              © 2026 Living Circle · Bangalore, India
            </Text>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: LUXE.bg },

  hero: {
    paddingHorizontal: S.xl, paddingTop: S.xxl, paddingBottom: S.xxxl,
    alignItems: "flex-start", gap: S.md, overflow: "hidden",
    backgroundColor: "#050508",
  },
  heroTitle: { fontSize: 34, fontWeight: "900", color: "#FFFFFF", lineHeight: 40, letterSpacing: -0.5 },
  heroTitleAccent: { color: LUXE.coral },
  heroSub: { fontSize: 15, color: "rgba(229,226,235,0.85)", fontWeight: "600" },

  cardWrap: { flex: 1, marginTop: -28 },
  card: {
    flex: 1, backgroundColor: LUXE.card,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: S.xl, paddingTop: S.xxl,
  },
  h1: { fontSize: 22, fontWeight: "800", color: LUXE.text, letterSpacing: 0.2 },
  sub: { fontSize: 14, color: LUXE.textSecondary, marginTop: S.sm, marginBottom: S.xl },
  input: {
    backgroundColor: LUXE.bg,
    borderRadius: R.md,
    paddingHorizontal: S.lg,
    paddingVertical: S.lg,
    fontSize: 17,
    color: LUXE.text,
    borderWidth: 1,
    borderColor: LUXE.border,
  },
  err: { color: LUXE.error, marginTop: S.md, fontSize: 14 },
  checkRow: {
    flexDirection: "row", alignItems: "flex-start", gap: S.md,
    marginTop: S.lg,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: LUXE.borderStrong,
    backgroundColor: LUXE.bg,
    alignItems: "center", justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: LUXE.coral, borderColor: LUXE.coral },
  checkLabel: { flex: 1, fontSize: 14, color: LUXE.text, lineHeight: 20 },
  checkLink: { color: LUXE.coral, fontWeight: "700", textDecorationLine: "underline" },
  cta: {
    paddingVertical: S.lg,
    borderRadius: R.pill,
    alignItems: "center",
    shadowColor: LUXE.coral,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  ctaText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  statsRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginTop: S.xxl, paddingVertical: S.lg,
    borderTopWidth: 1, borderTopColor: LUXE.border,
  },
  statItem: { alignItems: "center", paddingHorizontal: S.lg },
  statValue: { fontSize: 20, fontWeight: "900", color: LUXE.coral, letterSpacing: 0.2 },
  statLabel: { fontSize: 11, fontWeight: "600", color: LUXE.textTertiary, marginTop: 2 },
  statsDivider: { width: 1, height: 28, backgroundColor: LUXE.border },
  legalFooter: {
    textAlign: "center",
    fontSize: 11,
    color: LUXE.textTertiary,
    marginTop: S.xl,
    marginBottom: S.lg,
  },
});
