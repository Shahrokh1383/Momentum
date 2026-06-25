import { AxiosError } from 'axios';
import { FieldValues, UseFormSetError, FieldPath } from 'react-hook-form';

/**
 * Centralized handler for Laravel 422 Validation Errors.
 * Maps backend error keys to React Hook Form frontend paths with strict type safety.
 * 
 * @param error - The caught error object (usually from an Axios catch block)
 * @param setError - The setError function provided by react-hook-form
 * @param fieldMapping - A dictionary mapping backend field names to frontend FieldPaths
 */
export const handleLaravelValidationErrors = <T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fieldMapping: Record<string, FieldPath<T>>
) => {
  const axiosError = error as AxiosError<any>;
  
  if (axiosError.response?.status === 422 && axiosError.response.data?.errors) {
    const backendErrors = axiosError.response.data.errors;
    
    Object.entries(fieldMapping).forEach(([backendField, frontendField]) => {
      if (backendErrors[backendField]) {
        setError(frontendField, {
          type: 'server',
          message: backendErrors[backendField][0],
        });
      }
    });
  }
};