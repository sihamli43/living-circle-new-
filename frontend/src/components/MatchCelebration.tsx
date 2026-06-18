import { useEffect } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  interpolate,
} from "react-native-reanimated";
import { Avatar } from "@/src/components/Avatar";
import { PressableScale } from "@/src/components/PressableScale";
import { C, R, S } from "@/src/theme/colors";

const CONFETTI = [C.brand, C.coral, "#FFFFFF", "#4338CA", "#0EA5E9", "#10B981"];

function Confetto({ delay, x, color }: { delay: number; x: number; color: string }) {
  const ty = useSharedValue(-40);
  const tx = useSharedValue(0);
  const rot = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 120 }));
    ty.value = withDelay(delay, withTiming(420, { duration: 1600 }));
    tx.value = withDelay(delay, withTiming((Math.random() - 0.5) * 120, { duration: 1600 }));
    rot.value = withDelay(delay, withTiming(Math.random() * 720 - 360, { duration: 1600 }));
  }, [delay, opacity, ty, tx, rot]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotateZ: `${rot.value}deg` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: 0,
          left: x,
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export function MatchCelebration({
  match,
  onClose,
}: {
  match: any | null;
  onClose: () => void;
}) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const nameLeft = useSharedValue(-80);
  const nameRight = useSharedValue(80);

  useEffect(() => {
    if (match) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSequence(
        withSpring(1.08, { damping: 6, stiffness: 180 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );
      nameLeft.value = withDelay(200, withSpring(0, { damping: 12, stiffness: 120 }));
      nameRight.value = withDelay(200, withSpring(0, { damping: 12, stiffness: 120 }));
    } else {
      opacity.value = 0;
      scale.value = 0;
      nameLeft.value = -80;
      nameRight.value = 80;
    }
  }, [match, opacity, scale, nameLeft, nameRight]);

  const boxStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const leftNameStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nameLeft.value }],
    opacity: interpolate(nameLeft.value, [-80, 0], [0, 1]),
  }));

  const rightNameStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nameRight.value }],
    opacity: interpolate(nameRight.value, [80, 0], [0, 1]),
  }));

  const matchName = match?.user?.name?.split(" ")[0] || "Them";

  return (
    <Modal visible={!!match} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {match && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {Array.from({ length: 28 }).map((_, i) => (
              <Confetto
                key={i}
                delay={i * 30}
                x={(i * 37) % 360}
                color={CONFETTI[i % CONFETTI.length]}
              />
            ))}
          </View>
        )}
        <Animated.View style={[styles.box, boxStyle]} testID="match-modal">
          <Text style={styles.title}>It&apos;s a match! 🎉</Text>
          <View style={styles.namesRow}>
            <Animated.Text style={[styles.nameSlide, leftNameStyle]}>You</Animated.Text>
            <Text style={styles.heart}>💚</Text>
            <Animated.Text style={[styles.nameSlide, rightNameStyle]}>{matchName}</Animated.Text>
          </View>
          <Text style={styles.sub}>You and {match?.user?.name} liked each other.</Text>
          <View style={{ alignItems: "center", marginVertical: S.xl }}>
            <Avatar name={match?.user?.name} photo={match?.user?.photo} size={104} />
            {match?.user?.compatibility != null && (
              <Text style={styles.compat}>{match.user.compatibility}% compatible</Text>
            )}
          </View>
          <PressableScale testID="match-keep-swiping" style={styles.cta} onPress={onClose}>
            <Text style={styles.ctaText}>Keep swiping</Text>
          </PressableScale>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(30,58,138,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: S.xl,
  },
  box: {
    backgroundColor: C.surface,
    padding: S.xl,
    borderRadius: R.lg,
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: C.border,
  },
  title: { fontSize: 30, fontWeight: "900", color: C.brand, textAlign: "center", letterSpacing: -0.5 },
  namesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S.md,
    marginTop: S.lg,
    overflow: "hidden",
  },
  nameSlide: { fontSize: 22, fontWeight: "800", color: C.coral },
  heart: { fontSize: 20 },
  sub: { fontSize: 15, color: C.onSurfaceSecondary, textAlign: "center", marginTop: S.sm },
  compat: { marginTop: S.md, fontWeight: "800", color: C.coral, fontSize: 15 },
  cta: { backgroundColor: C.brand, paddingVertical: S.lg, borderRadius: R.pill, alignItems: "center" },
  ctaText: { color: C.onBrand, fontSize: 16, fontWeight: "700" },
});
