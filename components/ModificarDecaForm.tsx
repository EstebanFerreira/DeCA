'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useMemo, useState } from 'react';
import { modifyDecaAction, type FormState } from '@/app/actions/deca';
import EnviosEditor, { type EnvioRow } from './EnviosEditor';

type EntityOption = { id: string; name: string; nif: string };
type VehiculoOption = { id: string; transportistaEntityId: string; matricula: string; remolque: string | null };
type ConductorOption = { id: string; transportistaEntityId: string; nombre: string; dni: string };

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando…' : 'Guardar modificación'}
    </button>
  );
}

export default function ModificarDecaForm({
  decaId,
  autorizacionEspecial,
  observacionesCargador,
  observacionesTransportista,
  serviceEndDate,
  cuentaAnalitica,
  expedidorNombre,
  expedidorNif,
  expedidorDireccion,
  envios,
  cargadores,
  transportistas,
  vehiculos,
  conductores,
  currentCargadorEntityId,
  currentTransportistaEntityId,
  currentVehiculoId,
  currentConductorId,
}: {
  decaId: string;
  autorizacionEspecial: string;
  observacionesCargador: string;
  observacionesTransportista: string;
  serviceEndDate: string;
  cuentaAnalitica: string;
  expedidorNombre: string;
  expedidorNif: string;
  expedidorDireccion: string;
  envios: EnvioRow[];
  cargadores: EntityOption[];
  transportistas: EntityOption[];
  vehiculos: VehiculoOption[];
  conductores: ConductorOption[];
  currentCargadorEntityId: string;
  currentTransportistaEntityId: string;
  currentVehiculoId: string;
  currentConductorId: string;
}) {
  const [state, formAction] = useFormState(modifyDecaAction, initialState);
  const [type, setType] = useState<'UPDATE_SAME' | 'NEW_VERSION'>('UPDATE_SAME');
  const [transportistaId, setTransportistaId] = useState(currentTransportistaEntityId);

  const vehiculosDisponibles = useMemo(
    () => vehiculos.filter((v) => v.transportistaEntityId === transportistaId),
    [vehiculos, transportistaId]
  );
  const conductoresDisponibles = useMemo(
    () => conductores.filter((c) => c.transportistaEntityId === transportistaId),
    [conductores, transportistaId]
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="decaId" value={decaId} />

      <div className="card p-5">
        <label className="label">Tipo de modificación (Quinto de la resolución)</label>
        <div className="space-y-2">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="type"
              value="UPDATE_SAME"
              checked={type === 'UPDATE_SAME'}
              onChange={() => setType('UPDATE_SAME')}
              className="mt-1"
            />
            <span>
              <strong>Actualizar el PDF existente.</strong> Se conservan los datos anteriores y se añade el motivo
              del cambio al historial. La URL y el QR no cambian.
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="type"
              value="NEW_VERSION"
              checked={type === 'NEW_VERSION'}
              onChange={() => setType('NEW_VERSION')}
              className="mt-1"
            />
            <span>
              <strong>Generar un PDF nuevo.</strong> Se crea una nueva URL y un nuevo QR; el documento actual queda
              marcado como sustituido. El historial de cambios se traslada al nuevo documento.
            </span>
          </label>
        </div>
        <div className="mt-4">
          <label className="label">Motivo de la modificación</label>
          <textarea className="input" name="motivo" rows={2} required />
          <p className="text-xs text-gray-500 mt-1">
            Además del motivo, el sistema registra automáticamente qué campos han cambiado (p. ej. matrícula
            anterior → nueva) para conservar la trazabilidad completa.
          </p>
        </div>
      </div>

      <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">a) Cargador contractual</label>
          <select className="input" name="cargadorEntityId" defaultValue={currentCargadorEntityId} required>
            {cargadores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.nif})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">b) Transportista efectivo</label>
          <select
            className="input"
            name="transportistaEntityId"
            value={transportistaId}
            onChange={(e) => setTransportistaId(e.target.value)}
            required
          >
            {transportistas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.nif})
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Cuenta analítica / Proyecto</label>
          <input className="input" name="cuentaAnalitica" defaultValue={cuentaAnalitica} />
        </div>
      </div>

      <div className="card p-5">
        <label className="label">Expedidor</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input className="input" name="expedidorNombre" placeholder="Nombre" defaultValue={expedidorNombre} />
          <input className="input" name="expedidorNif" placeholder="NIF" defaultValue={expedidorNif} />
          <input className="input" name="expedidorDireccion" placeholder="Dirección" defaultValue={expedidorDireccion} />
        </div>
      </div>

      <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">g) Vehículo (matrícula)</label>
          <select className="input" name="vehiculoId" defaultValue={currentVehiculoId} required>
            {vehiculosDisponibles.length === 0 && <option value={currentVehiculoId}>Vehículo actual</option>}
            {vehiculosDisponibles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.matricula}
                {v.remolque ? ` / ${v.remolque}` : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Si cambias la matrícula, quedará registrado en el historial.</p>
        </div>
        <div>
          <label className="label">Conductor</label>
          <select className="input" name="conductorId" defaultValue={currentConductorId} required>
            {conductoresDisponibles.length === 0 && <option value={currentConductorId}>Conductor actual</option>}
            {conductoresDisponibles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.dni})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card p-5">
        <EnviosEditor initial={envios} />
      </div>

      <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">e) Autorización especial</label>
          <input className="input" name="autorizacionEspecial" defaultValue={autorizacionEspecial} />
        </div>
        <div>
          <label className="label">Fin de servicio estimado</label>
          <input className="input" type="date" name="serviceEndDate" defaultValue={serviceEndDate} />
        </div>
      </div>

      <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">h) Observaciones — Cargador contractual</label>
          <textarea className="input" name="observacionesCargador" rows={2} defaultValue={observacionesCargador} />
        </div>
        <div>
          <label className="label">h) Observaciones — Transportista efectivo</label>
          <textarea
            className="input"
            name="observacionesTransportista"
            rows={2}
            defaultValue={observacionesTransportista}
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{state.error}</p>
      )}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
