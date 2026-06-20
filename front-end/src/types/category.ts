export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  is_default: boolean;
  created_at: string;
  deleted_at?: string | null;
}

export interface CategoryPayload {
  name: string;
  color: string;
  icon: string;
  sort_order?: number;
}
export interface QuotaErrorResponse {
  success: false;
  error: 'quota_exceeded';
  message: string;
  resource: string;
  limit: number;
  used: number;
  upgrade_required: string;
}