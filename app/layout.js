/**
 * MediTrack — Responsive Layout System
 *
 * Usage:
 *   const layout = useLayout();
 *   layout.isTablet, layout.hp, layout.sp, layout.contentPadding, etc.
 *
 * Design philosophy:
 *   - Phone styles live in StyleSheet.create() as safe defaults.
 *   - Tablet/landscape overrides are applied as inline style objects
 *     computed from this hook, layered on top of base styles.
 *   - Never replace base styles — only augment them.
 */
import { useWindowDimensions } from "react-native";

// ── Breakpoints ───────────────────────────────────────────────────────────────
const BP = {
  tablet:      768,
  largeTablet: 1024,
};

// ── Spacing scale (phone base) ────────────────────────────────────────────────
const SPACE_BASE = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
// Tablet multiplier — subtle increase only
const SPACE_TABLET_MULT = 1.25;

// ── Font scale ────────────────────────────────────────────────────────────────
// Returns a clamped font size: scales up slightly on tablets, never shrinks.
export function rf(phoneSize, tabletSize) {
  // Called inside useLayout — returns the right value based on current width.
  // When called standalone (outside hook), returns phoneSize as safe default.
  return { phone: phoneSize, tablet: tabletSize ?? Math.min(phoneSize * 1.12, phoneSize + 4) };
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useLayout() {
  const { width, height } = useWindowDimensions();

  const isLandscape    = width > height;
  const isTablet       = width >= BP.tablet;
  const isLargeTablet  = width >= BP.largeTablet;
  const isFoldable     = width >= BP.tablet && width < BP.largeTablet;

  // Horizontal padding — grows moderately on wider screens
  const contentPadding = isLargeTablet ? 40 : isTablet ? 28 : 20;

  // Max content width — prevents ultra-wide stretching on large tablets
  // null on phones so flex fills naturally
  const maxContentWidth = isLargeTablet ? 900 : isTablet ? 720 : null;

  // Spacing helpers — returns scaled value
  function sp(key) {
    const base = SPACE_BASE[key] ?? SPACE_BASE.md;
    return isTablet ? Math.round(base * SPACE_TABLET_MULT) : base;
  }

  // Font size helper — clamps tablet size
  function fs(phoneSize, tabletOverride) {
    if (!isTablet) return phoneSize;
    return tabletOverride ?? Math.min(phoneSize + 2, phoneSize * 1.1);
  }

  // Urgent card width for horizontal scroll — scales with screen
  const urgentCardWidth = isLargeTablet
    ? 320
    : isTablet
      ? Math.min(width * 0.38, 280)
      : width * 0.58;

  // Whether to use two-column medicine list
  const useTwoColumnCards = isTablet;

  // Card width in two-column mode — leaves room for gap
  const twoColCardWidth = isLargeTablet
    ? (Math.min(width, 900) - contentPadding * 2 - 16) / 2
    : (width - contentPadding * 2 - 12) / 2;

  // Whether detail screen should use side-by-side layout
  const useDetailSideBySide = isLargeTablet;

  // FAB bottom offset — stays above tab bar on all sizes
  const fabBottom = 100;
  const fabRight  = isLargeTablet ? 40 : isTablet ? 28 : 20;

  return {
    width,
    height,
    isLandscape,
    isTablet,
    isLargeTablet,
    isFoldable,
    contentPadding,
    maxContentWidth,
    sp,
    fs,
    urgentCardWidth,
    useTwoColumnCards,
    twoColCardWidth,
    useDetailSideBySide,
    fabBottom,
    fabRight,
  };
}
