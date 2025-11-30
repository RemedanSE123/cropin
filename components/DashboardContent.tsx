'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import KPICards from './KPICards';
import DATable from './DATable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DAUser {
  name: string;
  region: string;
  zone: string;
  woreda: string;
  kebele: string;
  contact_number: string;
  reporting_manager_name: string;
  reporting_manager_mobile: string;
  language: string;
  total_data_collected: number;
  status: string;
  last_updated?: string;
  created_at?: string;
}

interface KPIs {
  repTotalDAs: number;
  repTotalData: number;
  globalTotalDAs: number;
  globalTotalData: number;
}

export default function DashboardContent() {
  const router = useRouter();
  const [daUsers, setDaUsers] = useState<DAUser[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [woredaRepName, setWoredaRepName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [chartPage, setChartPage] = useState(1);
  const chartItemsPerPage = 10;

  useEffect(() => {
    const name = localStorage.getItem('woredaRepName');
    const admin = localStorage.getItem('isAdmin') === 'true';
    if (name) setWoredaRepName(name);
    setIsAdmin(admin);
    if (admin) {
      router.push('/admin');
    } else {
      fetchData();
    }
  }, [router]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch DA users (only their own, not global)
      const daResponse = await fetch('/api/da-users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (daResponse.ok) {
        const daData = await daResponse.json();
        setDaUsers(daData.daUsers || []);
      }

      // Fetch KPIs
      const kpiResponse = await fetch('/api/kpis', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (kpiResponse.ok) {
        const kpiData = await kpiResponse.json();
        setKpis(kpiData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('woredaRepPhone');
    localStorage.removeItem('woredaRepName');
    router.push('/login');
  };

  const handleUpdate = async (contact_number: string, field: 'total_data_collected' | 'status', value: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/da-users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          contact_number,
          [field]: value,
        }),
      });

      if (response.ok) {
        // Refresh data
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update');
      }
    } catch (error) {
      console.error('Error updating:', error);
      alert('An error occurred while updating');
    }
  };

  // Prepare chart data with pagination
  const allChartData = daUsers.map(da => ({
    name: da.name.length > 15 ? da.name.substring(0, 15) + '...' : da.name,
    'Data Collected': da.total_data_collected || 0,
  }));

  const chartTotalPages = Math.ceil(allChartData.length / chartItemsPerPage);
  const chartStartIndex = (chartPage - 1) * chartItemsPerPage;
  const chartEndIndex = chartStartIndex + chartItemsPerPage;
  const chartData = allChartData.slice(chartStartIndex, chartEndIndex);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dashboard-container">
      {/* Top Navigation Bar - Matching Home Page */}
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
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                  Cropin Grow System - {woredaRepName ? `Welcome, ${woredaRepName}` : 'Dashboard'}
                </p>
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
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 sm:px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-md font-semibold text-xs sm:text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-12 py-4 sm:py-8">
        {/* Header Section - Matching Home Page */}
        <div className="mb-6 sm:mb-8 text-center bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-4 sm:p-6 shadow-lg text-white">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 tracking-tight">
            My Development Agents Dashboard
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-gray-200 font-medium">
            Manage and monitor your assigned Development Agents
          </p>
        </div>

        {/* KPI Cards */}
        {kpis && (
          <div className="mb-8">
            <KPICards kpis={kpis} />
          </div>
        )}

        {/* Chart */}
        {allChartData.length > 0 && (
          <div className="mb-6 sm:mb-8 bg-white rounded-xl shadow-lg p-4 sm:p-6 border-2 border-gray-200 hover:shadow-xl transition-shadow">
            <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-gray-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">Data Collection Overview</h2>
                  <p className="text-sm sm:text-base text-gray-600 font-medium">Performance by Development Agent</p>
                </div>
                {chartTotalPages > 1 && (
                  <div className="text-sm font-semibold text-gray-600">
                    Showing {chartStartIndex + 1}-{Math.min(chartEndIndex, allChartData.length)} of {allChartData.length}
                  </div>
                )}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={450} className="sm:h-[500px] md:h-[550px] lg:h-[600px]">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                <defs>
                  <linearGradient id="dataGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2d5016" stopOpacity={1} />
                    <stop offset="100%" stopColor="#1e3a0f" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={120}
                  tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 500 }}
                  stroke="#9ca3af"
                />
                <YAxis 
                  tick={{ fontSize: 13, fill: '#4b5563', fontWeight: 500 }}
                  tickFormatter={(value) => value.toLocaleString()}
                  stroke="#9ca3af"
                  label={{ value: 'Data Collected', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '14px', fontWeight: 600 } }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '2px solid #2d5016', 
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                  formatter={(value: any) => [value.toLocaleString(), 'Data Collected']}
                  cursor={{ fill: 'rgba(45, 80, 22, 0.1)' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px', fontSize: '14px', fontWeight: 600 }}
                  iconType="rect"
                />
                <Bar 
                  dataKey="Data Collected" 
                  fill="url(#dataGradient)" 
                  radius={[8, 8, 0, 0]} 
                  stroke="#1e3a0f"
                  strokeWidth={2}
                  animationDuration={1000}
                />
              </BarChart>
            </ResponsiveContainer>
            {chartTotalPages > 1 && (
              <div className="mt-4 pt-4 border-t-2 border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => setChartPage(prev => Math.max(1, prev - 1))}
                  disabled={chartPage === 1}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition font-semibold text-sm disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Previous</span>
                </button>
                <span className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg">
                  Page {chartPage} of {chartTotalPages}
                </span>
                <button
                  onClick={() => setChartPage(prev => Math.min(chartTotalPages, prev + 1))}
                  disabled={chartPage === chartTotalPages}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition font-semibold text-sm disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  <span>Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* DA Users Table */}
        <div className="mt-8">
          <DATable
            daUsers={daUsers}
            onUpdate={handleUpdate}
            isEditable={true}
          />
        </div>
      </main>

      {/* Footer - Matching Home Page */}
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

