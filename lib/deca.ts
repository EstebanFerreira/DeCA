import { customAlphabet } from 'nanoid';
import { prisma } from './db';
import { generateDecaPdf, type EnvioInput, type ModificationEntryInput, type SignatureBlockInput } from './pdf';
import { savePdf } from './storage';
import { DAYS_URL_MUST_STAY_ACTIVE, MAX_PDF_SIZE_BYTES } from './constants';

// Alfabeto sin caracteres ambiguos, similar al ejemplo del Ministerio (ewRWQE, pewTldoE...).
const nanoid = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789', 10);

export function generateDocId(): string {
  return nanoid();
}

export function buildPublicUrl(docId: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/d/${docId}`;
}

type SignatureInput = { type: 'NONE' | 'ADVANCED' | 'QUALIFIED'; signerName?: string | null };

export type CreateDecaParams = {
  cargadorEntityId: string;
  transportistaEntityId: string;
  expedidorNombre?: string | null;
  expedidorNif?: string | null;
  expedidorDireccion?: string | null;
  cuentaAnalitica?: string | null;
  conductorId: string;
  vehiculoId: string;
  envios: EnvioInput[];
  autorizacionEspecial?: string | null;
  observacionesCargador?: string | null;
  observacionesTransportista?: string | null;
  cargadorSignature: SignatureInput;
  transportistaSignature: SignatureInput;
  serviceStartDate?: Date | null;
  serviceEndDate?: Date | null;
  createdByUserId: string;
};

async function assertPdfSize(bytes: Uint8Array) {
  if (bytes.byteLength > MAX_PDF_SIZE_BYTES) {
    throw new Error(
      `El PDF generado (${(bytes.byteLength / (1024 * 1024)).toFixed(2)}MB) supera el máximo de 5MB permitido por la resolución DeCA.`
    );
  }
}

function resolveSignedAt(sig: SignatureInput, previousSignedAt?: Date | null): Date | null {
  if (sig.type === 'NONE') return null;
  return previousSignedAt ?? new Date();
}

function toSignatureBlock(type: string, signerName: string | null, signedAt: Date | null): SignatureBlockInput {
  return { type: type as SignatureBlockInput['type'], signerName, signedAt };
}

function envioToPrismaCreate(e: EnvioInput) {
  return {
    origen: e.origen,
    origenDireccion: e.origenDireccion || null,
    destino: e.destino,
    destinoDireccion: e.destinoDireccion || null,
    mercancia: e.mercancia,
    bultos: e.bultos ?? null,
    pesoKg: e.pesoKg ?? null,
    volumenM3: e.volumenM3 ?? null,
    destinatarioNombre: e.destinatarioNombre || null,
    destinatarioNif: e.destinatarioNif || null,
    destinatarioDireccion: e.destinatarioDireccion || null,
    destinatarioSignatureType: e.destinatarioSignature?.type || 'NONE',
    destinatarioSignerName: e.destinatarioSignature?.type && e.destinatarioSignature.type !== 'NONE' ? e.destinatarioSignature.signerName || null : null,
    destinatarioSignedAt:
      e.destinatarioSignature?.type && e.destinatarioSignature.type !== 'NONE'
        ? e.destinatarioSignature.signedAt || new Date()
        : null,
    fechaRealizacion: e.fechaRealizacion || null,
    fechaPrevistaEntrega: e.fechaPrevistaEntrega || null,
    fechaEfectivaEntrega: e.fechaEfectivaEntrega || null,
  };
}

function envioFromPrisma(e: {
  origen: string;
  origenDireccion: string | null;
  destino: string;
  destinoDireccion: string | null;
  mercancia: string;
  bultos: number | null;
  pesoKg: number | null;
  volumenM3: number | null;
  destinatarioNombre: string | null;
  destinatarioNif: string | null;
  destinatarioDireccion: string | null;
  destinatarioSignatureType: string;
  destinatarioSignerName: string | null;
  destinatarioSignedAt: Date | null;
  fechaRealizacion: Date | null;
  fechaPrevistaEntrega: Date | null;
  fechaEfectivaEntrega: Date | null;
}): EnvioInput {
  return {
    origen: e.origen,
    origenDireccion: e.origenDireccion,
    destino: e.destino,
    destinoDireccion: e.destinoDireccion,
    mercancia: e.mercancia,
    bultos: e.bultos,
    pesoKg: e.pesoKg,
    volumenM3: e.volumenM3,
    destinatarioNombre: e.destinatarioNombre,
    destinatarioNif: e.destinatarioNif,
    destinatarioDireccion: e.destinatarioDireccion,
    destinatarioSignature: toSignatureBlock(e.destinatarioSignatureType, e.destinatarioSignerName, e.destinatarioSignedAt),
    fechaRealizacion: e.fechaRealizacion,
    fechaPrevistaEntrega: e.fechaPrevistaEntrega,
    fechaEfectivaEntrega: e.fechaEfectivaEntrega,
  };
}

export async function createDeca(params: CreateDecaParams) {
  const [cargador, transportista, vehiculo, conductor] = await Promise.all([
    prisma.entity.findUniqueOrThrow({ where: { id: params.cargadorEntityId } }),
    prisma.entity.findUniqueOrThrow({ where: { id: params.transportistaEntityId } }),
    prisma.vehiculo.findUniqueOrThrow({ where: { id: params.vehiculoId } }),
    prisma.conductor.findUniqueOrThrow({ where: { id: params.conductorId } }),
  ]);

  const docId = generateDocId();
  const publicUrl = buildPublicUrl(docId);
  const now = new Date();

  const cargadorSignedAt = resolveSignedAt(params.cargadorSignature);
  const transportistaSignedAt = resolveSignedAt(params.transportistaSignature);

  const pdfBytes = await generateDecaPdf({
    docId,
    publicUrl,
    cargador: { name: cargador.name, nif: cargador.nif, domicilio: cargador.domicilio },
    transportista: { name: transportista.name, nif: transportista.nif },
    expedidor: { nombre: params.expedidorNombre, nif: params.expedidorNif, direccion: params.expedidorDireccion },
    cuentaAnalitica: params.cuentaAnalitica,
    conductorNombre: conductor.nombre,
    conductorDni: conductor.dni,
    envios: params.envios,
    matricula: vehiculo.matricula,
    remolque: vehiculo.remolque,
    autorizacionEspecial: params.autorizacionEspecial,
    observacionesCargador: params.observacionesCargador,
    observacionesTransportista: params.observacionesTransportista,
    cargadorSignature: toSignatureBlock(params.cargadorSignature.type, params.cargadorSignature.signerName ?? null, cargadorSignedAt),
    transportistaSignature: toSignatureBlock(
      params.transportistaSignature.type,
      params.transportistaSignature.signerName ?? null,
      transportistaSignedAt
    ),
    createdAt: now,
    updatedAt: now,
    modificationHistory: [],
    version: 1,
  });

  await assertPdfSize(pdfBytes);
  const { filePath, size } = await savePdf(docId, pdfBytes);

  return prisma.decaDocument.create({
    data: {
      docId,
      cargadorEntityId: params.cargadorEntityId,
      transportistaEntityId: params.transportistaEntityId,
      expedidorNombre: params.expedidorNombre || null,
      expedidorNif: params.expedidorNif || null,
      expedidorDireccion: params.expedidorDireccion || null,
      cuentaAnalitica: params.cuentaAnalitica || null,
      conductorId: params.conductorId,
      conductorNombre: conductor.nombre,
      conductorDni: conductor.dni,
      autorizacionEspecial: params.autorizacionEspecial || null,
      vehiculoId: params.vehiculoId,
      matricula: vehiculo.matricula,
      remolque: vehiculo.remolque,
      observacionesCargador: params.observacionesCargador || null,
      observacionesTransportista: params.observacionesTransportista || null,
      cargadorSignatureType: params.cargadorSignature.type,
      cargadorSignerName: params.cargadorSignature.type !== 'NONE' ? params.cargadorSignature.signerName || null : null,
      cargadorSignedAt,
      transportistaSignatureType: params.transportistaSignature.type,
      transportistaSignerName:
        params.transportistaSignature.type !== 'NONE' ? params.transportistaSignature.signerName || null : null,
      transportistaSignedAt,
      serviceStartDate: params.serviceStartDate || null,
      serviceEndDate: params.serviceEndDate || null,
      status: 'ACTIVE',
      pdfPath: filePath,
      pdfSizeBytes: size,
      createdByUserId: params.createdByUserId,
      envios: {
        create: params.envios.map(envioToPrismaCreate),
      },
    },
    include: { envios: true, cargadorEntity: true, transportistaEntity: true, vehiculo: true, conductor: true },
  });
}

export type ModifyDecaParams = {
  decaId: string;
  type: 'UPDATE_SAME' | 'NEW_VERSION';
  motivo: string;
  changedByUserId: string;
  // Campos editables (opcional: si no se pasan, se mantienen los actuales)
  cargadorEntityId?: string;
  transportistaEntityId?: string;
  expedidorNombre?: string | null;
  expedidorNif?: string | null;
  expedidorDireccion?: string | null;
  cuentaAnalitica?: string | null;
  conductorId?: string;
  vehiculoId?: string;
  envios?: EnvioInput[];
  autorizacionEspecial?: string | null;
  observacionesCargador?: string | null;
  observacionesTransportista?: string | null;
  serviceEndDate?: Date | null;
};

type FieldDiff = { label: string; before: string; after: string };

function diffField(label: string, before: string | null | undefined, after: string | null | undefined): FieldDiff | null {
  const b = (before ?? '—').toString().trim() || '—';
  const a = (after ?? '—').toString().trim() || '—';
  if (b === a) return null;
  return { label, before: b, after: a };
}

function envioSummary(e: { origen: string; destino: string; mercancia: string; destinatarioNombre?: string | null }): string {
  const dest = e.destinatarioNombre ? ` [${e.destinatarioNombre}]` : '';
  return `${e.origen} -> ${e.destino} (${e.mercancia})${dest}`;
}

/**
 * Quinto de la resolución DeCA: modificación de datos durante el servicio.
 * - UPDATE_SAME: se actualiza el PDF existente, conservando los datos antiguos y el motivo.
 *   Mantiene la misma URL y el mismo QR (mismo docId).
 * - NEW_VERSION: se genera un nuevo PDF con nueva URL y nuevo QR (nuevo docId), enlazado
 *   como versión siguiente del documento anterior, que queda marcado como SUPERSEDED.
 *
 * En ambos casos se calcula un diff campo a campo (incluyendo cambios de cargador
 * contractual, transportista efectivo, vehículo/matrícula y conductor) que se guarda en
 * ModificationLog y se incluye íntegro en el PDF, junto con el resto del historial de
 * modificaciones anteriores — no solo la del último cambio.
 */
export async function modifyDeca(params: ModifyDecaParams) {
  const current = await prisma.decaDocument.findUniqueOrThrow({
    where: { id: params.decaId },
    include: {
      envios: true,
      cargadorEntity: true,
      transportistaEntity: true,
      vehiculo: true,
      conductor: true,
      modificationLogs: { orderBy: { changedAt: 'asc' }, include: { changedByUser: true } },
    },
  });

  const [newCargador, newTransportista, newVehiculo, newConductor, changedByUser] = await Promise.all([
    params.cargadorEntityId ? prisma.entity.findUniqueOrThrow({ where: { id: params.cargadorEntityId } }) : null,
    params.transportistaEntityId
      ? prisma.entity.findUniqueOrThrow({ where: { id: params.transportistaEntityId } })
      : null,
    params.vehiculoId ? prisma.vehiculo.findUniqueOrThrow({ where: { id: params.vehiculoId } }) : null,
    params.conductorId ? prisma.conductor.findUniqueOrThrow({ where: { id: params.conductorId } }) : null,
    prisma.user.findUniqueOrThrow({ where: { id: params.changedByUserId } }),
  ]);

  const currentEnviosInput: EnvioInput[] = current.envios.map(envioFromPrisma);

  const merged = {
    cargadorEntityId: params.cargadorEntityId ?? current.cargadorEntityId,
    cargadorEntity: newCargador ?? current.cargadorEntity,
    transportistaEntityId: params.transportistaEntityId ?? current.transportistaEntityId,
    transportistaEntity: newTransportista ?? current.transportistaEntity,
    expedidorNombre: params.expedidorNombre !== undefined ? params.expedidorNombre : current.expedidorNombre,
    expedidorNif: params.expedidorNif !== undefined ? params.expedidorNif : current.expedidorNif,
    expedidorDireccion: params.expedidorDireccion !== undefined ? params.expedidorDireccion : current.expedidorDireccion,
    cuentaAnalitica: params.cuentaAnalitica !== undefined ? params.cuentaAnalitica : current.cuentaAnalitica,
    conductorId: params.conductorId ?? current.conductorId,
    conductorNombre: newConductor?.nombre ?? current.conductorNombre,
    conductorDni: newConductor?.dni ?? current.conductorDni,
    vehiculoId: params.vehiculoId ?? current.vehiculoId,
    matricula: newVehiculo?.matricula ?? current.matricula,
    remolque: newVehiculo ? newVehiculo.remolque : current.remolque,
    envios: params.envios ?? currentEnviosInput,
    autorizacionEspecial:
      params.autorizacionEspecial !== undefined ? params.autorizacionEspecial : current.autorizacionEspecial,
    observacionesCargador:
      params.observacionesCargador !== undefined ? params.observacionesCargador : current.observacionesCargador,
    observacionesTransportista:
      params.observacionesTransportista !== undefined
        ? params.observacionesTransportista
        : current.observacionesTransportista,
    serviceEndDate: params.serviceEndDate !== undefined ? params.serviceEndDate : current.serviceEndDate,
  };

  // Diff campo a campo — incluye explícitamente el cambio de matrícula/remolque (sustituye
  // al antiguo campo libre "Cambio de vehículo": ahora queda registrado automáticamente).
  const changes: FieldDiff[] = [
    diffField('Cargador contractual', current.cargadorEntity.name, merged.cargadorEntity.name),
    diffField('Transportista efectivo', current.transportistaEntity.name, merged.transportistaEntity.name),
    diffField('Matrícula', current.matricula, merged.matricula),
    diffField('Remolque', current.remolque, merged.remolque),
    diffField('Conductor', current.conductorNombre, merged.conductorNombre),
    diffField('Expedidor', current.expedidorNombre, merged.expedidorNombre),
    diffField('Cuenta analítica / Proyecto', current.cuentaAnalitica, merged.cuentaAnalitica),
    diffField('Autorización especial', current.autorizacionEspecial, merged.autorizacionEspecial),
    diffField('Observaciones cargador', current.observacionesCargador, merged.observacionesCargador),
    diffField('Observaciones transportista', current.observacionesTransportista, merged.observacionesTransportista),
  ].filter((c): c is FieldDiff => c !== null);

  if (params.envios) {
    const before = currentEnviosInput.map(envioSummary).join('; ') || '—';
    const after = merged.envios.map(envioSummary).join('; ') || '—';
    if (before !== after) changes.push({ label: 'Envíos', before, after });
  }

  function buildHistoryForPdf(newEntry?: { motivo: string; type: 'UPDATE_SAME' | 'NEW_VERSION'; changedAt: Date }): ModificationEntryInput[] {
    const history: ModificationEntryInput[] = current.modificationLogs.map((log) => ({
      type: log.type as 'UPDATE_SAME' | 'NEW_VERSION',
      motivo: log.motivo,
      changedAt: log.changedAt,
      changedByName: log.changedByUser.name,
      changes: log.changesJson ? (JSON.parse(log.changesJson) as FieldDiff[]) : [],
    }));
    if (newEntry) {
      history.push({
        type: newEntry.type,
        motivo: newEntry.motivo,
        changedAt: newEntry.changedAt,
        changedByName: changedByUser.name,
        changes,
      });
    }
    return history;
  }

  const now = new Date();

  if (params.type === 'UPDATE_SAME') {
    const publicUrl = buildPublicUrl(current.docId);
    const pdfBytes = await generateDecaPdf({
      docId: current.docId,
      publicUrl,
      cargador: {
        name: merged.cargadorEntity.name,
        nif: merged.cargadorEntity.nif,
        domicilio: merged.cargadorEntity.domicilio,
      },
      transportista: { name: merged.transportistaEntity.name, nif: merged.transportistaEntity.nif },
      expedidor: { nombre: merged.expedidorNombre, nif: merged.expedidorNif, direccion: merged.expedidorDireccion },
      cuentaAnalitica: merged.cuentaAnalitica,
      conductorNombre: merged.conductorNombre,
      conductorDni: merged.conductorDni,
      envios: merged.envios,
      matricula: merged.matricula,
      remolque: merged.remolque,
      autorizacionEspecial: merged.autorizacionEspecial,
      observacionesCargador: merged.observacionesCargador,
      observacionesTransportista: merged.observacionesTransportista,
      cargadorSignature: toSignatureBlock(current.cargadorSignatureType, current.cargadorSignerName, current.cargadorSignedAt),
      transportistaSignature: toSignatureBlock(
        current.transportistaSignatureType,
        current.transportistaSignerName,
        current.transportistaSignedAt
      ),
      createdAt: current.createdAt,
      updatedAt: now,
      modificationHistory: buildHistoryForPdf({ motivo: params.motivo, type: 'UPDATE_SAME', changedAt: now }),
      version: current.modificationLogs.length + 2,
    });
    await assertPdfSize(pdfBytes);
    const { filePath, size } = await savePdf(current.docId, pdfBytes);

    const updated = await prisma.decaDocument.update({
      where: { id: current.id },
      data: {
        cargadorEntityId: merged.cargadorEntityId,
        transportistaEntityId: merged.transportistaEntityId,
        expedidorNombre: merged.expedidorNombre,
        expedidorNif: merged.expedidorNif,
        expedidorDireccion: merged.expedidorDireccion,
        cuentaAnalitica: merged.cuentaAnalitica,
        conductorId: merged.conductorId,
        conductorNombre: merged.conductorNombre,
        conductorDni: merged.conductorDni,
        vehiculoId: merged.vehiculoId,
        matricula: merged.matricula,
        remolque: merged.remolque,
        autorizacionEspecial: merged.autorizacionEspecial,
        observacionesCargador: merged.observacionesCargador,
        observacionesTransportista: merged.observacionesTransportista,
        serviceEndDate: merged.serviceEndDate,
        pdfPath: filePath,
        pdfSizeBytes: size,
        envios: {
          deleteMany: {},
          create: merged.envios.map(envioToPrismaCreate),
        },
      },
      include: { envios: true },
    });

    await prisma.modificationLog.create({
      data: {
        decaDocumentId: current.id,
        type: 'UPDATE_SAME',
        motivo: params.motivo,
        changesJson: JSON.stringify(changes),
        changedByUserId: params.changedByUserId,
      },
    });

    return updated;
  }

  // NEW_VERSION: nuevo docId, nueva URL, nuevo QR. El documento anterior queda SUPERSEDED.
  // El historial completo (incluidas las modificaciones de versiones anteriores) se
  // traslada al nuevo PDF para no perder trazabilidad.
  const docId = generateDocId();
  const publicUrl = buildPublicUrl(docId);
  const history = buildHistoryForPdf({ motivo: params.motivo, type: 'NEW_VERSION', changedAt: now });

  const cargadorSignedAt = current.cargadorSignedAt;
  const transportistaSignedAt = current.transportistaSignedAt;

  const pdfBytes = await generateDecaPdf({
    docId,
    publicUrl,
    cargador: { name: merged.cargadorEntity.name, nif: merged.cargadorEntity.nif, domicilio: merged.cargadorEntity.domicilio },
    transportista: { name: merged.transportistaEntity.name, nif: merged.transportistaEntity.nif },
    expedidor: { nombre: merged.expedidorNombre, nif: merged.expedidorNif, direccion: merged.expedidorDireccion },
    cuentaAnalitica: merged.cuentaAnalitica,
    conductorNombre: merged.conductorNombre,
    conductorDni: merged.conductorDni,
    envios: merged.envios,
    matricula: merged.matricula,
    remolque: merged.remolque,
    autorizacionEspecial: merged.autorizacionEspecial,
    observacionesCargador: merged.observacionesCargador,
    observacionesTransportista: merged.observacionesTransportista,
    cargadorSignature: toSignatureBlock(current.cargadorSignatureType, current.cargadorSignerName, cargadorSignedAt),
    transportistaSignature: toSignatureBlock(current.transportistaSignatureType, current.transportistaSignerName, transportistaSignedAt),
    createdAt: now,
    updatedAt: now,
    modificationHistory: history,
    version: 1,
  });
  await assertPdfSize(pdfBytes);
  const { filePath, size } = await savePdf(docId, pdfBytes);

  const newDoc = await prisma.decaDocument.create({
    data: {
      docId,
      cargadorEntityId: merged.cargadorEntityId,
      transportistaEntityId: merged.transportistaEntityId,
      expedidorNombre: merged.expedidorNombre,
      expedidorNif: merged.expedidorNif,
      expedidorDireccion: merged.expedidorDireccion,
      cuentaAnalitica: merged.cuentaAnalitica,
      conductorId: merged.conductorId,
      conductorNombre: merged.conductorNombre,
      conductorDni: merged.conductorDni,
      vehiculoId: merged.vehiculoId,
      matricula: merged.matricula,
      remolque: merged.remolque,
      autorizacionEspecial: merged.autorizacionEspecial,
      observacionesCargador: merged.observacionesCargador,
      observacionesTransportista: merged.observacionesTransportista,
      cargadorSignatureType: current.cargadorSignatureType,
      cargadorSignerName: current.cargadorSignerName,
      cargadorSignedAt,
      transportistaSignatureType: current.transportistaSignatureType,
      transportistaSignerName: current.transportistaSignerName,
      transportistaSignedAt,
      serviceStartDate: current.serviceStartDate,
      serviceEndDate: merged.serviceEndDate,
      status: 'ACTIVE',
      pdfPath: filePath,
      pdfSizeBytes: size,
      previousVersionId: current.id,
      createdByUserId: params.changedByUserId,
      envios: {
        create: merged.envios.map(envioToPrismaCreate),
      },
    },
  });

  await prisma.decaDocument.update({
    where: { id: current.id },
    data: { status: 'SUPERSEDED' },
  });

  await prisma.modificationLog.create({
    data: {
      decaDocumentId: current.id,
      type: 'NEW_VERSION',
      motivo: params.motivo,
      changesJson: JSON.stringify(changes),
      changedByUserId: params.changedByUserId,
    },
  });

  return newDoc;
}

/**
 * Tercero de la resolución: transcurridos 7 días naturales tras la finalización del
 * servicio, se puede desactivar la descarga. Esta función determina si, según la fecha
 * de fin de servicio, procede desactivar automáticamente el documento.
 */
export function isPastRetentionWindow(serviceEndDate: Date | null): boolean {
  if (!serviceEndDate) return false;
  const deadline = new Date(serviceEndDate);
  deadline.setDate(deadline.getDate() + DAYS_URL_MUST_STAY_ACTIVE);
  return new Date() > deadline;
}

export async function disableDownload(decaId: string) {
  return prisma.decaDocument.update({
    where: { id: decaId },
    data: { status: 'DOWNLOAD_DISABLED', disabledAt: new Date() },
  });
}

export async function reactivateDownload(decaId: string) {
  return prisma.decaDocument.update({
    where: { id: decaId },
    data: { status: 'ACTIVE', disabledAt: null },
  });
}
