import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Bot, FileText, Loader2, Trash2, Upload } from "lucide-react";

import { AppShell, useMe } from "@/components/AppShell";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { supabase } from "@/integrations/supabase/client";
import {
  askAI,
  deleteDocument,
  listDocuments,
  listMessages,
  processDocument,
} from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({
    meta: [
      { title: "AI Study Assistant — BBITClassPoint" },
      {
        name: "description",
        content: "Ask questions grounded in your own uploaded BBIT study documents.",
      },
      { property: "og:title", content: "AI Study Assistant — BBITClassPoint" },
      {
        property: "og:description",
        content: "Real study help grounded in your uploaded material.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiPage,
});

function AiPage() {
  const { data: me, isLoading: loadingMe } = useMe();
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
  const { data: documents } = useQuery({
    queryKey: ["ai-documents"],
    queryFn: () => fetchDocuments(),
    enabled: Boolean(me?.isAdmin),
  });
  const { data: messages } = useQuery({
    queryKey: ["ai-messages", documentId],
    queryFn: () => fetchMessages({ data: { documentId } }),
    enabled: Boolean(me?.isAdmin),
  });
  const selected = (documents ?? []).find((doc) => doc.id === documentId);

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
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Please sign in again.");
      const path = `${data.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
      const result = await supabase.storage
        .from("ai-uploads")
        .upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (result.error) throw result.error;
      const doc = await process({
        data: {
          filePath: path,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
        },
      });
      setDocumentId(doc.id);
      queryClient.invalidateQueries({ queryKey: ["ai-documents"] });
      toast.success(`${file.name} is ready to study`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  if (loadingMe)
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </AppShell>
    );
  if (!me?.isAdmin)
    return (
      <AppShell title="AI Study Assistant" icon={<Bot className="size-5" />}>
        <div className="surface-card mx-auto max-w-md p-6 text-center">
          <Bot className="mx-auto size-8 text-primary" />
          <h2 className="mt-3 text-lg font-semibold">Administrator access required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            AI tools are managed by the platform administrator.
          </p>
        </div>
      </AppShell>
    );

  return (
    <AppShell title="AI Study Assistant" icon={<Bot className="size-5" />}>
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
      <div className="grid min-h-[68vh] gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-2">
          <Button
            className="w-full"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}{" "}
            {uploading ? "Reading…" : "Upload material"}
          </Button>
          <button
            type="button"
            onClick={() => setDocumentId(null)}
            className={cn(
              "surface-card w-full p-3 text-left text-sm font-semibold",
              documentId === null && "border-accent bg-secondary",
            )}
          >
            General study chat
          </button>
          {(documents ?? []).map((doc) => (
            <div
              key={doc.id}
              className={cn(
                "surface-card flex items-center gap-2 p-3",
                documentId === doc.id && "border-accent bg-secondary",
              )}
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => setDocumentId(doc.id)}
              >
                <p className="truncate text-sm font-semibold">{doc.file_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {doc.char_count.toLocaleString()} characters
                </p>
              </button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Delete ${doc.file_name}`}
                onClick={async () => {
                  await remove({ data: { id: doc.id } });
                  if (documentId === doc.id) setDocumentId(null);
                  queryClient.invalidateQueries({ queryKey: ["ai-documents"] });
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </aside>
        <section className="surface-card flex min-h-[62vh] flex-col overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">{selected?.file_name ?? "General study chat"}</p>
            <p className="text-xs text-muted-foreground">
              {selected ? "Answers use this document" : "Ask a BBIT study question"}
            </p>
          </div>
          <Conversation className="min-h-0">
            <ConversationContent>
              {!(messages ?? []).length ? (
                <ConversationEmptyState
                  icon={<FileText className="size-9" />}
                  title="Ready when you are"
                  description={
                    selected
                      ? "Ask a question about this document."
                      : "Upload material for grounded answers, or ask a general question."
                  }
                />
              ) : null}
              {(messages ?? []).map((message) => (
                <Message key={message.id} from={message.role === "user" ? "user" : "assistant"}>
                  <MessageContent
                    className={
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "rounded-xl bg-secondary p-3"
                    }
                  >
                    {message.role === "assistant" ? (
                      <MessageResponse>{message.content}</MessageResponse>
                    ) : (
                      message.content
                    )}
                  </MessageContent>
                </Message>
              ))}
              {askMutation.isPending ? (
                <Message from="assistant">
                  <MessageContent className="rounded-xl bg-secondary p-3">
                    <Shimmer>Thinking through your material…</Shimmer>
                  </MessageContent>
                </Message>
              ) : null}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
          <div className="border-t border-border p-3">
            <PromptInput
              onSubmit={({ text }) => {
                const value = text.trim();
                if (value) askMutation.mutate(value);
              }}
            >
              <PromptInputBody>
                <PromptInputTextarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask about your material…"
                />
              </PromptInputBody>
              <PromptInputFooter>
                <span className="text-[11px] text-muted-foreground">Enter to send</span>
                <PromptInputSubmit
                  status={askMutation.isPending ? "submitted" : "ready"}
                  disabled={!question.trim()}
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
