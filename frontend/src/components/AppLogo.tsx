/**
 * Living Circle logo — futuristic overlapping circles, neon cyan + coral.
 * Pure View-based: no PNG dependency, works on web and native identically.
 */
import { StyleProp, View, ViewStyle, Text } from "react-native";

type Props = { size?: number; style?: StyleProp<ViewStyle>; showText?: boolean };

export function AppLogo({ size = 32, style, showText = false }: Props) {
  const r = size * 0.40;
  const offset = size * 0.18;

  return (
    <View style={[{ alignItems: "center" }, style]}>
      <View style={{ width: size, height: size * 0.75, position: "relative" }}>
        {/* Cyan circle (left) */}
        <View
          style={{
            position: "absolute",
            left: 0,
            top: size * 0.05,
            width: r * 2,
            height: r * 2,
            borderRadius: r,
            backgroundColor: "#00D9FF",
            opacity: 0.9,
            shadowColor: "#00D9FF",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: size * 0.15,
          }}
        />
        {/* Coral circle (right) */}
        <View
          style={{
            position: "absolute",
            right: 0,
            top: size * 0.05,
            width: r * 2,
            height: r * 2,
            borderRadius: r,
            backgroundColor: "#FF006E",
            opacity: 0.85,
            shadowColor: "#FF006E",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: size * 0.15,
          }}
        />
        {/* Centre overlap — white blend */}
        <View
          style={{
            position: "absolute",
            left: size / 2 - offset * 0.8,
            top: size * 0.05 + r - offset * 0.8,
            width: offset * 1.6,
            height: offset * 1.6,
            borderRadius: offset,
            backgroundColor: "rgba(255,255,255,0.18)",
          }}
        />
      </View>
      {showText && (
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: size * 0.28,
            fontWeight: "900",
            letterSpacing: 1,
            marginTop: size * 0.05,
          }}
        >
          LIVING CIRCLE
        </Text>
      )}
    </View>
  );
}
