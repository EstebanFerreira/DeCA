'use server';

import { revalidatePath } from 'next/cache';
import { requireRole, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/db';

export type FormState = { error?: string; ok?: boolean };

export async function createEntityAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole('ADMIN');

  const type = String(formData.get('type') || '');
  const name = String(formData.get('name') || '').trim();
  const nif = String(formData.get('nif') || '').trim();
  const domicilio = String(formData.get('domicilio') || '').trim() || null;

  if (!['CARGADOR', 'TRANSPORTISTA'].includes(type) || !name || !nif) {
    return { error: 'Completa tipo, nombre y NIF de la entidad.' };
  }

  await prisma.entity.create({ data: { type, name, nif, domicilio } });
  revalidatePath('/admin/usuarios');
  return { ok: true };
}

export async function createUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole('ADMIN');

  const email = String(formData.get('email') || '').trim().toLowerCase();
  const name = String(formData.get('name') || '').trim();
  const password = String(formData.get('password') || '');
  const role = String(formData.get('role') || '');
  const entityId = String(formData.get('entityId') || '') || null;

  if (!email || !name || !password || !['ADMIN', 'CARGADOR', 'TRANSPORTISTA'].includes(role)) {
    return { error: 'Completa todos los campos obligatorios.' };
  }
  if (password.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' };
  }
  if (role !== 'ADMIN' && !entityId) {
    return { error: 'Los usuarios cargador/transportista deben estar asociados a una entidad.' };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: 'Ya existe un usuario con ese email.' };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: { email, name, passwordHash, role, entityId: role === 'ADMIN' ? null : entityId },
  });

  revalidatePath('/admin/usuarios');
  return { ok: true };
}

export async function createVehiculoAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole('ADMIN', 'TRANSPORTISTA');

  const transportistaEntityId =
    session.role === 'TRANSPORTISTA' ? session.entityId ?? '' : String(formData.get('transportistaEntityId') || '');
  const matricula = String(formData.get('matricula') || '').trim().toUpperCase();
  const remolque = String(formData.get('remolque') || '').trim().toUpperCase() || null;

  if (!transportistaEntityId) {
    return { error: 'Selecciona el transportista efectivo propietario del vehículo.' };
  }
  if (!matricula) {
    return { error: 'La matrícula es obligatoria.' };
  }

  await prisma.vehiculo.create({ data: { transportistaEntityId, matricula, remolque } });
  revalidatePath('/admin/flota');
  return { ok: true };
}

export async function createConductorAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole('ADMIN', 'TRANSPORTISTA');

  const transportistaEntityId =
    session.role === 'TRANSPORTISTA' ? session.entityId ?? '' : String(formData.get('transportistaEntityId') || '');
  const nombre = String(formData.get('nombre') || '').trim();
  const dni = String(formData.get('dni') || '').trim().toUpperCase();

  if (!transportistaEntityId) {
    return { error: 'Selecciona el transportista efectivo del que depende el conductor.' };
  }
  if (!nombre || !dni) {
    return { error: 'Nombre y DNI del conductor son obligatorios.' };
  }

  await prisma.conductor.create({ data: { transportistaEntityId, nombre, dni } });
  revalidatePath('/admin/flota');
  return { ok: true };
}

export async function toggleVehiculoActivoAction(formData: FormData) {
  const session = await requireRole('ADMIN', 'TRANSPORTISTA');
  const id = String(formData.get('id') || '');
  const vehiculo = await prisma.vehiculo.findUniqueOrThrow({ where: { id } });
  if (session.role === 'TRANSPORTISTA' && vehiculo.transportistaEntityId !== session.entityId) {
    throw new Error('NO_AUTORIZADO');
  }
  await prisma.vehiculo.update({ where: { id }, data: { activo: !vehiculo.activo } });
  revalidatePath('/admin/flota');
}

export async function toggleConductorActivoAction(formData: FormData) {
  const session = await requireRole('ADMIN', 'TRANSPORTISTA');
  const id = String(formData.get('id') || '');
  const conductor = await prisma.conductor.findUniqueOrThrow({ where: { id } });
  if (session.role === 'TRANSPORTISTA' && conductor.transportistaEntityId !== session.entityId) {
    throw new Error('NO_AUTORIZADO');
  }
  await prisma.conductor.update({ where: { id }, data: { activo: !conductor.activo } });
  revalidatePath('/admin/flota');
}
