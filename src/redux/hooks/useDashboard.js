import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';

import { apiRequest } from '../services/api';
import { setDashboardData } from '../features/dashboard/dashboardSlice';

export function useDashboard() {
  const dispatch = useDispatch();
  const token = useSelector(state => state.auth.token);

  return useQuery({
    queryKey: ['dashboard'],
    enabled: !!token,
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: '/dashboard',
        method: 'GET',
        token,
      });

      console.log('response', response);

      if (response?.data) {
        dispatch(setDashboardData(response.data));
      }

      return response;
    },
  });
}
