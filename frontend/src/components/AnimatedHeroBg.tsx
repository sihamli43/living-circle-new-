import { useEffect, useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// Abstract hero background — dark gradient + floating circles ("people"),
// pulsing connector lines ("matches"), rotating triangle accents, and
// drifting dot particles. Pure Views/Reanimated (no SVG/canvas dep) so it
// renders identically on iOS, Android and web.

const CORAL = "#FF5252";
const TEAL = "#17A2B8";
const GOLD = "#FFC107";

type CircleSpec = {
  id: string;
  size: number;
  leftPct: number;
  topPct: number;
  color: string;
  floatPx: number;
  duration: number;
  delay: number;
};

const CIRCLES: CircleSpec[] = [
  { id: "c1", size: 118, leftPct: 10, topPct: 20, color: CORAL, floatPx: 14, duration: 4200, delay: 0 },
  { id: "c2", size: 156, leftPct: 62, topPct: 12, color: TEAL, floatPx: 18, duration: 5200, delay: 250 },
  { id: "c3", size: 92, leftPct: 82, topPct: 55, color: GOLD, floatPx: 12, duration: 3800, delay: 500 },
  { id: "c4", size: 68, leftPct: 24, topPct: 68, color: TEAL, floatPx: 10, duration: 4600, delay: 750 },
  { id: "c5", size: 50, leftPct: 46, topPct: 40, color: CORAL, floatPx: 16, duration: 5000, delay: 1000 },
];

// Pairs of circles joined by a slow pulsing connector line — the "network".
const LINKS: [string, string, string, number][] = [
  ["c1", "c2", TEAL, 3000],
  ["c2", "c3", CORAL, 3600],
  ["c3", "c4", GOLD, 3200],
  ["c4", "c5", TEAL, 4000],
  ["c5", "c1", CORAL, 4400],
];

const TRIANGLES = [
  { leftPct: 32, topPct: 16, size: 14, color: GOLD, duration: 12000, delay: 0 },
  { leftPct: 72, topPct: 74, size: 10, color: TEAL, duration: 15000, delay: 400 },
  { leftPct: 90, topPct: 24, size: 12, color: CORAL, duration: 13000, delay: 800 },
];

const DOTS = Array.from({ length: 10 }).map((_, i) => ({
  id: `d${i}`,
  leftPct: (i * 37) % 100,
  topPct: (i * 53) % 100,
  size: 3 + (i % 3),
  color: [CORAL, TEAL, GOLD][i % 3],
  duration: 3000 + (i % 5) * 400,
  delay: i * 180,
}));

function FloatingCircle({ spec, w, h }: { spec: CircleSpec; w: number; h: number }) {
  const t = useSharedValue(0);
  const glow = useSharedValue(0.55);

  useEffect(() => {
    t.value = withDelay(
      spec.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: spec.duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: spec.duration, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
    glow.value = withDelay(
      spec.delay,
      withRepeat(
        withSequence(
          withTiming(0.85, { duration: spec.duration * 0.9, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.45, { duration: spec.duration * 0.9, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (t.value - 0.5) * 2 * spec.floatPx }],
    opacity: glow.value,
  }));

  const left = (spec.leftPct / 100) * w - spec.size / 2;
  const top = (spec.topPct / 100) * h - spec.size / 2;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left,
          top,
          width: spec.size,
          height: spec.size,
          borderRadius: spec.size / 2,
          backgroundColor: spec.color,
        },
        animStyle,
      ]}
    />
  );
}

function ConnectorLine({
  x1, y1, x2, y2, color, duration, delay,
}: {
  x1: number; y1: number; x2: number; y2: number; color: string; duration: number; delay: number;
}) {
  const o = useSharedValue(0.15);

  useEffect(() => {
    o.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.12, { duration, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: o.value }));

  const length = Math.hypot(x2 - x1, y2 - y1);
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: x1,
          top: y1,
          width: length,
          height: 1.5,
          backgroundColor: color,
          transformOrigin: "0 0",
          transform: [{ rotate: `${angle}deg` }],
        },
        animStyle,
      ]}
    />
  );
}

function RotatingTriangle({
  spec, w, h,
}: { spec: (typeof TRIANGLES)[number]; w: number; h: number }) {
  const r = useSharedValue(0);

  useEffect(() => {
    r.value = withDelay(
      spec.delay,
      withRepeat(withTiming(360, { duration: spec.duration, easing: Easing.linear }), -1),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));

  const left = (spec.leftPct / 100) * w;
  const top = (spec.topPct / 100) * h;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left,
          top,
          width: 0,
          height: 0,
          borderLeftWidth: spec.size * 0.6,
          borderRightWidth: spec.size * 0.6,
          borderBottomWidth: spec.size,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: spec.color,
          opacity: 0.55,
        },
        animStyle,
      ]}
    />
  );
}

function FloatingDot({ spec, w, h }: { spec: (typeof DOTS)[number]; w: number; h: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      spec.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: spec.duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: spec.duration, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -t.value * 16 }],
    opacity: 0.25 + t.value * 0.55,
  }));

  const left = (spec.leftPct / 100) * w;
  const top = (spec.topPct / 100) * h;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left,
          top,
          width: spec.size,
          height: spec.size,
          borderRadius: spec.size / 2,
          backgroundColor: spec.color,
        },
        animStyle,
      ]}
    />
  );
}

export function AnimatedHeroBg({ style }: { style?: StyleProp<ViewStyle> }) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
  };

  const centers = useMemo(() => {
    const m: Record<string, { x: number; y: number }> = {};
    for (const c of CIRCLES) m[c.id] = { x: (c.leftPct / 100) * size.w, y: (c.topPct / 100) * size.h };
    return m;
  }, [size.w, size.h]);

  const ready = size.w > 0 && size.h > 0;

  return (
    <View style={[StyleSheet.absoluteFill, style]} onLayout={onLayout} pointerEvents="none">
      <LinearGradient
        colors={["#001F3F", "#003A66", "#001527"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {ready && (
        <>
          {LINKS.map(([aId, bId, color, duration], i) => {
            const a = centers[aId];
            const b = centers[bId];
            return (
              <ConnectorLine
                key={`${aId}-${bId}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                color={color} duration={duration} delay={i * 200}
              />
            );
          })}
          {CIRCLES.map((c) => (
            <FloatingCircle key={c.id} spec={c} w={size.w} h={size.h} />
          ))}
          {TRIANGLES.map((t, i) => (
            <RotatingTriangle key={i} spec={t} w={size.w} h={size.h} />
          ))}
          {DOTS.map((d) => (
            <FloatingDot key={d.id} spec={d} w={size.w} h={size.h} />
          ))}
        </>
      )}
    </View>
  );
}
