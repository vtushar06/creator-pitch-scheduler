import React from 'react';
import { Slot } from '../hooks/useSlots';
import { useBookSlot } from '../hooks/useBookSlot';
import { useCancelBooking } from '../hooks/useCancelBooking';
import { useAuth } from '../context/AuthContext';
import { MENTORS } from '../data/mentors';

interface SlotCardProps {
  slot: Slot;
}

export const SlotCard: React.FC<SlotCardProps> = ({ slot }: SlotCardProps) => {
  const { user } = useAuth();
  const { mutate: bookSlot, isPending: isBooking } = useBookSlot();
  const { mutate: cancelBooking, isPending: isCancelling } = useCancelBooking();

  // Get mentor data from MENTORS array
  const mentor = MENTORS.find(m => m.id === slot.mentor_id) || MENTORS[0];

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
    <div className="group relative rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-mugafiRed/30">
      {/* Cinematic Mentor Hero Section */}
      <div className="relative h-56 overflow-hidden">
        {/* Mentor Portrait Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center scale-105 transition-transform duration-700 group-hover:scale-110"
          style={{ backgroundImage: `url(${mentor.image})` }}
        />
        
        {/* Cosmic Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/90 to-transparent" />
        
        {/* Mentor Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-mugafiPink/90 text-xs font-bold uppercase tracking-widest mb-1">
                {mentor.role}
              </div>
              <div className="text-white text-2xl font-bold tracking-tight">
                {mentor.name}
              </div>
              <div className="text-mugafiCream/70 text-xs mt-1 font-medium">
                {mentor.specialty}
              </div>
            </div>
            
            {/* Status Badge - Moved to hero */}
            {isOwnBooking && (
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-mugafiRed/30 text-mugafiPink border border-mugafiRed/50 backdrop-blur-md animate-pulse-slow">
                YOUR BOOKING
              </span>
            )}
            {isBooked && !isOwnBooking && (
              <span className="px-3 py-1.5 rounded-full text-xs font-bold text-white/40 border border-white/20 backdrop-blur-md">
                UNAVAILABLE
              </span>
            )}
          </div>
        </div>

        {/* Cosmic Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-mugafiRed to-transparent opacity-60" />
      </div>

      {/* Card Content */}
      <div className="bg-zinc-900/80 backdrop-blur-md border-x border-b border-white/10 group-hover:border-mugafiRed/30 transition-colors p-6">
        {/* Time Display */}
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-white tracking-tighter mb-1">
            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
          </h3>
          <p className="text-xs text-white/40 font-medium">
            {new Date(slot.start_time).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
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
