/**
 * Validation and sanitization helpers for user inputs.
 * - Email: must contain '@' and '.' with a valid domain
 * - Password: at least 8 characters
 * - Phone: max 10 numeric digits
 * - Address: max 150 words
 * - Pincode: 6 numeric digits
 */

export const sanitizePhone = (input: string): string => {
  return (input || '').replace(/\D/g, '').slice(0, 10);
};

export const validatePhone = (phone: string): { isValid: boolean; message?: string } => {
  const digits = sanitizePhone(phone);
  if (!digits) {
    return { isValid: false, message: 'Phone number is required.' };
  }
  if (digits.length !== 10) {
    return { isValid: false, message: 'Phone number must be exactly 10 digits.' };
  }
  return { isValid: true };
};

export const validateEmail = (email: string, required: boolean = true): { isValid: boolean; message?: string } => {
  if (!email || !email.trim()) {
    if (!required) return { isValid: true };
    return { isValid: false, message: 'Email address is required.' };
  }
  const trimmed = email.trim();
  // Must contain @ and a dot in the domain portion
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!trimmed.includes('@') || !trimmed.includes('.')) {
    return { isValid: false, message: "Email must contain '@' and '.' (e.g., user@domain.com)." };
  }
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, message: 'Please enter a valid email address (e.g., user@domain.com).' };
  }
  return { isValid: true };
};

export const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (!password) {
    return { isValid: false, message: 'Password is required.' };
  }
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }
  return { isValid: true };
};

export const countWords = (text: string): number => {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
};

export const validateAddress = (
  address: string,
  maxWords: number = 150
): { isValid: boolean; wordCount: number; maxWords: number; message?: string } => {
  if (!address || !address.trim()) {
    return { isValid: false, wordCount: 0, maxWords, message: 'Address is required.' };
  }
  const count = countWords(address);
  if (count > maxWords) {
    return {
      isValid: false,
      wordCount: count,
      maxWords,
      message: `Address exceeds maximum of ${maxWords} words (currently ${count} words).`,
    };
  }
  return { isValid: true, wordCount: count, maxWords };
};

export const sanitizePincode = (input: string): string => {
  return (input || '').replace(/\D/g, '').slice(0, 6);
};

export const validatePincode = (pincode: string): { isValid: boolean; message?: string } => {
  const digits = sanitizePincode(pincode);
  if (digits && digits.length !== 6) {
    return { isValid: false, message: 'Postal PIN code must be 6 digits.' };
  }
  return { isValid: true };
};
