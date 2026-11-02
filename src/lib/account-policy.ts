/** Confirmation-enabled signup never grants access until Auth supplies a session. */
export function canEnterAfterSignup(session: unknown): boolean {
  return session != null;
}

/** Class rule: only StudyLyn student emails ending in 26@students.dkut.ac.ke may sign up. */
export const STUDENT_EMAIL_PATTERN = /^[a-z0-9._%+-]*26@students\.dkut\.ac\.ke$/i;

/** Platform owner account, granted the admin role automatically at signup. */
export const PLATFORM_ADMIN_EMAIL = "kariuki.macharia26@students.dkut.ac.ke";

export function isEligibleSignupEmail(email: string): boolean {
  return STUDENT_EMAIL_PATTERN.test(email.trim());
}

export function allowsCodeRecovery(_code: string): boolean {
  return false;
}
