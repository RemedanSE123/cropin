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
        <div className="max-w-[1920px] mx-auto px-6 lg:px-12">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="relative w-16 h-16 flex-shrink-0 bg-white rounded-lg p-1 shadow-md border border-gray-200">
                <Image 
                  src="/moe.webp" 
                  alt="Ministry of Agriculture Logo" 
                  width={56} 
                  height={56}
                  className="object-contain rounded-lg"
                  priority
                />
              </div>
              <div className="border-l-2 border-gray-400 pl-4">
                <h1 className="text-xl font-bold text-gray-800 leading-tight">
                  Ministry of Agriculture
                </h1>
                <p className="text-xs font-medium text-gray-600 mt-0.5">Federal Democratic Republic of Ethiopia</p>
                <p className="text-xs text-gray-500 mt-0.5">Cropin Grow System - Real-Time Monitoring Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchStats}
                className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:text-gray-900 transition rounded-lg hover:bg-gray-100 font-medium border border-gray-300"
                title="Refresh Data"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden md:inline">Refresh</span>
              </button>
              <div className="text-right mr-4 hidden md:block">
                <p className="text-xs text-gray-500">Last Updated</p>
                <p className="text-sm font-semibold text-gray-700">
                  {lastUpdated.toLocaleTimeString()}
                </p>
              </div>
              <a
                href="https://forms.gle/YRGNNjeVnGJyUuZdA"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition rounded-lg hover:bg-gray-100 font-medium border border-gray-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>Support</span>
              </a>
              <button
                onClick={handleLogin}
                className="flex items-center space-x-2 px-5 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition shadow-md font-semibold"
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
      <main className="max-w-[1920px] mx-auto px-6 lg:px-12 py-8">
        {/* Header Section - Professional */}
        <div className="mb-8 text-center bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 shadow-lg text-white">
          <h2 className="text-4xl font-bold mb-2 tracking-tight">
            Agricultural Data Collection Dashboard
          </h2>
          <p className="text-lg text-gray-200 font-medium">
            Real-time insights and comprehensive statistics from Development Agents across Ethiopia
          </p>
        </div>

        {/* KPI Cards - Professional Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* All Regions - Area Chart */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Data Collection by Region</h3>
                <p className="text-sm text-gray-600">All Regions ({regionChartData.length} total)</p>
              </div>
            </div>
            {regionChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={regionChartData} margin={{ top: 10, right: 30, left: 0, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      angle={-35} 
                      textAnchor="end" 
                      height={100}
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      interval={0}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      tickFormatter={(value) => value.toLocaleString()}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="data" fill="#2d5016" name="Total Data" radius={[4, 4, 0, 0]} />
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
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">DA Status Distribution</h3>
                <p className="text-sm text-gray-600">Current Status Overview</p>
              </div>
            </div>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
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
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-200">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">Top 5 Data Collectors</h3>
              <p className="text-sm text-gray-600">Highest Performing Development Agents</p>
            </div>
          </div>
          <div className="overflow-x-auto">
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
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">Data Collection by Zone</h3>
              <p className="text-sm text-gray-600">Top 10 Zones Performance Analysis</p>
            </div>
          </div>
          {zoneChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={zoneChartData} margin={{ top: 20, right: 30, left: 0, bottom: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={120}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  interval={0}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="data" fill="#1e3a5f" name="Total Data" radius={[4, 4, 0, 0]} />
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
      <footer className="bg-gray-800 text-white mt-12 border-t-2 border-gray-700">
        <div className="max-w-[1920px] mx-auto px-6 lg:px-12 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-bold text-sm mb-2">Ministry of Agriculture</h4>
              <p className="text-gray-400 text-xs">Federal Democratic Republic of Ethiopia</p>
              <p className="text-gray-500 text-xs mt-1">Cropin Grow System</p>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-2">System Information</h4>
              <p className="text-gray-400 text-xs">Real-time Agricultural Data Collection</p>
              <p className="text-gray-500 text-xs mt-1">Monitoring and Analytics Platform</p>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-2">Contact & Support</h4>
              <a 
                href="https://forms.gle/YRGNNjeVnGJyUuZdA" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 text-xs hover:text-white underline"
              >
                Report Issues / Get Support
              </a>
              <p className="text-gray-500 text-xs mt-1">© {new Date().getFullYear()} All Rights Reserved</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
