'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RegionalManagerDashboard from '@/components/RegionalManagerDashboard';

export default function RegionalManagerPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const isRegionalManager = localStorage.getItem('isRegionalManager') === 'true';
    
    if (!token || !isRegionalManager) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <RegionalManagerDashboard />;
}


