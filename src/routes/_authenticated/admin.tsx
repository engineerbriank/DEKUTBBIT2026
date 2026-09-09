import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  CalendarDays,
  FileStack,
  Loader2,
  Megaphone,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
} from "lucide-react";

import { AppShell, useMe } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { formatBytes } from "@/components/ResourceCard";
import { listCategories, listUnits } from "@/lib/catalog.functions";
import {
  adminHasOwner,
  adminListAnnouncements,
  adminListMembers,
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
  setMemberAdmin,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      <div className="surface-card overflow-hidden p-0">
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">Admin panel</h1>
              <p className="text-sm text-muted-foreground">
                Anything you publish here appears for students immediately.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="resources" className="mt-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl bg-card/60 p-1 backdrop-blur">
          <TabsTrigger value="resources" className="gap-2 rounded-xl">
            <FileStack className="size-4" /> Resources
          </TabsTrigger>
          <TabsTrigger value="units" className="gap-2 rounded-xl">
            <BookOpen className="size-4" /> Units
          </TabsTrigger>
          <TabsTrigger value="timetable" className="gap-2 rounded-xl">
            <CalendarDays className="size-4" /> Timetable
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-2 rounded-xl">
            <Megaphone className="size-4" /> Announcements
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2 rounded-xl">
            <Users className="size-4" /> Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resources">
          <UploadSection />
          <ResourceTable />
        </TabsContent>
        <TabsContent value="units">
          <UnitsSection />
        </TabsContent>
        <TabsContent value="timetable">
          <TimetableSection />
        </TabsContent>
        <TabsContent value="announcements">
          <AnnouncementsSection />
        </TabsContent>
        <TabsContent value="members">
          <MembersSection />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function MembersSection() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const fetchMembers = useServerFn(adminListMembers);
  const setAdmin = useServerFn(setMemberAdmin);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["admin-members"], queryFn: () => fetchMembers() });

  const term = search.trim().toLowerCase();
  const members = (data ?? []).filter(
    (member) =>
      !term ||
      member.email.toLowerCase().includes(term) ||
      (member.fullName ?? "").toLowerCase().includes(term),
  );
  const adminCount = (data ?? []).filter((member) => member.isAdmin).length;

  const toggle = useMutation({
    mutationFn: (input: { userId: string; isAdmin: boolean }) => setAdmin({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-members"] });
      toast.success("Member access updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="surface-card mt-6 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Members ({data?.length ?? 0})</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Everyone signed up for BBITClassPoint · {adminCount} administrator{adminCount === 1 ? "" : "s"}
          </p>
        </div>
        <Input
          className="w-full sm:w-64"
          placeholder="Search name or email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="mt-4 space-y-2">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading members…</p> : null}
        {members.map((member) => (
          <div
            key={member.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-card/50 p-3"
          >
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
              {(member.fullName || member.email || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{member.fullName || "Unnamed student"}</p>
              <p className="truncate text-xs text-muted-foreground">{member.email}</p>
            </div>
            <span className="text-xs text-muted-foreground">
              Joined {new Date(member.createdAt).toLocaleDateString()}
            </span>
            <Badge variant={member.isAdmin ? "default" : "secondary"}>
              {member.isAdmin ? "Administrator" : "Student"}
            </Badge>
            <Button
              size="sm"
              variant={member.isAdmin ? "ghost" : "outline"}
              disabled={toggle.isPending || member.id === me?.userId}
              onClick={() => toggle.mutate({ userId: member.id, isAdmin: !member.isAdmin })}
            >
              {member.isAdmin ? "Revoke admin" : "Make admin"}
            </Button>
          </div>
        ))}
        {!isLoading && !members.length ? (
          <p className="text-sm text-muted-foreground">No members match that search.</p>
        ) : null}
      </div>
    </section>
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
  const removeUnit = useServerFn(deleteUnit);
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

type AdminSlot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  venue: string;
  lecturer: string;
  status: string;
  source_file: string | null;
  group_label: string | null;
  unit_id: string | null;
  unit: { id: string; code: string; name: string } | null;
};

function TimetableSection() {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const fetchUnits = useServerFn(listUnits);
  const fetchSlots = useServerFn(adminListTimetable);
  const create = useServerFn(createClassSlot);
  const update = useServerFn(updateClassSlot);
  const remove = useServerFn(deleteClassSlot);
  const importFile = useServerFn(importTimetableFromFile);
  const publishDrafts = useServerFn(publishTimetableDrafts);
  const discardDrafts = useServerFn(discardTimetableDrafts);

  const { data: units } = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits() });
  const { data } = useQuery({ queryKey: ["admin-timetable"], queryFn: () => fetchSlots() });
  const slots = (data ?? []) as unknown as AdminSlot[];
  const drafts = slots.filter((slot) => slot.status === "draft");
  const live = slots.filter((slot) => slot.status === "published");

  const [instruction, setInstruction] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    unitId: "",
    dayOfWeek: 1,
    startTime: "08:00",
    endTime: "10:00",
    venue: "",
  });

  const runImport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      toast.error("Choose the original timetable file");
      return;
    }
    setBusy(true);
    try {
      const { data: session } = await supabase.auth.getUser();
      const userId = session.user?.id;
      if (!userId) throw new Error("Please sign in again.");
      const path = `${userId}/timetable/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
      const { error } = await supabase.storage.from("ai-uploads").upload(path, file, {
        contentType: file.type || "application/octet-stream",
      });
      if (error) throw error;
      const result = await importFile({
        data: {
          filePath: path,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          instruction,
        },
      });
      toast.success(`${result.drafted} class slots drafted — check and correct them below, then publish.`);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      queryClient.invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that timetable");
    } finally {
      setBusy(false);
    }
  };

  const patch = async (
    id: string,
    values: Partial<{
      unitId: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      venue: string;
      lecturer: string;
      groupLabel: string;
      status: "draft" | "published";
    }>,
  ) => {
    try {
      await update({ data: { ...values, id } });
      queryClient.invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the change");
    }
  };

  const SlotRow = ({ slot, editable }: { slot: AdminSlot; editable: boolean }) => (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3 text-sm">
      {editable ? (
        <>
          <select
            className="h-8 rounded-md border border-input bg-card px-2 text-xs"
            value={slot.unit_id ?? ""}
            onChange={(event) => patch(slot.id, { unitId: event.target.value })}
          >
            <option value="">Unit</option>
            {(units ?? []).map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.code}
              </option>
            ))}
          </select>
          <select
            className="h-8 rounded-md border border-input bg-card px-2 text-xs"
            value={slot.day_of_week}
            onChange={(event) => patch(slot.id, { dayOfWeek: Number(event.target.value) })}
          >
            {DAYS.map((day, index) => (
              <option key={day} value={index}>
                {day}
              </option>
            ))}
          </select>
          <Input
            type="time"
            className="h-8 w-28 text-xs"
            defaultValue={slot.start_time.slice(0, 5)}
            onBlur={(event) => patch(slot.id, { startTime: event.target.value })}
          />
          <Input
            type="time"
            className="h-8 w-28 text-xs"
            defaultValue={slot.end_time.slice(0, 5)}
            onBlur={(event) => patch(slot.id, { endTime: event.target.value })}
          />
          <Input
            className="h-8 w-32 text-xs"
            placeholder="Venue"
            defaultValue={slot.venue}
            onBlur={(event) => patch(slot.id, { venue: event.target.value })}
          />
          <Input
            className="h-8 w-36 text-xs"
            placeholder="Lecturer"
            defaultValue={slot.lecturer}
            onBlur={(event) => patch(slot.id, { lecturer: event.target.value })}
          />
        </>
      ) : (
        <span className="flex-1">
          {DAYS[slot.day_of_week]} {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)} ·{" "}
          {slot.unit?.code ?? "No unit"} {slot.venue ? `· ${slot.venue}` : ""}
          {slot.lecturer ? ` · ${slot.lecturer}` : ""}
        </span>
      )}
      {editable ? (
        <Button size="sm" variant="outline" onClick={() => patch(slot.id, { status: "published" })}>
          Publish
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => patch(slot.id, { status: "draft" })}>
          Unpublish
        </Button>
      )}
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
  );

  return (
    <section className="surface-card mt-8 p-5">
      <h2 className="text-lg font-semibold">Timetable</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload the original timetable, tell the assistant what to pull out, correct anything it got wrong, then
        publish it for students.
      </p>

      <form className="mt-4 grid gap-3" onSubmit={runImport}>
        <div className="space-y-1.5">
          <Label htmlFor="timetable-file">Original timetable (PDF, DOCX, TXT or CSV)</Label>
          <Input
            id="timetable-file"
            ref={fileInput}
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="timetable-instruction">What should be extracted?</Label>
          <Textarea
            id="timetable-instruction"
            placeholder="e.g. Extract only the year 2 semester 1 classes, keeping venues and lecturers as printed."
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={busy} className="w-fit">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {busy ? "Reading timetable…" : "Extract with AI"}
        </Button>
      </form>

      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold">Draft slots ({drafts.length})</h3>
          {drafts.length ? (
            <>
              <Button
                size="sm"
                onClick={async () => {
                  const result = await publishDrafts();
                  queryClient.invalidateQueries();
                  toast.success(`${result.published} slots published to students`);
                }}
              >
                Publish all drafts
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await discardDrafts();
                  queryClient.invalidateQueries();
                  toast.success("Drafts discarded");
                }}
              >
                Discard drafts
              </Button>
            </>
          ) : null}
        </div>
        {drafts.length ? (
          <ul className="mt-3 space-y-2">
            {drafts.map((slot) => (
              <SlotRow key={slot.id} slot={slot} editable />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No drafts waiting. Extract a timetable above.</p>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-semibold">Live for students ({live.length})</h3>
        <ul className="mt-3 space-y-2">
          {live.map((slot) => (
            <SlotRow key={slot.id} slot={slot} editable={false} />
          ))}
        </ul>
      </div>

      <form
        className="mt-8 grid gap-3 sm:grid-cols-6"
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
        <Button type="submit" variant="outline" className="sm:col-span-6 sm:w-fit">
          Add one class manually
        </Button>
      </form>
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
