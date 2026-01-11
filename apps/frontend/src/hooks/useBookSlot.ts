import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Slot } from './useSlots';
import { useUrlFilters } from './useUrlFilters';

interface BookSlotRequest {
  slotId: number;
  idempotencyKey: string;
}

interface BookSlotResponse {
  status: string;
  message?: string;
  data: {
    booking: any;
  };
}

const bookSlot = async (request: BookSlotRequest): Promise<BookSlotResponse> => {
  const { data } = await axios.post('/api/bookings', request);
  return data;
};

export const useBookSlot = () => {
  const queryClient = useQueryClient();
  const { filters } = useUrlFilters();

  return useMutation({
    mutationFn: bookSlot,

    onMutate: async (variables: BookSlotRequest) => {
      const queryKey = ['slots', filters.date, filters.status];
      await queryClient.cancelQueries({ queryKey });

      const previousSlots = queryClient.getQueryData<Slot[]>(queryKey);

      queryClient.setQueryData<Slot[]>(queryKey, (old: Slot[] | undefined) => {
        if (!old) return old;
        return old.filter((slot: Slot) => slot.id !== variables.slotId);
      });

      return { previousSlots, queryKey };
    },

    onError: (error: any, _variables: BookSlotRequest, context: any) => {
      if (context?.previousSlots) {
        queryClient.setQueryData(context.queryKey, context.previousSlots);
      }

      if (error.response?.status === 409) {
        toast.error('This slot is no longer available');
      } else {
        toast.error(error.response?.data?.message || 'Failed to book slot');
      }
    },

    onSuccess: (data: BookSlotResponse) => {
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.invalidateQueries({ queryKey: ['adminSlots'] });
      
      queryClient.refetchQueries({ queryKey: ['slots'] });
      queryClient.refetchQueries({ queryKey: ['myBookings'] });
      
      toast.success(data.message?.includes('idempotent') ? 'Booking confirmed' : 'Slot booked successfully!');
    },

    onSettled: (_data: any, _error: any, _variables: BookSlotRequest, context: any) => {
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
    },
  });
};
