import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import TopNav from '@/components/TopNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen">
      <TopNav session={session} />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
