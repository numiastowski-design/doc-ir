import { describe, expect, it } from "vitest";

import { isSymbolFont, SYMBOL_FONT_TABLE, symbolFontText } from "./symbol-font";

describe("the Symbol font's private-use points become the characters they draw (26/10/2026)", () => {
  it("🔴 θ, the minus sign and the bullet Word writes in the Symbol font (fixture 51 p7)", () => {
    // FAILS WITH: the module does not exist.
    expect(symbolFontText("cos() = ei ")).toBe("cos(θ) = e−iθ •");
  });

  it("Delta, Omega and mu are the GREEK letters (Δ U+0394, Ω U+03A9, μ U+03BC), not the math signs (biais écrit)", () => {
    expect(symbolFontText("")).toBe("ΔΩμ");
  });

  it("a point with no entry, or outside U+F020–U+F0FF, is left as it is", () => {
    expect(symbolFontText("   abc")).toBe("   abc");
  });

  it("🔴 guard: the table never gives a private-use point (no double translation, no Adobe-private piece of a bracket)", () => {
    for (const ch of SYMBOL_FONT_TABLE.values())
      for (const c of ch) expect(c.codePointAt(0)! < 0xe000 || c.codePointAt(0)! > 0xf8ff).toBe(true);
  });

  it("text without any point of the range comes back as the same string", () => {
    const s = "plain text";
    expect(symbolFontText(s)).toBe(s);
  });

  it("🔴 the font is Symbol only by its name: subset prefix and style suffix allowed, never a name that merely contains it", () => {
    for (const name of ["Symbol", "SymbolMT", "ABCDEF+Symbol", "AAAAAA+SymbolMT", "Symbol,Bold", "symbol"])
      expect(isSymbolFont(name)).toBe(true);
    for (const name of ["Segoe UI Symbol", "SymbolNeu", "Wingdings", "ABCDEF+Arial-BoldMT", "", undefined])
      expect(isSymbolFont(name)).toBe(false);
  });
});
