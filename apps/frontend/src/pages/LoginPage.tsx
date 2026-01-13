import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { CosmicBackground } from '../components/CosmicBackground';
import logoWhite from '../images/website_logo_white.webp';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password, isRegister);
      
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (storedUser.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/slots');
      }
      
      toast.success(isRegister ? 'Account created successfully' : 'Welcome to the Studio');
    } catch (error: any) {
      toast.error(error.response?.data?.message || (isRegister ? 'Registration failed' : 'Login failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void relative flex items-center justify-center overflow-hidden">
      {/* Cosmic Background */}
      <CosmicBackground />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-void/50 backdrop-blur-xl rounded-3xl border border-white/10 p-10 shadow-2xl">
          {/* Logo/Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-32 h-32 mb-8">
              <img 
                src={logoWhite} 
                alt="Mugafi Logo" 
                className="w-full h-full object-contain drop-shadow-2xl animate-pulse-slow"
              />
            </div>
            <h1 className="font-[Slussen] font-semibold leading-[130%] tracking-[-0.01em] text-[#D4C3C3] text-[28px] sm:text-[36px] lg:text-[48px] max-w-[500px] mb-3 sm:mb-4 mx-auto">
              {isRegister ? 'CREATE' : 'ENTER THE'}
              <span className="block bg-gradient-to-r from-mugafiRed via-mugafiPink to-mugafiRed bg-clip-text text-transparent animate-pulse-slow">
                {isRegister ? 'ACCOUNT' : 'STUDIO'}
              </span>
            </h1>
            <p className="text-white/60 text-sm font-bold tracking-wider uppercase">
              Mentorship Sessions • Industry Experts
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-white/90 mb-2 tracking-tight">
                EMAIL ADDRESS
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-5 py-4 bg-void/80 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-mugafiRed/50 focus:border-mugafiRed transition-all font-medium"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-white/90 mb-2 tracking-tight">
                PASSWORD
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-5 py-4 bg-void/80 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-mugafiRed/50 focus:border-mugafiRed transition-all font-medium"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 rounded-xl font-black text-white tracking-tight transition-all duration-300 ${
                isLoading
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : 'bg-gradient-to-r from-mugafiRed to-mugafiPink hover:from-mugafiPink hover:to-mugafiRed shadow-2xl shadow-mugafiRed/50 hover:shadow-mugafiRed/70 transform hover:scale-105'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isRegister ? 'CREATING...' : 'ENTERING...'}
                </span>
              ) : (
                isRegister ? 'CREATE ACCOUNT' : 'ENTER STUDIO'
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="w-full text-white/60 text-sm font-bold hover:text-mugafiPink transition-all"
            >
              {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};
