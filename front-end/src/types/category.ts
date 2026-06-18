export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  is_default: boolean;
  created_at: string;
}

export interface CategoryPayload {
  name: string;
  color: string;
  icon: string;
  sort_order?: number;
}