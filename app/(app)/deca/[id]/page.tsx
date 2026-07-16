import Link from 'next/link';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { buildPublicUrl, isPastRetentionWindow } from '@/lib/deca';
import { STATUS_LABELS, SIGNATURE_LABELS, type DecaStatus, type SignatureType } from '@/lib/constants';
import { disableDownloadAction, reactivateDownloadAction } from '@/app/actions/deca';

export const dynamic = 'force-dynamic';

type FieldDiff = { label: string; before: string; after: string };

function SignatureCard({
  title,
  type,
  signerName,
  signedAt,
  extra,
}: {
  title: string;
  type: string;
  signerName: string | null;
  signedAt: Date | null;
  extra?: string | null;
}) {
  return (
    <div className="border border-gray-200 rounded-md p-3">
      <p className="text-gray-500 text-xs">{title}</p>
      {extra && <p className="text-xs text-gray-400">{extra}</p>}
      <p className="text-sm font-medium">{SIGNATURE_LABELS[type as SignatureType]}</p>
      {type !== 'NONE' && (
        <>
          <p className="text-xs text-gray-500">Firmante: {signerName || '—'}</p>
          {signedAt && <p className="text-xs text-gray-400">{signedAt.toLocaleString('es-ES')}</p>}
        </>
      )}
    </div>
  );
}

export default async function DecaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const deca = await prisma.decaDocument.findUnique({
    where: { id },
    include: {
      cargadorEntity: true,
      transportistaEntity: true,
      vehiculo: true,
      conductor: true,
      envios: true,
      modificationLogs: { orderBy: { changedAt: 'desc' }, include: { changedByUser: true } },
      previousVersion: true,
      nextVersions: true,
    },
  });

  if (!deca) notFound();

  const publicUrl = buildPublicUrl(deca.docId);
  const qrDataUrl = await QRCode.toDataURL(publicUrl, { margin: 1, width: 220 });
  const pastWindow = isPastRetentionWindow(deca.serviceEndDate);
  const effectiveStatus: DecaStatus =
    deca.status === 'ACTIVE' && pastWindow ? 'DOWNLOAD_DISABLED' : (deca.status as DecaStatus);

  const canManage = session.role === 'ADMIN' || session.userId === deca.createdByUserId;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">DeCA {deca.docId}</h1>
          <p className="text-sm text-gray-500">
            Creado {deca.createdAt.toLocaleString('es-ES')} · Última modificación {deca.updatedAt.toLocaleString('es-ES')}
          </p>
        </div>
        <span
          className={`badge ${
            effectiveStatus === 'ACTIVE'
              ? 'bg-green-100 text-green-800'
              : effectiveStatus === 'SUPERSEDED'
                ? 'bg-gray-100 text-gray-700'
                : 'bg-red-100 text-red-800'
          }`}
        >
          {STATUS_LABELS[effectiveStatus]}
        </span>
      </div>

      <div className="card p-5 flex flex-col sm:flex-row gap-6 items-center">
        <img src={qrDataUrl} alt="QR del DeCA" className="w-40 h-40" />
        <div className="flex-1 space-y-2">
          <p className="text-sm text-gray-600">
            URL pública (sin login, acceso directo — según Tercero de la resolución):
          </p>
          <a
            href={`/d/${deca.docId}`}
            target="_blank"
            rel="noreferrer"
            className="text-deca-teal font-mono text-sm break-all hover:underline"
          >
            {publicUrl}
          </a>
          <div className="flex gap-2 pt-2">
            <a href={`/d/${deca.docId}`} target="_blank" rel="noreferrer" className="btn-primary">
              Ver / descargar PDF
            </a>
            {canManage && effectiveStatus !== 'SUPERSEDED' && (
              <Link href={`/deca/${deca.id}/modificar`} className="btn-secondary">
                Modificar
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">a) Cargador contractual</p>
          <p className="font-medium">{deca.cargadorEntity.name}</p>
          <p className="text-gray-500">NIF {deca.cargadorEntity.nif}</p>
        </div>
        <div>
          <p className="text-gray-500">b) Transportista efectivo</p>
          <p className="font-medium">{deca.transportistaEntity.name}</p>
          <p className="text-gray-500">NIF {deca.transportistaEntity.nif}</p>
        </div>
        <div>
          <p className="text-gray-500">Conductor</p>
          <p className="font-medium">{deca.conductorNombre}</p>
          <p className="text-gray-500">DNI {deca.conductorDni}</p>
        </div>
        <div>
          <p className="text-gray-500">Cuenta analítica / Proyecto</p>
          <p className="font-medium">{deca.cuentaAnalitica || '—'}</p>
        </div>
        <div>
          <p className="text-gray-500">f) Fecha</p>
          <p className="font-medium">{deca.fecha.toLocaleDateString('es-ES')}</p>
        </div>
        <div>
          <p className="text-gray-500">g) Matrícula / Remolque</p>
          <p className="font-medium">
            {deca.matricula}
            {deca.remolque ? ` / ${deca.remolque}` : ''}
          </p>
        </div>
        <div>
          <p className="text-gray-500">e) Autorización especial de circulación</p>
          <p className="font-medium">{deca.autorizacionEspecial || '—'}</p>
        </div>
        <div>
          <p className="text-gray-500">Fin de servicio (control de 7 días)</p>
          <p className="font-medium">
            {deca.serviceEndDate ? deca.serviceEndDate.toLocaleDateString('es-ES') : 'No indicado'}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Tamaño del PDF</p>
          <p className="font-medium">{(deca.pdfSizeBytes / 1024).toFixed(1)} KB</p>
        </div>
      </div>

      <div className="card p-5">
        <p className="text-gray-500 text-sm mb-3">Firmas</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SignatureCard
            title="Cargador contractual"
            type={deca.cargadorSignatureType}
            signerName={deca.cargadorSignerName}
            signedAt={deca.cargadorSignedAt}
          />
          <SignatureCard
            title="Transportista efectivo"
            type={deca.transportistaSignatureType}
            signerName={deca.transportistaSignerName}
            signedAt={deca.transportistaSignedAt}
          />
          <SignatureCard
            title="Destinatario"
            type={deca.destinatarioSignatureType}
            signerName={deca.destinatarioSignerName}
            signedAt={deca.destinatarioSignedAt}
            extra={deca.destinatarioNombre ? `${deca.destinatarioNombre}${deca.destinatarioNif ? ' (' + deca.destinatarioNif + ')' : ''}` : undefined}
          />
        </div>
      </div>

      <div className="card p-5">
        <p className="text-gray-500 text-sm mb-2">c) / d) Envíos</p>
        <table className="min-w-full text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="text-left py-1">Origen</th>
              <th className="text-left py-1">Destino</th>
              <th className="text-left py-1">Mercancía</th>
              <th className="text-left py-1">Bultos</th>
              <th className="text-left py-1">Kg / m³</th>
            </tr>
          </thead>
          <tbody>
            {deca.envios.map((e) => (
              <tr key={e.id} className="border-t border-gray-100">
                <td className="py-1">{e.origen}</td>
                <td className="py-1">{e.destino}</td>
                <td className="py-1">{e.mercancia}</td>
                <td className="py-1">{e.bultos ?? '—'}</td>
                <td className="py-1">
                  {e.pesoKg ?? '—'} / {e.volumenM3 ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(deca.observacionesCargador || deca.observacionesTransportista) && (
        <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">h) Observaciones — Cargador</p>
            <p>{deca.observacionesCargador || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">h) Observaciones — Transportista</p>
            <p>{deca.observacionesTransportista || '—'}</p>
          </div>
        </div>
      )}

      {(deca.previousVersion || deca.nextVersions.length > 0) && (
        <div className="card p-5 text-sm">
          <p className="text-gray-500 mb-2">Historial de versiones (generación de nuevo PDF/URL)</p>
          {deca.previousVersion && (
            <p>
              Versión anterior:{' '}
              <Link href={`/deca/${deca.previousVersion.id}`} className="text-deca-teal hover:underline">
                {deca.previousVersion.docId}
              </Link>
            </p>
          )}
          {deca.nextVersions.map((v) => (
            <p key={v.id}>
              Versión posterior:{' '}
              <Link href={`/deca/${v.id}`} className="text-deca-teal hover:underline">
                {v.docId}
              </Link>
            </p>
          ))}
        </div>
      )}

      {deca.modificationLogs.length > 0 && (
        <div className="card p-5 text-sm">
          <p className="text-gray-500 mb-2">
            Historial de modificaciones ({deca.modificationLogs.length}) — se incluye íntegro en el PDF descargado
          </p>
          <ul className="space-y-3">
            {deca.modificationLogs.map((log) => {
              const changes: FieldDiff[] = log.changesJson ? JSON.parse(log.changesJson) : [];
              return (
                <li key={log.id} className="border-t border-gray-100 pt-3 first:border-0 first:pt-0">
                  <span className="font-medium">
                    {log.type === 'UPDATE_SAME' ? 'Actualización del PDF existente' : 'Nueva versión (nuevo PDF/URL)'}
                  </span>{' '}
                  — {log.motivo}
                  <div className="text-gray-400 text-xs mb-1">
                    {log.changedAt.toLocaleString('es-ES')} por {log.changedByUser.name}
                  </div>
                  {changes.length > 0 && (
                    <ul className="text-xs text-gray-600 list-disc list-inside space-y-0.5">
                      {changes.map((c, i) => (
                        <li key={i}>
                          <strong>{c.label}:</strong> &quot;{c.before}&quot; → &quot;{c.after}&quot;
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {canManage && (
        <div className="card p-5 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {effectiveStatus === 'DOWNLOAD_DISABLED'
              ? 'La descarga pública está desactivada.'
              : 'Puedes desactivar manualmente la descarga pública (p. ej. tras confirmar la entrega).'}
          </div>
          {effectiveStatus === 'DOWNLOAD_DISABLED' ? (
            <form action={reactivateDownloadAction}>
              <input type="hidden" name="decaId" value={deca.id} />
              <button className="btn-secondary" type="submit">
                Reactivar descarga
              </button>
            </form>
          ) : (
            <form action={disableDownloadAction}>
              <input type="hidden" name="decaId" value={deca.id} />
              <button className="btn-danger" type="submit">
                Desactivar descarga
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
