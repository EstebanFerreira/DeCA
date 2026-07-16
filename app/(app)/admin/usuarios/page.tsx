import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLE_LABELS, type Role } from '@/lib/constants';
import { NewEntityForm, NewUserForm } from '@/components/AdminForms';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== 'ADMIN') redirect('/dashboard');

  const [entities, users] = await Promise.all([
    prisma.entity.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({ orderBy: { createdAt: 'asc' }, include: { entity: true } }),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-xl font-bold text-gray-800">Administración</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NewEntityForm />
        <NewUserForm entities={entities} />
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800">Entidades</div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2">Nombre</th>
              <th className="text-left px-4 py-2">Tipo</th>
              <th className="text-left px-4 py-2">NIF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entities.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-2">{e.name}</td>
                <td className="px-4 py-2">{e.type}</td>
                <td className="px-4 py-2">{e.nif}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800">Usuarios</div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2">Nombre</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Rol</th>
              <th className="text-left px-4 py-2">Entidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{ROLE_LABELS[u.role as Role]}</td>
                <td className="px-4 py-2">{u.entity?.name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
