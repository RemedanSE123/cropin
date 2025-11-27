'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DATable from './DATable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

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

export default function RegionalManagerDashboard() {
  const router = useRouter();
  const [daUsers, setDaUsers] = useState<DAUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [managerName, setManagerName] = useState('');
  const [region, setRegion] = useState('');
  const [chartPage, setChartPage] = useState(1);

  useEffect(() => {
    const name = localStorage.getItem('woredaRepName');
    const regionName = localStorage.getItem('region');
    const isRegionalManager = localStorage.getItem('isRegionalManager') === 'true';
    
    if (name) setManagerName(name);
    if (regionName) setRegion(regionName);
    
    if (!isRegionalManager) {
      router.push('/login');
      return;
    }
    
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Debug: Log stored region
      console.log('Regional Manager - Stored region:', region);
      console.log('Regional Manager - Token:', token ? 'Present' : 'Missing');

      // Fetch DA users for this region (read-only)
      const daResponse = await fetch('/api/da-users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (daResponse.ok) {
        const daData = await daResponse.json();
        console.log('Regional Manager - Fetched DA users count:', daData.daUsers?.length || 0);
        console.log('Regional Manager - Sample DA user:', daData.daUsers?.[0]);
        setDaUsers(daData.daUsers || []);
      } else {
        const errorData = await daResponse.json();
        console.error('Regional Manager - API Error:', errorData);
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
    localStorage.removeItem('isRegionalManager');
    localStorage.removeItem('region');
    router.push('/login');
  };

  // Read-only update handler (should not be called, but needed for DATable)
  const handleUpdate = async () => {
    // Regional managers cannot update - this is read-only
    alert('Regional managers have read-only access. You cannot edit data.');
  };

  // Calculate KPIs for the region
  const totalDAs = daUsers.length;
  const totalData = daUsers.reduce((sum, da) => sum + (da.total_collected_data || 0), 0);
  const activeDAs = daUsers.filter(da => da.status === 'Active').length;
  const inactiveDAs = daUsers.filter(da => da.status === 'Inactive').length;
  const pendingDAs = daUsers.filter(da => da.status === 'Pending').length;
  const avgDataPerDA = totalDAs > 0 ? Math.round(totalData / totalDAs) : 0;

  // Prepare chart data with pagination (10 items per page)
  const chartDataAll = daUsers.map(da => ({
    name: da.name.length > 15 ? da.name.substring(0, 15) + '...' : da.name,
    fullName: da.name, // Keep full name for tooltip
    'Data Collected': da.total_collected_data || 0,
  }));

  const itemsPerChartPage = 10;
  const totalChartPages = Math.ceil(chartDataAll.length / itemsPerChartPage);
  const startIndex = (chartPage - 1) * itemsPerChartPage;
  const endIndex = startIndex + itemsPerChartPage;
  const chartData = chartDataAll.slice(startIndex, endIndex);

  // Calculate woreda statistics - all woredas sorted by total data
  const allWoredaStats = useMemo(() => {
    const woredaMap = new Map<string, number>();
    daUsers.forEach(da => {
      if (da.woreda) {
        const current = woredaMap.get(da.woreda) || 0;
        woredaMap.set(da.woreda, current + (da.total_collected_data || 0));
      }
    });
    
    const woredaArray = Array.from(woredaMap.entries()).map(([woreda, total]) => ({
      woreda,
      total,
    })).sort((a, b) => b.total - a.total);
    
    return woredaArray;
  }, [daUsers]);

  // Calculate top and least DAs
  const daStats = useMemo(() => {
    const daArray = daUsers
      .map(da => ({
        name: da.name,
        total: da.total_collected_data || 0,
      }))
      .sort((a, b) => b.total - a.total);
    
    return {
      top5: daArray.slice(0, 5),
      least5: daArray.slice(-5).reverse(),
    };
  }, [daUsers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dashboard-container">
      {/* Top Navigation Bar */}
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
                  Cropin Grow System - {managerName ? `${managerName}` : 'Regional Dashboard'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto justify-end flex-wrap">
              <div className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg border border-blue-300 font-semibold text-xs sm:text-sm">
                Read-Only Access
              </div>
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
        {/* Header Section */}
        <div className="mb-6 sm:mb-8 text-center bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-4 sm:p-6 shadow-lg text-white">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 tracking-tight">
            {region} Regional Dashboard
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-gray-200 font-medium">
            View all Development Agents in {region} Region (Read-Only)
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-600">Total DAs</h3>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{totalDAs.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-green-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-600">Total Data</h3>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{totalData.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-emerald-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-600">Active DAs</h3>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{activeDAs.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">{totalDAs > 0 ? Math.round((activeDAs / totalDAs) * 100) : 0}%</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-red-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-600">Inactive DAs</h3>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{inactiveDAs.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">{totalDAs > 0 ? Math.round((inactiveDAs / totalDAs) * 100) : 0}%</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-yellow-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-600">Pending DAs</h3>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{pendingDAs.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">{totalDAs > 0 ? Math.round((pendingDAs / totalDAs) * 100) : 0}%</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-purple-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-600">Avg Data/DA</h3>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{avgDataPerDA.toLocaleString()}</p>
          </div>
        </div>

        {/* 3 Performance Graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* All Woredas */}
          {allWoredaStats.length > 0 && (
            <div className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 rounded-2xl shadow-2xl p-6 sm:p-10 border border-blue-200/50 lg:col-span-2 hover:shadow-3xl transition-all duration-300 backdrop-blur-sm">
              <div className="mb-8 pb-6 border-b-2 border-gradient-to-r from-blue-200 to-indigo-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-12 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full"></div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 mb-2">
                      All Woredas Data Collection
                    </h2>
                    <p className="text-sm sm:text-base text-slate-600 font-medium">Data collection by Woreda (sorted by highest to lowest)</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/80 rounded-xl p-4 border border-blue-100 shadow-inner">
                <ResponsiveContainer width="100%" height={400} className="sm:h-[450px] md:h-[500px] lg:h-[550px]">
                  <BarChart data={allWoredaStats} margin={{ top: 25, right: 30, left: 20, bottom: 90 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.4} vertical={false} />
                    <XAxis 
                      dataKey="woreda" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                      tick={{ fontSize: 11, fill: '#475569', fontWeight: '600' }}
                      stroke="#64748b"
                      tickLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#475569', fontWeight: '600' }}
                      tickFormatter={(value) => value.toLocaleString()}
                      stroke="#64748b"
                      tickLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                      label={{ 
                        value: 'Data Collected', 
                        angle: -90, 
                        position: 'insideLeft', 
                        style: { 
                          textAnchor: 'middle', 
                          fill: '#475569', 
                          fontSize: 13, 
                          fontWeight: '700',
                          letterSpacing: '0.5px'
                        } 
                      }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [value.toLocaleString(), 'Data Collected']}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                        border: '2px solid #3b82f6', 
                        borderRadius: '12px',
                        padding: '12px 16px',
                        boxShadow: '0 10px 25px rgba(59, 130, 246, 0.2)',
                        backdropFilter: 'blur(10px)'
                      }}
                      labelStyle={{ 
                        fontWeight: '700', 
                        color: '#1e293b',
                        fontSize: '13px',
                        marginBottom: '8px',
                        borderBottom: '2px solid #e2e8f0',
                        paddingBottom: '6px'
                      }}
                      cursor={{ fill: 'rgba(59, 130, 246, 0.1)', stroke: '#3b82f6', strokeWidth: 2 }}
                    />
                    <Bar 
                      dataKey="total" 
                      radius={[10, 10, 0, 0]}
                      fill="url(#woredaGradient)"
                      stroke="#1e40af"
                      strokeWidth={1}
                    >
                      {allWoredaStats.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={`hsl(${220 - (index * 3)}, 75%, ${50 + (index * 1.5)}%)`}
                          stroke={`hsl(${220 - (index * 3)}, 75%, ${40 + (index * 1.5)}%)`}
                          strokeWidth={1}
                        />
                      ))}
                    </Bar>
                    <defs>
                      <linearGradient id="woredaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                        <stop offset="50%" stopColor="#2563eb" stopOpacity={1} />
                        <stop offset="100%" stopColor="#1d4ed8" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top 5 DAs */}
          {daStats.top5.length > 0 && (
            <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-xl p-4 sm:p-6 border-2 border-blue-200 hover:shadow-2xl transition-shadow duration-300">
              <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-blue-200">
                <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 mb-1">
                  Top 5 DAs
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 font-medium">Highest performing Development Agents</p>
              </div>
              <ResponsiveContainer width="100%" height={300} className="sm:h-[350px] md:h-[400px]">
                <BarChart data={daStats.top5.map(da => ({ name: da.name.length > 15 ? da.name.substring(0, 15) + '...' : da.name, total: da.total }))} margin={{ top: 15, right: 20, left: 10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    tick={{ fontSize: 10, fill: '#4b5563', fontWeight: 'bold' }}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#4b5563', fontWeight: 'bold' }}
                    tickFormatter={(value) => value.toLocaleString()}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    formatter={(value: number) => [value.toLocaleString(), 'Data Collected']}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: '2px solid #3b82f6', 
                      borderRadius: '8px',
                      padding: '10px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#1f2937' }}
                  />
                  <Bar dataKey="total" fill="url(#topDAGradient)" radius={[8, 8, 0, 0]} />
                  <defs>
                    <linearGradient id="topDAGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Least 5 DAs */}
          {daStats.least5.length > 0 && (
            <div className="bg-gradient-to-br from-white to-amber-50 rounded-xl shadow-xl p-4 sm:p-6 border-2 border-amber-200 hover:shadow-2xl transition-shadow duration-300">
              <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-amber-200">
                <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600 mb-1">
                  Least 5 DAs
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 font-medium">Lowest performing Development Agents</p>
              </div>
              <ResponsiveContainer width="100%" height={300} className="sm:h-[350px] md:h-[400px]">
                <BarChart data={daStats.least5.map(da => ({ name: da.name.length > 15 ? da.name.substring(0, 15) + '...' : da.name, total: da.total }))} margin={{ top: 15, right: 20, left: 10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    tick={{ fontSize: 10, fill: '#4b5563', fontWeight: 'bold' }}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#4b5563', fontWeight: 'bold' }}
                    tickFormatter={(value) => value.toLocaleString()}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    formatter={(value: number) => [value.toLocaleString(), 'Data Collected']}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: '2px solid #f59e0b', 
                      borderRadius: '8px',
                      padding: '10px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#1f2937' }}
                  />
                  <Bar dataKey="total" fill="url(#leastDAGradient)" radius={[8, 8, 0, 0]} />
                  <defs>
                    <linearGradient id="leastDAGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                      <stop offset="100%" stopColor="#d97706" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart */}
        {chartDataAll.length > 0 && (
          <div className="mb-6 sm:mb-8 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/30 rounded-2xl shadow-2xl p-6 sm:p-10 border border-emerald-200/50 hover:shadow-3xl transition-all duration-300 backdrop-blur-sm">
            <div className="mb-8 pb-6 border-b-2 border-gradient-to-r from-emerald-200 to-green-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-12 bg-gradient-to-b from-emerald-600 to-green-600 rounded-full"></div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 mb-2">
                      Data Collection Overview
                    </h2>
                    <p className="text-sm sm:text-base text-slate-600 font-medium">Performance by Development Agent in {region}</p>
                  </div>
                </div>
                {totalChartPages > 1 && (
                  <div className="flex items-center gap-2 sm:gap-3 bg-white/80 px-4 py-2 rounded-lg border border-emerald-200 shadow-sm">
                    <button
                      onClick={() => setChartPage(prev => Math.max(1, prev - 1))}
                      disabled={chartPage === 1}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                        chartPage === 1
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg transform hover:scale-105'
                      }`}
                    >
                      ← Previous
                    </button>
                    <span className="text-sm font-semibold text-slate-700 px-4 py-2 bg-slate-100 rounded-lg border border-slate-200">
                      Page {chartPage} of {totalChartPages}
                    </span>
                    <button
                      onClick={() => setChartPage(prev => Math.min(totalChartPages, prev + 1))}
                      disabled={chartPage === totalChartPages}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                        chartPage === totalChartPages
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg transform hover:scale-105'
                      }`}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white/80 rounded-xl p-4 border border-emerald-100 shadow-inner">
              <ResponsiveContainer width="100%" height={350} className="sm:h-[400px] md:h-[450px]">
                <BarChart data={chartData} margin={{ top: 25, right: 30, left: 20, bottom: 90 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.4} vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    tick={{ fontSize: 11, fill: '#475569', fontWeight: '600' }}
                    stroke="#64748b"
                    tickLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#475569', fontWeight: '600' }}
                    tickFormatter={(value) => value.toLocaleString()}
                    stroke="#64748b"
                    tickLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                    label={{ 
                      value: 'Data Collected', 
                      angle: -90, 
                      position: 'insideLeft', 
                      style: { 
                        textAnchor: 'middle', 
                        fill: '#475569', 
                        fontSize: 13, 
                        fontWeight: '700',
                        letterSpacing: '0.5px'
                      } 
                    }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [value.toLocaleString(), 'Data Collected']}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                      border: '2px solid #10b981', 
                      borderRadius: '12px',
                      padding: '12px 16px',
                      boxShadow: '0 10px 25px rgba(16, 185, 129, 0.2)',
                      backdropFilter: 'blur(10px)'
                    }}
                    labelStyle={{ 
                      fontWeight: '700', 
                      color: '#1e293b',
                      fontSize: '13px',
                      marginBottom: '8px',
                      borderBottom: '2px solid #e2e8f0',
                      paddingBottom: '6px'
                    }}
                    cursor={{ fill: 'rgba(16, 185, 129, 0.1)', stroke: '#10b981', strokeWidth: 2 }}
                  />
                  <Bar 
                    dataKey="Data Collected" 
                    fill="url(#daOverviewGradient)" 
                    radius={[10, 10, 0, 0]}
                    stroke="#059669"
                    strokeWidth={1}
                  />
                  <defs>
                    <linearGradient id="daOverviewGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                      <stop offset="50%" stopColor="#059669" stopOpacity={1} />
                      <stop offset="100%" stopColor="#047857" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {totalChartPages > 1 && (
              <div className="mt-6 text-center text-sm font-medium text-slate-600 bg-white/60 px-4 py-2 rounded-lg border border-emerald-100">
                Showing <span className="font-bold text-emerald-700">{startIndex + 1}-{Math.min(endIndex, chartDataAll.length)}</span> of <span className="font-bold text-emerald-700">{chartDataAll.length}</span> Development Agents
              </div>
            )}
          </div>
        )}

        {/* DA Users Table - Read Only */}
        <div className="mt-8">
          <DATable
            daUsers={daUsers}
            onUpdate={handleUpdate}
            isEditable={false}
          />
        </div>
      </main>

      {/* Footer */}
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


