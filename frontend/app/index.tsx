import { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { storage } from "@/src/utils/storage";
import { api } from "@/src/api/client";
import { C, S, R } from "@/src/theme/colors";
import { AppLogo } from "@/src/components/AppLogo";

export default function Index() {
  const router = useRouter();
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(20)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation sequence
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(taglineY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(btnOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    (async () => {
      const tk = await storage.getItem<string>("lc_token", "");
      if (!tk) return; // Show splash, user taps Get Started
      try {
        const me = await api.me();
        if (me?.onboarded) router.replace("/(tabs)/discover");
        else router.replace("/onboarding/profile");
      } catch {
        await storage.removeItem("lc_token");
      }
    })();
  }, [router]);

  return (
    <View style={styles.root} testID="splash-screen">
      {/* Grid overlay */}
      <View style={styles.gridOverlay} pointerEvents="none" />

      {/* Ambient glow blobs */}
      <View style={[styles.glowBlob, { top: -80, left: -80, backgroundColor: "#00D9FF", opacity: 0.07 }]} />
      <View style={[styles.glowBlob, { bottom: -80, right: -80, backgroundColor: "#FF006E", opacity: 0.07 }]} />
      <View style={[styles.glowBlob, { top: "35%", left: "20%", width: 200, height: 200, backgroundColor: "#6A0572", opacity: 0.05 }]} />

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <AppLogo size={140} showText={false} />
      </Animated.View>

      {/* Brand name */}
      <Animated.View style={{ opacity: logoOpacity }}>
        <Text style={styles.brand}>Living Circle</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={{ opacity: taglineOpacity, transform: [{ translateY: taglineY }] }}>
        <Text style={styles.tagline}>Find your people,{"\n"}find your place.</Text>
      </Animated.View>

      {/* CTA */}
      <Animated.View style={[styles.ctaWrap, { opacity: btnOpacity }]}>
        <Pressable
          style={styles.cta}
          onPress={() => router.replace("/auth/phone")}
          testID="get-started-btn"
        >
          <Text style={styles.ctaText}>Get Started</Text>
        </Pressable>
        <Pressable
          style={styles.loginBtn}
          onPress={() => router.replace("/auth/phone")}
          testID="login-btn"
        >
          <Text style={styles.loginText}>Already have an account? <Text style={{ color: C.cyan }}>Login</Text></Text>
        </Pressable>
      </Animated.View>

      {/* Bottom badge */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>🏙️ Bangalore's #1 Roommate App</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: S.xxl,
    gap: S.xl,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.04,
    ...(Platform.OS === "web"
      ? ({
          backgroundImage:
            "linear-gradient(rgba(0,217,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,217,255,0.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        } as any)
      : {}),
  },
  glowBlob: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 999,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 2,
    textAlign: "center",
    ...(Platform.OS === "web"
      ? ({ textShadow: "0 0 30px rgba(0,217,255,0.5)" } as any)
      : {}),
  },
  tagline: {
    fontSize: 18,
    color: C.onSurfaceSecondary,
    textAlign: "center",
    lineHeight: 28,
    letterSpacing: 0.5,
    fontWeight: "500",
  },
  ctaWrap: { width: "100%", alignItems: "center", gap: S.lg },
  cta: {
    width: "100%",
    paddingVertical: S.lg + 4,
    borderRadius: R.pill,
    backgroundColor: "#FF006E",
    alignItems: "center",
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 0 24px rgba(255,0,110,0.6), 0 4px 20px rgba(0,0,0,0.4)" } as any)
      : {
          shadowColor: "#FF006E",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.65,
          shadowRadius: 16,
          elevation: 10,
        }),
  },
  ctaText: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", letterSpacing: 1 },
  loginBtn: { paddingVertical: S.sm },
  loginText: { color: C.onSurfaceTertiary, fontSize: 14, letterSpacing: 0.3 },
  badge: {
    position: "absolute",
    bottom: S.xxl,
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.borderCyan,
    backgroundColor: "rgba(0,217,255,0.06)",
  },
  badgeText: { color: C.cyan, fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },
});
