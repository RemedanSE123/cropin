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

export default function DashboardContent() {
  const router = useRouter();
  const [daUsers, setDaUsers] = useState<DAUser[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [woredaRepName, setWoredaRepName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

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

  // Prepare chart data
  const chartData = daUsers.map(da => ({
    name: da.name.length > 15 ? da.name.substring(0, 15) + '...' : da.name,
    'Data Collected': da.total_collected_data || 0,
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
      {/* Top Navigation Bar - Matching Home Page */}
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
                <p className="text-xs text-gray-500 mt-0.5">
                  Cropin Grow System - {woredaRepName ? `Welcome, ${woredaRepName}` : 'Dashboard'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
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
                onClick={handleLogout}
                className="flex items-center space-x-2 px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-md font-semibold"
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
      <main className="max-w-[1920px] mx-auto px-6 lg:px-12 py-8">
        {/* Header Section - Matching Home Page */}
        <div className="mb-8 text-center bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 shadow-lg text-white">
          <h2 className="text-4xl font-bold mb-2 tracking-tight">
            My Development Agents Dashboard
          </h2>
          <p className="text-lg text-gray-200 font-medium">
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
        {chartData.length > 0 && (
          <div className="mb-8 bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="mb-6 pb-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Data Collection Overview</h2>
              <p className="text-sm text-gray-600">Performance by Development Agent</p>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <Tooltip />
                <Legend />
                <Bar dataKey="Data Collected" fill="#2d5016" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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

