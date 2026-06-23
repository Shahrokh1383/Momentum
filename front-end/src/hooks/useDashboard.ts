import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/user/dashboardService';

export const useDashboard = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardService.getDashboard,
  });

  return {
    dashboardData: data,
    isLoadingDashboard: isLoading,
    dashboardError: error,
  };
};