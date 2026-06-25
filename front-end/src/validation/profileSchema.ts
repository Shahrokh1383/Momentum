import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional().nullable(),
  profile_visibility: z.enum(['public', 'friends_only', 'private']),
});
export type ProfileFormData = z.infer<typeof profileSchema>;

export const preferencesSchema = z.object({
  timezone: z.string().min(1, 'Timezone is required'),
  theme: z.enum(['light', 'dark', 'system']),
  date_format: z.enum(['Y-m-d', 'd/m/Y', 'm/d/Y']),
});
export type PreferencesFormData = z.infer<typeof preferencesSchema>;