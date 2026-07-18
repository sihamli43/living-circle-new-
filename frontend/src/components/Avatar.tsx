import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { initialsFor, paletteFor } from "@/src/theme/colors";

export function Avatar({
  name,
  photo,
  size = 56,
  testID,
}: {
  name?: string | null;
  photo?: string | null;
  size?: number;
  testID?: string;
}) {
  const radius = size / 2;
  if (photo) {
    return (
      <Image
        source={{ uri: photo.startsWith("data:") ? photo : `data:image/jpeg;base64,${photo}` }}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
        testID={testID}
      />
    );
  }
  const [c1, c2] = paletteFor(name ?? "?");
  return (
    <LinearGradient
      colors={[c1, c2]}
      style={[styles.wrap, { width: size, height: size, borderRadius: radius }]}
      testID={testID}
    >
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initialsFor(name)}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  initials: { color: "#fff", fontWeight: "800", letterSpacing: 0.5 },
});
