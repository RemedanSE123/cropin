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
    pendingDAs: number;
    avgDataPerDA: number;
  };
  regionData: Array<{ region: string; da_count: number; total_data: number }>;
  zoneData: Array<{ zone: string; da_count: number; total_data: number }>;
  statusTrend: Array<{ status: string; count: number; total_data: number }>;
  topDAs: Array<{ 
    name: string; 
    region: string; 
    zone: string; 
    woreda: string;
    total_collected_data: number; 
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
  'Active': '#22543d',
  'active': '#22543d',
  'Inactive': '#742a2a',
  'inactive': '#742a2a',
  'Pending': '#744210',
  'pending': '#744210',
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
          pendingDAs: data.stats?.pendingDAs,
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

  // Prepare chart data with proper number conversion
  // Use statusTrend from database if available, otherwise fall back to stats
  console.log('=== PIE CHART DEBUG ===');
  console.log('statusTrend raw:', JSON.stringify(stats.statusTrend, null, 2));
  
  const pieData = (stats.statusTrend && stats.statusTrend.length > 0) 
    ? stats.statusTrend.map((item: any) => {
        const statusName = (item.status || 'Unknown').trim();
        const statusLower = statusName.toLowerCase();
        const count = Number(item.count) || 0;
        
        console.log(`Processing status: "${statusName}" (lower: "${statusLower}"), count: ${count}`);
        
        // Map status to color
        let color = STATUS_COLORS[statusName] || STATUS_COLORS[statusLower] || '#6b7280';
        
        // Normalize status name for display
        let displayName = statusName;
        if (statusLower === 'active') {
          displayName = 'Active';
          color = STATUS_COLORS['Active'];
        } else if (statusLower === 'inactive') {
          displayName = 'Inactive';
          color = STATUS_COLORS['Inactive'];
        } else if (statusLower === 'pending') {
          displayName = 'Pending';
          color = STATUS_COLORS['Pending'];
        }
        
        const pieItem = {
          name: displayName,
          value: count,
          color: color,
        };
        
        console.log('Created pie item:', pieItem);
        return pieItem;
      }).filter(item => {
        const keep = item.value > 0;
        if (!keep) {
          console.log(`Filtered out pie item: ${item.name} (value: ${item.value})`);
        }
        return keep;
      })
    : [
        { name: 'Active', value: stats.stats.activeDAs || 0, color: STATUS_COLORS['Active'] },
        { name: 'Inactive', value: stats.stats.inactiveDAs || 0, color: STATUS_COLORS['Inactive'] },
        { name: 'Pending', value: stats.stats.pendingDAs || 0, color: STATUS_COLORS['Pending'] },
      ].filter(item => item.value > 0);
  
  console.log('Final pieData:', pieData);

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

  const zoneChartData = (stats.zoneData || []).map((z) => {
    // Handle PostgreSQL numeric types (can be string or number)
    const totalData = z.total_data != null ? Number(z.total_data) : 0;
    const daCount = z.da_count != null ? Number(z.da_count) : 0;
    
    return {
      name: (z.zone || 'Unknown').substring(0, 25),
      fullName: z.zone || 'Unknown',
      data: isNaN(totalData) ? 0 : totalData,
      das: isNaN(daCount) ? 0 : daCount,
    };
  }).sort((a, b) => b.data - a.data).slice(0, 10); // Sort and show top 10

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
  console.log('Zone chart data:', zoneChartData);
  console.log('Zone chart data length:', zoneChartData.length);
  if (zoneChartData.length > 0) {
    console.log('First zone data:', JSON.stringify(zoneChartData[0], null, 2));
    console.log('All zone data values:', zoneChartData.map(z => ({ name: z.name, data: z.data, das: z.das })));
  }
  console.log('Pie chart data:', pieData);
  console.log('Pie chart data length:', pieData.length);
  console.log('Raw stats.statusTrend:', JSON.stringify(stats.statusTrend, null, 2));
  console.log('Raw stats.stats:', {
    activeDAs: stats.stats.activeDAs,
    inactiveDAs: stats.stats.inactiveDAs,
    pendingDAs: stats.stats.pendingDAs,
  });

  return (
    <div className="min-h-screen bg-gray-50 dashboard-container">
      {/* Top Navigation Bar - Professional */}
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
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Cropin Grow System - Real-Time Monitoring Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto justify-end flex-wrap">
              <button
                onClick={fetchStats}
                className="flex items-center space-x-2 px-2 sm:px-3 py-2 text-gray-700 hover:text-gray-900 transition rounded-lg hover:bg-gray-100 font-medium border border-gray-300 text-xs sm:text-sm"
                title="Refresh Data"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <div className="text-right hidden lg:block">
                <p className="text-xs text-gray-500">Last Updated</p>
                <p className="text-sm font-semibold text-gray-700">
                  {lastUpdated.toLocaleTimeString()}
                </p>
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
                onClick={handleLogin}
                className="flex items-center space-x-2 px-3 sm:px-5 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition shadow-md font-semibold text-xs sm:text-sm"
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

        {/* KPI Cards - Professional Design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-600 hover:shadow-lg transition">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total DA Users</p>
                <p className="text-4xl font-bold text-gray-900 mb-1">{stats.stats.totalDAs.toLocaleString()}</p>
                <p className="text-xs text-gray-600">Active Development Agents</p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Active Rate: <span className="font-semibold text-gray-700">{activeRate}%</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-600 hover:shadow-lg transition">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Data Collected</p>
                <p className="text-4xl font-bold text-gray-900 mb-1">{stats.stats.totalData.toLocaleString()}</p>
                <p className="text-xs text-gray-600">Data Points Collected</p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Avg per DA: <span className="font-semibold text-gray-700">{Math.round(stats.stats.avgDataPerDA).toLocaleString()}</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-600 hover:shadow-lg transition">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Woreda Representatives</p>
                <p className="text-4xl font-bold text-gray-900 mb-1">{stats.stats.totalReps.toLocaleString()}</p>
                <p className="text-xs text-gray-600">Active Field Managers</p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Avg DAs per Rep: <span className="font-semibold text-gray-700">{stats.stats.totalReps > 0 ? Math.round(stats.stats.totalDAs / stats.stats.totalReps) : 0}</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-amber-600 hover:shadow-lg transition">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Avg Data per DA</p>
                <p className="text-4xl font-bold text-gray-900 mb-1">{Math.round(stats.stats.avgDataPerDA).toLocaleString()}</p>
                <p className="text-xs text-gray-600">Average Collection Rate</p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Performance Metric</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Cards - Professional */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-600 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Active DAs</p>
                <p className="text-4xl font-bold text-gray-900 mb-2">{stats.stats.activeDAs.toLocaleString()}</p>
                <p className="text-xs text-gray-600 mb-3">
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

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-600 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Inactive DAs</p>
                <p className="text-4xl font-bold text-gray-900 mb-2">{stats.stats.inactiveDAs.toLocaleString()}</p>
                <p className="text-xs text-gray-600 mb-3">
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

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-600 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pending DAs</p>
                <p className="text-4xl font-bold text-gray-900 mb-2">{stats.stats.pendingDAs.toLocaleString()}</p>
                <p className="text-xs text-gray-600 mb-3">
                  {stats.stats.totalDAs > 0 
                    ? `${((stats.stats.pendingDAs / stats.stats.totalDAs) * 100).toFixed(1)}% of total DAs`
                    : '0% of total'}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${stats.stats.totalDAs > 0 ? (stats.stats.pendingDAs / stats.stats.totalDAs) * 100 : 0}%` }}
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
                          fill={entry.color}
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
                <div className="mt-6 space-y-2">
                  {pieData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="font-semibold text-gray-700">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-900">{item.value.toLocaleString()}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({((item.value / stats.stats.totalDAs) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))}
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
                        <div className="text-base font-bold text-gray-900">{da.total_collected_data.toLocaleString()}</div>
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

        {/* Zone Data Chart - Full Width */}
        <div className="bg-white rounded-xl shadow-md p-3 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">Data Collection by Zone</h3>
              <p className="text-xs sm:text-sm text-gray-600">Top 10 Zones Performance Analysis</p>
            </div>
          </div>
          {zoneChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={450} className="sm:h-[500px] md:h-[550px]">
              <ComposedChart data={zoneChartData} margin={{ top: 20, right: 30, left: 10, bottom: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={120}
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
                  cursor={{ fill: 'rgba(30, 58, 95, 0.1)' }}
                  formatter={(value: any) => [value.toLocaleString(), 'Total Data']}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 500 }}
                  iconType="rect"
                />
                <Bar 
                  dataKey="data" 
                  name="Total Data Collected" 
                  fill="#1e3a5f" 
                  radius={[6, 6, 0, 0]}
                  stroke="#0f1f3a"
                  strokeWidth={1}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center text-gray-400">
              <p className="text-lg font-semibold mb-2">No zone data available</p>
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
