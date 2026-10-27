import { PDFDocument } from "pdf-lib";

export async function mergePdfBytes(sources: ArrayBuffer[]): Promise<Uint8Array> {
  if (sources.length < 1) {
    throw new Error("At least one PDF is required.");
  }

  const output = await PDFDocument.create();

  for (const source of sources) {
    const document = await PDFDocument.load(source.slice(0));
    const pages = await output.copyPages(document, document.getPageIndices());
    pages.forEach((page) => output.addPage(page));
  }

  return output.save();
}
