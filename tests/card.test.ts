import { describe, expect, it } from "vitest";
import { formatCard } from "@/lib/card";

describe("formatCard", () => {
  it("показывает маску и платёжную систему", () => {
    expect(formatCard("4242", "MIR")).toBe("•••• 4242 · MIR");
  });

  it("без платёжной системы — только маска", () => {
    expect(formatCard("4242", null)).toBe("•••• 4242");
  });

  it("без маски показывать нечего", () => {
    expect(formatCard(null, "MIR")).toBeNull();
    expect(formatCard(undefined, undefined)).toBeNull();
  });
});
