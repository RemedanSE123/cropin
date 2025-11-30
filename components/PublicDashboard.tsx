'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, ComposedChart 
} from 'recharts';

interface PublicStats {
  stats: {
    totalDAs: number;
    totalData: number;
    totalReps: number;
    activeDAs: number;
    inactiveDAs: number;
    avgDataPerDA: number;
  };
  regionData: Array<{ region: string; da_count: number; total_data: number }>;
  zoneData: Array<{ zone: string; da_count: number; total_data: number }>;
  woredaData: Array<{ woreda: string; da_count: number; total_data: number }>;
  statusTrend: Array<{ status: string; count: number; total_data: number }>;
  topDAs: Array<{ 
    name: string; 
    region: string; 
    zone: string; 
    woreda: string;
    total_data_collected: number; 
    status: string;
    reporting_manager_name: string;
  }>;
}

// Professional Minister-Level Color Palette
const PROFESSIONAL_COLORS = {
  primary: '#1e3a5f',      // Navy Blue
  secondary: '#2c5282',    // Dark Blue
  accent: '#2d5016',       // Forest Green
  success: '#22543d',      // Dark Green
  warning: '#744210',      // Dark Amber
  danger: '#742a2a',       // Dark Red
  neutral: '#4a5568',       // Charcoal
  light: '#f7fafc',        // Light Gray
};

const STATUS_COLORS: { [key: string]: string } = {
  'Active': '#22543d', // Professional dark green
  'active': '#22543d',
  'Inactive': '#6b7280', // Professional gray
  'inactive': '#6b7280',
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-xl">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function PublicDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [woredaPage, setWoredaPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      console.log('Auto-refreshing stats...');
      fetchStats();
      setLastUpdated(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Reset pagination when stats change
  useEffect(() => {
    setWoredaPage(1);
  }, [stats]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/public-stats');
      if (response.ok) {
        const data = await response.json();
        console.log('=== FETCHED STATS ===');
        console.log('Full stats object:', JSON.stringify(data.stats, null, 2));
        console.log('KPI Values:', {
          totalDAs: data.stats?.totalDAs,
          totalData: data.stats?.totalData,
          totalReps: data.stats?.totalReps,
          activeDAs: data.stats?.activeDAs,
          inactiveDAs: data.stats?.inactiveDAs,
          avgDataPerDA: data.stats?.avgDataPerDA,
        });
        console.log('Region data count:', data.regionData?.length);
        console.log('Zone data count:', data.zoneData?.length);
        console.log('Status trend count:', data.statusTrend?.length);
        setStats(data);
        setLastUpdated(new Date());
      } else {
        console.error('API response not OK:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-gray-700 border-t-transparent mx-auto mb-6"></div>
          <p className="text-gray-700 font-bold text-lg">Loading Dashboard...</p>
          <p className="text-gray-500 text-sm mt-2">Fetching real-time data</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
          <p className="text-red-600 font-bold text-xl mb-4">Unable to load dashboard data</p>
          <button 
            onClick={fetchStats}
            className="px-8 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition shadow-lg font-semibold"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Prepare chart data with proper normalization and deduplication
  // Normalize status data to ensure no duplicates
  const normalizedStatusData = (stats.statusTrend && stats.statusTrend.length > 0) 
    ? stats.statusTrend.reduce((acc: any, item: any) => {
        const statusName = (item.status || 'Unknown').trim();
        const statusLower = statusName.toLowerCase();
        const count = Number(item.count) || 0;
        
        // Normalize to standard names
        let normalizedName = 'Inactive'; // Default
        if (statusLower === 'active') {
          normalizedName = 'Active';
        } else if (statusLower === 'inactive') {
          normalizedName = 'Inactive';
        }
        
        // Accumulate counts for same normalized status
        if (!acc[normalizedName]) {
          acc[normalizedName] = 0;
        }
        acc[normalizedName] += count;
        
        return acc;
      }, {})
    : {
        'Active': stats.stats.activeDAs || 0,
        'Inactive': stats.stats.inactiveDAs || 0,
      };
  
  // Convert to array format with proper colors
  const pieData = Object.entries(normalizedStatusData)
    .map(([name, value]) => ({
      name,
      value: Number(value) || 0,
      color: STATUS_COLORS[name] || '#6b7280',
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => {
      // Sort: Active first, then Inactive
      if (a.name === 'Active') return -1;
      if (b.name === 'Active') return 1;
      return a.name.localeCompare(b.name);
    });

  // Fix region data - ensure proper number conversion - Show ALL regions
  const regionChartData = (stats.regionData || []).map((r, index) => {
    // Handle PostgreSQL numeric types (can be string or number)
    const totalData = r.total_data != null ? Number(r.total_data) : 0;
    const daCount = r.da_count != null ? Number(r.da_count) : 0;
    
    return {
      name: (r.region || 'Unknown').substring(0, 20),
      fullName: r.region || 'Unknown',
      data: isNaN(totalData) ? 0 : totalData,
      das: isNaN(daCount) ? 0 : daCount,
      rank: index + 1,
    };
  }).sort((a, b) => b.data - a.data); // Sort by data descending, but show all

  const allWoredaChartData = (stats.woredaData || []).map((w) => {
    // Handle PostgreSQL numeric types (can be string or number)
    const totalData = w.total_data != null ? Number(w.total_data) : 0;
    const daCount = w.da_count != null ? Number(w.da_count) : 0;
    
    // Use full name for better clarity, trim whitespace
    const woredaName = (w.woreda || 'Unknown').trim();
    
    return {
      name: woredaName.length > 40 ? woredaName.substring(0, 40) + '...' : woredaName,
      fullName: woredaName,
      data: isNaN(totalData) ? 0 : totalData,
      das: isNaN(daCount) ? 0 : daCount,
    };
  }).sort((a, b) => b.data - a.data); // Sort by data descending

  // Paginate woreda data
  const woredaTotalPages = Math.ceil(allWoredaChartData.length / itemsPerPage);
  const woredaStartIndex = (woredaPage - 1) * itemsPerPage;
  const woredaEndIndex = woredaStartIndex + itemsPerPage;
  const woredaChartData = allWoredaChartData.slice(woredaStartIndex, woredaEndIndex);

  const activeRate = stats.stats.totalDAs > 0 
    ? ((stats.stats.activeDAs / stats.stats.totalDAs) * 100).toFixed(1)
    : '0.0';

  // Log chart data for debugging
  console.log('=== CHART DATA DEBUG ===');
  console.log('Region chart data:', regionChartData);
  console.log('Region chart data length:', regionChartData.length);
  if (regionChartData.length > 0) {
    console.log('First region data:', JSON.stringify(regionChartData[0], null, 2));
    console.log('All region data values:', regionChartData.map(r => ({ name: r.name, data: r.data, das: r.das })));
  }
  console.log('Pie chart data:', pieData);
  console.log('Pie chart data length:', pieData.length);
  console.log('Raw stats.statusTrend:', JSON.stringify(stats.statusTrend, null, 2));
  console.log('Raw stats.stats:', {
    activeDAs: stats.stats.activeDAs,
    inactiveDAs: stats.stats.inactiveDAs,
  });

  return (
    <div className="min-h-screen bg-gray-50 dashboard-container">
      {/* Top Navigation Bar - Professional */}
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
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Cropin Grow System - Real-Time Monitoring Dashboard</p>
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
                onClick={handleLogin}
                className="flex items-center space-x-2 px-3 sm:px-5 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition shadow-md font-semibold text-sm sm:text-base"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Login</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-12 py-4 sm:py-8">
        {/* Header Section - Professional */}
        <div className="mb-6 sm:mb-8 text-center bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-4 sm:p-6 shadow-lg text-white">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 tracking-tight">
            Agricultural Data Collection Dashboard
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-gray-200 font-medium">
            Real-time insights and comprehensive statistics from Development Agents across Ethiopia
          </p>
        </div>

        {/* KPI Cards - Professional Design with Proportional Sizing */}
        <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 lg:gap-5 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-blue-600 hover:shadow-lg transition h-full flex flex-col">
            <div className="flex items-start justify-between flex-1">
              <div className="flex-1">
                <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total DA Users</p>
                <p className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1">{stats.stats.totalDAs.toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-gray-600">Active Development Agents</p>
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
                  <p className="text-[10px] sm:text-xs text-gray-500">Active Rate: <span className="font-semibold text-gray-700">{activeRate}%</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-green-600 hover:shadow-lg transition h-full flex flex-col">
            <div className="flex items-start justify-between flex-1">
              <div className="flex-1">
                <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Data Collected</p>
                <p className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1">{stats.stats.totalData.toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-gray-600">Data Points Collected</p>
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
                  <p className="text-[10px] sm:text-xs text-gray-500">Avg per DA: <span className="font-semibold text-gray-700">{Math.round(stats.stats.avgDataPerDA).toLocaleString()}</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-purple-600 hover:shadow-lg transition h-full flex flex-col">
            <div className="flex items-start justify-between flex-1">
              <div className="flex-1">
                <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Woreda Representatives</p>
                <p className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1">{stats.stats.totalReps.toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-gray-600">Active Field Managers</p>
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
                  <p className="text-[10px] sm:text-xs text-gray-500">Avg DAs per Rep: <span className="font-semibold text-gray-700">{stats.stats.totalReps > 0 ? Math.round(stats.stats.totalDAs / stats.stats.totalReps) : 0}</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-amber-600 hover:shadow-lg transition h-full flex flex-col">
            <div className="flex items-start justify-between flex-1">
              <div className="flex-1">
                <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Avg Data per DA</p>
                <p className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1">{Math.round(stats.stats.avgDataPerDA).toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-gray-600">Average Collection Rate</p>
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
                  <p className="text-[10px] sm:text-xs text-gray-500">Performance Metric</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-green-600 hover:shadow-lg transition h-full flex flex-col">
            <div className="flex items-center justify-between flex-1">
              <div className="flex-1">
                <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 sm:mb-2">Active DAs</p>
                <p className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">{stats.stats.activeDAs.toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-gray-600 mb-2 sm:mb-3">
                  {stats.stats.totalDAs > 0 
                    ? `${((stats.stats.activeDAs / stats.stats.totalDAs) * 100).toFixed(1)}% of total DAs`
                    : '0% of total'}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${stats.stats.totalDAs > 0 ? (stats.stats.activeDAs / stats.stats.totalDAs) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-red-600 hover:shadow-lg transition h-full flex flex-col">
            <div className="flex items-center justify-between flex-1">
              <div className="flex-1">
                <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 sm:mb-2">Inactive DAs</p>
                <p className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">{stats.stats.inactiveDAs.toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-gray-600 mb-2 sm:mb-3">
                  {stats.stats.totalDAs > 0 
                    ? `${((stats.stats.inactiveDAs / stats.stats.totalDAs) * 100).toFixed(1)}% of total DAs`
                    : '0% of total'}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${stats.stats.totalDAs > 0 ? (stats.stats.inactiveDAs / stats.stats.totalDAs) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid - Top 5 Regions and Status Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* All Regions - Area Chart */}
          <div className="bg-white rounded-xl shadow-md p-3 sm:p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">Data Collection by Region</h3>
                <p className="text-xs sm:text-sm text-gray-600">All Regions ({regionChartData.length} total)</p>
              </div>
            </div>
            {regionChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={400} className="sm:h-[450px] md:h-[500px]">
                  <BarChart data={regionChartData} margin={{ top: 20, right: 30, left: 10, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis 
                      dataKey="name" 
                      angle={-35} 
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
                      dataKey="data" 
                      name="Total Data Collected" 
                      fill="#2d5016" 
                      radius={[6, 6, 0, 0]}
                      stroke="#1e3a0f"
                      strokeWidth={1}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div className={`mt-6 grid gap-2 ${regionChartData.length <= 5 ? 'grid-cols-5' : regionChartData.length <= 6 ? 'grid-cols-6' : 'grid-cols-3'}`}>
                  {regionChartData.map((region, index) => (
                    <div key={index} className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-xs font-bold text-gray-700 mb-1">#{index + 1}</div>
                      <div className="text-xs font-medium text-gray-600 mb-2 truncate" title={region.fullName}>
                        {region.name}
                      </div>
                      <div className="text-sm font-bold text-gray-900">
                        {region.data.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{region.das} DAs</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[350px] flex flex-col items-center justify-center text-gray-400">
                <p className="text-lg font-semibold mb-2">No region data available</p>
                <p className="text-sm">Check database connection and data</p>
                <button 
                  onClick={fetchStats}
                  className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm"
                >
                  Refresh Data
                </button>
              </div>
            )}
          </div>

          {/* DA Status Distribution - Pie Chart */}
          <div className="bg-white rounded-xl shadow-md p-3 sm:p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">DA Status Distribution</h3>
                <p className="text-xs sm:text-sm text-gray-600">Current Status Overview</p>
              </div>
            </div>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={400} className="sm:h-[450px] md:h-[500px]">
                  <PieChart>
                    <defs>
                      <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22543d" stopOpacity={1} />
                        <stop offset="100%" stopColor="#1a3d2e" stopOpacity={0.95} />
                      </linearGradient>
                      <linearGradient id="inactiveGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6b7280" stopOpacity={1} />
                        <stop offset="100%" stopColor="#4b5563" stopOpacity={0.95} />
                      </linearGradient>
                    </defs>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius="75%"
                      innerRadius="40%"
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={3}
                      animationDuration={1000}
                    >
                      {pieData.map((entry, index) => {
                        // Use gradient for Active/Inactive
                        let fillColor = entry.color;
                        if (entry.name === 'Active') {
                          fillColor = 'url(#activeGradient)';
                        } else if (entry.name === 'Inactive') {
                          fillColor = 'url(#inactiveGradient)';
                        }
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={fillColor}
                            stroke="#ffffff"
                            strokeWidth={3}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #d1d5db', 
                        borderRadius: '6px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        padding: '12px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                      }}
                      formatter={(value: any, name: string, props: any) => {
                        const total = pieData.reduce((sum, item) => sum + item.value, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                        return [`${value.toLocaleString()} (${percentage}%)`, 'Count'];
                      }}
                      labelStyle={{ 
                        color: '#111827', 
                        fontWeight: 600, 
                        fontSize: '13px', 
                        marginBottom: '6px',
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={50}
                      wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 500 }}
                      iconType="circle"
                      formatter={(value: string) => {
                        const entry = pieData.find(d => d.name === value);
                        const total = pieData.reduce((sum, item) => sum + item.value, 0);
                        const percentage = entry && total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
                        return `${value}: ${percentage}%`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-6 space-y-3">
                  {pieData.map((item, index) => {
                    const total = pieData.reduce((sum, i) => sum + i.value, 0);
                    const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                    const isActive = item.name === 'Active';
                    return (
                      <div 
                        key={index} 
                        className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                          isActive 
                            ? 'bg-gray-50 border-gray-300 hover:bg-gray-100' 
                            : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ 
                              backgroundColor: item.color
                            }}
                          ></div>
                          <span className="font-semibold text-gray-800 text-sm">
                            {item.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-gray-900 text-base">
                            {item.value.toLocaleString()}
                          </span>
                          <span className="text-sm text-gray-600 ml-2 font-medium">
                            ({percentage}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="h-[350px] flex flex-col items-center justify-center text-gray-400">
                <p className="text-lg font-semibold mb-2">No status data available</p>
                <p className="text-sm">Check database for status information</p>
                <button 
                  onClick={fetchStats}
                  className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm"
                >
                  Refresh Data
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Top Data Collectors - Professional Table */}
        <div className="bg-white rounded-xl shadow-md p-3 sm:p-6 mb-6 sm:mb-8 border border-gray-200">
          <div className="flex items-center justify-between mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">Top 5 Data Collectors</h3>
              <p className="text-xs sm:text-sm text-gray-600">Highest Performing Development Agents</p>
            </div>
          </div>
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">DA Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Region</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Zone</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Woreda</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Manager</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Data Collected</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.topDAs && stats.topDAs.length > 0 ? (
                  stats.topDAs.map((da, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                            index === 1 ? 'bg-gray-100 text-gray-800 border border-gray-300' :
                            index === 2 ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                            'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{da.name}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{da.region || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{da.zone || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{da.woreda || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{da.reporting_manager_name || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-base font-bold text-gray-900">{da.total_data_collected.toLocaleString()}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-lg ${
                          (da.status?.toLowerCase() === 'active') ? 'bg-green-100 text-green-800 border border-green-300' :
                          (da.status?.toLowerCase() === 'inactive') ? 'bg-red-100 text-red-800 border border-red-300' :
                          'bg-yellow-100 text-yellow-800 border border-yellow-300'
                        }`}>
                          {da.status || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <p className="text-lg font-semibold">No top data collectors found</p>
                      <p className="text-sm mt-2">Data will appear here once collection begins</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Woreda Data Chart - Full Width */}
        <div className="bg-white rounded-xl shadow-md p-3 sm:p-6 border border-gray-200 mt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-200 gap-3">
            <div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">Data Collection by Woreda</h3>
              <p className="text-xs sm:text-sm text-gray-600">Showing {woredaStartIndex + 1}-{Math.min(woredaEndIndex, allWoredaChartData.length)} of {allWoredaChartData.length} woredas</p>
            </div>
            {allWoredaChartData.length > itemsPerPage && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWoredaPage(prev => Math.max(1, prev - 1))}
                  disabled={woredaPage === 1}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm font-semibold text-gray-700">
                  Page {woredaPage} of {woredaTotalPages}
                </span>
                <button
                  onClick={() => setWoredaPage(prev => Math.min(woredaTotalPages, prev + 1))}
                  disabled={woredaPage === woredaTotalPages}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
          {woredaChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={600} className="sm:h-[650px] md:h-[700px]">
              <ComposedChart data={woredaChartData} margin={{ top: 20, right: 30, left: 20, bottom: 140 }}>
                <defs>
                  <linearGradient id="woredaBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={1} />
                    <stop offset="100%" stopColor="#1e40af" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={160}
                  tick={{ fontSize: 13, fill: '#1f2937', fontWeight: 600, fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  interval={0}
                  stroke="#6b7280"
                  tickLine={{ stroke: '#9ca3af' }}
                />
                <YAxis 
                  tick={{ fontSize: 13, fill: '#1f2937', fontWeight: 600, fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  tickFormatter={(value) => value.toLocaleString()}
                  stroke="#6b7280"
                  tickLine={{ stroke: '#9ca3af' }}
                  label={{ 
                    value: 'Data Collected', 
                    angle: -90, 
                    position: 'insideLeft', 
                    style: { 
                      textAnchor: 'middle', 
                      fill: '#374151', 
                      fontSize: '14px', 
                      fontWeight: 600,
                      fontFamily: 'system-ui, -apple-system, sans-serif'
                    } 
                  }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #2563eb', 
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    padding: '14px 16px',
                    fontSize: '14px',
                    fontWeight: 500,
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}
                  cursor={{ fill: 'rgba(37, 99, 235, 0.15)', stroke: '#2563eb', strokeWidth: 1 }}
                  formatter={(value: any, name: string, props: any) => {
                    const fullName = props.payload?.fullName || props.payload?.name || '';
                    return [`${fullName}: ${value.toLocaleString()}`, 'Total Data Collected'];
                  }}
                  labelFormatter={(label: any, payload: any) => {
                    if (payload && payload[0]) {
                      return payload[0].payload?.fullName || label;
                    }
                    return label;
                  }}
                  labelStyle={{ 
                    color: '#111827', 
                    fontWeight: 700, 
                    fontSize: '14px', 
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px', fontSize: '14px', fontWeight: 600, fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  iconType="rect"
                />
                <Bar 
                  dataKey="data" 
                  name="Total Data Collected" 
                  fill="url(#woredaBarGradient)" 
                  radius={[6, 6, 0, 0]}
                  stroke="#1e40af"
                  strokeWidth={2}
                  animationDuration={800}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center text-gray-400">
              <p className="text-lg font-semibold mb-2">No woreda data available</p>
              <p className="text-sm">Check database connection and data</p>
              <button 
                onClick={fetchStats}
                className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm"
              >
                Refresh Data
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer - Professional */}
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
