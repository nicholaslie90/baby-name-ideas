import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

/** Pixel density multiplier for crisp, print-quality exports. */
const SCALE = 3;

/** Wait for web fonts to load so the cursive script renders in the capture. */
async function waitForFonts(): Promise<void> {
  if ('fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      /* fonts API unavailable — proceed anyway */
    }
  }
}

async function capturePng(node: HTMLElement): Promise<{ dataUrl: string; width: number; height: number }> {
  await waitForFonts();
  const width = node.offsetWidth;
  const height = node.offsetHeight;
  const dataUrl = await toPng(node, {
    pixelRatio: SCALE,
    width,
    height,
    cacheBust: true,
    // Render at natural CSS size; pixelRatio handles the hi-res upscaling.
    style: { transform: 'none' },
  });
  return { dataUrl, width, height };
}

function triggerDownload(href: string, filename: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Export the frame node as a hi-res PNG. */
export async function downloadPng(node: HTMLElement, filename: string): Promise<void> {
  const { dataUrl } = await capturePng(node);
  triggerDownload(dataUrl, `${filename}.png`);
}

/** Export the frame node as a PDF whose page matches the frame's aspect ratio. */
export async function downloadPdf(node: HTMLElement, filename: string): Promise<void> {
  const { dataUrl, width, height } = await capturePng(node);
  const orientation = width >= height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'px', format: [width, height] });
  pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
  pdf.save(`${filename}.pdf`);
}

/** Build a filesystem-safe filename from the name + surname. */
export function exportFilename(name: string, surname: string): string {
  const raw = [name, surname].filter(Boolean).join('-');
  return raw.replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').toLowerCase() || 'nama-bayi';
}
