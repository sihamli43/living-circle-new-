/**
 * Living Circle logo — two overlapping circles (indigo + coral).
 * Pure View-based: no PNG dependency, works on web and native identically.
 */
import { StyleProp, View, ViewStyle } from "react-native";
import { C } from "@/src/theme/colors";

type Props = { size?: number; style?: StyleProp<ViewStyle> };

export function AppLogo({ size = 32, style }: Props) {
  const r = size * 0.38;          // circle radius
  const overlap = size * 0.14;    // how much the circles overlap

  return (
    <View
      style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}
      accessibilityLabel="Living Circle logo"
    >
      {/* Indigo circle (left) */}
      <View
        style={{
          position: "absolute",
          left: 0,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          backgroundColor: C.brand,
          opacity: 0.92,
        }}
      />
      {/* Coral circle (right) */}
      <View
        style={{
          position: "absolute",
          right: 0,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          backgroundColor: C.coral,
          opacity: 0.88,
        }}
      />
      {/* Overlap blend — small white dot in the centre for depth */}
      <View
        style={{
          position: "absolute",
          width: overlap * 2,
          height: overlap * 2,
          borderRadius: overlap,
          backgroundColor: "rgba(255,255,255,0.25)",
        }}
      />
    </View>
  );
}
