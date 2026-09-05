import { describe, it, expect } from "vitest";
import { ACCENT_COLORS, resolveAccentPalette } from "@/lib/theme/constants";
import type { AccentColor } from "@/types/database";

const BACKGROUNDS = {
  dark: "#000000",
  light: "#f5f5f5",
} as const;

/** Original palette values that failed AA on light backgrounds (documented in P8). */
export const LIGHT_MODE_CONTRAST_FAILURES: AccentColor[] = ["yellow", "green", "cyan"];

function luminance(hex: string): number {
  const rgb = hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map((part) => {
      const channel = parseInt(part, 16) / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function contrastRatio(foreground: string, background: string): number {
  const l1 = luminance(foreground);
  const l2 = luminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA for UI components and large text: 3:1 */
const AA_UI = 3;

describe("accent color contrast (WCAG AA UI)", () => {
  const colors = Object.keys(ACCENT_COLORS) as AccentColor[];

  for (const mode of ["dark", "light"] as const) {
    for (const color of colors) {
      it(`${color} accent on ${mode} background meets AA for UI components`, () => {
        const palette = resolveAccentPalette(color, mode);
        const ratio = contrastRatio(palette.main, BACKGROUNDS[mode]);
        expect(ratio).toBeGreaterThanOrEqual(AA_UI);
      });

      it(`${color} foreground on accent meets AA for button text`, () => {
        const palette = resolveAccentPalette(color, mode);
        const ratio = contrastRatio(palette.foreground, palette.main);
        expect(ratio).toBeGreaterThanOrEqual(AA_UI);
      });
    }
  }

  it("documents which raw accent values failed on light backgrounds before P8 fix", () => {
    for (const color of LIGHT_MODE_CONTRAST_FAILURES) {
      const raw = ACCENT_COLORS[color].main;
      expect(contrastRatio(raw, BACKGROUNDS.light)).toBeLessThan(AA_UI);
    }
  });
});
