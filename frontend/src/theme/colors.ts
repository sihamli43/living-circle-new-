// Design tokens — Living Circle.
// Palette: Warm modern — Tinder/Bumble/LinkedIn inspired.
// Primary gradient: flame red → warm orange  (#FD5564 → #FF9A53)
// Backgrounds: clean warm dark  (#181520 / #231E2E)
// Cards: #FFFFFF  |  Text: #FFFFFF / #B3B3B3
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
  // Backgrounds — warm clean dark (Tinder dark mode)
  bg: "#181520",
  brand: "#FD5564",          // primary flame red
  brandTint: "rgba(253,85,100,0.12)",
  onBrand: "#FFFFFF",
  onBrandTint: "#FD5564",

  // Primary accents — flame gradient endpoints
  coral: "#FD5564",          // flame red (replaces neon coral)
  onCoral: "#FFFFFF",
  cyan: "#FF9A53",           // warm amber/orange (replaces neon cyan)

  // Gradient pair for buttons / hero
  gradStart: "#FD5564",      // Tinder red
  gradEnd:   "#FF9A53",      // Bumble amber

  // Surfaces — warm dark cards
  surface: "#181520",
  surfaceSecondary: "#231E2E",
  surfaceTertiary: "#2D2640",
  surfaceGlass: "rgba(255,255,255,0.06)",
  surfaceGlassStrong: "rgba(255,255,255,0.12)",

  // Text
  onSurface: "#FFFFFF",
  onSurfaceSecondary: "#C4B8D0",
  onSurfaceTertiary: "#7B6F8A",
  onSurfaceInverse: "#181520",

  // Semantic
  success: "#3ECF8E",        // Supabase/LinkedIn green
  warning: "#FFA940",
  error: "#FF4757",

  // Borders — subtle warm
  border: "rgba(255,255,255,0.09)",
  borderStrong: "rgba(255,255,255,0.18)",
  borderCyan: "rgba(253,85,100,0.35)",   // maps to primary
  borderCoral: "rgba(255,154,83,0.35)",  // maps to amber
};

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const R = { sm: 8, md: 16, lg: 24, pill: 99 };

// Card / button shadows — warm, clean (no neon glow)
export const GLOW_CYAN = {
  shadowColor: "#FF9A53",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.30,
  shadowRadius: 12,
  elevation: 8,
};
export const GLOW_CORAL = {
  shadowColor: "#FD5564",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.35,
  shadowRadius: 12,
  elevation: 8,
};
export const CARD_SHADOW = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 16,
  elevation: 8,
};

// Avatar gradients — warm modern palette
export const AVATAR_PALETTE: [string, string][] = [
  ["#FD5564", "#FF9A53"],   // flame
  ["#A855F7", "#7C3AED"],   // purple
  ["#3ECF8E", "#059669"],   // green
  ["#0EA5E9", "#2563EB"],   // blue
  ["#F59E0B", "#D97706"],   // amber
  ["#EC4899", "#BE185D"],   // pink
  ["#FD5564", "#A855F7"],   // flame → purple
  ["#3ECF8E", "#0EA5E9"],   // teal
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
