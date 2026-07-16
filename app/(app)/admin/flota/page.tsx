import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NewVehiculoForm, NewConductorForm } from '@/components/FlotaForms';
import { toggleVehiculoActivoAction, toggleConductorActivoAction } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';

export default async function FlotaPage() {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== 'ADMIN' && session.role !== 'TRANSPORTISTA') redirect('/dashboard');

  const isTransportista = session.role === 'TRANSPORTISTA';
  const entityFilter = isTransportista ? { transportistaEntityId: session.entityId ?? '__none__' } : {};

  const [transportistas, vehiculos, conductores] = await Promise.all([
    prisma.entity.findMany({ where: { type: 'TRANSPORTISTA' }, orderBy: { name: 'asc' } }),
    prisma.vehiculo.findMany({ where: entityFilter, orderBy: { matricula: 'asc' }, include: { transportistaEntity: true } }),
    prisma.conductor.findMany({ where: entityFilter, orderBy: { nombre: 'asc' }, include: { transportistaEntity: true } }),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Flota y conductores</h1>
        <p className="text-sm text-gray-500 mt-1">
          Vehículos (matrículas) y conductores disponibles para seleccionar al crear o modificar un DeCA. Al
          desactivar uno deja de aparecer en los formularios, pero los DeCA ya creados con él conservan sus datos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NewVehiculoForm
          transportistas={transportistas}
          fixedTransportistaId={isTransportista ? session.entityId ?? undefined : undefined}
        />
        <NewConductorForm
          transportistas={transportistas}
          fixedTransportistaId={isTransportista ? session.entityId ?? undefined : undefined}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800">Vehículos</div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2">Matrícula</th>
              <th className="text-left px-4 py-2">Remolque</th>
              {!isTransportista && <th className="text-left px-4 py-2">Transportista</th>}
              <th className="text-left px-4 py-2">Estado</th>
              <th className="text-right px-4 py-2">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vehiculos.map((v) => (
              <tr key={v.id}>
                <td className="px-4 py-2 font-mono">{v.matricula}</td>
                <td className="px-4 py-2 font-mono">{v.remolque || '—'}</td>
                {!isTransportista && <td className="px-4 py-2">{v.transportistaEntity.name}</td>}
                <td className="px-4 py-2">
                  <span className={`badge ${v.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {v.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <form action={toggleVehiculoActivoAction}>
                    <input type="hidden" name="id" value={v.id} />
                    <button type="submit" className="text-deca-teal hover:underline text-xs">
                      {v.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {vehiculos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Todavía no hay vehículos dados de alta.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800">Conductores</div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2">Nombre</th>
              <th className="text-left px-4 py-2">DNI</th>
              {!isTransportista && <th className="text-left px-4 py-2">Transportista</th>}
              <th className="text-left px-4 py-2">Estado</th>
              <th className="text-right px-4 py-2">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {conductores.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2">{c.nombre}</td>
                <td className="px-4 py-2 font-mono">{c.dni}</td>
                {!isTransportista && <td className="px-4 py-2">{c.transportistaEntity.name}</td>}
                <td className="px-4 py-2">
                  <span className={`badge ${c.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {c.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <form action={toggleConductorActivoAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="text-deca-teal hover:underline text-xs">
                      {c.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {conductores.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Todavía no hay conductores dados de alta.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
