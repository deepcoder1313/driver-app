// src/theme.ts  — shared design tokens for Driver App
// Palette: deep navy + electric indigo (matches admin panel)
// but with a slightly warmer feel for mobile

export const C = {
  // Backgrounds
  bgDark:    "#0F172A",   // navy — header, splash
  bgMid:     "#1E293B",   // slate — cards on dark
  bgLight:   "#F1F5F9",   // page background
  bgCard:    "#FFFFFF",   // white cards

  // Brand
  primary:   "#6366F1",   // indigo
  primary2:  "#818CF8",   // lighter indigo
  primaryBg: "#EEF2FF",   // indigo tint

  // Status
  success:   "#10B981",   // emerald
  successBg: "#ECFDF5",
  warning:   "#F59E0B",   // amber
  warningBg: "#FFFBEB",
  danger:    "#F43F5E",   // rose
  dangerBg:  "#FFF1F2",

  // Text
  textPrimary: "#0F172A",
  textSub:     "#475569",
  textMuted:   "#94A3B8",
  textOnDark:  "#F8FAFC",
  textFaint:   "#CBD5E1",

  // Border
  border:    "#E2E8F0",
  borderDark:"#1E293B",
};

export const S = {
  radiusSm:  8,
  radiusMd:  12,
  radiusLg:  16,
  radiusXl:  24,
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  shadowMd: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
  },
};
