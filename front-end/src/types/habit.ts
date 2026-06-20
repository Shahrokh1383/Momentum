import { Category } from './category';
import { Tag } from './tag';

export interface HabitSchedule {
  reminders?: string[];
  // Future proofing for other schedule types
}

export interface Habit {
  id: number;
  title: string;
  description: string | null;
  type: 'boolean' | 'numeric' | 'timer' | 'checklist';
  schedule: HabitSchedule | null;
  due_days_of_week: number[]; // Backend returns array of ints
  frequency: 'daily' | 'weekly' | 'custom';
  reminder_time: string | null;
  timezone: string;
  target_value: number | null;
  unit: string | null;
  is_active: boolean;
  is_due_today: boolean;
  archived_at: string | null;
  category: Category | null;
  tags: Tag[];
  created_at: string;
  updated_at: string;
}

export interface HabitPayload {
  title: string;
  description?: string | null;
  category_id?: number | null;
  type: 'boolean' | 'numeric' | 'timer' | 'checklist';
  schedule?: HabitSchedule;
  due_days_of_week?: string;
  frequency: 'daily' | 'weekly' | 'custom';
  reminder_time?: string | null;
  timezone?: string;
  target_value?: number | null;
  unit?: string | null;
  is_active?: boolean;
  tags?: (number | string)[];
}