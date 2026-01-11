import { useQuery } from "@tanstack/react-query";
import { useUrlFilters } from "./useUrlFilters";
import axios from "axios";

export interface Slot {
  id: number;
  start_time: string;
  end_time: string;
  status: "AVAILABLE" | "BOOKED" | "CANCELLED";
  mentor_id: number;
  mentor_name: string;
  booking_id?: number;
  booked_by_user_id?: number;
}

const fetchSlots = async (date: string | null): Promise<Slot[]> => {
  const queryParams = new URLSearchParams();
  if (date) {
    queryParams.append("date", date);
  }

  const response = await axios.get(`/api/slots?${queryParams.toString()}`);
  return response.data.data || [];
};

export const useSlots = () => {
  const { filters } = useUrlFilters();

  return useQuery({
    queryKey: ["slots", filters.date],
    queryFn: () => fetchSlots(filters.date),
    staleTime: 60 * 1000,
  });
};
