/*
 * Innov8 Studios — client-side PDF first-page cover thumbnail. Uses
 * pdfjs-dist, dynamically import()ed here only (never in the main
 * bundle) so a project with no PDF files never pays for it. Used by
 * FileTile.jsx as the preview for PDF files.
 */
let pdfjsPromise;

function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/build/pdf.mjs").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).href;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

export async function generatePdfThumbnail(url) {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument(url).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 0.5 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.8);
}
