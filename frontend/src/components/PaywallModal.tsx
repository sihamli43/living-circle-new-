import { Modal, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/src/components/PressableScale";
import { C, R, S } from "@/src/theme/colors";

export function PaywallModal({
  visible,
  onUpgrade,
  onClose,
}: {
  visible: boolean;
  onUpgrade: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.box} testID="paywall-modal">
          <Ionicons name="star" size={40} color={C.cyan} />
          <Text style={styles.title}>You&apos;ve used your 3 free matches</Text>
          <Text style={styles.sub}>
            Free plan is limited to 3 matches per month. Upgrade to Premium for unlimited matches.
          </Text>
          <PressableScale testID="paywall-upgrade" style={styles.cta} onPress={onUpgrade}>
            <Text style={styles.ctaText}>⭐ Upgrade to Premium — $4.99/mo</Text>
          </PressableScale>
          <PressableScale testID="paywall-dismiss" style={styles.ctaSecondary} onPress={onClose}>
            <Text style={styles.ctaSecondaryText}>Not now</Text>
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center", justifyContent: "center", padding: S.xl,
  },
  box: {
    backgroundColor: C.surface, padding: S.xl, borderRadius: R.lg,
    width: "100%", maxWidth: 380, alignItems: "center", gap: S.sm,
    borderWidth: 1, borderColor: C.border,
  },
  title: { fontSize: 19, fontWeight: "900", color: C.onSurface, textAlign: "center", marginTop: S.sm },
  sub: { fontSize: 14, color: C.onSurfaceSecondary, textAlign: "center", lineHeight: 20, marginBottom: S.sm },
  cta: { backgroundColor: C.cyan, paddingVertical: S.lg, borderRadius: R.pill, alignItems: "center", width: "100%" },
  ctaText: { color: C.onSurface, fontSize: 15, fontWeight: "800" },
  ctaSecondary: { paddingVertical: S.md, alignItems: "center", width: "100%" },
  ctaSecondaryText: { color: C.onSurfaceTertiary, fontSize: 14, fontWeight: "600" },
});
