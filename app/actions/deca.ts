'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth';
import { createDeca, modifyDeca, disableDownload, reactivateDownload } from '@/lib/deca';
import { prisma } from '@/lib/db';
import type { EnvioInput } from '@/lib/pdf';

export type FormState = { error?: string };

function parseDate(value: string): Date | null {
  return value ? new Date(value) : null;
}

function parseEnvios(formData: FormData): EnvioInput[] {
  const origenes = formData.getAll('envio_origen') as string[];
  const origenDirecciones = formData.getAll('envio_origenDireccion') as string[];
  const destinos = formData.getAll('envio_destino') as string[];
  const destinoDirecciones = formData.getAll('envio_destinoDireccion') as string[];
  const mercancias = formData.getAll('envio_mercancia') as string[];
  const bultos = formData.getAll('envio_bultos') as string[];
  const pesos = formData.getAll('envio_peso') as string[];
  const volumenes = formData.getAll('envio_volumen') as string[];
  const destNombres = formData.getAll('envio_destinatarioNombre') as string[];
  const destNifs = formData.getAll('envio_destinatarioNif') as string[];
  const destDirecciones = formData.getAll('envio_destinatarioDireccion') as string[];
  const destSigType = formData.getAll('envio_destinatarioSignatureType') as string[];
  const destSigName = formData.getAll('envio_destinatarioSignerName') as string[];
  const fechaRealizacion = formData.getAll('envio_fechaRealizacion') as string[];
  const fechaPrevista = formData.getAll('envio_fechaPrevistaEntrega') as string[];
  const fechaEfectiva = formData.getAll('envio_fechaEfectivaEntrega') as string[];

  const envios: EnvioInput[] = [];
  for (let i = 0; i < origenes.length; i++) {
    if (!origenes[i]?.trim() && !destinos[i]?.trim() && !mercancias[i]?.trim()) continue;
    const sigType = (destSigType[i] || 'NONE') as 'NONE' | 'ADVANCED' | 'QUALIFIED';
    envios.push({
      origen: origenes[i]?.trim() || '',
      origenDireccion: origenDirecciones[i]?.trim() || null,
      destino: destinos[i]?.trim() || '',
      destinoDireccion: destinoDirecciones[i]?.trim() || null,
      mercancia: mercancias[i]?.trim() || '',
      bultos: bultos[i] ? Number(bultos[i]) : null,
      pesoKg: pesos[i] ? Number(pesos[i]) : null,
      volumenM3: volumenes[i] ? Number(volumenes[i]) : null,
      destinatarioNombre: destNombres[i]?.trim() || null,
      destinatarioNif: destNifs[i]?.trim() || null,
      destinatarioDireccion: destDirecciones[i]?.trim() || null,
      destinatarioSignature: { type: sigType, signerName: destSigName[i]?.trim() || null },
      fechaRealizacion: parseDate(fechaRealizacion[i]),
      fechaPrevistaEntrega: parseDate(fechaPrevista[i]),
      fechaEfectivaEntrega: parseDate(fechaEfectiva[i]),
    });
  }
  return envios;
}

type SignatureFields = { type: 'NONE' | 'ADVANCED' | 'QUALIFIED'; signerName?: string | null };

function parseSignature(formData: FormData, prefix: string): SignatureFields {
  const type = String(formData.get(`${prefix}SignatureType`) || 'NONE') as SignatureFields['type'];
  const signerName = String(formData.get(`${prefix}SignerName`) || '').trim() || null;
  return { type, signerName };
}

export async function createDecaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();

  const cargadorEntityId = String(formData.get('cargadorEntityId') || '');
  const transportistaEntityId = String(formData.get('transportistaEntityId') || '');
  const vehiculoId = String(formData.get('vehiculoId') || '');
  const conductorId = String(formData.get('conductorId') || '');
  const envios = parseEnvios(formData);

  if (!cargadorEntityId || !transportistaEntityId) {
    return { error: 'Selecciona cargador contractual y transportista efectivo.' };
  }
  if (!vehiculoId || !conductorId) {
    return { error: 'Selecciona un vehículo y un conductor de la flota del transportista efectivo.' };
  }
  if (envios.length === 0) {
    return { error: 'Añade al menos un envío (origen, destino y mercancía).' };
  }
  for (const e of envios) {
    if (!e.origen || !e.destino || !e.mercancia) {
      return { error: 'Cada envío necesita origen, destino y naturaleza de la mercancía.' };
    }
    if (e.destinatarioSignature && e.destinatarioSignature.type !== 'NONE' && !e.destinatarioSignature.signerName) {
      return { error: 'Indica el nombre del firmante del destinatario en cada envío firmado.' };
    }
  }

  const cargadorSignature = parseSignature(formData, 'cargador');
  const transportistaSignature = parseSignature(formData, 'transportista');
  for (const [label, sig] of [
    ['cargador', cargadorSignature],
    ['transportista', transportistaSignature],
  ] as const) {
    if (sig.type !== 'NONE' && !sig.signerName) {
      return { error: `Indica el nombre del firmante de la firma del ${label}.` };
    }
  }

  const serviceEndDateRaw = String(formData.get('serviceEndDate') || '');
  const fechasRealizacion = envios.map((e) => e.fechaRealizacion).filter((d): d is Date => !!d);
  const serviceStartDate = fechasRealizacion.length
    ? new Date(Math.min(...fechasRealizacion.map((d) => d.getTime())))
    : null;

  let deca;
  try {
    deca = await createDeca({
      cargadorEntityId,
      transportistaEntityId,
      expedidorNombre: String(formData.get('expedidorNombre') || '').trim() || null,
      expedidorNif: String(formData.get('expedidorNif') || '').trim() || null,
      expedidorDireccion: String(formData.get('expedidorDireccion') || '').trim() || null,
      cuentaAnalitica: String(formData.get('cuentaAnalitica') || '').trim() || null,
      conductorId,
      vehiculoId,
      envios,
      autorizacionEspecial: String(formData.get('autorizacionEspecial') || '').trim() || null,
      observacionesCargador: String(formData.get('observacionesCargador') || '').trim() || null,
      observacionesTransportista: String(formData.get('observacionesTransportista') || '').trim() || null,
      cargadorSignature,
      transportistaSignature,
      serviceStartDate,
      serviceEndDate: serviceEndDateRaw ? new Date(serviceEndDateRaw) : null,
      createdByUserId: session.userId,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'No se pudo crear el DeCA.' };
  }

  revalidatePath('/dashboard');
  redirect(`/deca/${deca.id}`);
}

export async function modifyDecaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  const decaId = String(formData.get('decaId') || '');
  const type = String(formData.get('type') || 'UPDATE_SAME') as 'UPDATE_SAME' | 'NEW_VERSION';
  const motivo = String(formData.get('motivo') || '').trim();

  if (!motivo) {
    return { error: 'Indica el motivo de la modificación (obligatorio para conservar trazabilidad).' };
  }

  const envios = parseEnvios(formData);
  const serviceEndDateRaw = String(formData.get('serviceEndDate') || '');
  const cargadorEntityId = String(formData.get('cargadorEntityId') || '') || undefined;
  const transportistaEntityId = String(formData.get('transportistaEntityId') || '') || undefined;
  const vehiculoId = String(formData.get('vehiculoId') || '') || undefined;
  const conductorId = String(formData.get('conductorId') || '') || undefined;

  let updated;
  try {
    updated = await modifyDeca({
      decaId,
      type,
      motivo,
      changedByUserId: session.userId,
      cargadorEntityId,
      transportistaEntityId,
      vehiculoId,
      conductorId,
      expedidorNombre: formData.has('expedidorNombre') ? String(formData.get('expedidorNombre') || '').trim() || null : undefined,
      expedidorNif: formData.has('expedidorNif') ? String(formData.get('expedidorNif') || '').trim() || null : undefined,
      expedidorDireccion: formData.has('expedidorDireccion')
        ? String(formData.get('expedidorDireccion') || '').trim() || null
        : undefined,
      cuentaAnalitica: formData.has('cuentaAnalitica') ? String(formData.get('cuentaAnalitica') || '').trim() || null : undefined,
      envios: envios.length ? envios : undefined,
      autorizacionEspecial: String(formData.get('autorizacionEspecial') || '').trim() || null,
      observacionesCargador: String(formData.get('observacionesCargador') || '').trim() || null,
      observacionesTransportista: String(formData.get('observacionesTransportista') || '').trim() || null,
      serviceEndDate: serviceEndDateRaw ? new Date(serviceEndDateRaw) : undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'No se pudo modificar el DeCA.' };
  }

  revalidatePath('/dashboard');
  redirect(`/deca/${updated.id}`);
}

export async function disableDownloadAction(formData: FormData) {
  await requireSession();
  const decaId = String(formData.get('decaId') || '');
  await disableDownload(decaId);
  revalidatePath(`/deca/${decaId}`);
}

export async function reactivateDownloadAction(formData: FormData) {
  await requireSession();
  const decaId = String(formData.get('decaId') || '');
  await reactivateDownload(decaId);
  revalidatePath(`/deca/${decaId}`);
}

export async function listEntitiesAction(type: 'CARGADOR' | 'TRANSPORTISTA') {
  await requireSession();
  return prisma.entity.findMany({ where: { type }, orderBy: { name: 'asc' } });
}
