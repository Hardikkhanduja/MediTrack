/**
 * MediTrack — Unified Motion System
 *
 * Single source of truth for all animation constants.
 * Import from here in every screen to keep motion cohesive.
 */
import { Animated, Easing, LayoutAnimation, Platform } from "react-native";

// ── Durations ────────────────────────────────────────────────────────────────
export const DURATION = {
  instant:  80,   // micro-feedback (button press down)
  fast:     160,  // state badge swaps, chip transitions
  normal:   220,  // standard transitions, screen elements settling
  gentle:   300,  // layout shifts, card entrances
};

// ── Easing ───────────────────────────────────────────────────────────────────
export const EASE = {
  out:      Easing.out(Easing.cubic),
  outQuad:  Easing.out(Easing.quad),
  inOut:    Easing.inOut(Easing.cubic),
};

// ── Spring configs ────────────────────────────────────────────────────────────
// "press" — tight, no overshoot, used for button compression
export const SPRING_PRESS = { friction: 8, tension: 200, useNativeDriver: true };
// "release" — soft settle after press, minimal bounce
export const SPRING_RELEASE = { friction: 6, tension: 120, useNativeDriver: true };

// ── Reusable animation builders ───────────────────────────────────────────────

/** Standard press-down + spring-release for any pressable element */
export function pressAnimation(anim, toScale = 0.96) {
  return Animated.sequence([
    Animated.timing(anim, {
      toValue: toScale,
      duration: DURATION.instant,
      easing: EASE.out,
      useNativeDriver: true,
    }),
    Animated.spring(anim, { toValue: 1, ...SPRING_RELEASE }),
  ]);
}

/** Fade + translateY entrance — used on screen mount */
export function entranceAnimation(fadeAnim, slideAnim, offsetY = 14) {
  return Animated.parallel([
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: DURATION.normal,
      easing: EASE.out,
      useNativeDriver: true,
    }),
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: DURATION.normal,
      easing: EASE.out,
      useNativeDriver: true,
    }),
  ]);
}

/** Staggered entrance for a list of animated values */
export function staggerEntrance(anims, staggerMs = 40) {
  return Animated.stagger(
    staggerMs,
    anims.map((a) =>
      Animated.timing(a, {
        toValue: 1,
        duration: DURATION.gentle,
        easing: EASE.out,
        useNativeDriver: true,
      }),
    ),
  );
}

// ── LayoutAnimation preset ────────────────────────────────────────────────────
// Consistent layout shift animation for add/remove list items
export function configureLayoutTransition() {
  if (Platform.OS === "android") {
    LayoutAnimation.configureNext({
      duration: DURATION.normal,
      create: { type: "easeOut", property: "opacity" },
      update: { type: "easeInEaseOut" },
      delete: { type: "easeIn",  property: "opacity" },
    });
  } else {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }
}
