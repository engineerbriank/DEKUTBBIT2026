import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { adminListSmsRecipients, adminSendSms } from "@/lib/sms.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function SmsAdminSection() {
  const qc = useQueryClient();
  const list = useServerFn(adminListSmsRecipients);
  const send = useServerFn(adminSendSms);
  const { data, isLoading } = useQuery({ queryKey: ["admin-sms"], queryFn: () => list() });
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"all" | "selected">("all");
  const [selected, setSelected] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: () =>
      send({ data: { message, ...(mode === "selected" ? { userIds: selected } : {}) } }),
    onSuccess: (r) => {
      toast.success(r.status === "no_recipients" ? "No premium members to send to" : `SMS sent to ${r.accepted} of ${r.total}`);
      setMessage("");
      qc.invalidateQueries({ queryKey: ["admin-sms"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const recipients = data?.recipients ?? [];
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="mt-4 space-y-4">
      <div className="surface-card space-y-3 p-4">
        <h2 className="font-display text-base font-semibold">Send SMS</h2>
        <p className="text-xs text-muted-foreground">
          Goes to premium members with a verified phone ({recipients.length} active).
          Announcements, documents, timetable updates and tomorrow's classes (8:00 PM) are sent automatically.
        </p>
        <Textarea
          rows={4}
          maxLength={480}
          placeholder="Type your message…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <p className="text-right text-[11px] text-muted-foreground">{message.length}/480</p>
        <div className="flex gap-2">
          <Button size="sm" variant={mode === "all" ? "default" : "outline"} className="rounded-xl" onClick={() => setMode("all")}>
            All premium members
          </Button>
          <Button size="sm" variant={mode === "selected" ? "default" : "outline"} className="rounded-xl" onClick={() => setMode("selected")}>
            Choose members
          </Button>
        </div>
        {mode === "selected" ? (
          <ul className="max-h-60 space-y-1 overflow-auto rounded-xl border border-border p-2">
            {isLoading ? <li className="text-sm text-muted-foreground">Loading…</li> : null}
            {recipients.map((r) => (
              <li key={r.userId}>
                <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary">
                  <input type="checkbox" checked={selected.includes(r.userId)} onChange={() => toggle(r.userId)} />
                  <span className="flex-1 truncate">{r.name}</span>
                  <span className="text-xs text-muted-foreground">+{r.phone}</span>
                </label>
              </li>
            ))}
            {!isLoading && !recipients.length ? (
              <li className="text-sm text-muted-foreground">No premium members with verified phones yet.</li>
            ) : null}
          </ul>
        ) : null}
        <Button
          className="w-full rounded-xl"
          disabled={mutation.isPending || !message.trim() || (mode === "selected" && !selected.length)}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Sending…" : "Send SMS"}
        </Button>
      </div>

      <div className="surface-card p-4">
        <h3 className="font-display text-sm font-semibold">Recent SMS</h3>
        <ul className="mt-2 divide-y divide-border">
          {(data?.logs ?? []).map((l: any) => (
            <li key={l.id} className="py-2 text-sm">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="capitalize">{String(l.kind).replace("_", " ")} · {l.status.replace("_", " ")}</span>
                <span>{l.accepted_count}/{l.recipient_count} · {new Date(l.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-1 line-clamp-2 whitespace-pre-wrap">{l.message}</p>
            </li>
          ))}
          {!(data?.logs ?? []).length ? <li className="py-2 text-sm text-muted-foreground">Nothing sent yet.</li> : null}
        </ul>
      </div>
    </div>
  );
}
