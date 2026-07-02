/**
 * Living Circle logo — Bumble/Tinder/LinkedIn inspired.
 * Gradient rounded square with bold white "LC" and a small house accent.
 * Pure View/Text, no image dependency.
 */
import { Platform, StyleProp, Text, View, ViewStyle } from "react-native";

type Props = { size?: number; style?: StyleProp<ViewStyle>; showText?: boolean };

export function AppLogo({ size = 40, style, showText = false }: Props) {
  const radius = size * 0.28;   // rounded square corner radius
  const fontSize = size * 0.36;

  const shadow = Platform.OS === "web"
    ? ({
        boxShadow: `0 ${size * 0.08}px ${size * 0.3}px rgba(253,85,100,0.45), 0 ${size * 0.04}px ${size * 0.1}px rgba(0,0,0,0.3)`,
      } as any)
    : {
        shadowColor: "#FD5564",
        shadowOffset: { width: 0, height: size * 0.06 },
        shadowOpacity: 0.45,
        shadowRadius: size * 0.2,
        elevation: 10,
      };

  // On web use CSS gradient; on native use a layered approach
  const bgStyle = Platform.OS === "web"
    ? ({
        background: "linear-gradient(135deg, #FD5564 0%, #FF7847 55%, #FF9A53 100%)",
      } as any)
    : { backgroundColor: "#FD5564" };   // solid fallback for native

  return (
    <View style={[{ alignItems: "center" }, style]}>
      {/* Gradient rounded square */}
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: radius,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          },
          bgStyle,
          shadow,
        ]}
      >
        {/* Native gradient layer (orange bottom-right) */}
        {Platform.OS !== "web" && (
          <View
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: size * 0.65,
              height: size * 0.65,
              borderRadius: size * 0.65,
              backgroundColor: "#FF9A53",
              opacity: 0.55,
            }}
          />
        )}

        {/* Small house dot above LC */}
        <View
          style={{
            width: size * 0.12,
            height: size * 0.12,
            borderRadius: size * 0.06,
            backgroundColor: "rgba(255,255,255,0.5)",
            marginBottom: size * 0.04,
          }}
        />

        {/* LC monogram */}
        <Text
          style={{
            color: "#FFFFFF",
            fontSize,
            fontWeight: "900",
            letterSpacing: size * 0.02,
            lineHeight: fontSize * 1.1,
            includeFontPadding: false,
          }}
        >
          LC
        </Text>
      </View>

      {showText && (
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: size * 0.22,
            fontWeight: "800",
            letterSpacing: size * 0.03,
            marginTop: size * 0.14,
          }}
        >
          Living Circle
        </Text>
      )}
    </View>
  );
}
