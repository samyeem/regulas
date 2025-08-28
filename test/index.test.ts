import { describe, it, expect } from "vitest";
import {
  Regulas,
  range,
  generateRange,
  oneOf,
  allOf,
  next,
  prev,
  escape,
} from "../src/index";

describe("Regulas Core Tests", () => {
  // ------------------------------
  // Literal matching and escaping
  // ------------------------------
  it("should match simple literals", () => {
    const r = Regulas("sample").toRegex();
    expect("sample").toMatch(r);
    expect("sample text").toMatch(r);
    expect("sampl").not.toMatch(r);
  });

  it("should escape special regex characters correctly", () => {
    expect(escape(".+*?^${}()|[]\\")).toBe(
      "\\.\\+\\*\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\"
    );
  });

  // ------------------------------
  // oneOf() and allOf() combinators
  // ------------------------------
  it("should handle oneOf() correctly", () => {
    const r = Regulas(oneOf("item1", "item2")).toRegex();
    expect("item1").toMatch(r);
    expect("item2").toMatch(r);
    expect("item3").not.toMatch(r);
  });

  it("should handle allOf() correctly", () => {
    const r = Regulas(allOf("word1", "word2")).toRegex();
    expect("word1word2").toMatch(r);
    expect("word1").not.toMatch(r);
    expect("word2").not.toMatch(r);
  });

  // ------------------------------
  // Quantifiers: .oneOrMore, .zeroOrMore, .optional, .repeat(m, n), .lazy
  // ------------------------------
  it("should support oneOrMore() quantifier", () => {
    const tok = range("a").oneOrMore;
    const r = Regulas(tok).toRegex();
    expect("a").toMatch(r);
    expect("aaaa").toMatch(r);
    expect("").not.toMatch(r);
  });

  it("should support zeroOrMore() quantifier", () => {
    const tok = range("a").zeroOrMore;
    const r = Regulas(tok).toRegex();
    expect("").toMatch(r);
    expect("a").toMatch(r);
    expect("aaaaa").toMatch(r);
  });

  it("should support optional() quantifier", () => {
    const tok = range("a").optional;
    const r = Regulas(tok).fullMatch.toRegex();
    expect("").toMatch(r);
    expect("a").toMatch(r);
    expect("aa").not.toMatch(r);
  });

  it("should support oneOf() quantifier chaining", () => {
    const r = Regulas(range("0-10").or, range("50-60")).toRegex();
    expect("55").toMatch(r);
    expect("100").not.toMatch(r);
    expect("65").not.toMatch(r);
    expect("40").not.toMatch(r);
  });

  // ------------------------------
  // LookAround support
  // ------------------------------
  it("should support lookAhead assertions", () => {
    const r = Regulas("word1", next("word2")).toRegex();
    expect("word1word2").toMatch(r);
    expect("word1word3").not.toMatch(r);
  });

  it("should support lookBehind assertions", () => {
    const r = Regulas(prev("word1"), "word2").toRegex();
    expect("word1word2").toMatch(r);
    expect("xxword2").not.toMatch(r);
  });

  // ------------------------------
  // Named groups
  // ------------------------------
  it("should support named capturing groups", () => {
    const tok = oneOf("word1").group("example");
    const r = Regulas(tok).toRegex();
    const match = "word1".match(r);
    expect(match?.groups?.example).toBe("word1");
  });

  // ------------------------------
  // Range and numeric tests
  // ------------------------------
  describe("range() and generateRange()", () => {
    it("should match single digits", () => {
      const r = Regulas(range("0-9")).toRegex();
      expect("0").toMatch(r);
      expect("5").toMatch(r);
      expect("a").not.toMatch(r);
      expect("-1").not.toMatch(r);
    });

    it("should match numbers 0-255", () => {
      const r = Regulas(range("0-255")).toRegex();
      expect("0").toMatch(r);
      expect("99").toMatch(r);
      expect("255").toMatch(r);
      expect("256").not.toMatch(r);
      expect("-1").not.toMatch(r);
    });

    it("should handle mixed ranges and letters", () => {
      const r = Regulas(range("a-z", "0-3")).toRegex();
      expect("a").toMatch(r);
      expect("z").toMatch(r);
      expect("2").toMatch(r);
      expect("9").not.toMatch(r);
    });

    it("generateRange should produce correct strings", () => {
      expect(generateRange(0, 9)).toBe("[0-9]");
      expect(generateRange(5, 5)).toBe("5");
    });

    it("generateRange should handle multi-digit ranges correctly", () => {
      const r = new RegExp(`^(${generateRange(0, 20)})$`);
      expect(r.test("0")).toBe(true);
      expect(r.test("15")).toBe(true);
      expect(r.test("20")).toBe(true);
      expect(r.test("21")).toBe(false);
    });

    it("generateRange should handle very large numbers", () => {
      const r = new RegExp(`^(${generateRange(13452350, 13452356)})$`);
      expect(r.test("13452350")).toBe(true);
      expect(r.test("13452356")).toBe(true);
      expect(r.test("13452357")).toBe(false);
    });
  });

  // ------------------------------
  // Complex patterns
  // ------------------------------
  describe("Complex patterns", () => {
    it("should match IPv4 addresses", () => {
      const octet = range("0-255");
      const r = Regulas(
        octet,
        ".",
        octet,
        ".",
        octet,
        ".",
        octet
      ).toRegex();
      expect("192.168.1.1").toMatch(r);
      expect("255.255.255.255").toMatch(r);
      expect("256.0.0.1").not.toMatch(r);
      expect("123.45.67").not.toMatch(r);
    });

    it("should support nested combinators", () => {
      const r = Regulas(allOf("word1", oneOf("word2", "word3"))).toRegex();
      expect("word1word3").toMatch(r);
      expect("word1word2").toMatch(r);
      expect("word1word4").not.toMatch(r);
    });

    it("should handle consecutive lookarounds", () => {
      const r = Regulas(
        prev("word1"),
        "word2",
        next("word3")
      ).toRegex();
      expect("word1word2").not.toMatch(r);
      expect("word1word2word3").toMatch(r);
    });

    it("should handle multiple oneOf() in sequence", () => {
      const r = Regulas(
        oneOf("item1", "item2"),
        oneOf("item3", "item4")
      ).toRegex();
      expect("item1item3").toMatch(r);
      expect("item2item4").toMatch(r);
      expect("item1item4").toMatch(r);
      expect("item2item3").toMatch(r);
    });
  });

  // ------------------------------
  // Edge cases and bulletproofing
  // ------------------------------
  describe("Edge case validations", () => {
    it("should match empty input correctly with zeroOrMore()", () => {
      const r = Regulas(range("x").zeroOrMore).toRegex();
      expect("").toMatch(r);
      expect("x").toMatch(r);
      expect("xxxx").toMatch(r);
    });

    it("should handle large repeated patterns efficiently", () => {
      const pattern = Regulas(range("a").zeroOrMore, "b").toRegex();
      expect("a".repeat(10000) + "b").toMatch(pattern);
      expect("a".repeat(10000) + "c").not.toMatch(pattern);
    });

    it("should correctly match complex nested numeric ranges", () => {
      const r = Regulas(range("0-1", "10-11", "20")).toRegex();
      expect("0").toMatch(r);
      expect("1").toMatch(r);
      expect("10").toMatch(r);
      expect("11").toMatch(r);
      expect("20").toMatch(r);
      expect("21").not.toMatch(r);
    });
  });
});
