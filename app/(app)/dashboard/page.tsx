import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { STATUS_LABELS, type DecaStatus } from '@/lib/constants';
import { isPastRetentionWindow } from '@/lib/deca';

export const dynamic = 'force-dynamic';

function StatusBadge({ status, serviceEndDate }: { status: string; serviceEndDate: Date | null }) {
  const willExpireSoon = status === 'ACTIVE' && isPastRetentionWindow(serviceEndDate);
  const label = willExpireSoon ? 'Pendiente de desactivar' : STATUS_LABELS[status as DecaStatus] ?? status;
  const color =
    status === 'ACTIVE' && !willExpireSoon
      ? 'bg-green-100 text-green-800'
      : status === 'SUPERSEDED'
        ? 'bg-gray-100 text-gray-700'
        : 'bg-red-100 text-red-800';
  return <span className={`badge ${color}`}>{label}</span>;
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const where =
    session.role === 'ADMIN'
      ? {}
      : session.role === 'CARGADOR'
        ? { cargadorEntityId: session.entityId ?? '__none__' }
        : { transportistaEntityId: session.entityId ?? '__none__' };

  const decas = await prisma.decaDocument.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { cargadorEntity: true, transportistaEntity: true, envios: true },
    take: 100,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Mis DeCA</h1>
        <Link href="/deca/nuevo" className="btn-primary">
          + Nuevo DeCA
        </Link>
      </div>

      {decas.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          Todavía no hay ningún DeCA. Crea el primero con &quot;+ Nuevo DeCA&quot;.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2 font-medium">DocID</th>
                <th className="text-left px-4 py-2 font-medium">Cargador contractual</th>
                <th className="text-left px-4 py-2 font-medium">Transportista efectivo</th>
                <th className="text-left px-4 py-2 font-medium">Envíos</th>
                <th className="text-left px-4 py-2 font-medium">Creado</th>
                <th className="text-left px-4 py-2 font-medium">Estado</th>
                <th className="text-right px-4 py-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {decas.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{d.docId}</td>
                  <td className="px-4 py-2">{d.cargadorEntity.name}</td>
                  <td className="px-4 py-2">{d.transportistaEntity.name}</td>
                  <td className="px-4 py-2">
                    {d.envios[0]?.origen} → {d.envios[0]?.destino}
                    {d.envios.length > 1 ? ` (+${d.envios.length - 1})` : ''}
                  </td>
                  <td className="px-4 py-2">{d.createdAt.toLocaleDateString('es-ES')}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={d.status} serviceEndDate={d.serviceEndDate} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/deca/${d.id}`} className="text-deca-teal hover:underline">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
