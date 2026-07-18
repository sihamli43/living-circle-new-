// Design tokens — Living Circle.
// Brand palette: Navy (#001F3F) / Teal (#17A2B8) / Gold (#FFC107) / Coral (#FF5252).
// Navy is reserved for header bars and the login hero gradient; every other
// screen background is white with Navy text. Teal is the primary CTA color.
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
  // Backgrounds — white, brand-neutral
  bg: "#FFFFFF",
  brand: "#17A2B8",           // Teal — primary CTA color
  brandTint: "rgba(23,162,184,0.12)",
  onBrand: "#FFFFFF",
  onBrandTint: "#17A2B8",

  // Primary accents
  coral: "#FF5252",           // danger / like / report
  onCoral: "#FFFFFF",
  cyan: "#FFC107",            // Gold — secondary accent

  // Gradient pair for buttons / hero
  gradStart: "#17A2B8",       // Teal
  gradEnd:   "#001F3F",       // Navy

  // Surfaces — white with subtle gray steps for layering
  surface: "#FFFFFF",
  surfaceSecondary: "#F4F6F8",
  surfaceTertiary: "#E9EDF1",
  surfaceGlass: "rgba(0,31,63,0.04)",
  surfaceGlassStrong: "rgba(0,31,63,0.08)",

  // Text
  onSurface: "#001F3F",              // Navy
  onSurfaceSecondary: "#4A5C6E",
  onSurfaceTertiary: "#8B98A5",
  onSurfaceInverse: "#FFFFFF",

  // Semantic
  success: "#16A34A",
  warning: "#FFC107",
  error: "#FF5252",

  // Borders — subtle navy
  border: "rgba(0,31,63,0.08)",
  borderStrong: "rgba(0,31,63,0.16)",
  borderCyan: "rgba(23,162,184,0.35)",   // maps to primary (teal)
  borderCoral: "rgba(255,193,7,0.35)",   // maps to accent (gold)
};

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const R = { sm: 8, md: 16, lg: 24, pill: 99 };

// Card / button shadows — soft navy-tinted, no neon glow
export const GLOW_CYAN = {
  shadowColor: "#FFC107",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.30,
  shadowRadius: 12,
  elevation: 8,
};
export const GLOW_CORAL = {
  shadowColor: "#FF5252",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.35,
  shadowRadius: 12,
  elevation: 8,
};
export const CARD_SHADOW = {
  shadowColor: "#001F3F",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.16,
  shadowRadius: 16,
  elevation: 8,
};

// Avatar gradients — built from the 4 brand hues + deepened self-shades
// (needed so white initials text stays legible on the lighter Gold pairs).
export const AVATAR_PALETTE: [string, string][] = [
  ["#17A2B8", "#0D6E7D"],   // teal → deep teal
  ["#001F3F", "#003A66"],   // navy → lighter navy
  ["#FF5252", "#C62828"],   // coral → deep coral
  ["#FFC107", "#B8860B"],   // gold → bronze
  ["#17A2B8", "#001F3F"],   // teal → navy
  ["#FF5252", "#001F3F"],   // coral → navy
  ["#FFC107", "#FF5252"],   // gold → coral
  ["#0D6E7D", "#FFC107"],   // deep teal → gold
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

// ── LUXE — light theme, scoped to the redesigned screens ───────────────────
// Structure: clean, professional, card-based. Colors: same brand palette as
// `C` above (both are now one unified light theme).
export const LUXE = {
  bg: "#FFFFFF",
  bgAlt: "#FFFFFF",
  card: "#FFFFFF",
  cardBorder: "rgba(0,31,63,0.06)",

  coral: "#FF5252",
  coralTint: "rgba(255,82,82,0.08)",
  teal: "#17A2B8",
  tealTint: "rgba(23,162,184,0.08)",
  gold: "#FFC107",
  goldTint: "rgba(255,193,7,0.14)",
  goldDeep: "#8A6200", // darker gold for legible text-on-light

  gradStart: "#17A2B8",
  gradEnd: "#001F3F",
  onGradient: "#FFFFFF",

  text: "#001F3F",
  textSecondary: "#4A5C6E",
  textTertiary: "#8B98A5",
  onDark: "#FFFFFF",

  success: "#16A34A",
  warning: "#FFC107",
  error: "#FF5252",

  border: "rgba(0,31,63,0.08)",
  borderStrong: "rgba(0,31,63,0.16)",
};

export const LUXE_SHADOW = {
  shadowColor: "#001F3F",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.10,
  shadowRadius: 18,
  elevation: 4,
};

export const LUXE_SHADOW_SM = {
  shadowColor: "#001F3F",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
};
