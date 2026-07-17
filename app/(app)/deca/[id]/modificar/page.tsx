import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import ModificarDecaForm from '@/components/ModificarDecaForm';

export const dynamic = 'force-dynamic';

function toDateInput(d: Date | null): string {
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}

export default async function ModificarDecaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const deca = await prisma.decaDocument.findUnique({ where: { id }, include: { envios: true } });
  if (!deca) notFound();
  if (deca.status === 'SUPERSEDED') notFound();

  const canManage = session.role === 'ADMIN' || session.userId === deca.createdByUserId;
  if (!canManage) {
    return (
      <div className="max-w-xl mx-auto card p-6 text-sm text-red-600">
        No tienes permiso para modificar este DeCA.
      </div>
    );
  }

  const [cargadores, transportistas, vehiculos, conductores] = await Promise.all([
    prisma.entity.findMany({ where: { type: 'CARGADOR' }, orderBy: { name: 'asc' } }),
    prisma.entity.findMany({ where: { type: 'TRANSPORTISTA' }, orderBy: { name: 'asc' } }),
    prisma.vehiculo.findMany({ where: { activo: true }, orderBy: { matricula: 'asc' } }),
    prisma.conductor.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-1">Modificar DeCA {deca.docId}</h1>
      <p className="text-sm text-gray-500 mb-6">
        Según el Quinto de la resolución, puedes actualizar el PDF existente (misma URL/QR) o generar un PDF nuevo
        (nueva URL/QR). En ambos casos debe reenviarse el documento actualizado al conductor.
      </p>
      <ModificarDecaForm
        decaId={deca.id}
        autorizacionEspecial={deca.autorizacionEspecial || ''}
        observacionesCargador={deca.observacionesCargador || ''}
        observacionesTransportista={deca.observacionesTransportista || ''}
        serviceEndDate={toDateInput(deca.serviceEndDate)}
        cuentaAnalitica={deca.cuentaAnalitica || ''}
        expedidorNombre={deca.expedidorNombre || ''}
        expedidorNif={deca.expedidorNif || ''}
        expedidorDireccion={deca.expedidorDireccion || ''}
        cargadores={cargadores}
        transportistas={transportistas}
        vehiculos={vehiculos}
        conductores={conductores}
        currentCargadorEntityId={deca.cargadorEntityId}
        currentTransportistaEntityId={deca.transportistaEntityId}
        currentVehiculoId={deca.vehiculoId || ''}
        currentConductorId={deca.conductorId || ''}
        envios={deca.envios.map((e) => ({
          origen: e.origen,
          origenDireccion: e.origenDireccion || '',
          destino: e.destino,
          destinoDireccion: e.destinoDireccion || '',
          mercancia: e.mercancia,
          bultos: e.bultos != null ? String(e.bultos) : '',
          peso: e.pesoKg != null ? String(e.pesoKg) : '',
          volumen: e.volumenM3 != null ? String(e.volumenM3) : '',
          destinatarioNombre: e.destinatarioNombre || '',
          destinatarioNif: e.destinatarioNif || '',
          destinatarioDireccion: e.destinatarioDireccion || '',
          destinatarioSignatureType: e.destinatarioSignatureType || 'NONE',
          destinatarioSignerName: e.destinatarioSignerName || '',
          fechaRealizacion: toDateInput(e.fechaRealizacion),
          fechaPrevistaEntrega: toDateInput(e.fechaPrevistaEntrega),
          fechaEfectivaEntrega: toDateInput(e.fechaEfectivaEntrega),
        }))}
      />
    </div>
  );
}
