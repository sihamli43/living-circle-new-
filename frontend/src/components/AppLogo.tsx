/**
 * Living Circle logo — house-in-diamond mark ringed by 4 people, rendered
 * from the real brand asset (frontend/assets/images/logo.png).
 */
import { Image } from "expo-image";
import { StyleProp, Text, View, ViewStyle } from "react-native";
import { C } from "@/src/theme/colors";

type Props = { size?: number; style?: StyleProp<ViewStyle>; showText?: boolean };

export function AppLogo({ size = 40, style, showText = false }: Props) {
  return (
    <View style={[{ alignItems: "center" }, style]}>
      <Image
        source={require("@/assets/images/logo.png")}
        style={{ width: size, height: size }}
        contentFit="contain"
      />
      {showText && (
        <Text
          style={{
            color: C.onSurface,
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
