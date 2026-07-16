'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useMemo, useState } from 'react';
import { createDecaAction, type FormState } from '@/app/actions/deca';
import EnviosEditor from './EnviosEditor';

type EntityOption = { id: string; name: string; nif: string };
type VehiculoOption = { id: string; transportistaEntityId: string; matricula: string; remolque: string | null };
type ConductorOption = { id: string; transportistaEntityId: string; nombre: string; dni: string };

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Generando PDF…' : 'Crear DeCA'}
    </button>
  );
}

function SignatureFields({ prefix, title }: { prefix: string; title: string }) {
  const [type, setType] = useState('NONE');
  return (
    <div>
      <label className="label">{title}</label>
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          className="input sm:w-72"
          name={`${prefix}SignatureType`}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="NONE">Sin firma</option>
          <option value="ADVANCED">Firma electrónica avanzada (eIDAS)</option>
          <option value="QUALIFIED">Firma electrónica cualificada (con certificado)</option>
        </select>
        {type !== 'NONE' && (
          <input className="input" name={`${prefix}SignerName`} placeholder="Nombre del firmante" required />
        )}
      </div>
    </div>
  );
}

export default function NuevoDecaForm({
  cargadores,
  transportistas,
  vehiculos,
  conductores,
  defaultCargadorId,
  defaultTransportistaId,
}: {
  cargadores: EntityOption[];
  transportistas: EntityOption[];
  vehiculos: VehiculoOption[];
  conductores: ConductorOption[];
  defaultCargadorId?: string;
  defaultTransportistaId?: string;
}) {
  const [state, formAction] = useFormState(createDecaAction, initialState);
  const [transportistaId, setTransportistaId] = useState(defaultTransportistaId || '');

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
      <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">a) Cargador contractual</label>
          <select className="input" name="cargadorEntityId" defaultValue={defaultCargadorId} required>
            <option value="">Selecciona…</option>
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
            <option value="">Selecciona…</option>
            {transportistas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.nif})
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Cuenta analítica / Proyecto (opcional)</label>
          <input className="input" name="cuentaAnalitica" placeholder="Código de proyecto o cuenta analítica" />
        </div>
      </div>

      <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">g) Vehículo (matrícula)</label>
          <select className="input" name="vehiculoId" required disabled={!transportistaId}>
            <option value="">
              {transportistaId ? 'Selecciona…' : 'Elige primero el transportista efectivo'}
            </option>
            {vehiculosDisponibles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.matricula}
                {v.remolque ? ` / ${v.remolque}` : ''}
              </option>
            ))}
          </select>
          {transportistaId && vehiculosDisponibles.length === 0 && (
            <p className="text-xs text-red-500 mt-1">
              Este transportista no tiene vehículos dados de alta. Añádelos desde &quot;Flota y conductores&quot;.
            </p>
          )}
        </div>
        <div>
          <label className="label">Conductor</label>
          <select className="input" name="conductorId" required disabled={!transportistaId}>
            <option value="">
              {transportistaId ? 'Selecciona…' : 'Elige primero el transportista efectivo'}
            </option>
            {conductoresDisponibles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.dni})
              </option>
            ))}
          </select>
          {transportistaId && conductoresDisponibles.length === 0 && (
            <p className="text-xs text-red-500 mt-1">
              Este transportista no tiene conductores dados de alta. Añádelos desde &quot;Flota y conductores&quot;.
            </p>
          )}
        </div>
      </div>

      <div className="card p-5">
        <EnviosEditor />
      </div>

      <div className="card p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="label">f) Fecha del transporte</label>
          <input className="input" type="date" name="fecha" required />
        </div>
        <div>
          <label className="label">e) Autorización especial de circulación</label>
          <input className="input" name="autorizacionEspecial" />
        </div>
        <div>
          <label className="label">
            Fin de servicio <span className="text-gray-400">(controla los 7 días de la URL)</span>
          </label>
          <input className="input" type="date" name="serviceEndDate" />
        </div>
      </div>

      <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">h) Observaciones — Cargador contractual</label>
          <textarea className="input" name="observacionesCargador" rows={2} />
        </div>
        <div>
          <label className="label">h) Observaciones — Transportista efectivo</label>
          <textarea className="input" name="observacionesTransportista" rows={2} />
        </div>
      </div>

      <div className="card p-5 space-y-2">
        <label className="label">Destinatario (opcional, para la firma de entrega)</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className="input" name="destinatarioNombre" placeholder="Nombre del destinatario" />
          <input className="input" name="destinatarioNif" placeholder="NIF del destinatario" />
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <p className="label !mb-0">Firmas (solo si el DeCA también tiene finalidad contractual)</p>
        <SignatureFields prefix="cargador" title="Firma — Cargador contractual" />
        <SignatureFields prefix="transportista" title="Firma — Transportista efectivo" />
        <SignatureFields prefix="destinatario" title="Firma — Destinatario" />
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
