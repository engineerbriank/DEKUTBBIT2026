/** Confirmation-enabled signup never grants access until Auth supplies a session. */
export function canEnterAfterSignup(session: unknown): boolean {
  return session != null;
}

export function allowsCodeRecovery(_code: string): boolean {
  return false;
}