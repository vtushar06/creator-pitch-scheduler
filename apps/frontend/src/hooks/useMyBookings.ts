import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface Booking {
  id: number;
  slot_id: number;
  user_id: number;
  booking_status: string;
  slot_status: string;
  created_at: string;
  cancelled_at: string | null;
  start_time: string;
  end_time: string;
  mentor_id: number;
}

interface MyBookingsResponse {
  status: string;
  data: Booking[];
}

const fetchMyBookings = async (): Promise<Booking[]> => {
  const { data } = await axios.get<MyBookingsResponse>('/api/bookings/me');
  console.log('My Bookings Response:', data);
  console.log('My Bookings Data:', data.data);
  return data.data;
};

export const useMyBookings = () => {
  return useQuery({
    queryKey: ['my-bookings'],
    queryFn: fetchMyBookings,
    staleTime: 30000, 
    refetchOnWindowFocus: true,
  });
};
