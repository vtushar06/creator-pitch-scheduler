import { useSlots } from '../hooks/useSlots';
import { useUrlFilters, TimeWindow } from '../hooks/useUrlFilters';
import { SlotCard } from '../components/SlotCard';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useMemo } from 'react';
import { CosmicBackground } from '../components/CosmicBackground';

export const SlotsPage = () => {
  const { filters, setFilters } = useUrlFilters();
  const { data: slots, isLoading, isError, error, refetch } = useSlots();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ date: e.target.value });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  // Time window filtering (client-side)
  const filteredSlots = useMemo(() => {
    if (!slots) return [];
    if (filters.window === 'all') return slots;

    return slots.filter((slot) => {
      const hour = new Date(slot.start_time).getHours();
      if (filters.window === 'morning') return hour >= 6 && hour < 12;
      if (filters.window === 'afternoon') return hour >= 12 && hour < 17;
      if (filters.window === 'evening') return hour >= 17 && hour < 23;
      return true;
    });
  }, [slots, filters.window]);

  // Find user's booking for the selected date
  const myBooking = useMemo(() => {
    if (!slots) return null;
    return slots.find((slot) => slot.status === 'BOOKED' && slot.booking_id);
  }, [slots]);

  // Pagination helpers
  const handlePreviousDay = () => {
    const date = new Date(filters.date);
    date.setDate(date.getDate() - 1);
    setFilters({ date: date.toISOString().split('T')[0] });
  };

  const handleNextDay = () => {
    const date = new Date(filters.date);
    date.setDate(date.getDate() + 1);
    setFilters({ date: date.toISOString().split('T')[0] });
  };

  return (
    <div className="min-h-screen bg-void relative">
      {/* Cosmic Background */}
      <CosmicBackground />

      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-void/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 text-center">
              <h1 className="font-[Slussen] font-semibold leading-[130%] tracking-[-0.01em] text-[#D4C3C3] text-[28px] sm:text-[36px] lg:text-[48px] max-w-[500px] mb-3 sm:mb-4 mx-auto">
                CREATOR PITCH SCHEDULER
              </h1>
              <div className="inline-block px-4 py-1.5 bg-mugafiRed/20 border border-mugafiRed/30 rounded-full">
                <p className="text-sm text-mugafiPink font-black tracking-wider uppercase">Mugafi Studios</p>
              </div>
            </div>
            <div className="absolute right-4 top-6 flex items-center space-x-4">
              <div className="flex items-center space-x-3 bg-void/80 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2.5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-mugafiRed to-mugafiPink flex items-center justify-center shadow-lg shadow-mugafiRed/30">
                  <span className="text-white font-black text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-white font-bold text-sm">{user?.name}</p>
                  <p className="text-white/50 text-xs font-medium uppercase">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 bg-void/80 border border-white/20 rounded-xl text-white/80 text-sm font-bold hover:text-white hover:border-mugafiRed/50 hover:bg-mugafiRed/10 transition-all"
              >
                LOGOUT
              </button>
            </div>
          </div>

          {/* Date Picker with Pagination */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePreviousDay}
                className="p-2.5 bg-void/50 border border-white/20 rounded-lg text-white/60 hover:text-mugafiRed hover:border-mugafiRed/50 transition-all backdrop-blur-sm"
                title="Previous Day"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <input
                id="date-picker"
                type="date"
                value={filters.date}
                onChange={handleDateChange}
                className="px-5 py-2.5 bg-void/50 border border-white/20 rounded-lg text-white text-sm font-semibold focus:ring-2 focus:ring-mugafiRed/50 focus:border-mugafiRed transition-all hover:border-white/40 backdrop-blur-sm"
              />
              <button
                onClick={handleNextDay}
                className="p-2.5 bg-void/50 border border-white/20 rounded-lg text-white/60 hover:text-mugafiRed hover:border-mugafiRed/50 transition-all backdrop-blur-sm"
                title="Next Day"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Time Window Chips */}
          <div className="flex items-center space-x-3">
            <span className="text-sm text-white/40 font-bold tracking-wider">TIME WINDOW:</span>
            {(['all', 'morning', 'afternoon', 'evening'] as TimeWindow[]).map((window) => (
              <button
                key={window}
                onClick={() => setFilters({ window })}
                className={`px-5 py-2 rounded-full text-sm font-bold tracking-tight transition-all ${
                  filters.window === window
                    ? 'bg-gradient-to-r from-mugafiRed to-mugafiPink text-white shadow-xl shadow-mugafiRed/40'
                    : 'bg-void/50 border border-white/20 text-white/60 hover:text-white hover:border-mugafiRed/50 backdrop-blur-sm'
                }`}
              >
                {window.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Slots Grid z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Slots Grid */}
          <div className="lg:col-span-2">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-pulse space-y-6">
                <div className="h-6 bg-white/5 rounded w-40 mx-auto"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-48 bg-white/5 rounded-2xl border border-white/10"></div>
                  ))}
                </div>
              </div>
              <p className="mt-8 text-white/40 text-sm font-semibold">LOADING SESSIONS...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-mugafiRed/10 border border-mugafiRed/30 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-mugafiRed"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                FAILED TO LOAD SESSIONS
              </h3>
              <p className="text-sm text-white/50 mb-6">
                {error instanceof Error ? error.message : 'An error occurred'}
              </p>
              <button
                onClick={() => refetch()}
                className="px-8 py-3 bg-gradient-to-r from-mugafiRed to-mugafiPink text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-mugafiRed/50 transition-all transform hover:scale-105"
              >
                TRY AGAIN
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && slots && slots.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white/30"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                NO SESSIONS AVAILABLE
              </h3>
              <p className="text-sm text-white/50">
                Try selecting a different date to see available slots.
              </p>
            </div>
          </div>
        )}

        {/* Slots Grid */}
        {!isLoading && !isError && filteredSlots && filteredSlots.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSlots.map((slot) => (
              <SlotCard key={slot.id} slot={slot} />
            ))}
          </div>
        )}

        {/* No results after filtering */}
        {!isLoading && !isError && slots && slots.length > 0 && filteredSlots.length === 0 && (
          <div className="text-center py-16">
            <p className="text-zinc-500">No slots in this time window. Try a different filter.</p>
          </div>
        )}
          </div>

          {/* Right Rail: My Booking Summary (Sticky Sidebar) */}
          <div className="lg:col-span-1">
            <div className="sticky top-32">
              <div className="bg-void/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
                <div className="flex items-center space-x-2 mb-4">
                  <svg className="w-5 h-5 text-mugafiRed" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-lg font-black text-white tracking-tighter">YOUR SCHEDULE</h3>
                </div>

                {myBooking ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-mugafiRed/10 border border-mugafiRed/30 rounded-xl">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold text-mugafiPink tracking-tight">UPCOMING SESSION</p>
                          <p className="text-xs text-white/50 mt-1 font-semibold">
                            {new Date(myBooking.start_time).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-mugafiRed text-white text-xs font-black rounded-full animate-pulse-slow">
                          BOOKED
                        </span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-mugafiRed/20">
                        <p className="text-lg font-black text-white tracking-tight">
                          {new Date(myBooking.start_time).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {' - '}
                          {new Date(myBooking.end_time).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-sm text-white/70 mt-1 font-semibold">
                          with {myBooking.mentor_name}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-white/40 text-center font-semibold">
                      You can cancel this booking from the card below
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-white/40 font-bold tracking-tight">NO SESSIONS BOOKED</p>
                    <p className="text-xs text-white/30 mt-1 font-semibold">on {new Date(filters.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
