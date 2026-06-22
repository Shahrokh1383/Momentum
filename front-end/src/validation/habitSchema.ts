import * as z from 'zod';

export const habitSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().nullable().optional(),
  category_id: z.number().nullable().optional(),
  type: z.enum(['boolean', 'numeric', 'timer', 'checklist']),
  frequency: z.enum(['daily', 'weekly', 'custom']),
  due_days_of_week: z.array(z.number()).optional(),
  reminder_time: z.string().nullable().optional(),
  schedule: z.object({
    reminders: z.array(z.string()).optional()
  }).optional(),
  target_value: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  tags: z.array(z.union([z.number(), z.string()])).optional(),
  checklist_items: z.array(
    z.object({
      title: z.string().min(1, 'Item title is required'),
      sort_order: z.number(),
    })
  ).optional(),
}).superRefine((data, ctx) => {
  // Strict backend alignment: Checklist must have at least 1 item
  if (data.type === 'checklist') {
    if (!data.checklist_items || data.checklist_items.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Checklist must have at least one item',
        path: ['checklist_items'],
      });
    }
  }
});

export type HabitFormData = z.infer<typeof habitSchema>;