import { useMyBookings } from "../hooks/useMyBookings";
import { MENTORS } from "../data/mentors";
import { useUrlFilters } from "../hooks/useUrlFilters";
import { useMemo } from "react";

export const BookingSummary = () => {
  const { data: bookings = [], isLoading } = useMyBookings();
  const { filters } = useUrlFilters();

  const bookingsForDate = useMemo(() => {
    if (!bookings || !filters.date) return [];
    const filtered = bookings.filter((booking) => {
      const bookingDate = new Date(booking.start_time).toISOString().split('T')[0];
      return bookingDate === filters.date;
    });
    console.log('📅 BookingSummary Debug:', {
      totalBookings: bookings.length,
      filterDate: filters.date,
      bookingsForDate: filtered.length,
      bookings: filtered.map(b => ({
        id: b.id,
        mentor_id: b.mentor_id,
        status: b.booking_status,
        start_time: b.start_time
      }))
    });
    return filtered;
  }, [bookings, filters.date]);

  const nextBooking = bookingsForDate.length > 0 ? bookingsForDate[0] : null;
  const mentor = nextBooking
    ? MENTORS.find((m) => m.id === nextBooking.mentor_id)
    : null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="hidden lg:flex fixed right-0 top-0 h-screen w-96 bg-void/80 backdrop-blur-xl border-l border-white/10 p-8 z-10 mt-20 flex-col">
      <h3 className="text-2xl font-black text-white tracking-tighter mb-1">
        TODAY'S BOOKINGS
      </h3>
      <p className="text-xs text-white/50 font-bold mb-4">
        {formatDate(filters.date)}
      </p>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-32 bg-void/50 rounded-xl animate-pulse"></div>
          <div className="h-20 bg-void/50 rounded-xl animate-pulse"></div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex-shrink-0">
            <p className="text-xs font-bold text-white/50 mb-2 tracking-widest uppercase">
              Upcoming Session
            </p>

            {nextBooking && mentor ? (
              <div className="bg-gradient-to-br from-mugafiRed/20 to-mugafiPink/10 border border-mugafiRed/30 rounded-2xl p-4 shadow-lg">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-mugafiRed/50 flex-shrink-0">
                    <img
                      src={mentor.image}
                      alt={mentor.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-lg leading-tight">
                      {mentor.name}
                    </p>
                    <p className="text-white/60 text-xs font-medium">
                      {mentor.role}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 bg-void/40 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs font-bold">
                      DATE
                    </span>
                    <span className="text-white font-bold text-sm">
                      {formatDate(nextBooking.start_time)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs font-bold">
                      TIME
                    </span>
                    <span className="text-white font-bold text-sm">
                      {formatTime(nextBooking.start_time)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs font-bold">
                      DURATION
                    </span>
                    <span className="text-white font-bold text-sm">
                      {Math.round(
                        (new Date(nextBooking.end_time).getTime() -
                          new Date(nextBooking.start_time).getTime()) /
                          60000
                      )}{" "}
                      min
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between bg-mugafiRed/20 rounded-lg px-3 py-2">
                  <span className="text-white/70 text-xs font-bold">
                    STATUS
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-black bg-gradient-to-r from-mugafiRed to-mugafiPink text-white">
                    CONFIRMED
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-void/50 border border-white/10 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-white/30"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-white/60 text-sm font-medium">
                  No upcoming bookings
                </p>
                <p className="text-white/40 text-xs mt-1">
                  Browse and book sessions
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 pt-4 mb-4 flex-shrink-0">
            <p className="text-xs font-bold text-white/50 mb-2 tracking-widest uppercase">
              Bookings Today
            </p>

            <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-4xl font-black text-white mb-1">
                {bookingsForDate.length}
              </p>
              <p className="text-white/60 text-sm font-medium">
                {bookingsForDate.length === 1 ? "session booked" : "sessions booked"}
              </p>
            </div>
          </div>

          {bookingsForDate.length >= 1 && (
            <div className="border-t border-white/10 pt-4 flex-1 min-h-0 flex flex-col">
              <p className="text-xs font-bold text-white/50 mb-3 tracking-widest uppercase flex-shrink-0">
                All Sessions Today
              </p>

              <div className="relative flex-1 min-h-0">
                {bookingsForDate.length > 2 && (
                  <div className="absolute -right-1 top-4 z-10 flex flex-col items-center animate-bounce">
                    <svg className="w-5 h-5 text-mugafiPink opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <div className="w-0.5 h-8 bg-gradient-to-b from-mugafiPink to-transparent mt-1"></div>
                  </div>
                )}
                
                <div className="space-y-3 h-full overflow-y-auto pr-2 scroll-smooth">
                  {bookingsForDate.map((booking) => {
                    const m = MENTORS.find(
                      (mentor) => mentor.id === booking.mentor_id
                    );
                    return (
                      <div
                        key={booking.id}
                        className="bg-void/50 border border-white/10 rounded-xl p-3 hover:border-mugafiRed/30 transition-colors"
                      >
                        <p className="text-white/80 font-bold text-sm line-clamp-1">
                          {m?.name}
                        </p>
                      <p className="text-white/50 text-xs mt-1">
                        {formatTime(booking.start_time)}
                      </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
