export interface PasswordChecks {
  length: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
}

export function validatePassword(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
}

export function isPasswordValid(checks: PasswordChecks): boolean {
  return checks.length && checks.uppercase && checks.number && checks.special;
}
