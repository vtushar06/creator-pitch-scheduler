import { useSlots } from '../hooks/useSlots';
import { useUrlFilters, TimeWindow, SortOption } from '../hooks/useUrlFilters';
import { SlotCard } from '../components/SlotCard';
import { BookingSummary } from '../components/BookingSummary';
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

  // Time window filtering, sorting, and pagination (client-side)
  const filteredSlots = useMemo(() => {
    if (!slots) return [];
    
    // Filter by time window
    let filtered = filters.window === 'all' ? slots : slots.filter((slot) => {
      const hour = new Date(slot.start_time).getHours();
      if (filters.window === 'morning') return hour >= 6 && hour < 12;
      if (filters.window === 'afternoon') return hour >= 12 && hour < 17;
      if (filters.window === 'evening') return hour >= 17 && hour < 23;
      return true;
    });

    // Sort by start time
    filtered = [...filtered].sort((a, b) => {
      const timeA = new Date(a.start_time).getTime();
      const timeB = new Date(b.start_time).getTime();
      return filters.sort === 'earliest' ? timeA - timeB : timeB - timeA;
    });

    return filtered;
  }, [slots, filters.window, filters.sort]);

  // Pagination
  const ITEMS_PER_PAGE = 9;
  const totalPages = Math.ceil(filteredSlots.length / ITEMS_PER_PAGE);
  const paginatedSlots = useMemo(() => {
    const startIdx = (filters.page - 1) * ITEMS_PER_PAGE;
    return filteredSlots.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredSlots, filters.page]);

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
      <BookingSummary />
      <CosmicBackground />
      
      <div className="lg:pr-96">

      <div className="sticky top-0 z-30 bg-void/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-5xl font-black bg-gradient-to-r from-white via-mugafiPink to-mugafiRed bg-clip-text text-transparent mb-2" style={{ fontFamily: 'Slussen' }}>
                Book Your Session
              </h1>
              <p className="text-white/60 text-sm">
                Welcome back, <span className="text-mugafiPink font-bold">{user?.name}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/my-bookings')}
                className="px-6 py-2.5 bg-mugafiRed/20 hover:bg-mugafiRed text-white rounded-xl font-bold border border-mugafiRed/30 hover:border-mugafiRed transition-all shadow-lg shadow-mugafiRed/20"
              >
                All Bookings
              </button>
              <button
                onClick={handleLogout}
                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-xl font-semibold border border-white/10 transition-all"
              >
                Logout
              </button>
            </div>
          </div>

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

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/40 font-bold tracking-wider">SORT BY:</span>
              <select
                value={filters.sort}
                onChange={(e) => setFilters({ sort: e.target.value as SortOption })}
                className="px-4 py-2 bg-void/50 border border-white/20 rounded-lg text-white text-sm font-semibold focus:ring-2 focus:ring-mugafiRed/50 focus:border-mugafiRed transition-all hover:border-white/40 backdrop-blur-sm"
              >
                <option value="earliest">Earliest First</option>
                <option value="latest">Latest First</option>
              </select>
            </div>
            <button
              onClick={() => setFilters({ window: 'all', sort: 'earliest', page: 1 })}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg text-sm font-bold border border-white/10 transition-all"
            >
              CLEAR FILTERS
            </button>
          </div>

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

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

        {!isLoading && !isError && paginatedSlots && paginatedSlots.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedSlots.map((slot) => (
                <SlotCard key={slot.id} slot={slot} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <button
                  onClick={() => setFilters({ page: filters.page - 1 })}
                  disabled={filters.page === 1}
                  className="px-4 py-2 bg-void/50 border border-white/20 rounded-lg text-white/60 hover:text-mugafiRed hover:border-mugafiRed/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-white/60 disabled:hover:border-white/20"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setFilters({ page: pageNum })}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        filters.page === pageNum
                          ? 'bg-gradient-to-r from-mugafiRed to-mugafiPink text-white shadow-lg shadow-mugafiRed/40'
                          : 'bg-void/50 border border-white/20 text-white/60 hover:text-white hover:border-mugafiRed/50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setFilters({ page: filters.page + 1 })}
                  disabled={filters.page === totalPages}
                  className="px-4 py-2 bg-void/50 border border-white/20 rounded-lg text-white/60 hover:text-mugafiRed hover:border-mugafiRed/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-white/60 disabled:hover:border-white/20"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}

        {!isLoading && !isError && slots && slots.length > 0 && filteredSlots.length === 0 && (
          <div className="text-center py-16">
            <p className="text-zinc-500">No slots in this time window. Try a different filter.</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
