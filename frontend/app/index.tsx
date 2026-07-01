import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { storage } from "@/src/utils/storage";
import { api } from "@/src/api/client";
import { AppLogo } from "@/src/components/AppLogo";
import { C, R, S } from "@/src/theme/colors";

const { width: W } = Dimensions.get("window");
const isWide = W > 720;

// ── helpers ───────────────────────────────────────────────────────────────────

function GlowBlob({ color, top, left, right, bottom, size = 320, opacity = 0.06 }: any) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top, left, right, bottom,
        width: size, height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
      }}
    />
  );
}

function GridOverlay() {
  if (Platform.OS !== "web") return null;
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: 0.035,
          ...(({
            backgroundImage:
              "linear-gradient(rgba(0,217,255,0.5) 1px, transparent 1px), linear-gradient(90deg,rgba(0,217,255,0.5) 1px,transparent 1px)",
            backgroundSize: "50px 50px",
          }) as any),
        },
      ]}
    />
  );
}

// ── Neon divider ──────────────────────────────────────────────────────────────

function Divider() {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <View style={styles.dividerDot} />
      <View style={styles.dividerLine} />
    </View>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────

function FeatureCard({
  icon, title, body, color,
}: {
  icon: any; title: string; body: string; color: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <View
      // @ts-ignore
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={[
        styles.featureCard,
        { borderColor: hovered ? color + "80" : C.border },
        Platform.OS === "web" && hovered
          ? ({ boxShadow: `0 0 28px ${color}30` } as any)
          : {},
      ]}
    >
      <View style={[styles.featureIconWrap, { backgroundColor: color + "18", borderColor: color + "40" }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureBody}>{body}</Text>
    </View>
  );
}

// ── Step card ─────────────────────────────────────────────────────────────────

function Step({ num, title, body, color }: { num: string; title: string; body: string; color: string }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepNum, { borderColor: color, backgroundColor: color + "14" }]}>
        <Text style={[styles.stepNumText, { color }]}>{num}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepBody}>{body}</Text>
      </View>
    </View>
  );
}

// ── Testimonial ───────────────────────────────────────────────────────────────

function Testimonial({ quote, name, role, color }: { quote: string; name: string; role: string; color: string }) {
  return (
    <View style={[styles.testimonial, { borderTopColor: color }]}>
      <Text style={styles.testimonialQuote}>"{quote}"</Text>
      <View style={styles.testimonialMeta}>
        <View style={[styles.testimonialAvatar, { backgroundColor: color + "28", borderColor: color + "60" }]}>
          <Text style={[styles.testimonialInitial, { color }]}>{name[0]}</Text>
        </View>
        <View>
          <Text style={styles.testimonialName}>{name}</Text>
          <Text style={styles.testimonialRole}>{role}</Text>
        </View>
      </View>
    </View>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const heroOpacity  = useRef(new Animated.Value(0)).current;
  const heroY        = useRef(new Animated.Value(40)).current;
  const logoScale    = useRef(new Animated.Value(0.6)).current;

  // Auto-redirect logged-in users
  useEffect(() => {
    (async () => {
      const tk = await storage.getItem<string>("lc_token", "");
      if (!tk) return;
      try {
        const me = await api.me();
        if (me?.onboarded) router.replace("/(tabs)/discover");
        else router.replace("/onboarding/profile");
      } catch {
        await storage.removeItem("lc_token");
      }
    })();
  }, [router]);

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      Animated.timing(heroOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(heroY,      { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const goAuth = () => router.replace("/auth/phone");

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <GridOverlay />

      {/* Ambient blobs */}
      <GlowBlob color="#00D9FF" top={-120} left={-80}  size={380} opacity={0.08} />
      <GlowBlob color="#FF006E" top={300}  right={-100} size={320} opacity={0.07} />
      <GlowBlob color="#6A0572" top="40%"  left="30%"  size={260} opacity={0.05} />
      <GlowBlob color="#00D9FF" bottom={200} right={60} size={200} opacity={0.06} />

      {/* ── NAV BAR ── */}
      <View style={styles.nav}>
        <View style={styles.navBrand}>
          <AppLogo size={32} />
          <Text style={styles.navBrandText}>Living Circle</Text>
        </View>
        <View style={styles.navActions}>
          <Pressable style={styles.navLoginBtn} onPress={goAuth}>
            <Text style={styles.navLoginText}>Login</Text>
          </Pressable>
          <Pressable style={styles.navSignupBtn} onPress={goAuth}>
            <Text style={styles.navSignupText}>Sign Up Free</Text>
          </Pressable>
        </View>
      </View>

      {/* ── HERO ── */}
      <Animated.View
        style={[styles.hero, { opacity: heroOpacity, transform: [{ translateY: heroY }] }]}
      >
        <Animated.View style={{ transform: [{ scale: logoScale }] }}>
          <AppLogo size={isWide ? 140 : 110} showText={false} />
        </Animated.View>

        <View style={styles.heroBadgeRow}>
          <View style={styles.heroBadge}>
            <View style={styles.heroBadgeDot} />
            <Text style={styles.heroBadgeText}>Bangalore Only · Now Live</Text>
          </View>
        </View>

        <Text style={styles.heroHeadline}>
          Find your{" "}
          <Text style={styles.heroAccentCyan}>perfect roommate</Text>
          {"\n"}in Bangalore.
        </Text>

        <Text style={styles.heroSub}>
          Living Circle matches professionals &amp; students with compatible
          roommates using lifestyle, budget &amp; locality preferences —
          safely and privately.
        </Text>

        <View style={styles.heroCTARow}>
          <Pressable style={styles.ctaPrimary} onPress={goAuth}>
            <Ionicons name="rocket-outline" size={18} color="#fff" />
            <Text style={styles.ctaPrimaryText}>Get Started — Free</Text>
          </Pressable>
          <Pressable style={styles.ctaSecondary} onPress={goAuth}>
            <Text style={styles.ctaSecondaryText}>I already have an account →</Text>
          </Pressable>
        </View>

        <Text style={styles.heroDisclaimer}>
          No credit card · No hidden fees · Bangalore only
        </Text>
      </Animated.View>

      {/* ── STATS BAR ── */}
      <View style={styles.statsBar}>
        <Stat value="500+" label="Roommates" color={C.cyan} />
        <View style={styles.statsDivider} />
        <Stat value="50+"  label="Localities" color="#A855F7" />
        <View style={styles.statsDivider} />
        <Stat value="94%"  label="Match Rate" color={C.coral} />
        <View style={styles.statsDivider} />
        <Stat value="100%" label="Bangalore" color="#22C55E" />
      </View>

      <Divider />

      {/* ── FEATURES ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>WHY LIVING CIRCLE</Text>
        <Text style={styles.sectionTitle}>Built for Bangalore,{"\n"}by Bangaloreans.</Text>
        <Text style={styles.sectionSub}>
          Every feature is designed for the realities of finding a roommate in India's tech capital.
        </Text>
        <View style={[styles.featureGrid, isWide && { flexDirection: "row", flexWrap: "wrap" }]}>
          {[
            { icon: "shield-checkmark-outline", title: "Privacy First",        body: "Room photos hidden until you match. Your number is never shared.",               color: "#00D9FF" },
            { icon: "heart-outline",            title: "Smart Matching",        body: "Algorithm scores lifestyle, budget, locality & language compatibility.",          color: "#FF006E" },
            { icon: "location-outline",         title: "Neighbourhood Map",     body: "See metro, gym, ATM & restaurant distances post-match. No surprises.",           color: "#A855F7" },
            { icon: "shield-outline",           title: "ID Verification",       body: "Verified badge for users who submit a government ID. +40% more matches.",        color: "#22C55E" },
            { icon: "chatbubble-outline",       title: "In-App Chat",           body: "Safe, encrypted messaging — no need to share personal numbers.",                 color: "#F59E0B" },
            { icon: "people-outline",           title: "Bangalore Locals Only", body: "Only real Bangalore profiles — no bots, no out-of-city fakes.",                  color: "#EF4444" },
          ].map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </View>
      </View>

      <Divider />

      {/* ── HOW IT WORKS ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
        <Text style={styles.sectionTitle}>Find a roommate{"\n"}in 3 easy steps.</Text>
        <View style={styles.steps}>
          <Step
            num="01"
            title="Create your profile"
            body="Fill in budget, preferred localities, lifestyle habits, and upload room photos. Takes under 5 minutes."
            color={C.cyan}
          />
          <View style={styles.stepConnector} />
          <Step
            num="02"
            title="Discover & match"
            body="Browse compatible profiles. Swipe right to like. When both sides like — it's a match!"
            color={C.coral}
          />
          <View style={styles.stepConnector} />
          <Step
            num="03"
            title="Chat & explore"
            body="Message safely in-app. Explore the neighbourhood map together. Meet in public. Move in."
            color="#A855F7"
          />
        </View>
      </View>

      <Divider />

      {/* ── SAFETY PROMISE ── */}
      <View style={[styles.safetySection]}>
        <View style={styles.safetyLeft}>
          <Text style={styles.sectionLabel}>SAFETY FIRST</Text>
          <Text style={styles.sectionTitle}>Your safety is{"\n"}our top priority.</Text>
          <Text style={styles.sectionSub}>
            Every feature is designed with DPDP Act 2023 compliance and
            your personal security in mind.
          </Text>
        </View>
        <View style={styles.safetyRight}>
          {[
            { icon: "lock-closed-outline",      label: "End-to-end encrypted chat",              color: "#00D9FF" },
            { icon: "eye-off-outline",           label: "Photos hidden until mutual match",        color: "#A855F7" },
            { icon: "shield-checkmark-outline",  label: "ID verification system",                  color: "#22C55E" },
            { icon: "flag-outline",              label: "1-tap report & block",                    color: "#EF4444" },
            { icon: "warning-outline",           label: "Safety briefing on every new match",      color: "#F59E0B" },
            { icon: "call-outline",              label: "Emergency helpline numbers built in",     color: "#FF006E" },
          ].map(({ icon, label, color }) => (
            <View key={label} style={styles.safetyRow}>
              <View style={[styles.safetyIconWrap, { backgroundColor: color + "18" }]}>
                <Ionicons name={icon as any} size={18} color={color} />
              </View>
              <Text style={styles.safetyLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <Divider />

      {/* ── TESTIMONIALS ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>REAL STORIES</Text>
        <Text style={styles.sectionTitle}>Roommates found,{"\n"}lives changed.</Text>
        <View style={[styles.testimonialGrid, isWide && { flexDirection: "row" }]}>
          <Testimonial
            quote="Found my current flatmate within 3 days. The lifestyle compatibility score was spot on — we're both night owls and gym people."
            name="Priya S."
            role="Software Engineer, Koramangala"
            color={C.cyan}
          />
          <Testimonial
            quote="As a girl moving to Bangalore alone, the safety features gave me confidence. My roommate is now one of my closest friends."
            name="Ananya R."
            role="MBA Student, HSR Layout"
            color={C.coral}
          />
          <Testimonial
            quote="The map feature showed me the gym and metro were 5 minutes away. Exactly what I needed. Moved in the next week."
            name="Karthik M."
            role="Product Manager, Indiranagar"
            color="#A855F7"
          />
        </View>
      </View>

      <Divider />

      {/* ── FINAL CTA ── */}
      <View style={styles.finalCTA}>
        <GlowBlob color="#FF006E" top={-60} right={40} size={200} opacity={0.1} />
        <GlowBlob color="#00D9FF" bottom={-40} left={20} size={180} opacity={0.1} />

        <AppLogo size={72} style={{ marginBottom: S.xl }} />
        <Text style={styles.finalCTATitle}>Ready to find your{"\n"}Living Circle?</Text>
        <Text style={styles.finalCTASub}>
          Join 500+ Bangaloreans already using Living Circle.{"\n"}
          Free forever. Safe by design.
        </Text>
        <Pressable style={styles.finalCTABtn} onPress={goAuth}>
          <Ionicons name="rocket-outline" size={20} color="#fff" />
          <Text style={styles.finalCTABtnText}>Get Started — It's Free</Text>
        </Pressable>
        <Text style={styles.finalCTANote}>No spam · No fees · Bangalore only 🏙️</Text>
      </View>

      {/* ── FOOTER ── */}
      <View style={styles.footer}>
        <View style={styles.footerBrand}>
          <AppLogo size={28} />
          <Text style={styles.footerBrandText}>Living Circle</Text>
        </View>
        <Text style={styles.footerTagline}>Bangalore's Roommate App · Est. 2026</Text>
        <View style={styles.footerLinks}>
          <Pressable onPress={() => router.push("/legal/terms")}>
            <Text style={styles.footerLink}>Terms of Service</Text>
          </Pressable>
          <Text style={styles.footerSep}>·</Text>
          <Pressable onPress={() => router.push("/legal/privacy")}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </Pressable>
          <Text style={styles.footerSep}>·</Text>
          <Pressable onPress={() => router.push("/auth/phone")}>
            <Text style={styles.footerLink}>Login</Text>
          </Pressable>
        </View>
        <Text style={styles.footerCopy}>
          © 2026 Living Circle. All rights reserved.{"\n"}
          Bangalore, Karnataka, India. DPDP Act 2023 compliant.
        </Text>
      </View>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const CARD_W = isWide ? "31%" : "100%";

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "#0F0F1E" },
  content: { paddingBottom: 0 },

  // Nav
  nav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: isWide ? 48 : S.xl, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(0,217,255,0.12)",
    backgroundColor: "rgba(15,15,30,0.95)",
    ...(Platform.OS === "web" ? ({ position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(20px)" } as any) : {}),
  },
  navBrand: { flexDirection: "row", alignItems: "center", gap: 10 },
  navBrandText: { color: "#FFFFFF", fontSize: 18, fontWeight: "900", letterSpacing: 1 },
  navActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  navLoginBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  navLoginText: { color: C.onSurfaceSecondary, fontSize: 14, fontWeight: "600" },
  navSignupBtn: {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: R.pill,
    backgroundColor: C.coral,
    ...(Platform.OS === "web" ? ({ boxShadow: "0 0 18px rgba(255,0,110,0.5)" } as any) : {}),
  },
  navSignupText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  // Hero
  hero: {
    alignItems: "center", paddingTop: isWide ? 80 : 60,
    paddingBottom: isWide ? 80 : 56, paddingHorizontal: isWide ? 80 : S.xl, gap: S.xl,
  },
  heroBadgeRow: { flexDirection: "row" },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: R.pill, borderWidth: 1, borderColor: "rgba(0,245,160,0.4)",
    backgroundColor: "rgba(0,245,160,0.08)",
  },
  heroBadgeDot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: "#00F5A0",
    ...(Platform.OS === "web" ? ({ boxShadow: "0 0 8px #00F5A0" } as any) : {}),
  },
  heroBadgeText: { color: "#00F5A0", fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },

  heroHeadline: {
    fontSize: isWide ? 52 : 34, fontWeight: "900", color: "#FFFFFF",
    textAlign: "center", lineHeight: isWide ? 64 : 44, letterSpacing: -0.5,
    ...(Platform.OS === "web" ? ({ textShadow: "0 2px 40px rgba(0,0,0,0.6)" } as any) : {}),
  },
  heroAccentCyan: {
    color: "#00D9FF",
    ...(Platform.OS === "web" ? ({ textShadow: "0 0 30px rgba(0,217,255,0.7)" } as any) : {}),
  },
  heroSub: {
    fontSize: isWide ? 18 : 15, color: C.onSurfaceSecondary,
    textAlign: "center", lineHeight: isWide ? 30 : 24,
    maxWidth: 580,
  },
  heroCTARow: { flexDirection: isWide ? "row" : "column", gap: 14, width: "100%", maxWidth: 480, alignItems: "center" },
  ctaPrimary: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.coral, paddingVertical: 16, paddingHorizontal: 32,
    borderRadius: R.pill, width: isWide ? undefined : "100%", justifyContent: "center",
    ...(Platform.OS === "web" ? ({ boxShadow: "0 0 30px rgba(255,0,110,0.6), 0 4px 20px rgba(0,0,0,0.4)" } as any) : {
      shadowColor: C.coral, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 16, elevation: 10,
    }),
  },
  ctaPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "900", letterSpacing: 0.5 },
  ctaSecondary: { paddingVertical: 12 },
  ctaSecondaryText: { color: C.cyan, fontSize: 14, fontWeight: "600" },
  heroDisclaimer: { color: C.onSurfaceTertiary, fontSize: 12, letterSpacing: 0.3 },

  // Stats
  statsBar: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    paddingVertical: 28, paddingHorizontal: S.xl,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: "rgba(0,217,255,0.1)",
    backgroundColor: "rgba(0,217,255,0.03)", gap: 0,
    flexWrap: "wrap",
  },
  stat: { alignItems: "center", paddingHorizontal: isWide ? 32 : 16 },
  statValue: { fontSize: isWide ? 36 : 26, fontWeight: "900", letterSpacing: 0.5 },
  statLabel: { color: C.onSurfaceTertiary, fontSize: 12, fontWeight: "600", letterSpacing: 0.5, marginTop: 2 },
  statsDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.08)" },

  // Divider
  divider: { flexDirection: "row", alignItems: "center", paddingHorizontal: isWide ? 80 : S.xl, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(0,217,255,0.12)" },
  dividerDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: C.cyan, marginHorizontal: 12,
    ...(Platform.OS === "web" ? ({ boxShadow: "0 0 8px #00D9FF" } as any) : {}),
  },

  // Section
  section: { paddingHorizontal: isWide ? 80 : S.xl, paddingVertical: 60 },
  sectionLabel: { color: C.cyan, fontSize: 11, fontWeight: "900", letterSpacing: 2.5, marginBottom: 14 },
  sectionTitle: {
    fontSize: isWide ? 38 : 28, fontWeight: "900", color: "#FFFFFF",
    lineHeight: isWide ? 48 : 36, letterSpacing: -0.3, marginBottom: 14,
  },
  sectionSub: { color: C.onSurfaceSecondary, fontSize: 15, lineHeight: 24, maxWidth: 560, marginBottom: 36 },

  // Features grid
  featureGrid: { gap: 14 },
  featureCard: {
    backgroundColor: "#1A1A2E", borderRadius: R.lg, borderWidth: 1,
    padding: 22, gap: 12,
    ...(isWide ? { width: CARD_W } : {}),
    ...(Platform.OS === "web" ? ({ transition: "box-shadow 0.2s, border-color 0.2s" } as any) : {}),
  },
  featureIconWrap: {
    width: 52, height: 52, borderRadius: R.md, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  featureTitle: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  featureBody: { fontSize: 13, color: C.onSurfaceSecondary, lineHeight: 20 },

  // Steps
  steps: { gap: 0 },
  step: { flexDirection: "row", gap: 20, alignItems: "flex-start" },
  stepNum: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 2,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  stepNumText: { fontSize: 16, fontWeight: "900" },
  stepTitle: { fontSize: 17, fontWeight: "800", color: "#FFFFFF", marginBottom: 6 },
  stepBody: { fontSize: 14, color: C.onSurfaceSecondary, lineHeight: 22 },
  stepConnector: {
    width: 2, height: 36, backgroundColor: "rgba(255,255,255,0.06)",
    marginLeft: 24, marginVertical: 6,
  },

  // Safety
  safetySection: {
    paddingHorizontal: isWide ? 80 : S.xl, paddingVertical: 60,
    flexDirection: isWide ? "row" : "column", gap: 48,
  },
  safetyLeft: { flex: isWide ? 1 : undefined },
  safetyRight: { flex: isWide ? 1 : undefined, gap: 14, justifyContent: "center" },
  safetyRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  safetyIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  safetyLabel: { color: C.onSurfaceSecondary, fontSize: 14, fontWeight: "600" },

  // Testimonials
  testimonialGrid: { gap: 16 },
  testimonial: {
    backgroundColor: "#16213E", borderRadius: R.lg,
    borderTopWidth: 3, padding: 24, gap: 16,
    ...(isWide ? { flex: 1 } : {}),
  },
  testimonialQuote: { color: C.onSurface, fontSize: 14, lineHeight: 22, fontStyle: "italic" },
  testimonialMeta: { flexDirection: "row", alignItems: "center", gap: 12 },
  testimonialAvatar: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  testimonialInitial: { fontSize: 18, fontWeight: "900" },
  testimonialName: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  testimonialRole: { color: C.onSurfaceTertiary, fontSize: 12 },

  // Final CTA
  finalCTA: {
    marginHorizontal: isWide ? 80 : S.xl, marginVertical: 60,
    backgroundColor: "#16213E", borderRadius: 24,
    borderWidth: 1, borderColor: "rgba(0,217,255,0.2)",
    padding: isWide ? 72 : 40, alignItems: "center", gap: S.xl,
    overflow: "hidden",
  },
  finalCTATitle: {
    fontSize: isWide ? 44 : 30, fontWeight: "900", color: "#FFFFFF",
    textAlign: "center", lineHeight: isWide ? 56 : 40, letterSpacing: -0.5,
  },
  finalCTASub: {
    fontSize: 15, color: C.onSurfaceSecondary, textAlign: "center", lineHeight: 24,
  },
  finalCTABtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.coral, paddingVertical: 18, paddingHorizontal: 40,
    borderRadius: R.pill,
    ...(Platform.OS === "web" ? ({ boxShadow: "0 0 36px rgba(255,0,110,0.65)" } as any) : {
      shadowColor: C.coral, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 20, elevation: 12,
    }),
  },
  finalCTABtnText: { color: "#fff", fontSize: 17, fontWeight: "900", letterSpacing: 0.5 },
  finalCTANote: { color: C.onSurfaceTertiary, fontSize: 12, letterSpacing: 0.3 },

  // Footer
  footer: {
    paddingHorizontal: isWide ? 80 : S.xl, paddingVertical: 48,
    borderTopWidth: 1, borderTopColor: "rgba(0,217,255,0.1)",
    alignItems: "center", gap: 16,
    backgroundColor: "#0A0A18",
  },
  footerBrand: { flexDirection: "row", alignItems: "center", gap: 10 },
  footerBrandText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", letterSpacing: 1 },
  footerTagline: { color: C.onSurfaceTertiary, fontSize: 12 },
  footerLinks: { flexDirection: "row", alignItems: "center", gap: 12 },
  footerLink: { color: C.cyan, fontSize: 13, fontWeight: "600" },
  footerSep: { color: C.onSurfaceTertiary },
  footerCopy: { color: C.onSurfaceTertiary, fontSize: 11, textAlign: "center", lineHeight: 18 },
});
