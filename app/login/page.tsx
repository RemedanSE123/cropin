'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, password }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (response.ok) {
        // Store data in parallel for faster execution
        const storagePromises = [
          localStorage.setItem('token', data.token),
          localStorage.setItem('woredaRepPhone', data.woredaRepPhone),
          localStorage.setItem('woredaRepName', data.name),
          localStorage.setItem('isAdmin', data.isAdmin ? 'true' : 'false'),
          localStorage.setItem('isViewOnlyAdmin', data.isViewOnlyAdmin ? 'true' : 'false'),
          localStorage.setItem('isRegionalManager', data.isRegionalManager ? 'true' : 'false'),
        ];
        
        // Store region if it exists
        if (data.region) {
          storagePromises.push(localStorage.setItem('region', data.region));
          console.log('Login - Storing region:', data.region);
        }
        
        Promise.all(storagePromises);

        // Navigate immediately without waiting
        if (data.isAdmin) {
          router.push('/admin');
        } else if (data.isRegionalManager) {
          router.push('/regional-manager');
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(data.error || 'Login failed');
        setLoading(false);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError('An error occurred. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 dashboard-container">
      {/* Top Navigation Bar - Matching Dashboard */}
      <nav className="bg-white shadow-lg border-b-2 border-gray-300 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-12">
          <div className="flex flex-row items-center py-3 sm:py-0 sm:h-20 gap-2 sm:gap-4 overflow-x-auto">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <div className="relative flex-shrink-0 bg-white rounded-lg p-1 shadow-md border border-gray-200">
                <Image 
                  src="/moe.webp" 
                  alt="Ministry of Agriculture Logo" 
                  width={56} 
                  height={56}
                  className="h-8 sm:h-10 w-auto object-contain rounded-lg"
                  unoptimized
                  onError={(e) => {
                    console.error('Failed to load MOA logo:', e);
                  }}
                />
              </div>
              <div className="border-l-2 border-gray-400 pl-2 sm:pl-4 flex-shrink-0">
                <h1 className="text-sm sm:text-xl font-bold text-gray-800 leading-tight">
                  Ministry of Agriculture
                </h1>
                <p className="text-[10px] sm:text-xs font-medium text-gray-600 mt-0.5">Federal Democratic Republic of Ethiopia</p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Cropin Grow System - Login</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0 ml-auto">
              <a
                href="https://forms.gle/YRGNNjeVnGJyUuZdA"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-2 sm:px-4 py-2 text-gray-700 hover:text-gray-900 transition rounded-lg hover:bg-gray-100 font-medium border border-gray-300 text-xs sm:text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="hidden sm:inline">Support</span>
              </a>
              <button
                onClick={handleBackToDashboard}
                className="flex items-center space-x-2 px-3 sm:px-5 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition shadow-md font-semibold text-sm sm:text-base"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 py-4 sm:py-12">
        <div className="flex items-center justify-center min-h-[calc(100vh-180px)] sm:min-h-[calc(100vh-200px)]">
          <div className="w-full max-w-md">
            {/* Login Card */}
            <div className="bg-white rounded-xl shadow-xl p-5 sm:p-6 md:p-8 border-2 border-gray-200">
              {/* Header */}
              <div className="text-center mb-5 sm:mb-8">
                <div className="flex justify-center mb-3 sm:mb-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-800 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">
                  Sign In
                </h2>
                <p className="text-xs sm:text-sm text-gray-600">
                  Access your Cropin Grow System account
                </p>
              </div>

              {/* Form */}
              <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-50 border-2 border-red-200 text-red-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold text-xs sm:text-sm">{error}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number or Admin Username
                    </label>
                    <input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="text"
                      inputMode="text"
                      autoComplete="username"
                      required
                      className="w-full px-4 py-3.5 sm:py-3 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-gray-800 transition text-gray-900 placeholder-gray-400"
                      placeholder="Phone Number 9********"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      className="w-full px-4 py-3.5 sm:py-3 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-gray-800 transition text-gray-900 placeholder-gray-400"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center py-3.5 sm:py-3 px-4 border border-transparent text-base font-bold rounded-lg text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98]"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 8 2.69 8 6v2H4z"></path>
                        </svg>
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Sign in
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Footer Info */}
              <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-gray-200">
                <p className="text-xs text-center text-gray-500">
                  Ministry of Agriculture - Federal Democratic Republic of Ethiopia
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Matching Dashboard */}
      <footer className="bg-gradient-to-b from-gray-900 to-gray-800 text-white mt-8 sm:mt-12 border-t-2 border-gray-700 shadow-2xl">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-12 py-6 sm:py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div className="space-y-3">
              <h4 className="font-bold text-base sm:text-lg mb-3 text-white border-l-4 border-green-500 pl-3">Ministry of Agriculture</h4>
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">Federal Democratic Republic of Ethiopia</p>
              <p className="text-gray-400 text-xs sm:text-sm font-medium">Cropin Grow System</p>
            </div>
            <div className="space-y-3">
              <h4 className="font-bold text-base sm:text-lg mb-3 text-white border-l-4 border-blue-500 pl-3">System Information</h4>
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">Real-time Agricultural Data Collection</p>
              <p className="text-gray-400 text-xs sm:text-sm">Monitoring and Analytics Platform</p>
            </div>
            <div className="space-y-3">
              <h4 className="font-bold text-base sm:text-lg mb-3 text-white border-l-4 border-purple-500 pl-3">Contact & Support</h4>
              <a 
                href="https://forms.gle/YRGNNjeVnGJyUuZdA" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-gray-300 text-xs sm:text-sm hover:text-white hover:underline transition-colors duration-200 group"
              >
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Report Issues / Get Support
              </a>
              <p className="text-gray-400 text-xs sm:text-sm mt-2">© {new Date().getFullYear()} All Rights Reserved</p>
            </div>
          </div>
          {/* Powered By Section */}
          <div className="border-t border-gray-700 pt-6 sm:pt-8 mt-6 sm:mt-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <p className="text-gray-400 text-xs sm:text-sm font-medium">Powered by</p>
              <div className="flex items-center gap-3 bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition-all duration-200 hover:border-gray-600">
                <Image 
                  src="/knd.png" 
                  alt="Kukunet digital Logo" 
                  width={120} 
                  height={40}
                  className="h-8 sm:h-10 w-auto object-contain hover:scale-105 transition-transform duration-200"
                  unoptimized
                  onError={(e) => {
                    console.error('Failed to load logo:', e);
                  }}
                />
                <span className="text-white font-semibold text-sm sm:text-base">Kukunet digital</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

