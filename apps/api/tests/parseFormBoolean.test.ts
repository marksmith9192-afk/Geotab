import { describe, expect, it } from "vitest";
import { parseFormBoolean } from "../src/utils/parseFormBoolean.js";

describe("parseFormBoolean", () => {
  it("maps string true and false to booleans", () => {
    expect(parseFormBoolean("true")).toBe(true);
    expect(parseFormBoolean("false")).toBe(false);
  });

  it("leaves unrelated values untouched", () => {
    expect(parseFormBoolean("yes")).toBe("yes");
    expect(parseFormBoolean(true)).toBe(true);
    expect(parseFormBoolean(undefined)).toBeUndefined();
  });
});
