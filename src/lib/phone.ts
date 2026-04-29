/**
 * Helpers for international phone number normalization and validation.
 */

/**
 * Normalizes a phone number string by removing spaces and non-digit characters except the leading +.
 */
export function normalizeInternationalPhone(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  
  // Keep the + if it exists at the start, and remove all non-digits
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

/**
 * Validates if a phone number is in a reasonable international format.
 * Requirement: starts with + and has between 8 and 20 digits total.
 */
export function isValidInternationalPhone(input: string): boolean {
  const normalized = normalizeInternationalPhone(input);
  
  if (!normalized.startsWith('+')) return false;
  
  const digitsOnly = normalized.substring(1);
  return digitsOnly.length >= 7 && digitsOnly.length <= 19;
}

/**
 * Common phone format example for placeholders.
 */
export const PHONE_PLACEHOLDER = '+351 912 345 678';
export const PHONE_HELP_TEXT = 'Inclua o código do país. Ex.: +351 para Portugal, +55 para Brasil.';
