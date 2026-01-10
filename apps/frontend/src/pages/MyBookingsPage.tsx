import { useState } from 'react';
import { useMyBookings } from '../hooks/useMyBookings';
import { useCancelBooking } from '../hooks/useCancelBooking';
import { MENTORS } from '../data/mentors';

export default function MyBookingsPage() {
  const { data: bookings = [], isLoading } = useMyBookings();
  const cancelBooking = useCancelBooking();
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const activeBookings = bookings
    .filter(b => b.booking_status === 'BOOKED' && b.slot_status === 'BOOKED')
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const cancelledBookings = bookings
    .filter(b => b.booking_status === 'CANCELLED' || b.slot_status === 'CANCELLED')
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  const handleCancel = async (bookingId: number) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    setCancellingId(bookingId);
    try {
      await cancelBooking.mutateAsync({ bookingId });
    } finally {
      setCancellingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-white text-lg">Loading your bookings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2" style={{ fontFamily: 'Slussen' }}>
            My Bookings
          </h1>
          <p className="text-white/60">Manage your scheduled sessions</p>
        </div>

        {/* Active Bookings */}
        <div className="mb-12">
          <h2 className="text-2xl font-black text-mugafiRed mb-6" style={{ fontFamily: 'Slussen' }}>
            Upcoming Sessions ({activeBookings.length})
          </h2>
          
          {activeBookings.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center">
              <p className="text-white/60">No upcoming sessions scheduled</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeBookings.map((booking) => {
                const mentor = MENTORS.find(m => m.id === booking.mentor_id);
                const startTime = new Date(booking.start_time);
                const endTime = new Date(booking.end_time);
                const isCancelling = cancellingId === booking.id;

                return (
                  <div
                    key={booking.id}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-mugafiRed/50 transition-all"
                  >
                    {/* Mentor Info */}
                    {mentor && (
                      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-mugafiRed/30">
                          <img src={mentor.image} alt={mentor.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-mugafiPink/80 font-bold uppercase tracking-wide">{mentor.role}</p>
                          <p className="text-white font-bold text-lg">{mentor.name}</p>
                          <p className="text-xs text-white/60 font-medium">{mentor.specialty}</p>
                        </div>
                      </div>
                    )}

                    {/* Date & Time */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white/60 text-sm">📅</span>
                        <span className="text-white font-semibold">
                          {startTime.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/60 text-sm">🕐</span>
                        <span className="text-white font-semibold">
                          {startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          {' - '}
                          {endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/60 text-sm">⏱️</span>
                        <span className="text-white/80 text-sm">
                          {Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))} minutes
                        </span>
                      </div>
                    </div>

                    {/* Booking Status */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                        ✓ Booked
                      </span>
                      <span className="text-white/40 text-xs">
                        ID: #{booking.id}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        disabled
                        className="flex-1 bg-white/5 text-white/40 px-4 py-2 rounded-lg font-semibold text-sm cursor-not-allowed"
                      >
                        Booked
                      </button>
                      <button
                        onClick={() => handleCancel(booking.id)}
                        disabled={isCancelling}
                        className="flex-1 bg-mugafiRed/10 text-mugafiRed hover:bg-mugafiRed hover:text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-mugafiRed/30"
                      >
                        {isCancelling ? 'Cancelling...' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cancelled Bookings */}
        {cancelledBookings.length > 0 && (
          <div>
            <h2 className="text-2xl font-black text-white/60 mb-6" style={{ fontFamily: 'Slussen' }}>
              Past & Cancelled ({cancelledBookings.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cancelledBookings.map((booking) => {
                const mentor = MENTORS.find(m => m.id === booking.mentor_id);
                const startTime = new Date(booking.start_time);
                const endTime = new Date(booking.end_time);

                return (
                  <div
                    key={booking.id}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 opacity-60"
                  >
                    {/* Mentor Info */}
                    {mentor && (
                      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 grayscale">
                          <img src={mentor.image} alt={mentor.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-white/40 font-bold uppercase tracking-wide">{mentor.role}</p>
                          <p className="text-white/60 font-bold text-lg">{mentor.name}</p>
                          <p className="text-xs text-white/40 font-medium">{mentor.specialty}</p>
                        </div>
                      </div>
                    )}

                    {/* Date & Time */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white/40 text-sm">📅</span>
                        <span className="text-white/60 font-semibold text-sm">
                          {startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/40 text-sm">🕐</span>
                        <span className="text-white/60 font-semibold text-sm">
                          {startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          {' - '}
                          {endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/5 text-white/40 border border-white/10">
                      {booking.booking_status === 'CANCELLED' ? '✕ Cancelled' : '⊘ Unavailable'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
