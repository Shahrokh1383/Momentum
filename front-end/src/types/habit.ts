import { Category } from './category';
import { Tag } from './tag';

export interface HabitSchedule {
  reminders?: string[];
}

export interface ChecklistItem {
  id?: number; 
  title: string;
  sort_order: number;
}

export interface HabitLogChecklistLog {
  checklist_item_id: number;
  title: string;
  sort_order: number;
  is_checked: boolean;
}

export interface HabitLog {
  id: number;
  habit_id: number;
  logged_date: string;
  status: 'pending' | 'completed' | 'missed' | 'skipped';
  notes: string | null;
  value?: number | null;
  duration_seconds?: number | null;
  checklist_logs?: HabitLogChecklistLog[];
  created_at: string;
  updated_at: string;
}

export interface Habit {
  id: number;
  title: string;
  description: string | null;
  type: 'boolean' | 'numeric' | 'timer' | 'checklist';
  schedule: HabitSchedule | null;
  due_days_of_week: number[];
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
  checklist_items?: ChecklistItem[];
  today_log?: HabitLog | null;
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
  checklist_items?: Omit<ChecklistItem, 'id'>[];
}