import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';

import { setShiftStatus } from '../features/shift/shiftSlice';
import { apiRequest } from '../services/api';
import { IVSnackbar } from './../../components/IVSnackbar';

export function useShiftStatus() {
  const dispatch = useDispatch();
  const token = useSelector(state => state.auth.token);

  return useQuery({
    queryKey: ['shift-status'],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: '/shifts/status',
        method: 'GET',
        token,
      });

      if (response?.data) {
        dispatch(setShiftStatus(response.data));
      }

      return response;
    },
    enabled: !!token,
  });
}

export function useToggleShift() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const token = useSelector(state => state.auth.token);

  return useMutation({
    mutationFn: body =>
      apiRequest({
        endpoint: '/shifts/toggle',
        method: 'POST',
        token,
        body,
      }),

    onSuccess: response => {
      if (response?.data) {
        dispatch(setShiftStatus(response.data));
      }

      queryClient.invalidateQueries({ queryKey: ['shift-status'] });
      IVSnackbar(response.message || 'Shift updated successfully');
    },

    onError: error => {
      IVSnackbar(error.message || 'Shift update failed');
    },
  });
}
