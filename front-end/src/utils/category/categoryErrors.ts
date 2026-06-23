import { AxiosError } from 'axios';
import { QuotaErrorResponse } from '@/types/category';

/**
 * Extracts a user-friendly error message for category create/update operations, 
 * specifically handling subscription/quota limits.
 */
export const getFormErrorMessage = (err: unknown): string => {
  const error = err as any;
  if (error?.response?.data?.error === 'quota_exceeded') {
    return `You have reached your total limit of ${error.response.data.limit} categories. Please permanently delete from trash or upgrade your plan.`;
  }
  return error?.response?.data?.message || error?.message || 'An unexpected error occurred.';
};

/**
 * Extracts a user-friendly error message for category deletion,
 * specifically handling the 'category_in_use' business logic constraint.
 */
export const getDeleteErrorMessage = (err: unknown): string => {
  const error = err as any;
  if (error?.response?.data?.error === 'category_in_use') {
    return 'Cannot delete this category because it contains active habits.';
  }
  return error?.response?.data?.message || error?.message || 'Failed to delete category.';
};

/**
 * Safely parses an Axios error to check for a restore quota limit exception.
 * Returns the structured QuotaErrorResponse if matched, otherwise null.
 */
export const parseRestoreQuotaError = (err: unknown): QuotaErrorResponse | null => {
  const axiosError = err as AxiosError<QuotaErrorResponse>;
  if (axiosError?.response?.data?.error === 'quota_exceeded') {
    return axiosError.response.data;
  }
  return null;
};