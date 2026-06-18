import { Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { PressableScale } from "@/src/components/PressableScale";
import { C, R, S } from "@/src/theme/colors";

export function Screen({
  children,
  title,
  subtitle,
  step,
  total,
  onBack,
  cta,
  onCta,
  ctaDisabled,
  testID,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  step?: number;
  total?: number;
  onBack?: () => void;
  cta: string;
  onCta: () => void;
  ctaDisabled?: boolean;
  testID?: string;
}) {
  const pct = step && total ? (step / total) * 100 : 0;
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID={testID}>
      {step !== undefined && total !== undefined && (
        <View style={styles.progressWrap}>
          <View style={[styles.progressBar, { width: `${pct}%` }]} />
        </View>
      )}
      <View style={styles.header}>
        {onBack && (
          <Pressable onPress={onBack} testID="screen-back">
            <Text style={{ color: C.brand, fontSize: 16, fontWeight: "600" }}>← Back</Text>
          </Pressable>
        )}
        <Text style={styles.h1}>{title}</Text>
        {subtitle && <Text style={styles.sub}>{subtitle}</Text>}
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: S.xl, paddingBottom: S.xxxl }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      <PressableScale
        testID="screen-cta"
        disabled={ctaDisabled}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onCta();
        }}
        style={[styles.cta, ctaDisabled && { backgroundColor: C.borderStrong }]}
      >
        <Text style={styles.ctaText}>{cta}</Text>
      </PressableScale>
    </SafeAreaView>
  );
}

export function Chip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <PressableScale
      testID={testID}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.chip, active ? styles.chipActive : null]}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]} numberOfLines={1}>{label}</Text>
    </PressableScale>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.surface },
  progressWrap: {
    height: 4,
    backgroundColor: C.surfaceTertiary,
    marginHorizontal: S.xl,
    borderRadius: R.pill,
    overflow: "hidden",
  },
  progressBar: { height: 4, backgroundColor: C.brand, borderRadius: R.pill },
  header: { paddingHorizontal: S.xl, paddingTop: S.lg },
  h1: { fontSize: 26, fontWeight: "800", color: C.onSurface, marginTop: S.md },
  sub: { fontSize: 14, color: C.onSurfaceSecondary, marginTop: S.sm },
  cta: {
    marginHorizontal: S.xl,
    marginBottom: S.lg,
    backgroundColor: C.brand,
    paddingVertical: S.lg,
    borderRadius: R.pill,
    alignItems: "center",
  },
  ctaText: { color: C.onBrand, fontSize: 17, fontWeight: "700" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  chip: {
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  chipActive: {
    backgroundColor: C.brandTint,
    borderColor: C.brand,
  },
  chipText: { color: C.onSurface, fontSize: 14, fontWeight: "600" },
  chipTextActive: { color: C.onBrandTint, fontWeight: "700" },
});
