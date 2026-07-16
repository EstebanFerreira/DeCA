import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import QRCode from 'qrcode';

export type EnvioInput = {
  origen: string;
  destino: string;
  mercancia: string;
  bultos?: number | null;
  pesoKg?: number | null;
  volumenM3?: number | null;
};

export type SignatureBlockInput = {
  type: 'NONE' | 'ADVANCED' | 'QUALIFIED';
  signerName?: string | null;
  signedAt?: Date | null;
};

export type ModificationEntryInput = {
  type: 'UPDATE_SAME' | 'NEW_VERSION';
  motivo: string;
  changedAt: Date;
  changedByName: string;
  changes: { label: string; before: string; after: string }[];
};

export type DecaPdfInput = {
  docId: string;
  publicUrl: string;
  cargador: { name: string; nif: string; domicilio?: string | null };
  transportista: { name: string; nif: string };
  cuentaAnalitica?: string | null;
  conductorNombre: string;
  conductorDni: string;
  envios: EnvioInput[];
  fecha: Date;
  matricula: string;
  remolque?: string | null;
  autorizacionEspecial?: string | null;
  observacionesCargador?: string | null;
  observacionesTransportista?: string | null;
  cargadorSignature: SignatureBlockInput;
  transportistaSignature: SignatureBlockInput;
  destinatario?: { nombre?: string | null; nif?: string | null } | null;
  destinatarioSignature: SignatureBlockInput;
  createdAt: Date;
  updatedAt: Date;
  modificationHistory: ModificationEntryInput[]; // Quinto: historial completo, no solo el último motivo
  version: number;
};

const TEAL = rgb(0.10, 0.48, 0.48);
const TEAL_LIGHT = rgb(0.87, 0.95, 0.95);
const DARK = rgb(0.13, 0.13, 0.13);
const GRAY = rgb(0.4, 0.4, 0.4);

function fmtDate(d: Date): string {
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function fmtDateTime(d: Date): string {
  return d.toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function signatureLabel(type: SignatureBlockInput['type']): string {
  if (type === 'ADVANCED') return 'Firma electrónica avanzada (eIDAS)';
  if (type === 'QUALIFIED') return 'Firma electrónica cualificada (eIDAS)';
  return 'Sin firma';
}

function drawWrapped(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: PDFFont,
  size: number,
  lineHeight: number,
  color = DARK
): number {
  const words = (text || '').split(/\s+/).filter(Boolean);
  let line = '';
  let cursorY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      page.drawText(line, { x, y: cursorY, size, font, color });
      cursorY -= lineHeight;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) {
    page.drawText(line, { x, y: cursorY, size, font, color });
    cursorY -= lineHeight;
  }
  return cursorY;
}

function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

/**
 * Genera el PDF del DeCA (Documento electrónico de Control Administrativo) cumpliendo
 * el "Segundo" de la resolución: fichero nativo digital (generado por código, no
 * escaneado), con código QR que contiene la URL de descarga, y con metadatos de
 * fecha/hora de creación y modificación. Incluye el historial completo de
 * modificaciones (no solo la última) para que quede constancia de todos los cambios.
 */
export async function generateDecaPdf(input: DecaPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  doc.setTitle(`DeCA ${input.docId}`);
  doc.setSubject('Documento electrónico de Control Administrativo (DeCA)');
  doc.setProducer('Portal DeCA');
  doc.setCreator('Portal DeCA');
  doc.setCreationDate(input.createdAt);
  doc.setModificationDate(input.updatedAt);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const qrDataUrl = await QRCode.toDataURL(input.publicUrl, { margin: 1, width: 300 });
  const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
  const qrImage = await doc.embedPng(qrImageBytes);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const colWidth = (contentWidth - 8) / 2;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function newPageIfNeeded(minSpace: number) {
    if (y - minSpace < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  }

  function box(
    x: number,
    boxY: number,
    width: number,
    height: number,
    title: string
  ): { contentX: number; contentY: number } {
    page.drawRectangle({
      x,
      y: boxY - height,
      width,
      height,
      borderColor: TEAL,
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });
    page.drawRectangle({ x, y: boxY - 14, width, height: 14, color: TEAL_LIGHT });
    page.drawText(title, { x: x + 6, y: boxY - 11, size: 8, font: fontBold, color: TEAL });
    return { contentX: x + 6, contentY: boxY - 26 };
  }

  // ---- Cabecera ----
  page.drawRectangle({ x: margin, y: y - 46, width: contentWidth, height: 46, color: TEAL });
  page.drawText('Documento electrónico de Control Administrativo', {
    x: margin + 12,
    y: y - 20,
    size: 13,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText('DeCA', { x: margin + 12, y: y - 38, size: 10, font, color: rgb(1, 1, 1) });
  page.drawText(`Versión ${input.version}${input.version > 1 ? ' (documento modificado)' : ''}`, {
    x: margin + contentWidth - 230,
    y: y - 38,
    size: 9,
    font,
    color: rgb(1, 1, 1),
  });

  const qrSize = 46;
  page.drawImage(qrImage, {
    x: margin + contentWidth - qrSize - 4,
    y: y - qrSize - 4 + 4,
    width: qrSize,
    height: qrSize,
  });

  y -= 58;
  page.drawText('Este DeCA cumple con la Orden FOM/2861/2012 y la DT8 de la Ley 9/2025 de Movilidad Sostenible', {
    x: margin,
    y,
    size: 8,
    font: fontItalic,
    color: GRAY,
  });
  y -= 12;
  page.drawText(`DocID: ${input.docId}`, { x: margin, y, size: 8, font, color: GRAY });
  y -= 20;

  // ---- a) Cargador contractual / b) Transportista efectivo ----
  const boxHeight1 = 60;
  {
    const c = box(margin, y, colWidth, boxHeight1, 'a) Cargador contractual (Nombre, NIF, domicilio)');
    let ty = c.contentY;
    ty = drawWrapped(page, input.cargador.name, c.contentX, ty, colWidth - 12, font, 9, 11);
    ty = drawWrapped(page, `NIF: ${input.cargador.nif}`, c.contentX, ty, colWidth - 12, font, 9, 11);
    if (input.cargador.domicilio) {
      drawWrapped(page, input.cargador.domicilio, c.contentX, ty, colWidth - 12, font, 8, 10, GRAY);
    }
  }
  {
    const c = box(margin + colWidth + 8, y, colWidth, boxHeight1, 'b) Transportista efectivo (Nombre, NIF)');
    let ty = c.contentY;
    ty = drawWrapped(page, input.transportista.name, c.contentX, ty, colWidth - 12, font, 9, 11);
    drawWrapped(page, `NIF: ${input.transportista.nif}`, c.contentX, ty, colWidth - 12, font, 9, 11);
  }
  y -= boxHeight1 + 10;

  // ---- Conductor / Cuenta analítica-Proyecto ----
  const condHeight = 40;
  {
    const c = box(margin, y, colWidth, condHeight, 'Conductor');
    let ty = c.contentY;
    ty = drawWrapped(page, input.conductorNombre, c.contentX, ty, colWidth - 12, font, 9, 11);
    drawWrapped(page, `DNI: ${input.conductorDni}`, c.contentX, ty, colWidth - 12, font, 8, 10, GRAY);
  }
  {
    const c = box(margin + colWidth + 8, y, colWidth, condHeight, 'Cuenta analítica / Proyecto');
    drawWrapped(page, input.cuentaAnalitica || '—', c.contentX, c.contentY, colWidth - 12, font, 9, 11);
  }
  y -= condHeight + 10;

  // ---- c) / d) Envíos (origen, destino, mercancía, bultos, peso, volumen) ----
  const envioRowHeight = 16;
  const envioTableHeight = 16 + envioRowHeight * Math.max(input.envios.length, 1);
  page.drawRectangle({
    x: margin,
    y: y - envioTableHeight,
    width: contentWidth,
    height: envioTableHeight,
    borderColor: TEAL,
    borderWidth: 1,
  });
  page.drawRectangle({ x: margin, y: y - 16, width: contentWidth, height: 16, color: TEAL_LIGHT });
  const colOrigen = margin + 6;
  const colDestino = margin + contentWidth * 0.24;
  const colMercancia = margin + contentWidth * 0.5;
  const colBultos = margin + contentWidth * 0.76;
  const colPeso = margin + contentWidth * 0.86;
  page.drawText('c) Origen', { x: colOrigen, y: y - 12, size: 8, font: fontBold, color: TEAL });
  page.drawText('Destino', { x: colDestino, y: y - 12, size: 8, font: fontBold, color: TEAL });
  page.drawText('d) Naturaleza de la mercancía', { x: colMercancia, y: y - 12, size: 8, font: fontBold, color: TEAL });
  page.drawText('Bultos', { x: colBultos, y: y - 12, size: 8, font: fontBold, color: TEAL });
  page.drawText('Peso(kg)/Vol(m3)', { x: colPeso, y: y - 12, size: 7, font: fontBold, color: TEAL });

  let rowY = y - 16 - 12;
  const envios = input.envios.length ? input.envios : [{ origen: '—', destino: '—', mercancia: '—' }];
  for (const envio of envios) {
    page.drawText(truncate(envio.origen, 26), { x: colOrigen, y: rowY, size: 8, font, color: DARK });
    page.drawText(truncate(envio.destino, 26), { x: colDestino, y: rowY, size: 8, font, color: DARK });
    page.drawText(truncate(envio.mercancia, 30), { x: colMercancia, y: rowY, size: 8, font, color: DARK });
    page.drawText(envio.bultos != null ? String(envio.bultos) : '-', { x: colBultos, y: rowY, size: 8, font, color: DARK });
    const pesoVol = `${envio.pesoKg ?? '-'} / ${envio.volumenM3 ?? '-'}`;
    page.drawText(pesoVol, { x: colPeso, y: rowY, size: 7, font, color: DARK });
    rowY -= envioRowHeight;
  }
  y -= envioTableHeight + 10;

  // ---- f) Fecha / g) Matrícula / e) Autorización especial ----
  const vehHeight = 44;
  page.drawRectangle({
    x: margin,
    y: y - vehHeight,
    width: contentWidth,
    height: vehHeight,
    borderColor: TEAL,
    borderWidth: 1,
  });
  page.drawRectangle({ x: margin, y: y - 14, width: contentWidth, height: 14, color: TEAL_LIGHT });
  const vc1 = margin + 6;
  const vc2 = margin + contentWidth * 0.33;
  const vc3 = margin + contentWidth * 0.66;
  page.drawText('f) Fecha', { x: vc1, y: y - 11, size: 8, font: fontBold, color: TEAL });
  page.drawText('g) Matrícula / Remolque', { x: vc2, y: y - 11, size: 8, font: fontBold, color: TEAL });
  page.drawText('e) Autorización especial', { x: vc3, y: y - 11, size: 8, font: fontBold, color: TEAL });
  const vy = y - 30;
  page.drawText(fmtDate(input.fecha), { x: vc1, y: vy, size: 9, font, color: DARK });
  page.drawText(`${input.matricula}${input.remolque ? ' / ' + input.remolque : ''}`, {
    x: vc2,
    y: vy,
    size: 9,
    font,
    color: DARK,
  });
  page.drawText(input.autorizacionEspecial || '—', { x: vc3, y: vy, size: 9, font, color: DARK });
  y -= vehHeight + 10;

  // ---- h) Observaciones ----
  const obsHeight = 54;
  {
    const c = box(margin, y, colWidth, obsHeight, 'h) Observaciones — Cargador contractual');
    if (input.observacionesCargador) drawWrapped(page, input.observacionesCargador, c.contentX, c.contentY, colWidth - 12, font, 8, 10);
  }
  {
    const c = box(margin + colWidth + 8, y, colWidth, obsHeight, 'h) Observaciones — Transportista efectivo');
    if (input.observacionesTransportista)
      drawWrapped(page, input.observacionesTransportista, c.contentX, c.contentY, colWidth - 12, font, 8, 10);
  }
  y -= obsHeight + 10;

  // ---- Firmas: Cargador contractual / Transportista efectivo / Destinatario ----
  newPageIfNeeded(70);
  const sigColWidth = (contentWidth - 16) / 3;
  const sigHeight = 58;
  function signatureBox(x: number, title: string, sig: SignatureBlockInput, extraLine?: string) {
    const c = box(x, y, sigColWidth, sigHeight, title);
    let ty = c.contentY;
    ty = drawWrapped(page, signatureLabel(sig.type), c.contentX, ty, sigColWidth - 12, fontBold, 7.5, 9, TEAL);
    if (extraLine) {
      ty = drawWrapped(page, extraLine, c.contentX, ty, sigColWidth - 12, font, 7.5, 9, DARK);
    }
    if (sig.type !== 'NONE') {
      ty = drawWrapped(page, `Firmante: ${sig.signerName || '—'}`, c.contentX, ty, sigColWidth - 12, font, 7.5, 9);
      if (sig.signedAt) {
        drawWrapped(page, fmtDateTime(sig.signedAt), c.contentX, ty, sigColWidth - 12, font, 7, 9, GRAY);
      }
    }
  }
  signatureBox(margin, 'Firma — Cargador contractual', input.cargadorSignature);
  signatureBox(margin + sigColWidth + 8, 'Firma — Transportista efectivo', input.transportistaSignature);
  signatureBox(
    margin + (sigColWidth + 8) * 2,
    'Firma — Destinatario',
    input.destinatarioSignature,
    input.destinatario?.nombre ? `${input.destinatario.nombre}${input.destinatario.nif ? ' (' + input.destinatario.nif + ')' : ''}` : undefined
  );
  y -= sigHeight + 10;

  // ---- Historial completo de modificaciones (Quinto de la resolución) ----
  if (input.modificationHistory.length > 0) {
    newPageIfNeeded(40);
    page.drawText('Historial de modificaciones', { x: margin, y, size: 9, font: fontBold, color: TEAL });
    y -= 13;
    for (const entry of input.modificationHistory) {
      newPageIfNeeded(30);
      const header = `${fmtDateTime(entry.changedAt)} — ${entry.changedByName} (${
        entry.type === 'UPDATE_SAME' ? 'actualización del PDF' : 'nueva versión'
      })`;
      y = drawWrapped(page, header, margin, y, contentWidth, fontBold, 7.5, 9.5, DARK);
      y = drawWrapped(page, `Motivo: ${entry.motivo}`, margin + 6, y, contentWidth - 6, font, 7.5, 9.5, DARK);
      for (const change of entry.changes) {
        newPageIfNeeded(14);
        y = drawWrapped(
          page,
          `• ${change.label}: "${change.before}" -> "${change.after}"`,
          margin + 10,
          y,
          contentWidth - 10,
          fontItalic,
          7,
          9,
          GRAY
        );
      }
      y -= 4;
    }
    y -= 6;
  }

  // ---- Aclaraciones (pie) ----
  newPageIfNeeded(100);
  const aclHeight = 90;
  page.drawRectangle({
    x: margin,
    y: y - aclHeight,
    width: contentWidth,
    height: aclHeight,
    color: TEAL_LIGHT,
  });
  let ay = y - 14;
  page.drawText('Aclaraciones', { x: margin + 8, y: ay, size: 9, font: fontBold, color: TEAL });
  ay -= 14;
  ay = drawWrapped(
    page,
    'Cargador contractual: contrata directamente con el transportista efectivo el transporte del envío (cargador efectivo, otro transportista, cooperativa, agencia de transporte, transitario, almacenista-distribuidor, operador logístico u otro que contrate o intermedie habitualmente).',
    margin + 8,
    ay,
    contentWidth - 16,
    font,
    7,
    9,
    DARK
  );
  ay = drawWrapped(
    page,
    'Transportista efectivo: titular de la autorización a cuyo amparo se realiza materialmente el transporte.',
    margin + 8,
    ay,
    contentWidth - 16,
    font,
    7,
    9,
    DARK
  );
  ay = drawWrapped(
    page,
    'Los datos de los apartados a), c) y d) son responsabilidad del Cargador contractual. Los datos de los apartados e), f) y g) son responsabilidad del Transportista efectivo.',
    margin + 8,
    ay,
    contentWidth - 16,
    font,
    7,
    9,
    DARK
  );
  y -= aclHeight + 10;

  // ---- Pie técnico: metadatos y URL ----
  newPageIfNeeded(20);
  page.drawText(`Creado: ${fmtDateTime(input.createdAt)}    Última modificación: ${fmtDateTime(input.updatedAt)}`, {
    x: margin,
    y: margin + 14,
    size: 7,
    font,
    color: GRAY,
  });
  page.drawText(input.publicUrl, { x: margin, y: margin + 2, size: 7, font, color: GRAY });

  const bytes = await doc.save();
  return bytes;
}
