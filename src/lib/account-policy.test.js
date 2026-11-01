import { describe, expect, it } from "bun:test";
import { allowsCodeRecovery, canEnterAfterSignup } from "./account-policy";

describe("account security rules", () => {
  it("requires email confirmation when signup returns no session", () => {
    expect(canEnterAfterSignup(null)).toBe(false);
    expect(canEnterAfterSignup({ user: { id: "confirmed-user" } })).toBe(true);
  });
  it("never accepts the proposed general recovery code Bbit26!", () => {
    expect(allowsCodeRecovery("Bbit26!")).toBe(false);
  });
});