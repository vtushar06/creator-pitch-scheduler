import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CosmicBackground } from '../components/CosmicBackground';
import { MENTORS } from '../data/mentors';

interface SlotWithBooking {
  id: number;
  start_time: string;
  end_time: string;
  status: 'AVAILABLE' | 'BOOKED' | 'CANCELLED';
  mentor_id: number;
  booking_id?: number;
  booked_by_name?: string;
  booked_by_email?: string;
}

interface Booking {
  id: number;
  slot_id: number;
  user_id: number;
  booking_status: 'AVAILABLE' | 'BOOKED' | 'CANCELLED';
  created_at: string;
  cancelled_at: string | null;
  start_time: string;
  end_time: string;
  slot_status: string;
  mentor_id: number;
  user_name: string;
  user_email: string;
}

export const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slots, setSlots] = useState<SlotWithBooking[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ slotId: number; slotData: SlotWithBooking } | null>(null);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [bookingsDate, setBookingsDate] = useState(new Date().toISOString().split('T')[0]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    mentorId: 1,
  });
  const [selectedMentorFilter, setSelectedMentorFilter] = useState<number | null>(null);

  // Stats calculations
  const stats = useMemo(() => {
    const total = slots.length;
    const booked = slots.filter(s => s.status === 'BOOKED').length;
    const available = slots.filter(s => s.status === 'AVAILABLE').length;
    const bookedPercentage = total > 0 ? Math.round((booked / total) * 100) : 0;

    return { total, booked, available, bookedPercentage };
  }, [slots]);

  // Filter slots by selected mentor
  const filteredSlots = useMemo(() => {
    if (selectedMentorFilter === null) return slots;
    return slots.filter(s => s.mentor_id === selectedMentorFilter);
  }, [slots, selectedMentorFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create Date objects in local timezone and convert to ISO string
      const startDate = new Date(`${formData.date}T${formData.startTime}:00`);
      const endDate = new Date(`${formData.date}T${formData.endTime}:00`);
      
      // Send as ISO strings which preserve timezone
      await axios.post('/api/slots', {
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        mentorId: formData.mentorId,
      });

      toast.success('Slot published successfully!');
      
      setFormData({
        ...formData,
        startTime: '09:00',
        endTime: '10:00',
      });

      fetchSlots(formData.date);
      
      // Refresh bookings view if active
      if (showAllBookings) {
        fetchAllBookings(bookingsDate);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create slot');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchSlots = async (date: string) => {
    setIsLoadingSlots(true);
    try {
      const response = await axios.get(`/api/slots?date=${date}`);
      setSlots(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch slots:', error);
      toast.error('Failed to load slots');
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const fetchAllBookings = async (date?: string) => {
    setIsLoadingBookings(true);
    try {
      // Fetch all slots for the date (includes available and booked slots)
      const targetDate = date || bookingsDate;
      const response = await axios.get(`/api/slots?date=${targetDate}`);
      let slots = response.data.data || [];
      
      // Transform slots to booking format for display
      const bookingsData = slots.map((slot: SlotWithBooking) => ({
        id: slot.booking_id || slot.id,
        slot_id: slot.id,
        user_id: 0,
        booking_status: slot.status,
        created_at: slot.start_time,
        cancelled_at: null,
        start_time: slot.start_time,
        end_time: slot.end_time,
        slot_status: slot.status,
        mentor_id: slot.mentor_id,
        user_name: slot.booked_by_name || 'N/A',
        user_email: slot.booked_by_email || 'N/A',
      }));
      
      setAllBookings(bookingsData);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setIsLoadingBookings(false);
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    try {
      const response = await axios.delete(`/api/slots/${slotId}`);
      toast.success(response.data.message || 'Slot cancelled successfully');
      setDeleteConfirm(null);
      fetchSlots(formData.date);
      
      // Refresh bookings view if active
      if (showAllBookings) {
        fetchAllBookings(bookingsDate);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete slot');
    }
  };

  useEffect(() => {
    fetchSlots(formData.date);
  }, [formData.date]);

  // Set initial mentor filter to match form selection
  useEffect(() => {
    setSelectedMentorFilter(formData.mentorId);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  return (
    <div className="min-h-screen bg-void relative">
      <CosmicBackground />

      {/* Header */}
      <div className="relative z-10 bg-void/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-[Slussen] font-semibold leading-[130%] tracking-[-0.01em] text-[#D4C3C3] text-[28px] sm:text-[36px] lg:text-[48px] max-w-[500px] mb-3 sm:mb-4">
                MISSION CONTROL
              </h1>
              <p className="text-sm text-mugafiPink font-bold tracking-wider uppercase">
                Studio Operations • {user?.name}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAllBookings(!showAllBookings);
                  if (!showAllBookings) {
                    fetchAllBookings(bookingsDate);
                  }
                }}
                className="px-5 py-2.5 bg-mugafiRed/20 border border-mugafiRed/50 rounded-xl text-white text-sm font-bold hover:bg-mugafiRed/30 transition-all"
              >
                {showAllBookings ? 'VIEW SLOTS' : 'ALL BOOKINGS'}
              </button>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 bg-void/80 border border-white/20 rounded-xl text-white/80 text-sm font-bold hover:text-white hover:border-mugafiRed/50 hover:bg-mugafiRed/10 transition-all"
              >
                LOGOUT
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Stats Cards - Mission Control Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Total Slots */}
          <div className="bg-void/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:border-mugafiRed/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-mugafiRed/20 to-mugafiPink/20 border border-mugafiRed/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-mugafiRed" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs text-white/40 font-bold uppercase tracking-wider">TOTAL SLOTS</span>
            </div>
            <div className="text-4xl font-black text-white tracking-tighter">{stats.total}</div>
            <p className="text-xs text-white/50 mt-2 font-medium">Today's Schedule</p>
          </div>

          {/* Booked Percentage */}
          <div className="bg-void/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:border-mugafiRed/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-mugafiRed/20 to-mugafiPink/20 border border-mugafiRed/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-mugafiPink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-xs text-white/40 font-bold uppercase tracking-wider">BOOKED %</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-black text-white tracking-tighter">{stats.bookedPercentage}</span>
              <span className="text-2xl font-bold text-white/50">%</span>
            </div>
            <p className="text-xs text-white/50 mt-2 font-medium">{stats.booked} of {stats.total} slots</p>
          </div>

          {/* Available */}
          <div className="bg-void/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:border-mugafiRed/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-xs text-white/40 font-bold uppercase tracking-wider">AVAILABLE</span>
            </div>
            <div className="text-4xl font-black text-white tracking-tighter">{stats.available}</div>
            <p className="text-xs text-white/50 mt-2 font-medium">Ready to book</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Slot Card */}
          <div className="bg-void/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-white tracking-tighter">
                PUBLISH NEW SLOT
              </h2>
              <p className="text-white/60 text-sm mt-2 font-medium">
                Create availability for mentorship sessions
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Mentor Selection */}
              <div>
                <label className="block text-sm font-bold text-white/80 mb-3 tracking-wide uppercase">
                  Select Mentor
                </label>
                <div className="relative">
                  {/* Scroll Indicator Animation */}
                  <div className="absolute -right-1 top-2 z-10 flex flex-col items-center animate-bounce">
                    <svg className="w-5 h-5 text-mugafiRed opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <div className="w-0.5 h-8 bg-gradient-to-b from-mugafiRed to-transparent mt-1"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 scroll-smooth">
                  {MENTORS.map((mentor) => {
                    return (
                      <button
                        key={mentor.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, mentorId: mentor.id });
                          setSelectedMentorFilter(mentor.id);
                        }}
                        className={`relative p-3 rounded-xl border-2 transition-all ${
                          formData.mentorId === mentor.id
                            ? 'border-mugafiRed bg-mugafiRed/20 shadow-lg shadow-mugafiRed/30'
                            : 'border-white/20 bg-void/80 hover:border-mugafiRed/50 hover:bg-mugafiRed/10'
                        }`}
                      >
                        <div className="aspect-square rounded-lg overflow-hidden mb-2">
                          <img 
                            src={mentor.image} 
                            alt={mentor.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-xs font-bold text-white truncate">{mentor.name}</p>
                        <p className="text-[10px] text-white/50 font-medium truncate">{mentor.role}</p>
                      </button>
                    );
                  })}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="date" className="block text-sm font-bold text-white/80 mb-3 tracking-wide uppercase">
                  Date
                </label>
                <input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 bg-void/80 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-mugafiRed/50 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startTime" className="block text-sm font-bold text-white/80 mb-3 tracking-wide uppercase">
                    Start Time
                  </label>
                  <input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-3 bg-void/80 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-mugafiRed/50 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="endTime" className="block text-sm font-bold text-white/80 mb-3 tracking-wide uppercase">
                    End Time
                  </label>
                  <input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-4 py-3 bg-void/80 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-mugafiRed/50 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 rounded-xl font-black text-white transition-all duration-300 tracking-wider uppercase text-sm ${
                  isSubmitting
                    ? 'bg-void/80 text-white/30 cursor-not-allowed border border-white/10'
                    : 'bg-gradient-to-r from-mugafiRed to-mugafiPink hover:shadow-lg hover:shadow-mugafiRed/50 transform hover:scale-[1.02]'
                }`}
              >
                {isSubmitting ? 'PUBLISHING...' : 'PUBLISH SLOT'}
              </button>
            </form>
          </div>

          {/* Slots List */}
          {/* BOOKINGS VIEW */}
          {showAllBookings ? (
            <div className="bg-void/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
              {/* Date Filter Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-black text-white tracking-tighter mb-4">
                  ALL BOOKINGS
                </h2>
                
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={bookingsDate}
                    onChange={(e) => {
                      setBookingsDate(e.target.value);
                      fetchAllBookings(e.target.value);
                    }}
                    className="flex-1 px-4 py-3 bg-void/80 border border-white/20 rounded-xl text-white font-bold focus:outline-none focus:ring-2 focus:ring-mugafiRed/50 focus:border-transparent transition-all"
                  />
                  
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setBookingsDate(today);
                      fetchAllBookings(today);
                    }}
                    className="px-4 py-3 bg-void/80 border border-white/20 rounded-xl text-white/80 font-bold hover:text-mugafiRed hover:border-mugafiRed/50 hover:bg-mugafiRed/10 transition-all whitespace-nowrap"
                  >
                    TODAY
                  </button>
                  
                  <button
                    onClick={() => fetchAllBookings(bookingsDate)}
                    className="p-3 bg-void/80 border border-white/20 rounded-xl text-white/60 hover:text-white hover:border-mugafiRed/50 hover:bg-mugafiRed/10 transition-all"
                    title="Refresh"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                
                <p className="text-white/60 text-sm mt-3 font-medium text-center">
                  {new Date(bookingsDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>

              {isLoadingBookings ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-mugafiRed"></div>
                  <p className="text-white/50 text-sm mt-4 font-medium">Loading bookings...</p>
                </div>
              ) : allBookings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-void/80 border border-white/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-white/50 font-bold">No bookings found</p>
                  <p className="text-white/30 text-sm mt-1 font-medium">Try selecting a different date</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scroll-smooth">
                  {allBookings.map((booking) => {
                    const mentorInfo = MENTORS.find(m => m.id === booking.mentor_id);
                    return (
                      <div
                        key={booking.id}
                        className={`p-5 rounded-xl border transition-all ${
                          booking.booking_status === 'AVAILABLE'
                            ? 'bg-void/80 border-white/20'
                            : booking.booking_status === 'BOOKED'
                            ? 'bg-mugafiRed/10 border-mugafiRed/30'
                            : 'bg-void/50 border-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="text-base font-bold text-white">
                                {new Date(booking.start_time).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                                {' - '}
                                {new Date(booking.end_time).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                              </span>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                  booking.booking_status === 'AVAILABLE'
                                    ? 'bg-green-500/20 text-green-400'
                                    : booking.booking_status === 'BOOKED'
                                    ? 'bg-gradient-to-r from-mugafiRed to-mugafiPink text-white'
                                    : 'bg-white/10 text-white/50'
                                }`}
                              >
                                {booking.booking_status}
                              </span>
                            </div>
                            
                            {mentorInfo && (
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full overflow-hidden border border-white/20">
                                  <img src={mentorInfo.image} alt={mentorInfo.name} className="w-full h-full object-cover" />
                                </div>
                                <span className="text-xs text-white/60 font-bold">{mentorInfo.name}</span>
                              </div>
                            )}
                            
                            {booking.booking_status === 'BOOKED' && (
                              <div className="space-y-1">
                                <p className="text-sm text-white/80 font-bold">
                                  {booking.user_name}
                                </p>
                                <p className="text-xs text-white/50 font-medium">
                                  {booking.user_email}
                                </p>
                                <p className="text-xs text-white/40 font-medium">
                                  Booked: {new Date(booking.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </p>
                                {booking.cancelled_at && (
                                  <p className="text-xs text-mugafiRed font-medium">
                                    Cancelled: {new Date(booking.cancelled_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                )}
                              </div>
                            )}
                            
                            {booking.booking_status === 'AVAILABLE' && (
                              <p className="text-sm text-white/60 font-medium italic">
                                No bookings yet
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* SLOTS VIEW */
            <div className="bg-void/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
              {/* Date Navigation Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-black text-white tracking-tighter mb-4">
                  ALL SLOTS
                </h2>

              {/* Mentor Filter Pills */}
              {selectedMentorFilter && (() => {
                const selectedMentor = MENTORS.find(m => m.id === selectedMentorFilter);
                const mentorSlots = slots.filter(s => s.mentor_id === selectedMentorFilter);
                
                return (
                  <div className="mb-4 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-white/60 font-bold uppercase tracking-wider">Filter by Mentor:</span>
                    <div className="flex gap-2 flex-wrap">
                      <div className="px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-mugafiRed to-mugafiPink text-white shadow-lg shadow-mugafiRed/30 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full overflow-hidden border border-white/20">
                          <img src={selectedMentor?.image} alt={selectedMentor?.name} className="w-full h-full object-cover" />
                        </div>
                        {selectedMentor?.name.split(' ')[0]}
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-white/20">
                          {mentorSlots.length}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              {/* Date Picker with Navigation */}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    const date = new Date(formData.date);
                    date.setDate(date.getDate() - 1);
                    const newDate = date.toISOString().split('T')[0];
                    setFormData({ ...formData, date: newDate });
                  }}
                  className="p-3 bg-void/80 border border-white/20 rounded-xl text-white/60 hover:text-mugafiRed hover:border-mugafiRed/50 hover:bg-mugafiRed/10 transition-all"
                  title="Previous Day"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="flex-1 flex items-center gap-3">
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="flex-1 px-4 py-3 bg-void/80 border border-white/20 rounded-xl text-white font-bold focus:outline-none focus:ring-2 focus:ring-mugafiRed/50 focus:border-transparent transition-all"
                  />
                  
                  <button
                    onClick={() => setFormData({ ...formData, date: new Date().toISOString().split('T')[0] })}
                    className="px-4 py-3 bg-void/80 border border-white/20 rounded-xl text-white/80 font-bold hover:text-mugafiRed hover:border-mugafiRed/50 hover:bg-mugafiRed/10 transition-all whitespace-nowrap"
                  >
                    TODAY
                  </button>
                </div>

                <button
                  onClick={() => {
                    const date = new Date(formData.date);
                    date.setDate(date.getDate() + 1);
                    const newDate = date.toISOString().split('T')[0];
                    setFormData({ ...formData, date: newDate });
                  }}
                  className="p-3 bg-void/80 border border-white/20 rounded-xl text-white/60 hover:text-mugafiRed hover:border-mugafiRed/50 hover:bg-mugafiRed/10 transition-all"
                  title="Next Day"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => fetchSlots(formData.date)}
                  className="p-3 bg-void/80 border border-white/20 rounded-xl text-white/60 hover:text-white hover:border-mugafiRed/50 hover:bg-mugafiRed/10 transition-all"
                  title="Refresh"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              {/* Current Date Display */}
              <p className="text-white/60 text-sm mt-3 font-medium text-center">
                {new Date(formData.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>

            {isLoadingSlots ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-mugafiRed"></div>
                <p className="text-white/50 text-sm mt-4 font-medium">Loading slots...</p>
              </div>
            ) : filteredSlots.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-void/80 border border-white/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-white/50 font-bold">{selectedMentorFilter ? 'No slots for this mentor' : 'No slots created yet'}</p>
                <p className="text-white/30 text-sm mt-1 font-medium">{selectedMentorFilter ? 'Try selecting a different mentor' : 'Create your first slot'}</p>
              </div>
            ) : (
              <div className="relative">
                {/* Scroll Indicator for Slots List */}
                {filteredSlots.length > 5 && (
                  <div className="absolute -right-1 top-4 z-10 flex flex-col items-center animate-bounce">
                    <svg className="w-5 h-5 text-mugafiPink opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <div className="w-0.5 h-8 bg-gradient-to-b from-mugafiPink to-transparent mt-1"></div>
                  </div>
                )}
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scroll-smooth">
                  {filteredSlots.map((slot, index) => (
                  <motion.div
                    key={slot.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`p-5 rounded-xl border transition-all ${
                      slot.status === 'BOOKED'
                        ? 'bg-mugafiRed/10 border-mugafiRed/30'
                        : slot.status === 'AVAILABLE'
                        ? 'bg-void/80 border-white/20'
                        : 'bg-void/50 border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-base font-bold text-white">
                            {new Date(slot.start_time).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                            {' - '}
                            {new Date(slot.end_time).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                              slot.status === 'BOOKED'
                                ? 'bg-gradient-to-r from-mugafiRed to-mugafiPink text-white'
                                : slot.status === 'AVAILABLE'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-white/10 text-white/50'
                            }`}
                          >
                            {slot.status}
                          </span>
                        </div>

                        {slot.status === 'BOOKED' && slot.booked_by_name && (
                          <div className="mt-3 pt-3 border-t border-mugafiRed/20">
                            <p className="text-sm text-white/60 mb-2 font-bold uppercase tracking-wide">Booked by:</p>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-mugafiRed to-mugafiPink flex items-center justify-center">
                                <span className="text-white font-black text-sm">
                                  {slot.booked_by_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-white font-bold text-sm">{slot.booked_by_name}</p>
                                {slot.booked_by_email && (
                                  <p className="text-xs text-white/50 font-medium">{slot.booked_by_email}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => setDeleteConfirm({ slotId: slot.id, slotData: slot })}
                        className="ml-4 p-2 bg-void/80 border border-white/20 rounded-lg text-white/60 hover:text-mugafiRed hover:border-mugafiRed/50 hover:bg-mugafiRed/10 transition-all"
                        title="Cancel/Delete Slot"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                ))}
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm">
          <div className="bg-void/90 backdrop-blur-xl rounded-2xl border border-white/20 p-8 max-w-md mx-4 shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-mugafiRed/20 border border-mugafiRed/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-mugafiRed" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-white text-center mb-4 tracking-tight">
              CANCEL SLOT?
            </h3>
            {deleteConfirm.slotData.status === 'BOOKED' && deleteConfirm.slotData.booked_by_name ? (
              <p className="text-white/70 text-center mb-6 text-sm font-medium">
                This slot is booked by <span className="text-mugafiPink font-bold">{deleteConfirm.slotData.booked_by_name}</span>. 
                They will be notified of the cancellation.
              </p>
            ) : (
              <p className="text-white/70 text-center mb-6 text-sm font-medium">
                Are you sure you want to cancel this slot?
              </p>
            )}
            <div className="flex space-x-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 bg-void/80 border border-white/20 rounded-xl text-white/80 font-bold hover:border-white/40 transition-all"
              >
                KEEP
              </button>
              <button
                onClick={() => handleDeleteSlot(deleteConfirm.slotId)}
                className="flex-1 py-3 bg-gradient-to-r from-mugafiRed to-mugafiPink rounded-xl text-white font-black hover:shadow-lg hover:shadow-mugafiRed/50 transition-all"
              >
                CANCEL SLOT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
