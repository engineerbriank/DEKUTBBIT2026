import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Trash2, Upload } from "lucide-react";

import { AppShell, useMe } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { formatBytes } from "@/components/ResourceCard";
import { listCategories, listUnits } from "@/lib/catalog.functions";
import {
  adminHasOwner,
  adminListAnnouncements,
  adminListResources,
  adminListTimetable,
  claimFirstAdmin,
  createClassSlot,
  createResource,
  deleteAnnouncement,
  deleteClassSlot,
  deleteResource,
  deleteUnit,
  discardTimetableDrafts,
  importTimetableFromFile,
  publishTimetableDrafts,
  updateClassSlot,
  updateResource,
  upsertAnnouncement,
  upsertUnit,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — BBITClassPoint" },
      { name: "description", content: "Publish resources, units, timetable slots and announcements." },
      { property: "og:title", content: "Admin — BBITClassPoint" },
      { property: "og:description", content: "Administrator tools for BBITClassPoint." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: me, refetch: refetchMe } = useMe();
  const checkOwner = useServerFn(adminHasOwner);
  const claim = useServerFn(claimFirstAdmin);
  const queryClient = useQueryClient();
  const { data: owner } = useQuery({
    queryKey: ["admin-owner"],
    queryFn: () => checkOwner(),
    enabled: !me?.isAdmin,
  });

  if (!me) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  if (!me.isAdmin) {
    return (
      <AppShell>
        <div className="surface-card mx-auto mt-10 max-w-md p-6 text-center">
          <ShieldCheck className="mx-auto size-8 text-primary" />
          <h1 className="mt-3 text-lg font-semibold">Administrator access required</h1>
          {owner && !owner.hasAdmin ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                No administrator exists yet. Claim the role to set up this platform.
              </p>
              <Button
                className="mt-4"
                onClick={async () => {
                  try {
                    await claim();
                    await refetchMe();
                    queryClient.invalidateQueries();
                    toast.success("You are now the administrator");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Could not claim admin");
                  }
                }}
              >
                Become the administrator
              </Button>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Your account is a student account. Ask an administrator for access.
            </p>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Admin panel</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Anything you publish here appears for students immediately.
      </p>
      <UploadSection />
      <ResourceTable />
      <UnitsSection />
      <TimetableSection />
      <AnnouncementsSection />
    </AppShell>
  );
}

function UploadSection() {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const fetchUnits = useServerFn(listUnits);
  const fetchCategories = useServerFn(listCategories);
  const create = useServerFn(createResource);

  const { data: units } = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits() });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => fetchCategories() });

  const [form, setForm] = useState({
    title: "",
    description: "",
    topic: "",
    lecturer: "",
    unitId: "",
    categoryId: "",
    status: "published" as "published" | "draft",
  });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      toast.error("Choose a file to upload");
      return;
    }
    setBusy(true);
    try {
      const unit = (units ?? []).find((item) => item.id === form.unitId);
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${unit?.code ?? "general"}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from("resources").upload(path, file, {
        contentType: file.type || "application/octet-stream",
      });
      if (error) throw error;
      await create({
        data: {
          ...form,
          filePath: path,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
        },
      });
      toast.success(`${form.title} published`);
      setForm({
        title: "",
        description: "",
        topic: "",
        lecturer: "",
        unitId: form.unitId,
        categoryId: form.categoryId,
        status: "published",
      });
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      queryClient.invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="surface-card mt-6 p-5">
      <h2 className="text-lg font-semibold">Upload a resource</h2>
      <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            required
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="BEC 2110 — Lecture 3 Notes"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Unit</Label>
          <select
            required
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
            value={form.unitId}
            onChange={(event) => setForm({ ...form, unitId: event.target.value })}
          >
            <option value="">Select unit</option>
            {(units ?? []).map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.code} — {unit.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <select
            required
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
            value={form.categoryId}
            onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
          >
            <option value="">Select category</option>
            {(categories ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="topic">Topic</Label>
          <Input
            id="topic"
            value={form.topic}
            onChange={(event) => setForm({ ...form, topic: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lecturer">Lecturer</Label>
          <Input
            id="lecturer"
            value={form.lecturer}
            onChange={(event) => setForm({ ...form, lecturer: event.target.value })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="file">File</Label>
          <Input
            id="file"
            ref={fileInput}
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value as "published" | "draft" })}
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {busy ? "Uploading…" : "Publish resource"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function ResourceTable() {
  const queryClient = useQueryClient();
  const fetchResources = useServerFn(adminListResources);
  const update = useServerFn(updateResource);
  const remove = useServerFn(deleteResource);
  const { data } = useQuery({ queryKey: ["admin-resources"], queryFn: () => fetchResources() });

  const mutate = useMutation({
    mutationFn: (input: { id: string; status: "published" | "draft" | "archived" }) =>
      update({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Resource updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="surface-card mt-8 p-5">
      <h2 className="text-lg font-semibold">All resources ({data?.length ?? 0})</h2>
      <div className="mt-4 space-y-2">
        {(data ?? []).map((resource) => (
          <div key={resource.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{resource.title}</p>
              <p className="text-xs text-muted-foreground">
                {(resource.unit as { code?: string } | null)?.code} ·{" "}
                {(resource.category as { name?: string } | null)?.name} · {formatBytes(resource.file_size)} ·{" "}
                {resource.download_count} downloads
              </p>
            </div>
            <Badge variant={resource.status === "published" ? "default" : "secondary"}>
              {resource.status}
            </Badge>
            <select
              className="h-8 rounded-md border border-input bg-card px-2 text-xs"
              value={resource.status}
              onChange={(event) =>
                mutate.mutate({
                  id: resource.id,
                  status: event.target.value as "published" | "draft" | "archived",
                })
              }
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Delete ${resource.title}`}
              onClick={async () => {
                await remove({ data: { id: resource.id } });
                queryClient.invalidateQueries();
                toast.success("Resource deleted");
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        {!(data ?? []).length ? (
          <p className="text-sm text-muted-foreground">Nothing uploaded yet.</p>
        ) : null}
      </div>
    </section>
  );
}

function UnitsSection() {
  const queryClient = useQueryClient();
  const fetchUnits = useServerFn(listUnits);
  const save = useServerFn(upsertUnit);
  const { data } = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits() });
  const [form, setForm] = useState({ code: "", name: "", lecturer: "", year: 1, semester: 1 });

  return (
    <section className="surface-card mt-8 p-5">
      <h2 className="text-lg font-semibold">Units ({data?.length ?? 0})</h2>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-5"
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            await save({ data: form });
            setForm({ code: "", name: "", lecturer: "", year: 1, semester: 1 });
            queryClient.invalidateQueries();
            toast.success("Unit saved");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save unit");
          }
        }}
      >
        <Input
          required
          placeholder="Code"
          value={form.code}
          onChange={(event) => setForm({ ...form, code: event.target.value })}
        />
        <Input
          required
          placeholder="Unit name"
          className="sm:col-span-2"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        <Input
          placeholder="Lecturer"
          value={form.lecturer}
          onChange={(event) => setForm({ ...form, lecturer: event.target.value })}
        />
        <Button type="submit">Add unit</Button>
      </form>
      {!(data ?? []).length ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No units yet. Add each unit's real code and title above, or upload the timetable below and the
          units found in it are created for you.
        </p>
      ) : null}
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {(data ?? []).map((unit) => (
          <li
            key={unit.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
          >
            <span>
              <span className="font-medium">{unit.code}</span> — {unit.name}{" "}
              <span className="text-xs text-muted-foreground">({unit.resourceCount} published)</span>
            </span>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Delete ${unit.code}`}
              onClick={async () => {
                try {
                  await removeUnit({ data: { id: unit.id } });
                  queryClient.invalidateQueries();
                  toast.success(`${unit.code} removed`);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not remove unit");
                }
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TimetableSection() {
  const queryClient = useQueryClient();
  const fetchUnits = useServerFn(listUnits);
  const fetchTimetable = useServerFn(listTimetable);
  const create = useServerFn(createClassSlot);
  const remove = useServerFn(deleteClassSlot);
  const { data: units } = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits() });
  const { data: slots } = useQuery({ queryKey: ["timetable"], queryFn: () => fetchTimetable() });
  const [form, setForm] = useState({
    unitId: "",
    dayOfWeek: 1,
    startTime: "08:00",
    endTime: "10:00",
    venue: "",
  });

  return (
    <section className="surface-card mt-8 p-5">
      <h2 className="text-lg font-semibold">Timetable</h2>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-6"
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            await create({ data: form });
            queryClient.invalidateQueries();
            toast.success("Class added");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not add class");
          }
        }}
      >
        <select
          required
          className="h-9 rounded-md border border-input bg-card px-2 text-sm sm:col-span-2"
          value={form.unitId}
          onChange={(event) => setForm({ ...form, unitId: event.target.value })}
        >
          <option value="">Unit</option>
          {(units ?? []).map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.code}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-card px-2 text-sm"
          value={form.dayOfWeek}
          onChange={(event) => setForm({ ...form, dayOfWeek: Number(event.target.value) })}
        >
          {DAYS.map((day, index) => (
            <option key={day} value={index}>
              {day}
            </option>
          ))}
        </select>
        <Input
          type="time"
          value={form.startTime}
          onChange={(event) => setForm({ ...form, startTime: event.target.value })}
        />
        <Input
          type="time"
          value={form.endTime}
          onChange={(event) => setForm({ ...form, endTime: event.target.value })}
        />
        <Input
          placeholder="Venue"
          value={form.venue}
          onChange={(event) => setForm({ ...form, venue: event.target.value })}
        />
        <Button type="submit" className="sm:col-span-6 sm:w-fit">
          Add class
        </Button>
      </form>
      <ul className="mt-4 space-y-2">
        {((slots ?? []) as unknown as Array<{
          id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          venue: string;
          unit: { code: string } | null;
        }>).map((slot) => (
          <li key={slot.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
            <span>
              {DAYS[slot.day_of_week]} {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)} ·{" "}
              {slot.unit?.code} {slot.venue ? `· ${slot.venue}` : ""}
            </span>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Delete class"
              onClick={async () => {
                await remove({ data: { id: slot.id } });
                queryClient.invalidateQueries();
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AnnouncementsSection() {
  const queryClient = useQueryClient();
  const fetchAnnouncements = useServerFn(adminListAnnouncements);
  const save = useServerFn(upsertAnnouncement);
  const remove = useServerFn(deleteAnnouncement);
  const { data } = useQuery({ queryKey: ["admin-announcements"], queryFn: () => fetchAnnouncements() });
  const [form, setForm] = useState({ title: "", body: "", status: "published" as "published" | "draft" });

  return (
    <section className="surface-card mt-8 p-5">
      <h2 className="text-lg font-semibold">Announcements</h2>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            await save({ data: form });
            setForm({ title: "", body: "", status: "published" });
            queryClient.invalidateQueries();
            toast.success("Announcement saved");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save");
          }
        }}
      >
        <Input
          required
          placeholder="Title"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
        />
        <Textarea
          placeholder="Message"
          value={form.body}
          onChange={(event) => setForm({ ...form, body: event.target.value })}
        />
        <div className="flex gap-3">
          <select
            className="h-9 rounded-md border border-input bg-card px-2 text-sm"
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value as "published" | "draft" })}
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <Button type="submit">Post announcement</Button>
        </div>
      </form>
      <ul className="mt-4 space-y-2">
        {(data ?? []).map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.status}</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Delete announcement"
              onClick={async () => {
                await remove({ data: { id: item.id } });
                queryClient.invalidateQueries();
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
