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

      // Cancel all relevant queries
      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: ['myBookings'] });
      await queryClient.cancelQueries({ queryKey: ['adminSlots'] });

      const previousSlots = queryClient.getQueryData<Slot[]>(queryKey);
      const previousBookings = queryClient.getQueryData(['myBookings']);

      // Optimistically update the slot to AVAILABLE
      queryClient.setQueryData<Slot[]>(queryKey, (old: Slot[] | undefined) => {
        if (!old) return old;
        return old.map((slot: Slot) =>
          slot.booking_id === variables.bookingId
            ? { ...slot, status: 'AVAILABLE' as const, booking_id: undefined }
            : slot
        );
      });

      // Optimistically update myBookings
      queryClient.setQueryData(['myBookings'], (old: any) => {
        if (!old) return old;
        return old.map((booking: any) =>
          booking.id === variables.bookingId
            ? { ...booking, booking_status: 'CANCELLED', cancelled_at: new Date().toISOString() }
            : booking
        );
      });

      return { previousSlots, previousBookings, queryKey };
    },

    onError: (error: any, _variables: CancelBookingRequest, context: any) => {
      // Rollback on error
      if (context?.previousSlots) {
        queryClient.setQueryData(context.queryKey, context.previousSlots);
      }
      if (context?.previousBookings) {
        queryClient.setQueryData(['myBookings'], context.previousBookings);
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
      // Invalidate all relevant queries for cross-panel sync
      // Force immediate refetch to show newly available slots
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.invalidateQueries({ queryKey: ['adminSlots'] });
      
      // Force refetch immediately to ensure UI updates
      queryClient.refetchQueries({ queryKey: ['slots'] });
      
      toast.success('Booking cancelled successfully');
    },

    onSettled: (_data: any, _error: any, _variables: CancelBookingRequest, context: any) => {
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
    },
  });
};
