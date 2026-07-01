// Design tokens — Living Circle.
// Palette: Futuristic dark — deep space backgrounds, neon cyan + coral accents.
export const ACTIVE_CITY = "Bangalore";
export const ACTIVE_LOCALITIES = [
  // Central / Inner ring
  "MG Road", "Residency Road", "Richmond Town", "Lavelle Road",
  "Shivajinagar", "Cubbon Park", "Ulsoor", "Frazer Town", "Cox Town",
  "Cunningham Road", "Cleveland Town",
  // South Bangalore
  "Koramangala", "Indiranagar", "Domlur", "Ejipura", "HAL Layout",
  "HSR Layout", "BTM Layout", "Jayanagar", "JP Nagar", "Banashankari",
  "Basavanagudi", "Padmanabhanagar", "Kanakapura Road",
  "Bannerghatta Road", "Electronic City", "Hosa Road",
  // North Bangalore
  "Hebbal", "Yelahanka", "Banaswadi", "RT Nagar", "HBR Layout",
  "Kalyan Nagar", "New BEL Road", "Vidyaranyapura", "Peenya",
  "Sahakara Nagar", "Nagavara", "Thanisandra",
  // West Bangalore
  "Rajajinagar", "Malleswaram", "Basaveshwara Nagar", "Nagarbhavi",
  "Kengeri", "Mysore Road", "Tumkur Road",
  // East / Outer ring
  "Whitefield", "Marathahalli", "Sarjapur Road", "Bellandur",
  "Old Airport Road", "Viman Nagar", "KR Puram", "Mahadevapura",
  "Brookefield", "ITPL Road", "Kadubeesanahalli",
  // Tech corridors
  "Outer Ring Road", "Silk Board", "Devanahalli",
];

export const C = {
  // Backgrounds — deep space dark
  bg: "#0F0F1E",
  brand: "#0F0F1E",
  brandTint: "rgba(0,217,255,0.12)",
  onBrand: "#FFFFFF",
  onBrandTint: "#00D9FF",

  // Neon accents
  coral: "#FF006E",        // neon coral/magenta
  onCoral: "#FFFFFF",
  cyan: "#00D9FF",         // electric cyan

  // Surfaces (glass layers)
  surface: "#0F0F1E",
  surfaceSecondary: "#1A1A2E",
  surfaceTertiary: "#16213E",
  surfaceGlass: "rgba(255,255,255,0.05)",
  surfaceGlassStrong: "rgba(255,255,255,0.10)",

  // Text
  onSurface: "#FFFFFF",
  onSurfaceSecondary: "#CBD5E1",
  onSurfaceTertiary: "#64748B",
  onSurfaceInverse: "#0F0F1E",

  // Semantic
  success: "#00F5A0",
  warning: "#F59E0B",
  error: "#FF4444",

  // Borders
  border: "rgba(255,255,255,0.10)",
  borderStrong: "rgba(255,255,255,0.20)",
  borderCyan: "rgba(0,217,255,0.45)",
  borderCoral: "rgba(255,0,110,0.45)",
};

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const R = { sm: 8, md: 16, lg: 24, pill: 99 };

// Neon glow shadows
export const GLOW_CYAN = {
  shadowColor: "#00D9FF",
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.65,
  shadowRadius: 14,
  elevation: 10,
};
export const GLOW_CORAL = {
  shadowColor: "#FF006E",
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.65,
  shadowRadius: 14,
  elevation: 10,
};
export const CARD_SHADOW = {
  shadowColor: "#00D9FF",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.18,
  shadowRadius: 16,
  elevation: 8,
};

// Avatar gradients — neon palette
export const AVATAR_PALETTE: [string, string][] = [
  ["#1A1A2E", "#00D9FF"],
  ["#FF006E", "#FF4D8F"],
  ["#6A0572", "#A855F7"],
  ["#00D9FF", "#0EA5E9"],
  ["#00F5A0", "#10B981"],
  ["#8B5CF6", "#6D28D9"],
  ["#FF006E", "#6A0572"],
  ["#00D9FF", "#6A0572"],
];

export function initialsFor(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function paletteFor(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length] as [string, string];
}
