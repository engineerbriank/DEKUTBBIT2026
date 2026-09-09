import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Send, Trash2, Upload } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { askAI, deleteDocument, listDocuments, listMessages, processDocument } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({
    meta: [
      { title: "AI Assistant — BBITClassPoint" },
      {
        name: "description",
        content: "Upload your notes and ask questions answered from that exact document by real AI.",
      },
      { property: "og:title", content: "AI Assistant — BBITClassPoint" },
      { property: "og:description", content: "Study help grounded in your own uploaded material." },
    ],
  }),
  component: AiPage,
});

function AiPage() {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useServerFn(listDocuments);
  const fetchMessages = useServerFn(listMessages);
  const process = useServerFn(processDocument);
  const remove = useServerFn(deleteDocument);
  const ask = useServerFn(askAI);

  const { data: documents } = useQuery({ queryKey: ["ai-documents"], queryFn: () => fetchDocuments() });
  const { data: messages } = useQuery({
    queryKey: ["ai-messages", documentId],
    queryFn: () => fetchMessages({ data: { documentId } }),
  });

  const askMutation = useMutation({
    mutationFn: (value: string) => ask({ data: { question: value, documentId } }),
    onSuccess: () => {
      setQuestion("");
      queryClient.invalidateQueries({ queryKey: ["ai-messages", documentId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const { data: session } = await supabase.auth.getUser();
      const userId = session.user?.id;
      if (!userId) throw new Error("Please sign in again.");
      const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
      const { error } = await supabase.storage.from("ai-uploads").upload(path, file, {
        contentType: file.type || "application/octet-stream",
      });
      if (error) throw error;
      const doc = await process({
        data: { filePath: path, fileName: file.name, mimeType: file.type || "application/octet-stream" },
      });
      toast.success(`Read ${doc.char_count.toLocaleString()} characters from ${file.name}`);
      setDocumentId(doc.id);
      queryClient.invalidateQueries({ queryKey: ["ai-documents"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">AI Assistant</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload a PDF, DOCX, PPTX or text file and the assistant answers from that document's real content.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-3">
          <input
            ref={fileInput}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.pptx,.txt,.md,.csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <Button className="w-full" onClick={() => fileInput.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {uploading ? "Reading document…" : "Upload study material"}
          </Button>

          <button
            type="button"
            onClick={() => setDocumentId(null)}
            className={cn(
              "w-full rounded-lg border border-border px-3 py-2 text-left text-sm",
              documentId === null ? "bg-secondary text-secondary-foreground" : "bg-card",
            )}
          >
            General chat (no document)
          </button>

          {(documents ?? []).map((doc) => (
            <div
              key={doc.id}
              className={cn(
                "flex items-start gap-2 rounded-lg border border-border px-3 py-2",
                documentId === doc.id ? "bg-secondary" : "bg-card",
              )}
            >
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setDocumentId(doc.id)}>
                <p className="truncate text-sm font-medium">{doc.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.char_count.toLocaleString()} characters indexed
                </p>
              </button>
              <button
                type="button"
                aria-label={`Delete ${doc.file_name}`}
                className="text-muted-foreground hover:text-destructive"
                onClick={async () => {
                  await remove({ data: { id: doc.id } });
                  if (documentId === doc.id) setDocumentId(null);
                  queryClient.invalidateQueries({ queryKey: ["ai-documents"] });
                  toast.success("Document removed");
                }}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </aside>

        <section className="surface-card flex min-h-[60vh] flex-col p-4">
          <div className="flex-1 space-y-4 overflow-y-auto">
            {!(messages ?? []).length ? (
              <p className="text-sm text-muted-foreground">
                Ask anything — for example “Summarise the key points of lecture 3” or “Give me 5 revision
                questions on this topic”.
              </p>
            ) : null}
            {(messages ?? []).map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[85%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap",
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {message.content}
              </div>
            ))}
            {askMutation.isPending ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Thinking…
              </div>
            ) : null}
          </div>

          <form
            className="mt-4 flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (question.trim()) askMutation.mutate(question.trim());
            }}
          >
            <Textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask a question about your material…"
              className="min-h-[60px]"
            />
            <Button type="submit" disabled={askMutation.isPending || !question.trim()}>
              <Send className="size-4" />
            </Button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
