/**
 * Generate a unique 6-character alphanumeric token
 * Excludes ambiguous characters: 0, O, 1, I
 * Allowed charset: 23456789ABCDEFGHJKLMNPQRSTUVWXYZ (32 characters)
 */
const TOKEN_CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateToken(length: number = 6): string {
  let result = '';
  const charsetLength = TOKEN_CHARSET.length;

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomBytes = new Uint8Array(length);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < length; i++) {
      result += TOKEN_CHARSET[randomBytes[i] % charsetLength];
    }
  } else {
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charsetLength);
      result += TOKEN_CHARSET[randomIndex];
    }
  }

  return result;
}

/**
 * Normalizes input token: uppercase, trims whitespace, and removes potential prefixes
 */
export function normalizeToken(input: string): string {
  if (!input) return '';
  // If formatted as TOKEN:XYZ or URL with token, extract the last 6 alphanumeric characters
  const trimmed = input.trim().toUpperCase();
  const match = trimmed.match(/[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
  if (match) return match[0];
  
  // Fallback: strip any non-alphanumeric and take first 6
  return trimmed.replace(/[^A-Z0-9]/g, '').slice(0, 8);
}
