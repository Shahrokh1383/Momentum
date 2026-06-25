export interface AvatarValidationResult {
  isValid: boolean;
  error: string;
}

export const validateAvatarFile = (file: File | undefined): AvatarValidationResult => {
  if (!file) {
    return { isValid: false, error: 'Please select a file.' };
  }

  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'Please select a valid image file.' };
  }

  // 2MB limit - easily configurable in the future without touching UI
  const MAX_SIZE_MB = 2;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
  
  if (file.size > MAX_SIZE_BYTES) {
    return { isValid: false, error: `Image size must be less than ${MAX_SIZE_MB}MB.` };
  }

  return { isValid: true, error: '' };
};