import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Slot } from './useSlots';
import { useUrlFilters } from './useUrlFilters';

interface CancelBookingRequest {
  bookingId: number;
}

interface CancelBookingResponse {
  status: string;
  message: string;
  data: {
    bookingId: number;
    slotId: number;
  };
}

const cancelBooking = async (request: CancelBookingRequest): Promise<CancelBookingResponse> => {
  const { data } = await axios.patch(`/api/bookings/${request.bookingId}/cancel`);
  return data;
};

export const useCancelBooking = () => {
  const queryClient = useQueryClient();
  const { filters } = useUrlFilters();

  return useMutation({
    mutationFn: cancelBooking,

    // Optimistic update
    onMutate: async (variables: CancelBookingRequest) => {
      const queryKey = ['slots', filters.date, filters.status];

      await queryClient.cancelQueries({ queryKey });

      const previousSlots = queryClient.getQueryData<Slot[]>(queryKey);

      // Optimistically update the slot to AVAILABLE
      queryClient.setQueryData<Slot[]>(queryKey, (old: Slot[] | undefined) => {
        if (!old) return old;
        return old.map((slot: Slot) =>
          slot.booking_id === variables.bookingId
            ? { ...slot, status: 'AVAILABLE' as const, booking_id: undefined }
            : slot
        );
      });

      return { previousSlots, queryKey };
    },

    onError: (error: any, _variables: CancelBookingRequest, context: any) => {
      // Rollback on error
      if (context?.previousSlots) {
        queryClient.setQueryData(context.queryKey, context.previousSlots);
      }

      if (error.response?.status === 403) {
        toast.error('You can only cancel your own bookings');
      } else if (error.response?.status === 409) {
        toast.error('Booking is already cancelled');
      } else {
        toast.error(error.response?.data?.message || 'Failed to cancel booking');
      }
    },

    onSuccess: () => {
      // Invalidate my-bookings for right rail sidebar sync
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      toast.success('Booking cancelled successfully');
    },

    onSettled: (_data: any, _error: any, _variables: CancelBookingRequest, context: any) => {
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
    },
  });
};
