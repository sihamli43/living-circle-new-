import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { C, R, S } from "@/src/theme/colors";

const EFFECTIVE_DATE = "17 June 2026";

type Section = { id: string; title: string; body: string[] };

const SECTIONS: Section[] = [
  {
    id: "overview",
    title: "1. Overview",
    body: [
      "Living Circle ('we', 'us', 'our') is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal data in compliance with India's Digital Personal Data Protection (DPDP) Act, 2023.",
      "By using Living Circle, you consent to the practices described in this Policy. If you do not agree, please discontinue use and delete your account.",
    ],
  },
  {
    id: "collect",
    title: "2. Data We Collect",
    body: [
      "We collect only the data necessary to provide our roommate-matching service. This includes:",
      "Identity data: full name, age, gender.",
      "Contact data: email address (used for login via OTP).",
      "Profile data: occupation, organisation/college, profile photo, bio, languages spoken.",
      "Preferences: budget range, preferred localities (Bangalore), move-in date, listing type.",
      "Lifestyle data: food preferences, sleep schedule, cleanliness habits, smoking/drinking status, pet preferences, and other compatibility factors you choose to share.",
      "Listing data: room photos, rent, deposit, amenities, property description (for users with a place).",
      "Interaction data: swipe history, match records, in-app messages.",
      "Technical data: IP address, browser/device type, access timestamps (collected automatically for security).",
      "We do NOT collect Aadhaar numbers, PAN, financial account details, or government-issued IDs.",
    ],
  },
  {
    id: "use",
    title: "3. How We Use Your Data",
    body: [
      "Matching: We use your lifestyle preferences and locality data to calculate compatibility scores and surface relevant profiles.",
      "Communication: We send OTP codes via email (using Brevo) to authenticate your login.",
      "Platform operation: We use interaction data to prevent duplicate matches, enforce bans, and improve discovery.",
      "Safety & fraud prevention: We analyse patterns to detect fake accounts, scammers, and harassment.",
      "Analytics: We use aggregated, anonymised data to improve product features. No individual-level data is shared for analytics.",
      "Legal compliance: We may process your data to comply with Indian law or respond to lawful requests from government authorities.",
      "We do NOT use your data for targeted advertising. We do NOT sell your data to any third party.",
    ],
  },
  {
    id: "security",
    title: "4. Data Security",
    body: [
      "All data is stored in MongoDB Atlas (cloud database) with encryption at rest and in transit.",
      "All communication between your device and our servers uses HTTPS/TLS encryption.",
      "Photos are stored as Base64-encoded data, accessible only to matched users and our internal systems.",
      "Passwords are not stored — we use a passwordless OTP system for authentication.",
      "Access to production data is restricted to authorised team members only.",
      "We conduct periodic security reviews. However, no system is 100% secure. If you suspect a security breach, contact privacy@livingcircle.app immediately.",
    ],
  },
  {
    id: "retention",
    title: "5. Data Retention",
    body: [
      "Your account data is retained for as long as your account remains active.",
      "Deleted accounts: all personal data, photos, chat messages, and match records are permanently deleted within 30 days of account deletion.",
      "OTP codes are auto-expired after 10 minutes and purged by the database TTL index.",
      "Anonymised, aggregated analytics data may be retained indefinitely as it cannot be linked back to any individual.",
      "We may retain certain data longer if legally required (e.g., fraud investigation records).",
    ],
  },
  {
    id: "rights",
    title: "6. Your Rights (DPDP Act 2023)",
    body: [
      "Under India's Digital Personal Data Protection Act, 2023, you have the following rights:",
      "Right to Access: Request a copy of all personal data we hold about you.",
      "Right to Correction: Ask us to correct inaccurate or outdated information.",
      "Right to Erasure: Request permanent deletion of your account and all associated data.",
      "Right to Grievance Redressal: File a grievance if you believe your rights have been violated. We will respond within 30 days.",
      "Right to Withdraw Consent: You may withdraw consent at any time by deleting your account. This does not affect processing done before withdrawal.",
      "Nomination: You may nominate another person to exercise your rights in the event of your incapacitation or death.",
      "To exercise any of these rights, contact privacy@livingcircle.app with the subject line 'DPDP Rights Request'.",
    ],
  },
  {
    id: "third-parties",
    title: "7. Third Parties & Processors",
    body: [
      "We share your data only with trusted service providers ('data processors') who process data on our behalf:",
      "Brevo (Sendinblue): Used to send OTP login emails. Brevo only receives your email address and the OTP content. Brevo's privacy policy applies to this processing.",
      "MongoDB Atlas (AWS): Our cloud database provider. Stores all user data with encryption at rest. MongoDB's security certifications include ISO 27001 and SOC 2.",
      "We do NOT share your data with advertisers, data brokers, insurance companies, employers, or any other third party for commercial purposes.",
      "In the event of a merger, acquisition, or sale of assets, user data may be transferred to the new entity, and you will be notified in advance.",
    ],
  },
  {
    id: "cookies",
    title: "8. Cookies & Tracking",
    body: [
      "The Living Circle web app uses minimal cookies:",
      "Session cookie: stores your authentication token (JWT) to keep you logged in. This is essential and cannot be disabled.",
      "We do NOT use advertising cookies, third-party tracking pixels, or analytics cookies (e.g., Google Analytics).",
      "Mobile app: on iOS and Android, we use AsyncStorage / SecureStore for local session data — no browser cookies.",
    ],
  },
  {
    id: "children",
    title: "9. Children's Privacy",
    body: [
      "Living Circle is not intended for users under 18 years of age.",
      "We do not knowingly collect personal data from minors. If we become aware that a user is under 18, their account will be immediately terminated and their data deleted.",
      "If you believe a minor has created an account, please contact safety@livingcircle.app.",
    ],
  },
  {
    id: "international",
    title: "10. International Data Transfers",
    body: [
      "Living Circle operates from India. Your data is primarily processed and stored on servers in India or within regions compliant with Indian data protection law.",
      "Brevo's email servers may process your email address in data centres outside India. Brevo complies with GDPR and has Standard Contractual Clauses in place.",
      "By using the platform, you consent to your data being processed as described above.",
    ],
  },
  {
    id: "changes",
    title: "11. Changes to This Policy",
    body: [
      "We may update this Privacy Policy from time to time. Material changes will be communicated via email or an in-app notification at least 7 days before they take effect.",
      "The 'effective date' at the top of this page will reflect the date of the latest revision.",
      "Continued use of the platform after the effective date constitutes acceptance of the revised Policy.",
    ],
  },
  {
    id: "contact",
    title: "12. Grievance Officer & Contact",
    body: [
      "In accordance with the DPDP Act, 2023, we have appointed a Grievance Officer:",
      "Name: Living Circle Privacy Team",
      "Email: privacy@livingcircle.app",
      "Address: Bangalore, Karnataka, India",
      "Response time: We aim to respond to all privacy requests within 30 days.",
      "For general support queries: support@livingcircle.app",
    ],
  },
];

function AccordionSection({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.section}>
      <Pressable style={styles.sectionHeader} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={C.brand}
        />
      </Pressable>
      {open && (
        <View style={styles.sectionBody}>
          {section.body.map((para, i) => (
            <Text key={i} style={styles.para}>{para}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

export default function PrivacyScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} testID="legal-back">
          <Ionicons name="arrow-back" size={24} color={C.brand} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroBanner}>
          <Text style={styles.heroTitle}>Privacy Policy</Text>
          <Text style={styles.heroSub}>Effective date: {EFFECTIVE_DATE}</Text>
          <Text style={styles.heroSub}>Compliant with India's DPDP Act, 2023</Text>
        </View>

        <View style={styles.noticeBanner}>
          <Ionicons name="shield-checkmark" size={18} color={C.success} />
          <Text style={styles.noticeText}>
            Your privacy matters to us. We collect only what's needed for matching, never sell your data, and give you full control over your information.
          </Text>
        </View>

        {SECTIONS.map((s) => (
          <AccordionSection key={s.id} section={s} />
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2026 Living Circle. All rights reserved.
          </Text>
          <Pressable onPress={() => Linking.openURL("mailto:privacy@livingcircle.app")}>
            <Text style={styles.footerLink}>privacy@livingcircle.app</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.surface },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: S.lg, paddingVertical: S.md,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: C.onSurface },
  content: { padding: S.xl, paddingBottom: S.xxxl },
  heroBanner: {
    backgroundColor: C.brandTint, borderRadius: R.md,
    padding: S.xl, marginBottom: S.lg,
    borderWidth: 1, borderColor: C.border,
  },
  heroTitle: { fontSize: 22, fontWeight: "800", color: C.brand, marginBottom: S.sm },
  heroSub: { fontSize: 13, color: C.onBrandTint, marginTop: 2 },
  noticeBanner: {
    flexDirection: "row", gap: S.sm, alignItems: "flex-start",
    backgroundColor: "#ECFDF5", borderRadius: R.md, padding: S.md,
    borderWidth: 1, borderColor: "#6EE7B7", marginBottom: S.lg,
  },
  noticeText: { flex: 1, fontSize: 13, color: "#065F46", lineHeight: 18 },
  section: {
    borderRadius: R.md, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface, marginBottom: S.md, overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: S.lg,
  },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: C.brand, paddingRight: S.sm },
  sectionBody: {
    paddingHorizontal: S.lg, paddingBottom: S.lg,
    borderTopWidth: 1, borderTopColor: C.border,
    backgroundColor: C.surfaceSecondary,
  },
  para: { fontSize: 14, color: C.onSurfaceSecondary, lineHeight: 22, marginTop: S.sm },
  footer: { alignItems: "center", marginTop: S.xl, gap: S.sm },
  footerText: { fontSize: 12, color: C.onSurfaceTertiary },
  footerLink: { fontSize: 12, color: C.brand, fontWeight: "600", textDecorationLine: "underline" },
});
