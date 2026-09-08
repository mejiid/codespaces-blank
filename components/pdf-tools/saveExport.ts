type SaveFileHandle = {
  createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>;
};

export async function saveExport(bytes: Uint8Array, filename: string, mimeType: string): Promise<void> {
  const browserWindow = window as Window & {
    showSaveFilePicker?: (options: {
      suggestedName: string;
      types: Array<{ description: string; accept: Record<string, string[]> }>;
    }) => Promise<SaveFileHandle>;
  };
  const extension = filename.endsWith(".zip") ? ".zip" : filename.endsWith(".csv") ? ".csv" : ".pdf";

  if (browserWindow.showSaveFilePicker) {
    try {
      const handle = await browserWindow.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: extension === ".zip" ? "ZIP archive" : extension === ".csv" ? "CSV file" : "PDF document", accept: { [mimeType]: [extension] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(new Blob([bytes as BlobPart], { type: mimeType }));
      await writable.close();
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
