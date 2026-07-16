import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { readPdf } from '@/lib/storage';
import { isPastRetentionWindow } from '@/lib/deca';

export const dynamic = 'force-dynamic';

/**
 * Endpoint público del DeCA — Tercero de la resolución.
 *
 * Requisitos que cumple deliberadamente este endpoint:
 * - NO requiere login, certificado digital, ni pulsar ningún botón: sirve el PDF
 *   directamente en la respuesta (acceso inmediato para el control en carretera).
 * - Debe servirse bajo HTTPS con TLS 1.2+ en producción (responsabilidad del
 *   despliegue/proxy, p.ej. Vercel o un balanceador con TLS termination).
 * - Permanece operativo durante el transporte y hasta 7 días naturales tras la
 *   finalización del servicio; pasado ese plazo, o si se desactiva manualmente,
 *   devuelve 410 Gone en lugar del PDF.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;

  const deca = await prisma.decaDocument.findUnique({ where: { docId } });

  if (!deca) {
    return new NextResponse('Documento no encontrado.', { status: 404 });
  }

  const shouldAutoDisable =
    deca.status === 'ACTIVE' && isPastRetentionWindow(deca.serviceEndDate);

  if (shouldAutoDisable) {
    await prisma.decaDocument.update({
      where: { id: deca.id },
      data: { status: 'DOWNLOAD_DISABLED', disabledAt: new Date() },
    });
  }

  if (deca.status === 'DOWNLOAD_DISABLED' || shouldAutoDisable) {
    return new NextResponse(
      'La descarga de este DeCA ha sido desactivada (transcurridos 7 días naturales desde la finalización del servicio).',
      { status: 410 }
    );
  }

  try {
    const bytes = await readPdf(deca.pdfPath);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        // inline: el documento se visualiza/descarga automáticamente sin interacción manual
        'Content-Disposition': `inline; filename="DeCA_${deca.docId}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new NextResponse('El fichero del documento no está disponible.', { status: 404 });
  }
}
