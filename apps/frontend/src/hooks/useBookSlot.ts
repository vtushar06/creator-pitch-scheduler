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

    // Optimistic update
    onMutate: async (variables: BookSlotRequest) => {
      const queryKey = ['slots', filters.date, filters.status];

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousSlots = queryClient.getQueryData<Slot[]>(queryKey);

      // Optimistically update cache
      queryClient.setQueryData<Slot[]>(queryKey, (old: Slot[] | undefined) => {
        if (!old) return old;
        return old.map((slot: Slot) =>
          slot.id === variables.slotId
            ? { ...slot, status: 'BOOKED' as const }
            : slot
        );
      });

      return { previousSlots, queryKey };
    },

    onError: (error: any, _variables: BookSlotRequest, context: any) => {
      // Rollback on error
      if (context?.previousSlots) {
        queryClient.setQueryData(context.queryKey, context.previousSlots);
      }

      // Handle 409 Conflict
      if (error.response?.status === 409) {
        toast.error('This slot is no longer available. Someone else booked it first.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to book slot');
      }
    },

    onSuccess: (data: BookSlotResponse) => {
      // Invalidate my-bookings for right rail sidebar sync
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      
      if (data.message?.includes('idempotent')) {
        toast.success('Booking confirmed (duplicate request)');
      } else {
        toast.success('Slot booked successfully!');
      }
    },

    onSettled: (_data: any, _error: any, _variables: BookSlotRequest, context: any) => {
      // Refetch to ensure sync with server
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
    },
  });
};
