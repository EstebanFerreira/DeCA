import bcrypt from 'bcryptjs';
import { prisma } from '../lib/db';
import { createDeca, modifyDeca } from '../lib/deca';

async function main() {
  console.log('Sembrando datos de demostración…');

  const cargador = await prisma.entity.upsert({
    where: { id: 'demo-cargador' },
    update: {},
    create: {
      id: 'demo-cargador',
      type: 'CARGADOR',
      name: 'Logística Ejemplo S.L.',
      nif: 'B12345678',
      domicilio: 'Calle Mayor 1, 28001 Madrid',
    },
  });

  const transportista = await prisma.entity.upsert({
    where: { id: 'demo-transportista' },
    update: {},
    create: {
      id: 'demo-transportista',
      type: 'TRANSPORTISTA',
      name: 'Transportes Ejemplo S.A.',
      nif: 'A87654321',
    },
  });

  const passwordAdmin = await bcrypt.hash('Admin1234!', 10);
  const passwordCargador = await bcrypt.hash('Cargador1234!', 10);
  const passwordTransportista = await bcrypt.hash('Transportista1234!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@deca-portal.es' },
    update: {},
    create: {
      email: 'admin@deca-portal.es',
      name: 'Administrador',
      role: 'ADMIN',
      passwordHash: passwordAdmin,
    },
  });

  await prisma.user.upsert({
    where: { email: 'cargador@deca-portal.es' },
    update: {},
    create: {
      email: 'cargador@deca-portal.es',
      name: 'Usuario Cargador',
      role: 'CARGADOR',
      passwordHash: passwordCargador,
      entityId: cargador.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'transportista@deca-portal.es' },
    update: {},
    create: {
      email: 'transportista@deca-portal.es',
      name: 'Usuario Transportista',
      role: 'TRANSPORTISTA',
      passwordHash: passwordTransportista,
      entityId: transportista.id,
    },
  });

  // Flota (vehículos) y conductores del transportista — listas reutilizables, en lugar de
  // escribir la matrícula/conductor a mano en cada DeCA.
  const vehiculo1 = await prisma.vehiculo.upsert({
    where: { id: 'demo-vehiculo-1' },
    update: {},
    create: { id: 'demo-vehiculo-1', transportistaEntityId: transportista.id, matricula: '1234ABC', remolque: '5678DEF' },
  });
  const vehiculo2 = await prisma.vehiculo.upsert({
    where: { id: 'demo-vehiculo-2' },
    update: {},
    create: { id: 'demo-vehiculo-2', transportistaEntityId: transportista.id, matricula: '9999XYZ', remolque: null },
  });
  const conductor1 = await prisma.conductor.upsert({
    where: { id: 'demo-conductor-1' },
    update: {},
    create: { id: 'demo-conductor-1', transportistaEntityId: transportista.id, nombre: 'Juan Pérez García', dni: '12345678A' },
  });
  const conductor2 = await prisma.conductor.upsert({
    where: { id: 'demo-conductor-2' },
    update: {},
    create: { id: 'demo-conductor-2', transportistaEntityId: transportista.id, nombre: 'María López Ruiz', dni: '87654321B' },
  });

  const existingDecas = await prisma.decaDocument.count();
  if (existingDecas === 0) {
    const hoy = new Date();
    const enDiezDias = new Date(hoy.getTime() + 10 * 24 * 60 * 60 * 1000);
    const haceVeinteDias = new Date(hoy.getTime() - 20 * 24 * 60 * 60 * 1000);
    const haceQuinceDias = new Date(hoy.getTime() - 15 * 24 * 60 * 60 * 1000);

    const deca1 = await createDeca({
      cargadorEntityId: cargador.id,
      transportistaEntityId: transportista.id,
      cuentaAnalitica: 'PROY-2026-014',
      conductorId: conductor1.id,
      vehiculoId: vehiculo1.id,
      envios: [
        { origen: 'Madrid', destino: 'Barcelona', mercancia: 'Material de construcción', bultos: 20, pesoKg: 3200, volumenM3: 18 },
      ],
      fecha: hoy,
      autorizacionEspecial: null,
      serviceStartDate: hoy,
      serviceEndDate: enDiezDias,
      cargadorSignature: { type: 'NONE' },
      transportistaSignature: { type: 'NONE' },
      destinatarioSignature: { type: 'NONE' },
      createdByUserId: admin.id,
    });
    console.log('DeCA de demostración #1 creado (activo).');

    // Dos modificaciones encadenadas para demostrar que el historial completo (no solo la
    // última) queda registrado y se incluye en el PDF descargado.
    const deca1v2 = await modifyDeca({
      decaId: deca1.id,
      type: 'UPDATE_SAME',
      motivo: 'Se añade autorización especial de circulación solicitada por el cliente.',
      changedByUserId: admin.id,
      autorizacionEspecial: 'AEC-2026-00891',
    });
    await modifyDeca({
      decaId: deca1v2.id,
      type: 'UPDATE_SAME',
      motivo: 'Cambio de vehículo por avería del tractor asignado inicialmente.',
      changedByUserId: admin.id,
      vehiculoId: vehiculo2.id,
      conductorId: conductor2.id,
    });
    console.log('DeCA #1: 2 modificaciones encadenadas registradas (cambio de matrícula y conductor incluido).');

    await createDeca({
      cargadorEntityId: cargador.id,
      transportistaEntityId: transportista.id,
      cuentaAnalitica: 'PROY-2026-022',
      conductorId: conductor2.id,
      vehiculoId: vehiculo2.id,
      envios: [
        { origen: 'Valencia', destino: 'Sevilla', mercancia: 'Palets de bebidas', bultos: 40, pesoKg: 5400, volumenM3: 30 },
        { origen: 'Valencia', destino: 'Córdoba', mercancia: 'Palets de conservas', bultos: 15, pesoKg: 1800, volumenM3: 9 },
      ],
      fecha: haceVeinteDias,
      autorizacionEspecial: null,
      serviceStartDate: haceVeinteDias,
      serviceEndDate: haceQuinceDias, // ya pasó la ventana de 7 días -> se mostrará como desactivable
      cargadorSignature: { type: 'ADVANCED', signerName: 'Ana Gómez (cargador)' },
      transportistaSignature: { type: 'ADVANCED', signerName: 'Juan Pérez García (conductor)' },
      destinatarioNombre: 'Almacenes del Sur S.L.',
      destinatarioNif: 'B11223344',
      destinatarioSignature: { type: 'ADVANCED', signerName: 'Pedro Sánchez (recepción)' },
      createdByUserId: admin.id,
    });
    console.log('DeCA de demostración #2 creado (agrupa 2 envíos, 3 firmas, ventana de 7 días superada).');
  }

  console.log('\nUsuarios de demostración:');
  console.log('  admin@deca-portal.es / Admin1234!');
  console.log('  cargador@deca-portal.es / Cargador1234!');
  console.log('  transportista@deca-portal.es / Transportista1234!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
