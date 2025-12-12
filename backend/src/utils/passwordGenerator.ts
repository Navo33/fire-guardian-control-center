/**
 * Password Generator Utility
 * Generates secure temporary passwords for new users
 */

/**
 * Generate a secure temporary password
 * Format: 10 characters with uppercase, lowercase, digits, and special characters
 * Excludes confusing characters like 0, O, 1, l, I
 */
export function generateTemporaryPassword(): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excludes I, O
  const lowercase = 'abcdefghijkmnpqrstuvwxyz'; // Excludes l, o
  const digits = '23456789'; // Excludes 0, 1
  const special = '!@#$%^&*';

  let password = '';

  // Add 3 uppercase letters
  for (let i = 0; i < 3; i++) {
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  }

  // Add 3 lowercase letters
  for (let i = 0; i < 3; i++) {
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  }

  // Add 3 digits
  for (let i = 0; i < 3; i++) {
    password += digits.charAt(Math.floor(Math.random() * digits.length));
  }

  // Add 1 special character
  password += special.charAt(Math.floor(Math.random() * special.length));

  // Shuffle the password characters to make it more random
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Validate password strength
 * Returns true if password meets minimum requirements
 */
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*]/.test(password);

  if (!hasUppercase) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!hasLowercase) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!hasDigit) {
    return { valid: false, message: 'Password must contain at least one digit' };
  }

  if (!hasSpecial) {
    return { valid: false, message: 'Password must contain at least one special character (!@#$%^&*)' };
  }

  return { valid: true };
}
