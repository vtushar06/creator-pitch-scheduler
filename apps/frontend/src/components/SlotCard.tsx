import React from 'react';
import { Slot } from '../hooks/useSlots';
import { useBookSlot } from '../hooks/useBookSlot';
import { useCancelBooking } from '../hooks/useCancelBooking';
import { useAuth } from '../context/AuthContext';

interface SlotCardProps {
  slot: Slot;
}

// Ghibli-themed mentors for the Creative Studio
const GHIBLI_MENTORS = [
  { name: 'Hayao Miyazaki', role: 'Animation Director' },
  { name: 'Isao Takahata', role: 'Film Director' },
  { name: 'Toshio Suzuki', role: 'Producer' },
  { name: 'Joe Hisaishi', role: 'Composer' },
  { name: 'Hiromasa Yonebayashi', role: 'Animation Director' },
  { name: 'Goro Miyazaki', role: 'Director' },
];

export const SlotCard: React.FC<SlotCardProps> = ({ slot }: SlotCardProps) => {
  const { user } = useAuth();
  const { mutate: bookSlot, isPending: isBooking } = useBookSlot();
  const { mutate: cancelBooking, isPending: isCancelling } = useCancelBooking();

  // Use slot ID as seed for consistent mentor assignment
  const mentorIndex = slot.id % GHIBLI_MENTORS.length;
  const ghibliMentor = GHIBLI_MENTORS[mentorIndex];
  const displayName = slot.mentor_name || ghibliMentor.name;
  const displayRole = ghibliMentor.role;

  const formatTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleBook = () => {
    if (slot.status !== 'AVAILABLE' || !user) return;

    const idempotencyKey = `${user.id}-${slot.id}-${Date.now()}`;
    bookSlot({
      slotId: slot.id,
      idempotencyKey,
    });
  };

  const handleCancel = () => {
    if (!slot.booking_id) return;

    cancelBooking({
      bookingId: slot.booking_id,
    });
  };

  const isAvailable = slot.status === 'AVAILABLE';
  const isBooked = slot.status === 'BOOKED';
  const isOwnBooking = isBooked && slot.booking_id && slot.booked_by_user_id === user?.id;

  return (
    <div className="group rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur-md p-6 transition-all duration-500 hover:-translate-y-2 hover:border-mugafiRed hover:shadow-2xl hover:shadow-mugafiRed/30">
      {/* Header: Time and Status Badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white tracking-tighter">
            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
          </h3>
          <p className="text-xs text-white/40 mt-1 font-medium">
            {new Date(slot.start_time).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Status Badge */}
        {isOwnBooking && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-mugafiRed/20 text-mugafiPink border border-mugafiRed/30 animate-pulse-slow">
            YOUR BOOKING
          </span>
        )}
        {isBooked && !isOwnBooking && (
          <span className="px-3 py-1 rounded-full text-xs font-bold text-white/30 border border-white/10">
            UNAVAILABLE
          </span>
        )}
      </div>

      {/* Mentor Info - Ghibli Themed */}
      <div className="mb-6 flex items-center space-x-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-mugafiRed to-mugafiPink flex items-center justify-center shadow-lg shadow-mugafiRed/20">
          <span className="text-white font-black text-base">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-sm text-white font-bold">{displayName}</p>
          <p className="text-xs text-mugafiPink/80 font-semibold uppercase tracking-wide">{displayRole}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6">
        {/* Book Button (Available) */}
        {isAvailable && (
          <button
            onClick={handleBook}
            disabled={isBooking}
            className={`w-full py-3.5 rounded-xl font-bold text-white tracking-tight transition-all duration-300 ${
              !isBooking
                ? 'bg-gradient-to-r from-mugafiRed to-mugafiPink hover:from-mugafiPink hover:to-mugafiRed shadow-xl shadow-mugafiRed/30 hover:shadow-2xl hover:shadow-mugafiRed/50 transform hover:scale-105'
                : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10'
            }`}
          >
            {isBooking ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                BOOKING...
              </span>
            ) : (
              'BOOK SESSION'
            )}
          </button>
        )}

        {/* Cancel Button (Your Booking) */}
        {isOwnBooking && (
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className={`w-full py-3.5 rounded-xl font-bold transition-all duration-300 ${
              !isCancelling
                ? 'bg-void/80 text-mugafiRed border border-mugafiRed/30 hover:bg-mugafiRed/10 hover:border-mugafiRed/50 transform hover:scale-105'
                : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10'
            }`}
          >
            {isCancelling ? 'CANCELLING...' : 'CANCEL BOOKING'}
          </button>
        )}

        {/* Unavailable (Booked by Others) */}
        {isBooked && !isOwnBooking && (
          <button
            disabled
            className="w-full py-3.5 rounded-xl font-bold bg-transparent text-white/20 border border-white/5 cursor-not-allowed"
          >
            UNAVAILABLE
          </button>
        )}
      </div>
    </div>
  );
};
