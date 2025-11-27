'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DATable from './DATable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DAUser {
  name: string;
  region: string;
  zone: string;
  woreda: string;
  kebele: string;
  contactnumber: string;
  reporting_manager_name: string;
  reporting_manager_mobile: string;
  language: string;
  total_collected_data: number;
  status: string;
}

interface KPIs {
  repTotalDAs: number;
  repTotalData: number;
  globalTotalDAs: number;
  globalTotalData: number;
}

// International standard color palette - accessible and professional
const COLORS = [
  '#2d5016', // Forest Green (Primary)
  '#2563eb', // Blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#dc2626', // Red
  '#7c3aed', // Violet
  '#0891b2', // Cyan
  '#ea580c'  // Orange
];

export default function AdminDashboard() {
  const router = useRouter();
  const [daUsers, setDaUsers] = useState<DAUser[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch all DA users (admin can see all)
      const daResponse = await fetch('/api/da-users?global=true', {
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
    localStorage.removeItem('isAdmin');
    router.push('/login');
  };

  const handleUpdate = async (contactnumber: string, field: 'total_collected_data' | 'status', value: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/da-users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          contactnumber,
          [field]: value,
        }),
      });

      if (response.ok) {
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

  // Prepare chart data
  const regionData = daUsers.reduce((acc: any, da) => {
    const region = da.region || 'Unknown';
    if (!acc[region]) {
      acc[region] = { region, total: 0, count: 0 };
    }
    acc[region].total += da.total_collected_data || 0;
    acc[region].count += 1;
    return acc;
  }, {});

  const regionChartData = Object.values(regionData).slice(0, 10);

  const statusData = daUsers.reduce((acc: any, da) => {
    const status = da.status || 'Unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusData).map(([name, value]) => ({
    name,
    value: value as number,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dashboard-container">
      {/* Top Navigation Bar - Matching Dashboard Style */}
      <nav className="bg-white shadow-lg border-b-2 border-gray-300 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 sm:py-0 sm:h-20 gap-3 sm:gap-0">
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              <div className="relative w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 bg-white rounded-lg p-1 shadow-md border border-gray-200">
                <Image 
                  src="/moe.webp" 
                  alt="Ministry of Agriculture Logo" 
                  width={56} 
                  height={56}
                  className="object-contain rounded-lg"
                  priority
                />
              </div>
              <div className="border-l-2 border-gray-400 pl-2 sm:pl-4 flex-1 sm:flex-none">
                <h1 className="text-sm sm:text-xl font-bold text-gray-800 leading-tight">
                  Ministry of Agriculture
                </h1>
                <p className="text-[10px] sm:text-xs font-medium text-gray-600 mt-0.5">Federal Democratic Republic of Ethiopia</p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                  Cropin Grow System - Admin Dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto justify-end flex-wrap">
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
        {/* Header Section - Matching Dashboard Style */}
        <div className="mb-6 sm:mb-8 text-center bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-4 sm:p-6 shadow-lg text-white">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 tracking-tight">
            Administrator Dashboard
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-gray-200 font-medium">
            Manage and monitor all Development Agents across the system
          </p>
        </div>

        {/* KPI Cards */}
        {kpis && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6 sm:mb-8">
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-blue-600 hover:shadow-lg transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total DA Users</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1">{kpis.globalTotalDAs}</p>
                </div>
                <div className="text-2xl sm:text-3xl opacity-20">👥</div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-green-600 hover:shadow-lg transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Data Collected</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1">{kpis.globalTotalData.toLocaleString()}</p>
                </div>
                <div className="text-2xl sm:text-3xl opacity-20">📊</div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-purple-600 hover:shadow-lg transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Woreda Reps</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1">{daUsers.length > 0 ? new Set(daUsers.map(d => d.reporting_manager_mobile)).size : 0}</p>
                </div>
                <div className="text-2xl sm:text-3xl opacity-20">🌍</div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-amber-600 hover:shadow-lg transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Avg Data per DA</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1">{kpis.globalTotalDAs > 0 ? Math.round(kpis.globalTotalData / kpis.globalTotalDAs).toLocaleString() : 0}</p>
                </div>
                <div className="text-2xl sm:text-3xl opacity-20">📈</div>
              </div>
            </div>
          </div>
        )}

        {/* Status KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-green-600 hover:shadow-lg transition">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Active DAs</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                  {daUsers.filter(u => u.status === 'Active').length}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {daUsers.length > 0 
                    ? `${((daUsers.filter(u => u.status === 'Active').length / daUsers.length) * 100).toFixed(1)}% of total`
                    : '0% of total'}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl opacity-20">✅</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-red-600 hover:shadow-lg transition">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Inactive DAs</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                  {daUsers.filter(u => u.status === 'Inactive').length}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {daUsers.length > 0 
                    ? `${((daUsers.filter(u => u.status === 'Inactive').length / daUsers.length) * 100).toFixed(1)}% of total`
                    : '0% of total'}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl opacity-20">❌</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-yellow-600 hover:shadow-lg transition">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Pending DAs</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                  {daUsers.filter(u => u.status === 'Pending' || !u.status).length}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {daUsers.length > 0 
                    ? `${((daUsers.filter(u => u.status === 'Pending' || !u.status).length / daUsers.length) * 100).toFixed(1)}% of total`
                    : '0% of total'}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl opacity-20">⏳</div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-md p-3 sm:p-6 border border-gray-200">
            <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">Data by Region (Top 10)</h2>
              <p className="text-xs sm:text-sm text-gray-600">Total data collected per region</p>
            </div>
            <ResponsiveContainer width="100%" height={400} className="sm:h-[450px] md:h-[500px]">
              <BarChart data={regionChartData} margin={{ top: 20, right: 30, left: 10, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                <XAxis 
                  dataKey="region" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  tick={{ fontSize: 10, fill: '#4b5563', fontWeight: 500 }}
                  interval={0}
                  stroke="#9ca3af"
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#4b5563', fontWeight: 500 }}
                  tickFormatter={(value) => value.toLocaleString()}
                  stroke="#9ca3af"
                  label={{ value: 'Data Collected', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px', fontWeight: 600 } }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    padding: '12px',
                    fontSize: '13px'
                  }}
                  cursor={{ fill: 'rgba(45, 80, 22, 0.1)' }}
                  formatter={(value: any) => [value.toLocaleString(), 'Total Data']}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 500 }}
                  iconType="rect"
                />
                <Bar 
                  dataKey="total" 
                  name="Total Data Collected" 
                  fill="#2d5016" 
                  radius={[6, 6, 0, 0]}
                  stroke="#1e3a0f"
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-md p-3 sm:p-6 border border-gray-200">
            <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">Status Distribution</h2>
              <p className="text-xs sm:text-sm text-gray-600">DA users by status</p>
            </div>
            <ResponsiveContainer width="100%" height={400} className="sm:h-[450px] md:h-[500px]">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius="70%"
                  innerRadius="30%"
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={2}
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    padding: '12px',
                    fontSize: '13px'
                  }}
                  formatter={(value: any) => [value.toLocaleString(), 'Count']}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 500 }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* All DA Users Table */}
        <div className="mt-8">
          <DATable
            daUsers={daUsers}
            onUpdate={handleUpdate}
            isEditable={true}
          />
        </div>
      </main>

      {/* Footer - Matching Dashboard Style */}
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

