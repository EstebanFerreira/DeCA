import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';
import { ROLE_LABELS } from '@/lib/constants';
import type { SessionPayload } from '@/lib/auth';

export default function TopNav({ session }: { session: SessionPayload }) {
  return (
    <header className="bg-deca-teal text-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-bold text-lg">
            Portal DeCA
          </Link>
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="hover:underline">
              Mis DeCA
            </Link>
            <Link href="/deca/nuevo" className="hover:underline">
              Nuevo DeCA
            </Link>
            {(session.role === 'ADMIN' || session.role === 'TRANSPORTISTA') && (
              <Link href="/admin/flota" className="hover:underline">
                Flota y conductores
              </Link>
            )}
            {session.role === 'ADMIN' && (
              <Link href="/admin/usuarios" className="hover:underline">
                Administración
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline text-teal-100">
            {session.name} · {ROLE_LABELS[session.role]}
          </span>
          <form action={logoutAction}>
            <button type="submit" className="btn-secondary !py-1.5 !px-3">
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
