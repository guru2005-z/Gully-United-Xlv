import { describe, expect, it } from "vitest";
import { maskPhone, normalizeIndianPhone, validatePassword } from "./auth-domain";

describe("auth-domain phone normalization", () => {
  it("normalizes valid 10-digit Indian phone numbers to E.164", () => {
    expect(normalizeIndianPhone("9390817811")).toEqual({ success: true, e164: "+919390817811" });
    expect(normalizeIndianPhone("+91 9390817811")).toEqual({
      success: true,
      e164: "+919390817811",
    });
    expect(normalizeIndianPhone("+919390817811")).toEqual({ success: true, e164: "+919390817811" });
    expect(normalizeIndianPhone("09390817811")).toEqual({ success: true, e164: "+919390817811" });
  });

  it("rejects invalid Indian phone numbers", () => {
    expect(normalizeIndianPhone("1234567890").success).toBe(false);
    expect(normalizeIndianPhone("9390817").success).toBe(false);
    expect(normalizeIndianPhone("").success).toBe(false);
  });

  it("masks phone numbers correctly for privacy", () => {
    expect(maskPhone("9390817811")).toBe("******7811");
    expect(maskPhone("+919390817811")).toBe("******7811");
  });
});

describe("auth-domain password validation", () => {
  it("enforces 4-character minimum password policy", () => {
    expect(validatePassword("abc").success).toBe(false);
    expect(validatePassword("Kgr2").success).toBe(true);
  });
});
