import { promises as fs } from 'fs';
import path from 'path';

function storageDir(): string {
  return process.env.DECA_STORAGE_DIR
    ? path.resolve(process.cwd(), process.env.DECA_STORAGE_DIR)
    : path.resolve(process.cwd(), 'storage/deca');
}

export async function ensureStorageDir(): Promise<string> {
  const dir = storageDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export function pdfFilePath(docId: string): string {
  return path.join(storageDir(), `${docId}.pdf`);
}

export async function savePdf(docId: string, bytes: Uint8Array): Promise<{ filePath: string; size: number }> {
  await ensureStorageDir();
  const filePath = pdfFilePath(docId);
  await fs.writeFile(filePath, bytes);
  const stat = await fs.stat(filePath);
  return { filePath, size: stat.size };
}

export async function readPdf(filePath: string): Promise<Buffer> {
  return fs.readFile(filePath);
}
