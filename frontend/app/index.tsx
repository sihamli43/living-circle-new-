import { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { storage } from "@/src/utils/storage";
import { api } from "@/src/api/client";
import { C } from "@/src/theme/colors";
import { AppLogo } from "@/src/components/AppLogo";

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      const tk = await storage.getItem<string>("lc_token", "");
      if (!tk) {
        router.replace("/auth/phone");
        return;
      }
      try {
        const me = await api.me();
        if (me?.onboarded) router.replace("/(tabs)/discover");
        else router.replace("/onboarding/profile");
      } catch {
        await storage.removeItem("lc_token");
        router.replace("/auth/phone");
      }
    })();
  }, [router]);

  return (
    <View style={styles.c} testID="splash-screen">
      <AppLogo size={96} />
      <Text style={styles.tagline}>Find your people, find your place.</Text>
      <ActivityIndicator color={C.brand} size="large" style={{ marginTop: 32 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", padding: 32 },
  tagline: { marginTop: 16, fontSize: 16, color: C.onSurfaceSecondary, fontWeight: "600", textAlign: "center" },
});
