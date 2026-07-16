'use client';

import { useState } from 'react';

export type EnvioRow = {
  origen: string;
  destino: string;
  mercancia: string;
  bultos: string;
  peso: string;
  volumen: string;
};

const emptyRow: EnvioRow = { origen: '', destino: '', mercancia: '', bultos: '', peso: '', volumen: '' };

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
        <label className="label !mb-0">c) / d) Envíos (origen, destino, mercancía)</label>
        <button type="button" onClick={addRow} className="text-sm text-deca-teal hover:underline">
          + Añadir envío
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-2">
        Puedes agrupar varios envíos en un mismo DeCA si comparten cargador contractual y transportista efectivo
        (Sexto de la resolución). Identifica cada uno con su origen, destino y mercancía.
      </p>
      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div key={idx} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-start border border-gray-200 rounded-md p-3">
            <input
              className="input sm:col-span-1"
              placeholder="Origen"
              name="envio_origen"
              value={row.origen}
              onChange={(e) => updateRow(idx, 'origen', e.target.value)}
              required
            />
            <input
              className="input sm:col-span-1"
              placeholder="Destino"
              name="envio_destino"
              value={row.destino}
              onChange={(e) => updateRow(idx, 'destino', e.target.value)}
              required
            />
            <input
              className="input sm:col-span-2"
              placeholder="Naturaleza de la mercancía"
              name="envio_mercancia"
              value={row.mercancia}
              onChange={(e) => updateRow(idx, 'mercancia', e.target.value)}
              required
            />
            <input
              className="input sm:col-span-1"
              placeholder="Bultos"
              name="envio_bultos"
              type="number"
              min={0}
              value={row.bultos}
              onChange={(e) => updateRow(idx, 'bultos', e.target.value)}
            />
            <div className="flex gap-1 sm:col-span-1">
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
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(idx)}
                className="text-xs text-red-600 hover:underline sm:col-span-6 text-left"
              >
                Eliminar este envío
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
