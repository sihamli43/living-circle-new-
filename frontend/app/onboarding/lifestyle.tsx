import { useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen, Chip, ChipRow } from "@/src/components/OnboardScreen";
import { api } from "@/src/api/client";
import { C, R, S } from "@/src/theme/colors";

type Q = { key: string; title: string; options: string[]; skippable?: boolean };

const QUESTIONS: Q[] = [
  // Core 7 — required
  { key: "food", title: "What's your food preference?", options: ["Veg", "Non-veg", "Eggetarian", "Jain", "Vegan"] },
  { key: "smoking", title: "Do you smoke?", options: ["Yes", "No"] },
  { key: "drinking", title: "Do you drink?", options: ["Yes", "No"] },
  { key: "sleep", title: "Your sleep schedule?", options: ["Early bird", "Night owl", "Flexible"] },
  { key: "cleanliness", title: "How tidy are you?", options: ["Very tidy", "Average", "Relaxed"] },
  { key: "guests", title: "How often do guests visit?", options: ["Often", "Sometimes", "Rarely"] },
  { key: "pets", title: "Pets?", options: ["Have pets", "Open to pets", "No pets"] },
  // Cultural — skippable
  { key: "religion", title: "Religion (cultural compatibility)", options: ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other", "Prefer not to say"], skippable: true },
  // Extended — all skippable
  { key: "work_timing", title: "Work timing?", options: ["9-5 (day shift)", "Night shift", "Flexible/WFH", "Irregular/varies"], skippable: true },
  { key: "cooking", title: "Cooking habits?", options: ["Daily", "Occasionally", "Rarely/order in", "Not at all"], skippable: true },
  { key: "noise", title: "Music / noise preference?", options: ["Often", "With headphones only", "Rarely", "Depends on time of day"], skippable: true },
  { key: "relationship_status", title: "Relationship status (informational)", options: ["Single", "In a relationship", "Married", "Prefer not to say"], skippable: true },
  { key: "overnight_guests", title: "Overnight guests?", options: ["Yes, anytime", "With notice", "Rarely", "No"], skippable: true },
  { key: "sharing_habits", title: "Sharing habits (groceries, supplies)", options: ["Yes, split everything", "Some items only", "Prefer separate", "Open to discuss"], skippable: true },
];

export default function Lifestyle() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [ans, setAns] = useState<Record<string, string>>({});

  const q = QUESTIONS[i];
  const selected = ans[q.key];

  const advance = async (answer?: string) => {
    const next = { ...ans };
    if (answer !== undefined) next[q.key] = answer;
    if (i < QUESTIONS.length - 1) {
      setAns(next);
      setI(i + 1);
    } else {
      await api.updateMe({ lifestyle: next });
      const me = await api.me();
      if (me.listing_type === "has_place") {
        router.push("/onboarding/listing");
      } else {
        await api.updateMe({ onboarded: true });
        router.replace("/(tabs)/discover");
      }
    }
  };

  const onNext = () => {
    if (!selected && !q.skippable) return;
    advance(selected);
  };

  const onSkip = () => advance();

  const onBack = () => {
    if (i > 0) setI(i - 1);
    else router.back();
  };

  return (
    <Screen
      testID={`lifestyle-q-${q.key}`}
      title={q.title}
      subtitle={`Question ${i + 1} of ${QUESTIONS.length}${q.skippable ? " · optional" : ""}`}
      step={i + 1}
      total={QUESTIONS.length}
      onBack={onBack}
      cta={i === QUESTIONS.length - 1 ? "Almost done" : "Next"}
      ctaDisabled={!q.skippable && !selected}
      onCta={onNext}
    >
      <View style={{ marginTop: S.lg }}>
        <ChipRow>
          {q.options.map((opt) => (
            <Chip
              key={opt}
              label={opt}
              active={selected === opt}
              onPress={() => setAns({ ...ans, [q.key]: opt })}
              testID={`lifestyle-opt-${opt}`}
            />
          ))}
        </ChipRow>
        {q.skippable && (
          <Pressable testID={`lifestyle-skip-${q.key}`} onPress={onSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip this question</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.hint}>
        {q.key === "religion"
          ? "Used only for cultural compatibility — never shown as a filter. Optional."
          : q.skippable
          ? "Optional — helps with better matches, but feel free to skip."
          : "This helps us calculate your compatibility score with potential roommates."}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: C.onSurfaceTertiary, fontSize: 13, marginTop: S.xxl },
  skipBtn: { marginTop: S.lg, alignSelf: "flex-start", paddingHorizontal: S.lg, paddingVertical: S.sm, borderRadius: R.pill },
  skipText: { color: C.brand, fontSize: 14, fontWeight: "700" },
});
