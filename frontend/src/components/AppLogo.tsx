/**
 * Living Circle logo — redesigned.
 * Three concentric elements: outer neon ring → cyan circle → coral circle → white "LC" monogram.
 * Pure View/Text based, no PNG/SVG dependency. Works identically on web + native.
 */
import { Platform, StyleProp, Text, View, ViewStyle } from "react-native";

type Props = { size?: number; style?: StyleProp<ViewStyle>; showText?: boolean };

export function AppLogo({ size = 40, style, showText = false }: Props) {
  const outerGlow = Platform.OS === "web"
    ? ({
        boxShadow: `0 0 ${size * 0.35}px rgba(0,217,255,0.7), 0 0 ${size * 0.7}px rgba(0,217,255,0.25), inset 0 0 ${size * 0.2}px rgba(0,217,255,0.15)`,
      } as any)
    : {
        shadowColor: "#00D9FF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: size * 0.3,
        elevation: 12,
      };

  return (
    <View style={[{ alignItems: "center" }, style]}>
      {/* Outer glowing ring */}
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: size * 0.035,
            borderColor: "#00D9FF",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "transparent",
          },
          outerGlow,
        ]}
      >
        {/* Cyan half */}
        <View
          style={{
            position: "absolute",
            left: size * 0.1,
            top: size * 0.1,
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: size * 0.2,
            backgroundColor: "#00D9FF",
            opacity: 0.92,
            ...(Platform.OS === "web"
              ? ({ boxShadow: `0 0 ${size * 0.2}px #00D9FF` } as any)
              : {}),
          }}
        />
        {/* Coral half */}
        <View
          style={{
            position: "absolute",
            right: size * 0.1,
            bottom: size * 0.1,
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: size * 0.2,
            backgroundColor: "#FF006E",
            opacity: 0.92,
            ...(Platform.OS === "web"
              ? ({ boxShadow: `0 0 ${size * 0.2}px #FF006E` } as any)
              : {}),
          }}
        />
        {/* Center monogram */}
        <View
          style={{
            width: size * 0.38,
            height: size * 0.38,
            borderRadius: size * 0.19,
            backgroundColor: "#0F0F1E",
            borderWidth: size * 0.025,
            borderColor: "rgba(255,255,255,0.25)",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: size * 0.16,
              fontWeight: "900",
              letterSpacing: size * 0.01,
              lineHeight: size * 0.18,
            }}
          >
            LC
          </Text>
        </View>
      </View>

      {showText && (
        <Text
          style={[
            {
              color: "#FFFFFF",
              fontSize: size * 0.22,
              fontWeight: "900",
              letterSpacing: size * 0.04,
              marginTop: size * 0.12,
              textTransform: "uppercase",
            },
            Platform.OS === "web"
              ? ({ textShadow: "0 0 20px rgba(0,217,255,0.6)" } as any)
              : {},
          ]}
        >
          Living Circle
        </Text>
      )}
    </View>
  );
}
