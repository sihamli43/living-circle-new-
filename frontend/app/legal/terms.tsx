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
    id: "acceptance",
    title: "1. Acceptance of Terms",
    body: [
      "By creating an account or using Living Circle, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.",
      "These Terms apply to all users, including those who browse without registering.",
    ],
  },
  {
    id: "responsibilities",
    title: "2. User Responsibilities",
    body: [
      "You must be at least 18 years old to use Living Circle.",
      "You agree to provide accurate, truthful, and current information in your profile. Fake names, misleading photos, or fabricated details are strictly prohibited.",
      "You are solely responsible for the content you post, including profile photos, bio, and listing details.",
      "You agree to treat all other users with respect and dignity. Offensive, abusive, or discriminatory language will result in immediate account suspension.",
      "You must not impersonate any person or misrepresent your identity in any way.",
    ],
  },
  {
    id: "prohibited",
    title: "3. Prohibited Activities",
    body: [
      "The following activities are strictly prohibited on Living Circle:",
      "• Harassment, stalking, threatening, or intimidating other users.",
      "• Discrimination based on religion, caste, gender, sexual orientation, disability, or any other protected characteristic.",
      "• Soliciting money, running scams, or engaging in any fraudulent activity.",
      "• Sharing another user's personal information (phone number, address, etc.) without their explicit consent.",
      "• Posting illegal content or content that violates any applicable law in India.",
      "• Using automated scripts, bots, or scrapers to access the platform.",
      "• Creating multiple accounts or using the platform after being banned.",
      "Violations may result in permanent account termination and, where applicable, legal action.",
    ],
  },
  {
    id: "matching",
    title: "4. Matching & Communication",
    body: [
      "Living Circle facilitates introductions between people seeking roommates. We are not a party to any rental agreement or roommate arrangement.",
      "We do not verify the accuracy of listings, rental prices, or user-provided information beyond basic email verification.",
      "Any roommate arrangement you enter into is solely between you and the other user. Living Circle is not liable for disputes, financial losses, theft, damage to property, or personal safety issues arising from roommate relationships.",
      "We strongly encourage you to meet in public places, conduct your own due diligence, verify identities, and consult legal counsel before entering into any rental or roommate agreement.",
      "In-app chat is provided as a convenience tool only. Do not share sensitive financial or identity information over chat.",
    ],
  },
  {
    id: "photos",
    title: "5. Photo & Data Usage",
    body: [
      "Profile photos and listing photos are stored securely as encrypted data in our database.",
      "By uploading a photo, you grant Living Circle a non-exclusive, royalty-free license to store and display that photo to other users for the purpose of matching.",
      "You must only upload photos of yourself or spaces you have the legal right to photograph and share.",
      "Upon account deletion, all your photos and personal data will be permanently deleted within 30 days.",
      "We do not sell, rent, or share your photos or personal data with advertisers or third parties for commercial purposes.",
    ],
  },
  {
    id: "liability",
    title: "6. Liability Disclaimer",
    body: [
      "Living Circle is provided 'as is' without warranties of any kind, express or implied.",
      "We are not liable for: (a) the conduct of any user on or off the platform; (b) any roommate disputes, financial losses, theft, property damage, or personal injuries; (c) inaccurate or misleading user profiles or listings; (d) any interruption, suspension, or termination of the service.",
      "Our total liability to you for any claim arising out of your use of the platform shall not exceed ₹1,000 (Indian Rupees One Thousand).",
      "This limitation of liability applies to the fullest extent permitted by applicable Indian law.",
    ],
  },
  {
    id: "refunds",
    title: "7. Refund Policy",
    body: [
      "All purchases of premium features or subscriptions on Living Circle are final and non-refundable.",
      "In cases of demonstrable technical failure on our part, you may contact support@livingcircle.app within 7 days of purchase to request a review.",
      "We reserve the right to offer refunds at our sole discretion.",
    ],
  },
  {
    id: "termination",
    title: "8. Account Termination",
    body: [
      "We reserve the right to suspend or permanently terminate your account, without notice, for any violation of these Terms.",
      "We may also remove accounts that have been inactive for more than 12 months.",
      "You may delete your account at any time from the Profile screen. Upon deletion, your matches and chat history will be permanently removed.",
      "Termination does not affect rights that have accrued prior to the date of termination.",
    ],
  },
  {
    id: "safety",
    title: "9. Safety & Fraud Prevention",
    body: [
      "Living Circle has a zero-tolerance policy for harassment, sexual misconduct, and discrimination.",
      "If you encounter suspicious behaviour, please use the 'Report' feature within the app or contact safety@livingcircle.app immediately.",
      "We cooperate with law enforcement agencies when legally required to do so.",
      "Never send money to someone you have not met in person and verified to your satisfaction.",
      "If you feel unsafe at any point, trust your instincts and leave. Your safety is the priority.",
    ],
  },
  {
    id: "changes",
    title: "10. Changes to Terms",
    body: [
      "We may update these Terms at any time. We will notify you of material changes via email or an in-app notice at least 7 days before the changes take effect.",
      "Continued use of the platform after the effective date constitutes acceptance of the updated Terms.",
    ],
  },
  {
    id: "governing",
    title: "11. Governing Law & Dispute Resolution",
    body: [
      "These Terms are governed by and construed in accordance with the laws of India.",
      "Any disputes arising from these Terms or your use of Living Circle shall be subject to the exclusive jurisdiction of the courts in Bangalore, Karnataka, India.",
      "For minor disputes, we encourage you to first contact our support team at support@livingcircle.app. We aim to resolve all disputes amicably within 30 days.",
    ],
  },
  {
    id: "contact",
    title: "12. Contact Us",
    body: [
      "For questions about these Terms, please contact us:",
      "Email: support@livingcircle.app",
      "Registered Office: Bangalore, Karnataka, India",
      "We endeavour to respond to all queries within 3 business days.",
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

export default function TermsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} testID="legal-back">
          <Ionicons name="arrow-back" size={24} color={C.brand} />
        </Pressable>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroBanner}>
          <Text style={styles.heroTitle}>Terms of Service</Text>
          <Text style={styles.heroSub}>Effective date: {EFFECTIVE_DATE}</Text>
          <Text style={styles.heroSub}>Last updated: {EFFECTIVE_DATE}</Text>
        </View>

        <View style={styles.noticeBanner}>
          <Ionicons name="information-circle" size={18} color={C.coral} />
          <Text style={styles.noticeText}>
            Please read these terms carefully before using Living Circle. They explain your rights and responsibilities as a user.
          </Text>
        </View>

        {SECTIONS.map((s) => (
          <AccordionSection key={s.id} section={s} />
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2026 Living Circle. All rights reserved.
          </Text>
          <Pressable onPress={() => Linking.openURL("mailto:support@livingcircle.app")}>
            <Text style={styles.footerLink}>support@livingcircle.app</Text>
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
    backgroundColor: "#FFF7ED", borderRadius: R.md, padding: S.md,
    borderWidth: 1, borderColor: "#FED7AA", marginBottom: S.lg,
  },
  noticeText: { flex: 1, fontSize: 13, color: "#92400E", lineHeight: 18 },
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
