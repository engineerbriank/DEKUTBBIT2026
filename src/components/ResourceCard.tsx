import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Download, ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";

import { getResourceLink, type ResourceRow } from "@/lib/catalog.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function formatBytes(size: number) {
  if (!size) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function ResourceCard({ resource }: { resource: ResourceRow }) {
  const getLink = useServerFn(getResourceLink);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<"view" | "download" | null>(null);

  const open = async (download: boolean) => {
    setBusy(download ? "download" : "view");
    try {
      const { url, fileName } = await getLink({ data: { id: resource.id, download } });
      const anchor = document.createElement("a");
      anchor.href = url;
      if (download) {
        anchor.download = fileName;
      } else {
        anchor.target = "_blank";
        anchor.rel = "noopener";
      }
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      if (download) {
        toast.success(`Downloading ${fileName}`);
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open this file");
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="surface-card flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <FileText className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{resource.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {resource.unit?.code} · {formatBytes(resource.file_size)} · {resource.download_count}{" "}
            downloads
          </p>
        </div>
        {resource.category ? <Badge variant="secondary">{resource.category.name}</Badge> : null}
      </div>

      {resource.description ? (
        <p className="line-clamp-2 text-sm text-muted-foreground">{resource.description}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {resource.topic ? <span>Topic: {resource.topic}</span> : null}
        {resource.lecturer ? <span>· {resource.lecturer}</span> : null}
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => open(false)} disabled={busy !== null}>
          <ExternalLink className="size-4" /> View
        </Button>
        <Button size="sm" onClick={() => open(true)} disabled={busy !== null}>
          <Download className="size-4" /> Download
        </Button>
      </div>
    </article>
  );
}
