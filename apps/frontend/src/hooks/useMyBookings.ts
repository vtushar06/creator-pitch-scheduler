import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface Booking {
  id: number;
  slot_id: number;
  user_id: number;
  status: string;
  created_at: string;
  start_time: string;
  end_time: string;
  mentor_name: string;
}

interface MyBookingsResponse {
  status: string;
  data: Booking[];
}

const fetchMyBookings = async (): Promise<Booking[]> => {
  const { data } = await axios.get<MyBookingsResponse>('/api/bookings/me');
  return data.data;
};

export const useMyBookings = () => {
  return useQuery({
    queryKey: ['my-bookings'],
    queryFn: fetchMyBookings,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
};
