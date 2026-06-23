/**
 * Extracts a user-friendly error message from a habit logging API failure.
 */
export const getLogErrorMessage = (err: unknown): string => {
  const error = err as any;
  return error?.response?.data?.message || error?.message || 'An unexpected error occurred while logging.';
};

/**
 * Extracts a user-friendly error message for habit CRUD operations, 
 * specifically handling subscription/quota limits.
 */
export const getHabitErrorMessage = (err: any): string => {
  if (err?.response?.data?.error === 'quota_exceeded') {
    return `You have reached your limit of ${err.response.data.limit} active habits. Please archive a habit or upgrade your plan.`;
  }
  if (err?.response?.data?.error === 'feature_locked') {
    return `This feature requires the ${err.response.data.required_plan} plan. Please upgrade to continue.`;
  }
  return err?.response?.data?.message || err?.message || 'An unexpected error occurred.';
};