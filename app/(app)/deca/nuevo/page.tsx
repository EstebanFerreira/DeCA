import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import NuevoDecaForm from '@/components/NuevoDecaForm';

export const dynamic = 'force-dynamic';

export default async function NuevoDecaPage() {
  const session = await getSession();
  if (!session) return null;

  const [cargadores, transportistas, vehiculos, conductores] = await Promise.all([
    prisma.entity.findMany({ where: { type: 'CARGADOR' }, orderBy: { name: 'asc' } }),
    prisma.entity.findMany({ where: { type: 'TRANSPORTISTA' }, orderBy: { name: 'asc' } }),
    prisma.vehiculo.findMany({ where: { activo: true }, orderBy: { matricula: 'asc' } }),
    prisma.conductor.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-1">Nuevo DeCA</h1>
      <p className="text-sm text-gray-500 mb-6">
        Documento electrónico de Control Administrativo — se generará un PDF nativo digital con código QR y una
        URL pública de acceso directo, según la resolución vigente.
      </p>
      <NuevoDecaForm
        cargadores={cargadores}
        transportistas={transportistas}
        vehiculos={vehiculos}
        conductores={conductores}
        defaultCargadorId={session.role === 'CARGADOR' ? session.entityId ?? undefined : undefined}
        defaultTransportistaId={session.role === 'TRANSPORTISTA' ? session.entityId ?? undefined : undefined}
      />
    </div>
  );
}
