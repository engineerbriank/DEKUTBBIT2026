import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ExamQuestion } from "@/lib/ai.functions";

export type ExamPaper = { title: string; instructions: string; questions: ExamQuestion[] };

/** Builds a real, downloadable PDF of the generated exam paper in the browser. */
export async function buildExamPdf(exam: ExamPaper, subtitle: string, withAnswers: boolean) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 56;
  const width = 595.28;
  const height = 841.89;
  let page = pdf.addPage([width, height]);
  let y = height - margin;

  const write = (text: string, size: number, useBold = false, indent = 0) => {
    const activeFont = useBold ? bold : font;
    const maxWidth = width - margin * 2 - indent;
    const words = text.split(/\s+/).filter(Boolean);
    let line = "";
    const lines: string[] = [];
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (activeFont.widthOfTextAtSize(candidate, size) > maxWidth) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    for (const entry of lines) {
      if (y < margin + size) {
        page = pdf.addPage([width, height]);
        y = height - margin;
      }
      page.drawText(entry, {
        x: margin + indent,
        y,
        size,
        font: activeFont,
        color: rgb(0.1, 0.13, 0.18),
      });
      y -= size * 1.45;
    }
  };

  write(exam.title, 18, true);
  write(subtitle, 11);
  y -= 6;
  write(exam.instructions, 10);
  y -= 10;

  for (const question of exam.questions) {
    y -= 6;
    write(`Question ${question.number} (${question.marks} marks)`, 11, true);
    write(question.question, 10);
    for (const [index, option] of (question.options ?? []).entries()) {
      write(`${String.fromCharCode(65 + index)}. ${option}`, 10, false, 16);
    }
    if (withAnswers) write(`Answer: ${question.answer}`, 10, false, 16);
  }

  const bytes = await pdf.save();
  return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
