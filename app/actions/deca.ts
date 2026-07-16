'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth';
import { createDeca, modifyDeca, disableDownload, reactivateDownload } from '@/lib/deca';
import { prisma } from '@/lib/db';
import type { EnvioInput } from '@/lib/pdf';

export type FormState = { error?: string };

function parseEnvios(formData: FormData): EnvioInput[] {
  const origenes = formData.getAll('envio_origen') as string[];
  const destinos = formData.getAll('envio_destino') as string[];
  const mercancias = formData.getAll('envio_mercancia') as string[];
  const bultos = formData.getAll('envio_bultos') as string[];
  const pesos = formData.getAll('envio_peso') as string[];
  const volumenes = formData.getAll('envio_volumen') as string[];

  const envios: EnvioInput[] = [];
  for (let i = 0; i < origenes.length; i++) {
    if (!origenes[i]?.trim() && !destinos[i]?.trim() && !mercancias[i]?.trim()) continue;
    envios.push({
      origen: origenes[i]?.trim() || '',
      destino: destinos[i]?.trim() || '',
      mercancia: mercancias[i]?.trim() || '',
      bultos: bultos[i] ? Number(bultos[i]) : null,
      pesoKg: pesos[i] ? Number(pesos[i]) : null,
      volumenM3: volumenes[i] ? Number(volumenes[i]) : null,
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
  const fecha = String(formData.get('fecha') || '');
  const envios = parseEnvios(formData);

  if (!cargadorEntityId || !transportistaEntityId) {
    return { error: 'Selecciona cargador contractual y transportista efectivo.' };
  }
  if (!vehiculoId || !conductorId) {
    return { error: 'Selecciona un vehículo y un conductor de la flota del transportista efectivo.' };
  }
  if (!fecha) {
    return { error: 'La fecha es obligatoria.' };
  }
  if (envios.length === 0) {
    return { error: 'Añade al menos un envío (origen, destino y mercancía).' };
  }
  for (const e of envios) {
    if (!e.origen || !e.destino || !e.mercancia) {
      return { error: 'Cada envío necesita origen, destino y naturaleza de la mercancía.' };
    }
  }

  const cargadorSignature = parseSignature(formData, 'cargador');
  const transportistaSignature = parseSignature(formData, 'transportista');
  const destinatarioSignature = parseSignature(formData, 'destinatario');
  for (const [label, sig] of [
    ['cargador', cargadorSignature],
    ['transportista', transportistaSignature],
    ['destinatario', destinatarioSignature],
  ] as const) {
    if (sig.type !== 'NONE' && !sig.signerName) {
      return { error: `Indica el nombre del firmante de la firma del ${label}.` };
    }
  }

  const serviceEndDateRaw = String(formData.get('serviceEndDate') || '');

  let deca;
  try {
    deca = await createDeca({
      cargadorEntityId,
      transportistaEntityId,
      cuentaAnalitica: String(formData.get('cuentaAnalitica') || '').trim() || null,
      conductorId,
      vehiculoId,
      envios,
      fecha: new Date(fecha),
      autorizacionEspecial: String(formData.get('autorizacionEspecial') || '').trim() || null,
      observacionesCargador: String(formData.get('observacionesCargador') || '').trim() || null,
      observacionesTransportista: String(formData.get('observacionesTransportista') || '').trim() || null,
      cargadorSignature,
      transportistaSignature,
      destinatarioNombre: String(formData.get('destinatarioNombre') || '').trim() || null,
      destinatarioNif: String(formData.get('destinatarioNif') || '').trim() || null,
      destinatarioSignature,
      serviceStartDate: new Date(fecha),
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
  const fecha = String(formData.get('fecha') || '');
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
      cuentaAnalitica: formData.has('cuentaAnalitica') ? String(formData.get('cuentaAnalitica') || '').trim() || null : undefined,
      envios: envios.length ? envios : undefined,
      fecha: fecha ? new Date(fecha) : undefined,
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
