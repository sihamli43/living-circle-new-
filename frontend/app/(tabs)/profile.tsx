import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AppLogo } from "@/src/components/AppLogo";
import { api, setToken } from "@/src/api/client";
import { Avatar } from "@/src/components/Avatar";
import { C, R, S, paletteFor } from "@/src/theme/colors";

export default function Profile() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const m = await api.me();
      setMe(m);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const logout = async () => {
    await setToken(null);
    router.replace("/auth/phone");
  };

  if (!me) return <View style={{ flex: 1, backgroundColor: C.surface }} />;
  const [c1, c2] = paletteFor(me.user_id || "x");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topBar}>
        <AppLogo size={28} />
        <Text style={styles.topBrand}>Living Circle</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: S.xxxl }}>
        <LinearGradient colors={[c1, c2]} style={styles.cover}>
          <View style={styles.avatarWrap}>
            <Avatar name={me.name} photo={me.photo} size={96} testID="profile-avatar" />
          </View>
        </LinearGradient>
        <View style={{ alignItems: "center", marginTop: 56, paddingHorizontal: S.xl }}>
          <Text style={styles.name} testID="profile-name">{me.name}, {me.age}</Text>
          <Text style={styles.meta}>{me.occupation === "student" ? "Student" : "Professional"} · {me.org}</Text>
          <Text style={styles.meta}>From {me.hometown}</Text>
          <Text style={styles.localityHint}>
            Popular in your area: Koramangala, Indiranagar, Whitefield.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Row icon="cash-outline" label="Budget" value={`₹${me.budget_min?.toLocaleString()}–${me.budget_max?.toLocaleString()}`} />
          <Row icon="location-outline" label="Localities" value={(me.localities || []).join(", ") || "—"} />
          <Row icon="calendar-outline" label="Move-in" value={me.move_in || "—"} />
          <Row icon="language-outline" label="Languages" value={(me.languages || []).join(", ") || "—"} />
          <Row icon="home-outline" label="Listing" value={me.listing_type === "has_place" ? "I have a place" : "Looking for a place"} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lifestyle</Text>
          {Object.entries(me.lifestyle || {})
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <Row key={k} icon="sparkles-outline" label={k} value={String(v)} />
            ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Pressable testID="edit-basics" style={styles.actionRow} onPress={() => router.push("/onboarding/profile")}>
            <Ionicons name="create-outline" size={20} color={C.brand} />
            <Text style={styles.actionText}>Edit basics</Text>
            <Ionicons name="chevron-forward" size={18} color={C.onSurfaceTertiary} />
          </Pressable>
          <Pressable testID="edit-details" style={styles.actionRow} onPress={() => router.push("/onboarding/details")}>
            <Ionicons name="options-outline" size={20} color={C.brand} />
            <Text style={styles.actionText}>Edit preferences</Text>
            <Ionicons name="chevron-forward" size={18} color={C.onSurfaceTertiary} />
          </Pressable>
          <Pressable testID="edit-lifestyle" style={styles.actionRow} onPress={() => router.push("/onboarding/lifestyle")}>
            <Ionicons name="leaf-outline" size={20} color={C.brand} />
            <Text style={styles.actionText}>Edit lifestyle</Text>
            <Ionicons name="chevron-forward" size={18} color={C.onSurfaceTertiary} />
          </Pressable>
          <Pressable testID="logout-button" style={styles.actionRow} onPress={logout}>
            <Ionicons name="log-out-outline" size={20} color={C.error} />
            <Text style={[styles.actionText, { color: C.error }]}>Logout</Text>
            <View style={{ width: 18 }} />
          </Pressable>
        </View>

        {/* Safety Tips */}
        <View style={styles.safetyCard}>
          <View style={styles.safetyHeader}>
            <Ionicons name="shield-checkmark" size={22} color={C.brand} />
            <Text style={styles.safetyTitle}>Safety Tips</Text>
          </View>
          <View style={styles.safetyTips}>
            {[
              "Meet matches in public places first",
              "Never share UPI IDs, bank details, or OTPs",
              "Tell someone you trust before meeting",
              "Trust your instincts — unmatch if unsure",
            ].map((tip, i) => (
              <View key={i} style={styles.safetyTipRow}>
                <Ionicons name="checkmark-circle" size={16} color={C.success} />
                <Text style={styles.safetyTipText}>{tip}</Text>
              </View>
            ))}
          </View>
          <View style={styles.safetyActions}>
            <Pressable
              testID="report-safety"
              style={styles.safetyBtn}
              onPress={() =>
                Linking.openURL("mailto:safety@livingcircle.app?subject=Safety%20Report")
              }
            >
              <Ionicons name="flag-outline" size={15} color={C.coral} />
              <Text style={[styles.safetyBtnText, { color: C.coral }]}>Report Unsafe User</Text>
            </Pressable>
            <Pressable
              testID="safety-guide"
              style={[styles.safetyBtn, { borderColor: C.brand }]}
              onPress={() =>
                Alert.alert(
                  "Emergency Contacts",
                  "Women's Helpline: 1091\nCyber Crime: 1930\nPolice: 100\n\nFor app safety issues:\nsafety@livingcircle.app",
                  [{ text: "OK" }]
                )
              }
            >
              <Ionicons name="call-outline" size={15} color={C.brand} />
              <Text style={[styles.safetyBtnText, { color: C.brand }]}>Emergency Contacts</Text>
            </Pressable>
          </View>
        </View>

        {/* Legal footer */}
        <View style={styles.legalSection}>
          <View style={styles.legalLinks}>
            <Pressable testID="terms-link" onPress={() => router.push("/legal/terms")}>
              <Text style={styles.legalLink}>Terms of Service</Text>
            </Pressable>
            <Text style={styles.legalSep}>·</Text>
            <Pressable testID="privacy-link" onPress={() => router.push("/legal/privacy")}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </Pressable>
            <Text style={styles.legalSep}>·</Text>
            <Pressable testID="report-issue-link" onPress={() => Linking.openURL("mailto:support@livingcircle.app?subject=Report%20Issue")}>
              <Text style={styles.legalLink}>Report Issue</Text>
            </Pressable>
          </View>
          <Text style={styles.legalFooter}>
            © 2026 Living Circle. All rights reserved.{"\n"}Bangalore, Karnataka, India.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={16} color={C.cyan} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F1E" },
  topBar: {
    flexDirection: "row", alignItems: "center", gap: S.sm,
    paddingHorizontal: S.xl, paddingTop: S.md, paddingBottom: S.sm,
    borderBottomWidth: 1, borderBottomColor: "rgba(0,217,255,0.12)",
  },
  topBrand: { fontSize: 18, fontWeight: "900", color: "#FFFFFF", letterSpacing: 1 },
  cover: { height: 140, alignItems: "center", justifyContent: "flex-end", backgroundColor: "#1A1A2E" },
  avatarWrap: {
    position: "absolute", bottom: -48,
    padding: 4, backgroundColor: "#0F0F1E", borderRadius: 999,
    borderWidth: 2, borderColor: "rgba(0,217,255,0.5)",
  },
  name: { fontSize: 24, fontWeight: "900", color: "#FFFFFF", letterSpacing: 0.3 },
  meta: { fontSize: 14, color: C.onSurfaceSecondary, marginTop: 2 },
  localityHint: { fontSize: 12, color: C.cyan, fontWeight: "600", marginTop: S.sm, textAlign: "center" },
  section: { marginTop: S.xl, paddingHorizontal: S.xl },
  sectionTitle: { fontSize: 12, color: C.cyan, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: S.md },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: S.sm, gap: S.md },
  rowIcon: {
    width: 32, height: 32, borderRadius: R.sm,
    backgroundColor: "rgba(0,217,255,0.1)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(0,217,255,0.2)",
  },
  rowLabel: { fontSize: 12, color: C.onSurfaceTertiary, textTransform: "capitalize" },
  rowValue: { fontSize: 15, color: "#FFFFFF", fontWeight: "600" },
  actionRow: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    paddingVertical: S.lg, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)",
  },
  actionText: { flex: 1, fontSize: 15, color: "#FFFFFF", fontWeight: "600" },
  safetyCard: {
    marginTop: S.xl, marginHorizontal: S.xl,
    backgroundColor: "rgba(0,217,255,0.05)",
    borderRadius: R.lg, padding: S.lg,
    borderWidth: 1, borderColor: C.borderCyan,
  },
  safetyHeader: { flexDirection: "row", alignItems: "center", gap: S.sm, marginBottom: S.md },
  safetyTitle: { fontSize: 16, fontWeight: "800", color: C.cyan },
  safetyTips: { gap: S.sm, marginBottom: S.md },
  safetyTipRow: { flexDirection: "row", alignItems: "flex-start", gap: S.sm },
  safetyTipText: { flex: 1, fontSize: 13, color: C.onSurfaceSecondary, lineHeight: 18 },
  safetyActions: { flexDirection: "row", gap: S.md, marginTop: S.sm },
  safetyBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: S.sm, borderRadius: R.pill,
    borderWidth: 1, borderColor: C.borderCoral, backgroundColor: "rgba(255,0,110,0.08)",
  },
  safetyBtnText: { fontSize: 12, fontWeight: "700" },
  legalSection: {
    marginTop: S.xl, paddingHorizontal: S.xl, paddingBottom: S.xl, alignItems: "center",
  },
  legalLinks: {
    flexDirection: "row", alignItems: "center", flexWrap: "wrap",
    justifyContent: "center", gap: S.sm, marginBottom: S.md,
  },
  legalLink: { fontSize: 13, color: C.cyan, fontWeight: "600", textDecorationLine: "underline" },
  legalSep: { fontSize: 13, color: C.onSurfaceTertiary },
  legalFooter: {
    fontSize: 11, color: C.onSurfaceTertiary, textAlign: "center", lineHeight: 17,
  },
});
