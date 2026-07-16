'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createVehiculoAction, createConductorAction, type FormState } from '@/app/actions/admin';

const initial: FormState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando…' : label}
    </button>
  );
}

type TransportistaOption = { id: string; name: string };

export function NewVehiculoForm({
  transportistas,
  fixedTransportistaId,
}: {
  transportistas: TransportistaOption[];
  fixedTransportistaId?: string;
}) {
  const [state, formAction] = useFormState(createVehiculoAction, initial);
  return (
    <form action={formAction} className="card p-5 space-y-3">
      <h2 className="font-semibold text-gray-800">Nuevo vehículo</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {!fixedTransportistaId && (
          <div className="sm:col-span-2">
            <label className="label">Transportista efectivo</label>
            <select className="input" name="transportistaEntityId" required>
              <option value="">Selecciona…</option>
              {transportistas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label">Matrícula</label>
          <input className="input" name="matricula" required />
        </div>
        <div>
          <label className="label">Remolque (opcional)</label>
          <input className="input" name="remolque" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-600">Vehículo añadido.</p>}
      <SubmitButton label="Añadir vehículo" />
    </form>
  );
}

export function NewConductorForm({
  transportistas,
  fixedTransportistaId,
}: {
  transportistas: TransportistaOption[];
  fixedTransportistaId?: string;
}) {
  const [state, formAction] = useFormState(createConductorAction, initial);
  return (
    <form action={formAction} className="card p-5 space-y-3">
      <h2 className="font-semibold text-gray-800">Nuevo conductor</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {!fixedTransportistaId && (
          <div className="sm:col-span-2">
            <label className="label">Transportista efectivo</label>
            <select className="input" name="transportistaEntityId" required>
              <option value="">Selecciona…</option>
              {transportistas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label">Nombre</label>
          <input className="input" name="nombre" required />
        </div>
        <div>
          <label className="label">DNI</label>
          <input className="input" name="dni" required />
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-600">Conductor añadido.</p>}
      <SubmitButton label="Añadir conductor" />
    </form>
  );
}
