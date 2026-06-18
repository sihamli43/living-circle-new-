import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

/**
 * Pick a single image and return as a `data:image/jpeg;base64,...` URI.
 * On web this uses a hidden file input via expo-image-picker's web shim.
 */
export async function pickImage(source: "library" | "camera"): Promise<string | null> {
  if (source === "camera" && Platform.OS !== "web") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  } else if (source === "library" && Platform.OS !== "web") {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
  }

  const opts: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.6,
    base64: true,
    aspect: source === "library" ? [4, 3] : [1, 1],
  };
  const res =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);

  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  if (asset.base64) {
    const type = asset.mimeType || "image/jpeg";
    return `data:${type};base64,${asset.base64}`;
  }
  // On web the asset.uri is already a data URL.
  return asset.uri ?? null;
}
