import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Wand2 } from "lucide-react";

import { AppShell, useMe } from "@/components/AppShell";
import { generateExam, listDocuments, listExams } from "@/lib/ai.functions";
import { listUnits } from "@/lib/catalog.functions";
import { buildExamPdf, downloadBlob, type ExamPaper } from "@/lib/exam-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/exam")({
  head: () => ({
    meta: [
      { title: "Exam Generator — BBITClassPoint" },
      {
        name: "description",
        content: "Generate a real practice exam from your unit material and download it as a PDF.",
      },
      { property: "og:title", content: "Exam Generator — BBITClassPoint" },
      { property: "og:description", content: "AI-written practice papers with downloadable PDFs." },
    ],
  }),
  component: ExamPage,
});

function ExamPage() {
  const { data: me, isLoading: loadingMe } = useMe();
  const queryClient = useQueryClient();
  const fetchUnits = useServerFn(listUnits);
  const fetchDocuments = useServerFn(listDocuments);
  const fetchExams = useServerFn(listExams);
  const generate = useServerFn(generateExam);

  const { data: units } = useQuery({
    queryKey: ["units"],
    queryFn: () => fetchUnits(),
    enabled: Boolean(me?.isAdmin),
  });
  const { data: documents } = useQuery({
    queryKey: ["ai-documents"],
    queryFn: () => fetchDocuments(),
    enabled: Boolean(me?.isAdmin),
  });
  const { data: exams } = useQuery({
    queryKey: ["exams"],
    queryFn: () => fetchExams(),
    enabled: Boolean(me?.isAdmin),
  });

  const [unitId, setUnitId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(8);
  const [difficulty, setDifficulty] = useState("standard");

  const mutation = useMutation({
    mutationFn: () =>
      generate({
        data: {
          unitId: unitId || null,
          documentId: documentId || null,
          topic,
          questionCount,
          difficulty,
        },
      }),
    onSuccess: () => {
      toast.success("Exam paper generated");
      queryClient.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const download = async (exam: ExamPaper, subtitle: string, withAnswers: boolean) => {
    const blob = await buildExamPdf(exam, subtitle, withAnswers);
    downloadBlob(blob, `${exam.title.replace(/[^\w\s-]/g, "").slice(0, 60) || "exam"}.pdf`);
    toast.success("PDF downloaded");
  };

  const latest = mutation.data;

  if (loadingMe)
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </AppShell>
    );
  if (!me?.isAdmin)
    return (
      <AppShell title="Exam Generator" icon={<Wand2 className="size-5" />}>
        <div className="surface-card mx-auto max-w-md p-6 text-center">
          <Wand2 className="mx-auto size-8 text-primary" />
          <h2 className="mt-3 text-lg font-semibold">Administrator access required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Exam generation is managed by the platform administrator.
          </p>
        </div>
      </AppShell>
    );

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Exam Generator</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Questions are written by AI from the unit's published material and your own uploaded notes.
      </p>

      <form
        className="surface-card mt-6 grid gap-4 p-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label>Unit</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
            value={unitId}
            onChange={(event) => setUnitId(event.target.value)}
          >
            <option value="">No specific unit</option>
            {(units ?? []).map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.code} — {unit.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Your uploaded notes (optional)</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
            value={documentId}
            onChange={(event) => setDocumentId(event.target.value)}
          >
            <option value="">None</option>
            {(documents ?? []).map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.file_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="topic">Focus topic</Label>
          <Input
            id="topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="e.g. Normalisation"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="count">Questions</Label>
            <Input
              id="count"
              type="number"
              min={1}
              max={20}
              value={questionCount}
              onChange={(event) => setQuestionCount(Number(event.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
            >
              <option value="introductory">Introductory</option>
              <option value="standard">Standard</option>
              <option value="challenging">Challenging</option>
            </select>
          </div>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wand2 className="size-4" />
            )}
            {mutation.isPending ? "Writing your paper…" : "Generate exam"}
          </Button>
        </div>
      </form>

      {latest ? (
        <section className="surface-card mt-8 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{latest.exam.title}</h2>
              <p className="text-sm text-muted-foreground">{latest.unitLabel}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => download(latest.exam, latest.unitLabel, false)}
              >
                <Download className="size-4" /> Question paper
              </Button>
              <Button size="sm" onClick={() => download(latest.exam, latest.unitLabel, true)}>
                <Download className="size-4" /> With answers
              </Button>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{latest.exam.instructions}</p>
          <ol className="mt-5 space-y-4">
            {latest.exam.questions.map((question) => (
              <li key={question.number}>
                <p className="text-sm font-medium">
                  {question.number}. {question.question}{" "}
                  <span className="text-xs text-muted-foreground">({question.marks} marks)</span>
                </p>
                {question.options?.length ? (
                  <ul className="mt-1 space-y-0.5 pl-4 text-sm text-muted-foreground">
                    {question.options.map((option, index) => (
                      <li key={option}>
                        {String.fromCharCode(65 + index)}. {option}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {(exams ?? []).length ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Your saved papers</h2>
          <ul className="mt-3 space-y-2">
            {(exams ?? []).map((exam) => (
              <li
                key={exam.id}
                className="surface-card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="text-sm font-medium">{exam.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(exam.created_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => download(exam.content as unknown as ExamPaper, exam.title, true)}
                >
                  <Download className="size-4" /> PDF
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
