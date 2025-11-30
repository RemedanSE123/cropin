import PublicDashboard from '@/components/PublicDashboard';

// Force dynamic rendering - disable static generation
// This ensures the page is never pre-rendered at build time
export const dynamic = 'force-dynamic';

export default function Home() {
  return <PublicDashboard />;
}
