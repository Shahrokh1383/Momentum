import * as z from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Max 255 characters'),
  color: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, 'Invalid hex color'),
  icon: z.string().min(1, 'Icon class is required').max(50, 'Max 50 characters'),
});

export type CategoryFormData = z.infer<typeof categorySchema>;