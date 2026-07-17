'use client';

import { useState } from 'react';

export type EnvioRow = {
  origen: string;
  origenDireccion: string;
  destino: string;
  destinoDireccion: string;
  mercancia: string;
  bultos: string;
  peso: string;
  volumen: string;
  destinatarioNombre: string;
  destinatarioNif: string;
  destinatarioDireccion: string;
  destinatarioSignatureType: string;
  destinatarioSignerName: string;
  fechaRealizacion: string;
  fechaPrevistaEntrega: string;
  fechaEfectivaEntrega: string;
};

const emptyRow: EnvioRow = {
  origen: '',
  origenDireccion: '',
  destino: '',
  destinoDireccion: '',
  mercancia: '',
  bultos: '',
  peso: '',
  volumen: '',
  destinatarioNombre: '',
  destinatarioNif: '',
  destinatarioDireccion: '',
  destinatarioSignatureType: 'NONE',
  destinatarioSignerName: '',
  fechaRealizacion: '',
  fechaPrevistaEntrega: '',
  fechaEfectivaEntrega: '',
};

export default function EnviosEditor({ initial }: { initial?: EnvioRow[] }) {
  const [rows, setRows] = useState<EnvioRow[]>(initial && initial.length ? initial : [{ ...emptyRow }]);

  function updateRow(idx: number, field: keyof EnvioRow, value: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { ...emptyRow }]);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="label !mb-0">c) / d) Envíos</label>
        <button type="button" onClick={addRow} className="text-sm text-deca-teal hover:underline">
          + Añadir envío
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Puedes agrupar varios envíos en un mismo DeCA si comparten cargador contractual y transportista efectivo
        (Sexto de la resolución). Cada envío tiene su propio destinatario, direcciones completas y fechas, ya que
        pueden ir a destinos y momentos distintos.
      </p>
      <div className="space-y-4">
        {rows.map((row, idx) => (
          <div key={idx} className="border border-gray-200 rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Envío {idx + 1}</p>
              {rows.length > 1 && (
                <button type="button" onClick={() => removeRow(idx)} className="text-xs text-red-600 hover:underline">
                  Eliminar envío
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                className="input"
                placeholder="Origen"
                name="envio_origen"
                value={row.origen}
                onChange={(e) => updateRow(idx, 'origen', e.target.value)}
                required
              />
              <input
                className="input"
                placeholder="Destino"
                name="envio_destino"
                value={row.destino}
                onChange={(e) => updateRow(idx, 'destino', e.target.value)}
                required
              />
              <input
                className="input"
                placeholder="Dirección completa de origen (opcional)"
                name="envio_origenDireccion"
                value={row.origenDireccion}
                onChange={(e) => updateRow(idx, 'origenDireccion', e.target.value)}
              />
              <input
                className="input"
                placeholder="Dirección completa de destino (opcional)"
                name="envio_destinoDireccion"
                value={row.destinoDireccion}
                onChange={(e) => updateRow(idx, 'destinoDireccion', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input
                className="input sm:col-span-2"
                placeholder="Naturaleza de la mercancía"
                name="envio_mercancia"
                value={row.mercancia}
                onChange={(e) => updateRow(idx, 'mercancia', e.target.value)}
                required
              />
              <input
                className="input"
                placeholder="Bultos"
                name="envio_bultos"
                type="number"
                min={0}
                value={row.bultos}
                onChange={(e) => updateRow(idx, 'bultos', e.target.value)}
              />
              <div className="flex gap-1">
                <input
                  className="input"
                  placeholder="Kg"
                  name="envio_peso"
                  type="number"
                  min={0}
                  value={row.peso}
                  onChange={(e) => updateRow(idx, 'peso', e.target.value)}
                />
                <input
                  className="input"
                  placeholder="m3"
                  name="envio_volumen"
                  type="number"
                  min={0}
                  value={row.volumen}
                  onChange={(e) => updateRow(idx, 'volumen', e.target.value)}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Destinatario de este envío</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  className="input"
                  placeholder="Nombre"
                  name="envio_destinatarioNombre"
                  value={row.destinatarioNombre}
                  onChange={(e) => updateRow(idx, 'destinatarioNombre', e.target.value)}
                />
                <input
                  className="input"
                  placeholder="NIF"
                  name="envio_destinatarioNif"
                  value={row.destinatarioNif}
                  onChange={(e) => updateRow(idx, 'destinatarioNif', e.target.value)}
                />
                <input
                  className="input"
                  placeholder="Dirección"
                  name="envio_destinatarioDireccion"
                  value={row.destinatarioDireccion}
                  onChange={(e) => updateRow(idx, 'destinatarioDireccion', e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <select
                  className="input sm:w-72"
                  name="envio_destinatarioSignatureType"
                  value={row.destinatarioSignatureType}
                  onChange={(e) => updateRow(idx, 'destinatarioSignatureType', e.target.value)}
                >
                  <option value="NONE">Firma destinatario: sin firma</option>
                  <option value="ADVANCED">Firma electrónica avanzada (eIDAS)</option>
                  <option value="QUALIFIED">Firma electrónica cualificada (con certificado)</option>
                </select>
                {row.destinatarioSignatureType !== 'NONE' && (
                  <input
                    className="input"
                    placeholder="Nombre del firmante"
                    name="envio_destinatarioSignerName"
                    value={row.destinatarioSignerName}
                    onChange={(e) => updateRow(idx, 'destinatarioSignerName', e.target.value)}
                    required
                  />
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Fechas de este envío</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Fecha de realización del transporte</label>
                  <input
                    className="input"
                    type="date"
                    name="envio_fechaRealizacion"
                    value={row.fechaRealizacion}
                    onChange={(e) => updateRow(idx, 'fechaRealizacion', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Fecha prevista de entrega</label>
                  <input
                    className="input"
                    type="date"
                    name="envio_fechaPrevistaEntrega"
                    value={row.fechaPrevistaEntrega}
                    onChange={(e) => updateRow(idx, 'fechaPrevistaEntrega', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Fecha efectiva de entrega</label>
                  <input
                    className="input"
                    type="date"
                    name="envio_fechaEfectivaEntrega"
                    value={row.fechaEfectivaEntrega}
                    onChange={(e) => updateRow(idx, 'fechaEfectivaEntrega', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
