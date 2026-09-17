import { unzipSync, strFromU8 } from "fflate";

function cleanup(text: string) {
  return text
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function xmlToText(xml: string) {
  return xml
    .replace(/<\/w:p>|<\/a:p>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function fromOfficeZip(bytes: Uint8Array, match: (name: string) => boolean) {
  const files = unzipSync(bytes);
  const names = Object.keys(files).filter(match).sort();
  let out = "";
  for (const name of names) {
    const entry = files[name];
    if (!entry) continue;
    out += xmlToText(strFromU8(entry)) + "\n";
  }
  return out;
}

/** Extracts readable text from an uploaded PDF, DOCX, PPTX, or plain-text file. */
export async function extractText(bytes: Uint8Array, fileName: string, mimeType: string) {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".pdf") || mimeType === "application/pdf") {
    const { extractText: extractPdfText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractPdfText(pdf, { mergePages: true });
    return cleanup(Array.isArray(text) ? text.join("\n") : text);
  }

  if (lower.endsWith(".docx")) {
    return cleanup(fromOfficeZip(bytes, (n) => n === "word/document.xml"));
  }

  if (lower.endsWith(".pptx")) {
    return cleanup(fromOfficeZip(bytes, (n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)));
  }

  if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".csv")) {
    return cleanup(new TextDecoder().decode(bytes));
  }

  throw new Error("Unsupported file type. Upload a PDF, DOCX, PPTX or TXT file.");
}

/** Splits long text into overlapping chunks used for retrieval. */
export function chunkText(text: string, size = 1400, overlap = 200) {
  const chunks: string[] = [];
  let index = 0;
  while (index < text.length) {
    chunks.push(text.slice(index, index + size));
    index += size - overlap;
  }
  return chunks.filter((chunk) => chunk.trim().length > 40);
}

/** Naive keyword retrieval over chunks — keeps AI answers grounded in the document. */
export function retrieveContext(text: string, question: string, maxChars = 12000) {
  if (text.length <= maxChars) return text;
  const chunks = chunkText(text);
  const terms = question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 3);
  const scored = chunks.map((chunk, position) => {
    const haystack = chunk.toLowerCase();
    let score = 0;
    for (const term of terms) {
      const matches = haystack.split(term).length - 1;
      score += matches;
    }
    return { chunk, score, position };
  });
  scored.sort((a, b) => b.score - a.score || a.position - b.position);
  const picked: typeof scored = [];
  let total = 0;
  for (const item of scored) {
    if (total + item.chunk.length > maxChars) continue;
    picked.push(item);
    total += item.chunk.length;
  }
  picked.sort((a, b) => a.position - b.position);
  return picked.map((item) => item.chunk).join("\n---\n");
}
