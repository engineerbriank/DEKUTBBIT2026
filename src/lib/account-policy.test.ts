import { describe, expect, it } from "bun:test";
import {
  allowsCodeRecovery,
  canEnterAfterSignup,
  isEligibleSignupEmail,
  PLATFORM_ADMIN_EMAIL,
} from "./account-policy";

describe("account security rules", () => {
  it("requires email confirmation when signup returns no session", () => {
    expect(canEnterAfterSignup(null)).toBe(false);
    expect(canEnterAfterSignup({ user: { id: "confirmed-user" } })).toBe(true);
  });
  it("never accepts the proposed general recovery code Bbit26!", () => {
    expect(allowsCodeRecovery("Bbit26!")).toBe(false);
  });
  it("only allows class emails ending in 26@students.dkut.ac.ke to sign up", () => {
    expect(isEligibleSignupEmail("kariuki.macharia26@students.dkut.ac.ke")).toBe(true);
    expect(isEligibleSignupEmail("jane.wanjiku26@students.dkut.ac.ke")).toBe(true);
    expect(isEligibleSignupEmail("jane.wanjiku25@students.dkut.ac.ke")).toBe(false);
    expect(isEligibleSignupEmail("jane.wanjiku26@gmail.com")).toBe(false);
    expect(isEligibleSignupEmail("bbit26@students.dkut.ac.ke.evil.com")).toBe(false);
    expect(isEligibleSignupEmail("jane.wanjiku@students.dkut.ac.ke")).toBe(false);
  });
  it("names the platform owner admin account", () => {
    expect(PLATFORM_ADMIN_EMAIL).toBe("kariuki.macharia26@students.dkut.ac.ke");
  });
});
