import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, R, S } from "@/src/theme/colors";

type Props = { visible: boolean; onAcknowledge: () => void };

const DONT_SHARE = [
  "Don't share your phone number immediately",
  "Don't share your residential address",
  "Don't share your full name or workplace until you meet",
  "Take time to chat and build trust first (at least 2–3 days)",
];

const NEVER_SHARE = [
  "Bank account numbers or UPI IDs",
  "Aadhaar or PAN details",
  "Passport or ID card numbers",
  "Passwords or OTPs of any kind",
  "Credit card or debit card information",
];

const DO_INSTEAD = [
  "Chat on this app first — we keep messages private",
  "Meet in a public place before finalising any arrangement",
  "Tell a friend or family member who you're meeting",
  "Trust your gut — if something feels off, unmatch immediately",
  "Report suspicious users to us right away",
];

function WarningBlock({
  icon,
  title,
  color,
  items,
}: {
  icon: string;
  title: string;
  color: string;
  items: string[];
}) {
  return (
    <View style={[styles.block, { borderLeftColor: color }]}>
      <Text style={[styles.blockTitle, { color }]}>
        {icon} {title}
      </Text>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={[styles.bullet, { color }]}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function MatchSafetyWarning({ visible, onAcknowledge }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onAcknowledge}
      testID="safety-warning-modal"
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="shield" size={28} color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>⚠️ Safety First!</Text>
              <Text style={styles.sub}>Before you connect with your match</Text>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{ paddingBottom: S.lg }}
            showsVerticalScrollIndicator={false}
          >
            <WarningBlock
              icon="🚫"
              title="DON'T Share Until You're Sure"
              color={C.coral}
              items={DONT_SHARE}
            />

            <WarningBlock
              icon="🚫"
              title="NEVER Share Sensitive Details"
              color={C.error}
              items={NEVER_SHARE}
            />

            <WarningBlock
              icon="✅"
              title="DO These Instead"
              color={C.success}
              items={DO_INSTEAD}
            />

            {/* Report box */}
            <View style={styles.reportBox}>
              <Text style={styles.reportTitle}>🛡️ Report Unsafe Behaviour</Text>
              <Text style={styles.reportBody}>
                Found something suspicious? Use the{" "}
                <Text style={{ fontWeight: "700" }}>'Report User'</Text> button in
                their profile. We take every report seriously and act within 24 hours.
              </Text>
              <Pressable
                onPress={() =>
                  Linking.openURL("mailto:safety@livingcircle.app?subject=Safety%20Report")
                }
              >
                <Text style={styles.reportLink}>safety@livingcircle.app</Text>
              </Pressable>
            </View>
          </ScrollView>

          {/* CTA */}
          <Pressable
            testID="safety-acknowledge-btn"
            style={styles.cta}
            onPress={onAcknowledge}
          >
            <Ionicons name="checkmark-circle" size={20} color={C.onBrand} />
            <Text style={styles.ctaText}>I Understand — Show My Match</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingTop: S.xl,
    paddingHorizontal: S.xl,
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    marginBottom: S.lg,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "900", color: C.onSurface },
  sub: { fontSize: 13, color: C.onSurfaceSecondary, marginTop: 2 },
  scroll: { flex: 1 },
  block: {
    borderLeftWidth: 3,
    paddingLeft: S.md,
    marginBottom: S.lg,
    backgroundColor: C.surfaceSecondary,
    borderRadius: R.md,
    padding: S.md,
    paddingLeft: S.lg,
  },
  blockTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: S.sm,
  },
  bulletRow: {
    flexDirection: "row",
    gap: S.sm,
    marginTop: 4,
  },
  bullet: { fontSize: 14, lineHeight: 20, fontWeight: "700" },
  bulletText: { flex: 1, fontSize: 14, color: C.onSurfaceSecondary, lineHeight: 20 },
  reportBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: R.md,
    padding: S.lg,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: S.sm,
  },
  reportTitle: { fontSize: 15, fontWeight: "800", color: C.brand, marginBottom: S.sm },
  reportBody: { fontSize: 13, color: C.onSurfaceSecondary, lineHeight: 20 },
  reportLink: {
    fontSize: 13,
    color: C.brand,
    fontWeight: "700",
    textDecorationLine: "underline",
    marginTop: S.sm,
  },
  cta: {
    backgroundColor: C.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S.sm,
    paddingVertical: S.lg,
    borderRadius: R.pill,
    marginVertical: S.xl,
  },
  ctaText: { color: C.onBrand, fontSize: 16, fontWeight: "700" },
});
