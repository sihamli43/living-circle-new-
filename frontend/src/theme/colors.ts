// Design tokens — Living Circle.
// Palette: Deep indigo + vibrant coral — modern, tech-forward, warm.
export const ACTIVE_CITY = "Bangalore";
export const ACTIVE_LOCALITIES = [
  "Koramangala",
  "Indiranagar",
  "HSR Layout",
  "Whitefield",
  "BTM Layout",
  "Marathahalli",
  "Jayanagar",
  "Electronic City",
  "Viman Nagar",
  "Sarjapur Road",
];

export const C = {
  // Primary: Deep indigo (modern, tech-forward)
  brand: "#1E3A8A",
  brandTint: "#E0E7FF",
  onBrand: "#FFFFFF",
  onBrandTint: "#1E3A8A",

  // Accent: Vibrant coral (energy, warmth)
  coral: "#F97316",
  onCoral: "#FFFFFF",

  // Surfaces
  surface: "#FAFBFF",
  surfaceSecondary: "#F3F4F6",
  surfaceTertiary: "#E5E7EB",

  // Text
  onSurface: "#111827",
  onSurfaceSecondary: "#6B7280",
  onSurfaceTertiary: "#9CA3AF",
  onSurfaceInverse: "#FFFFFF",

  // Semantic
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",

  // Borders
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
};

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const R = { sm: 8, md: 16, lg: 24, pill: 24 };

export const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};

// Avatar gradients — cohesive with indigo + coral palette
export const AVATAR_PALETTE = [
  ["#1E3A8A", "#1E40AF"],
  ["#F97316", "#EA580C"],
  ["#4338CA", "#312E81"],
  ["#0EA5E9", "#0284C7"],
  ["#10B981", "#059669"],
  ["#8B5CF6", "#6D28D9"],
  ["#EC4899", "#BE185D"],
  ["#14B8A6", "#0D9488"],
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
