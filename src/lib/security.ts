/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Hash a password using SHA-256 via the browser's native Web Crypto API.
 * The resulting hash is prefixed with 'sha256:' to differentiate it from plain text.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) return '';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return `sha256:${hashHex}`;
  } catch (error) {
    console.error('Error hashing password:', error);
    // Safe fallback if crypto.subtle is not supported (e.g. non-HTTPS test environments)
    // Return a simple pseudo-hash with prefix to maintain schema consistency
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `sha256_fallback:${hash}`;
  }
}

/**
 * Verify if a password matches a stored hash.
 * Supports backward compatibility with plaintext passwords.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  
  // If the stored hash is plain text (backward compatibility), compare directly
  if (!storedHash.startsWith('sha256:') && !storedHash.startsWith('sha256_fallback:')) {
    return password === storedHash;
  }
  
  const hashedInput = await hashPassword(password);
  return hashedInput === storedHash;
}

/**
 * Simple sanitizer to prevent HTML-injection and XSS on fields where dynamic rendering occurs.
 * React escapes JSX by default, but this adds extra insurance for raw input handling.
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate phone number format (Senegalese format: +221 or 9-digit format starting with 70, 75, 76, 77, 78, 33)
 */
export function validatePhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\s+/g, '');
  const pattern = /^(?:\+221|221)?(?:7[05678]|33)\d{7}$/;
  return pattern.test(cleanPhone);
}
