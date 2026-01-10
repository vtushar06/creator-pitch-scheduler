import { useQuery } from "@tanstack/react-query";
import { useUrlFilters } from "./useUrlFilters";
import axios from "axios";

// Define the shape of a Slot based on your DB schema
export interface Slot {
  id: number;
  start_time: string;
  end_time: string;
  status: "AVAILABLE" | "BOOKED" | "CANCELLED";
  mentor_id: number; // Mentor assigned to this slot
  mentor_name: string; // We joined with users table in the backend
  booking_id?: number; // Added for cancellation tracking
  booked_by_user_id?: number; // User ID who made the booking
}

interface SlotsResponse {
  status: string;
  data: Slot[];
}

const fetchSlots = async (date: string | null): Promise<Slot[]> => {
  // 1. Handle the "null" date case (default to today if missing, or handle logic)
  const queryParams = new URLSearchParams();
  if (date) {
    queryParams.append("date", date);
  }

  // 2. Fetch using axios (which includes Authorization header)
  const response = await axios.get(`/api/slots?${queryParams.toString()}`);

  // 3. Return the actual array
  return response.data.data || [];
};

export const useSlots = () => {
  const { filters } = useUrlFilters(); // This gets the filters object from URL

  return useQuery({
    // We include 'date' in the key so it refetches when URL changes
    // The "null" in your error log ["slots", "2026-01-09", null] was likely an extra filter (status)
    queryKey: ["slots", filters.date],

    queryFn: () => fetchSlots(filters.date),

    // Optional: Keep data fresh for 1 minute, but don't re-fetch on window focus immediately
    staleTime: 60 * 1000,
  });
};
