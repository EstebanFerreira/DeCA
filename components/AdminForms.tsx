'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createEntityAction, createUserAction, type FormState } from '@/app/actions/admin';

const initial: FormState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando…' : label}
    </button>
  );
}

export function NewEntityForm() {
  const [state, formAction] = useFormState(createEntityAction, initial);
  return (
    <form action={formAction} className="card p-5 space-y-3">
      <h2 className="font-semibold text-gray-800">Nueva entidad</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Tipo</label>
          <select className="input" name="type" required>
            <option value="CARGADOR">Cargador contractual</option>
            <option value="TRANSPORTISTA">Transportista efectivo</option>
          </select>
        </div>
        <div>
          <label className="label">NIF</label>
          <input className="input" name="nif" required />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Nombre / Razón social</label>
          <input className="input" name="name" required />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Domicilio (opcional)</label>
          <input className="input" name="domicilio" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-600">Entidad creada.</p>}
      <SubmitButton label="Crear entidad" />
    </form>
  );
}

export function NewUserForm({ entities }: { entities: { id: string; name: string; type: string }[] }) {
  const [state, formAction] = useFormState(createUserAction, initial);
  return (
    <form action={formAction} className="card p-5 space-y-3">
      <h2 className="font-semibold text-gray-800">Nuevo usuario</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Nombre</label>
          <input className="input" name="name" required />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" name="email" required />
        </div>
        <div>
          <label className="label">Contraseña</label>
          <input className="input" type="password" name="password" minLength={8} required />
        </div>
        <div>
          <label className="label">Rol</label>
          <select className="input" name="role" required>
            <option value="CARGADOR">Cargador contractual</option>
            <option value="TRANSPORTISTA">Transportista efectivo</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Entidad asociada (no aplica a Administrador)</label>
          <select className="input" name="entityId">
            <option value="">— Ninguna —</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.type})
              </option>
            ))}
          </select>
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-600">Usuario creado.</p>}
      <SubmitButton label="Crear usuario" />
    </form>
  );
}
