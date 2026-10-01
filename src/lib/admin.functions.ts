import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: administrator access is required.");
}

/**
 * Copy a row into public.archived_records before it is deleted, so nothing an
 * administrator removes is ever irrecoverable. Never throws: a failed archive
 * must not block the caller, but it is logged for follow-up.
 */
export async function archiveRow(
  context: { supabase: any; userId: string },
  table: "resources" | "units" | "announcements" | "timetable" | "quick_links" | "assignments",
  id: string,
  labelFrom: (row: Record<string, any>) => string,
) {
  try {
    const { data: row } = await context.supabase.from(table).select("*").eq("id", id).maybeSingle();
    if (!row) return;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("archived_records").insert({
      table_name: table,
      record_id: id,
      label: labelFrom(row).slice(0, 200),
      payload: row,
      deleted_by: context.userId,
    });
  } catch (error) {
    console.error("archiveRow failed", table, id, error);
  }
}

/** Bootstrap: an approved email may claim administrator while no administrator exists yet. */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    if ((count ?? 0) > 0) throw new Error("An administrator already exists for this platform.");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();
    const email = (profile?.email ?? "").trim().toLowerCase();
    const { data: approved } = await supabaseAdmin
      .from("admin_allowlist")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    if (!approved) throw new Error("This account is not approved for administrator access.");

    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (insertError) throw new Error(insertError.message);
    return { ok: true };
  });

export const adminHasOwner = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    return { hasAdmin: (count ?? 0) > 0 };
  });

/** Every registered member with their role — administrators only. */
export const adminListMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id,full_name,email,created_at,avatar_path")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id,role");
    const roleMap = new Map<string, string[]>();
    for (const row of roles ?? []) {
      roleMap.set(row.user_id, [...(roleMap.get(row.user_id) ?? []), row.role as string]);
    }
    const { data: codes } = await supabaseAdmin.from("recovery_codes").select("user_id,code");
    const codeMap = new Map<string, string>();
    for (const row of codes ?? []) codeMap.set(row.user_id, row.code);
    const paths = (profiles ?? [])
      .map((profile) => profile.avatar_path)
      .filter((path): path is string => Boolean(path));
    const { data: signed } = paths.length
      ? await supabaseAdmin.storage.from("user-images").createSignedUrls(paths, 3600)
      : { data: [] };
    const imageUrls = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));
    return (profiles ?? []).map((profile) => ({
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      createdAt: profile.created_at,
      isAdmin: (roleMap.get(profile.id) ?? []).includes("admin"),
      roles: roleMap.get(profile.id) ?? [],
      recoveryCode: codeMap.get(profile.id) ?? "",
      avatarUrl: profile.avatar_path ? imageUrls.get(profile.avatar_path) ?? "" : "",
    }));
  });

/** Issue a fresh recovery code for a member (to send over WhatsApp). */
export const regenerateMemberCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input?.userId) throw new Error("Member id is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { makeCode } = await import("./recovery.functions");
    const code = makeCode();
    const { error } = await supabaseAdmin
      .from("recovery_codes")
      .upsert(
        { user_id: data.userId, code, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { code };
  });

/** Grant or revoke administrator access for a member. */
export const setMemberAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; isAdmin: boolean }) => {
    if (!input?.userId) throw new Error("Member id is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId && !data.isAdmin) {
      throw new Error("You cannot remove your own administrator access.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.isAdmin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** Grant or revoke class-representative access for a member. */
export const setMemberClassRep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; isClassRep: boolean }) => {
    if (!input?.userId) throw new Error("Member id is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.isClassRep) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "class_rep" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "class_rep");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminListResources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("resources")
      .select(
        "id,title,description,topic,lecturer,status,file_name,file_path,file_size,mime_type,download_count,created_at,unit_id,category_id,unit:units(id,code,name),category:categories(id,slug,name)",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      title: string;
      description?: string;
      topic?: string;
      lecturer?: string;
      unitId: string;
      categoryId: string;
      filePath: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      status: "published" | "draft";
    }) => {
      if (!input?.title?.trim()) throw new Error("Title is required");
      if (!input.unitId) throw new Error("Unit is required");
      if (!input.categoryId) throw new Error("Category is required");
      if (!input.filePath) throw new Error("A file must be uploaded");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("resources")
      .insert({
        title: data.title.trim(),
        description: data.description?.trim() ?? "",
        topic: data.topic?.trim() ?? "",
        lecturer: data.lecturer?.trim() ?? "",
        unit_id: data.unitId,
        category_id: data.categoryId,
        file_path: data.filePath,
        file_name: data.fileName,
        file_size: data.fileSize,
        mime_type: data.mimeType,
        status: data.status,
        uploaded_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.status === "published" && row?.id) {
      const [{ data: unit }, { data: category }] = await Promise.all([
        context.supabase.from("units").select("code,name").eq("id", data.unitId).maybeSingle(),
        context.supabase.from("categories").select("name").eq("id", data.categoryId).maybeSingle(),
      ]);
      const { notifyResourcePublished } = await import("@/lib/notify.server");
      await notifyResourcePublished(context, {
        resourceId: row.id,
        title: data.title.trim(),
        unit: unit ? `${unit.code} — ${unit.name}` : "BBIT",
        category: category?.name ?? "Resource",
        ...(data.lecturer?.trim() ? { uploadedBy: data.lecturer.trim() } : {}),
      });
      const sms = await import("@/lib/sms.server");
      await sms.broadcastSms(
        "resource",
        sms.smsTemplates.resource(data.title.trim(), unit ? `${unit.code} ${unit.name}` : "BBIT"),
        `resource-${row.id}`,
        context.userId,
      );
    }

    return row;
  });


export const updateResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      title?: string;
      description?: string;
      topic?: string;
      lecturer?: string;
      unitId?: string;
      categoryId?: string;
      status?: "published" | "draft" | "archived";
    }) => {
      if (!input?.id) throw new Error("Resource id is required");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: Record<string, string> = { updated_at: new Date().toISOString() };
    if (data.title !== undefined) patch["title"] = data.title;
    if (data.description !== undefined) patch["description"] = data.description;
    if (data.topic !== undefined) patch["topic"] = data.topic;
    if (data.lecturer !== undefined) patch["lecturer"] = data.lecturer;
    if (data.unitId !== undefined) patch["unit_id"] = data.unitId;
    if (data.categoryId !== undefined) patch["category_id"] = data.categoryId;
    if (data.status !== undefined) patch["status"] = data.status;

    const { error } = await context.supabase
      .from("resources")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Resource id is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await archiveRow(context, "resources", data.id, (row) => row["title"] ?? "Resource");
    const { error } = await context.supabase.from("resources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    // The stored file is deliberately kept so the record can be restored later.
    return { ok: true };
  });

export const upsertUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      code: string;
      name: string;
      lecturer?: string;
      year?: number;
      semester?: number;
      description?: string;
    }) => {
      if (!input?.code?.trim()) throw new Error("Unit code is required");
      if (!input?.name?.trim()) throw new Error("Unit name is required");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      lecturer: data.lecturer?.trim() ?? "",
      year: data.year ?? 1,
      semester: data.semester ?? 1,
      description: data.description?.trim() ?? "",
    };
    const query = data.id
      ? context.supabase.from("units").update(payload).eq("id", data.id)
      : context.supabase.from("units").insert(payload);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Unit id is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await archiveRow(context, "units", data.id, (row) => `${row["code"] ?? ""} ${row["name"] ?? ""}`.trim());
    const { error } = await context.supabase.from("units").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id?: string; title: string; body: string; status: "published" | "draft" }) => {
      if (!input?.title?.trim()) throw new Error("Title is required");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = { title: data.title.trim(), body: data.body ?? "", status: data.status };
    const query = data.id
      ? context.supabase.from("announcements").update(payload).eq("id", data.id).select("id")
      : context.supabase.from("announcements").insert(payload).select("id");
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const announcementId = data.id ?? rows?.[0]?.id;
    if (data.status === "published" && announcementId) {
      const { notifyAnnouncementPublished } = await import("@/lib/notify.server");
      await notifyAnnouncementPublished(context, {
        announcementId,
        title: payload.title,
        body: payload.body,
      });
      const sms = await import("@/lib/sms.server");
      await sms.broadcastSms(
        "announcement",
        sms.smsTemplates.announcement(payload.title, payload.body),
        `announcement-${announcementId}-${Date.now()}`,
        context.userId,
      );
    }
    return { ok: true };
  });


export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Announcement id is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await archiveRow(context, "announcements", data.id, (row) => row["title"] ?? "Announcement");
    const { error } = await context.supabase.from("announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("announcements")
      .select("id,title,body,status,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createClassSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      unitId: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      venue?: string;
      lecturer?: string;
    }) => {
      if (!input?.unitId) throw new Error("Unit is required");
      if (!input.startTime || !input.endTime) throw new Error("Start and end time are required");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("timetable").insert({
      unit_id: data.unitId,
      day_of_week: data.dayOfWeek,
      start_time: data.startTime,
      end_time: data.endTime,
      venue: data.venue ?? "",
      lecturer: data.lecturer ?? "",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteClassSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Class id is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await archiveRow(context, "timetable", data.id, (row) => `Class ${row["start_time"] ?? ""}`.trim());
    const { error } = await context.supabase.from("timetable").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Every class slot, drafts included — administrators only. */
export const adminListTimetable = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("timetable")
      .select(
        "id,day_of_week,start_time,end_time,venue,lecturer,status,source_file,group_label,unit_id,unit:units(id,code,name)",
      )
      .order("day_of_week")
      .order("start_time");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateClassSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      unitId?: string;
      dayOfWeek?: number;
      startTime?: string;
      endTime?: string;
      venue?: string;
      lecturer?: string;
      groupLabel?: string;
      status?: "draft" | "published";
    }) => {
      if (!input?.id) throw new Error("Class id is required");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: Record<string, unknown> = {};
    if (data.unitId !== undefined) patch["unit_id"] = data.unitId || null;
    if (data.dayOfWeek !== undefined) patch["day_of_week"] = data.dayOfWeek;
    if (data.startTime !== undefined) patch["start_time"] = data.startTime;
    if (data.endTime !== undefined) patch["end_time"] = data.endTime;
    if (data.venue !== undefined) patch["venue"] = data.venue;
    if (data.lecturer !== undefined) patch["lecturer"] = data.lecturer;
    if (data.groupLabel !== undefined) patch["group_label"] = data.groupLabel;
    if (data.status !== undefined) patch["status"] = data.status;
    const { error } = await context.supabase
      .from("timetable")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Publishes every draft class slot so students can see them. */
export const publishTimetableDrafts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("timetable")
      .update({ status: "published" } as never)
      .eq("status", "draft")
      .select("id");
    if (error) throw new Error(error.message);
    const published = data?.length ?? 0;
    if (published > 0) {
      const { notifyTimetablePublished } = await import("@/lib/notify.server");
      await notifyTimetablePublished(context, {
        classCount: published,
        batchKey: `${context.userId}-${(data ?? []).map((row: { id: string }) => row.id).join("").slice(0, 60)}`,
      });
      const sms = await import("@/lib/sms.server");
      await sms.broadcastSms("timetable", sms.smsTemplates.timetable(published), `timetable-${Date.now()}`, context.userId);
    }
    return { published };
  });


export const discardTimetableDrafts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("timetable").delete().eq("status", "draft");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const TIMETABLE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["entries"],
  properties: {
    entries: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "unitCode",
          "unitName",
          "dayOfWeek",
          "startTime",
          "endTime",
          "venue",
          "lecturer",
          "groupLabel",
        ],
        properties: {
          unitCode: { type: "string" },
          unitName: { type: "string" },
          dayOfWeek: { type: "integer" },
          startTime: { type: "string" },
          endTime: { type: "string" },
          venue: { type: "string" },
          lecturer: { type: "string" },
          groupLabel: { type: "string" },
        },
      },
    },
  },
} as const;

function normaliseTime(value: string) {
  const match = /^(\d{1,2})[:.]?(\d{2})?/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  if (Number.isNaN(hour) || hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

/**
 * Reads an uploaded timetable document, asks AI to turn it into class slots
 * following the administrator's instruction, and stores them as drafts.
 */
export const importTimetableFromFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { filePath: string; fileName: string; mimeType: string; instruction?: string }) => {
      if (!input?.filePath) throw new Error("Upload the timetable file first");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: blob, error: downloadError } = await supabaseAdmin.storage
      .from("ai-uploads")
      .download(data.filePath);
    if (downloadError || !blob)
      throw new Error(downloadError?.message ?? "Could not read the uploaded file.");

    const { extractText } = await import("./doc-extract.server");
    const text = await extractText(
      new Uint8Array(await blob.arrayBuffer()),
      data.fileName,
      data.mimeType,
    );
    if (!text || text.length < 30) {
      throw new Error(
        "No readable text was found in that timetable. Scanned images are not supported.",
      );
    }

    const { callGateway, userItem } = await import("./ai-gateway.server");
    const raw = await callGateway(
      [
        userItem(
          `Timetable document "${data.fileName}":\n\n${text.slice(0, 40000)}\n\n` +
            `Administrator instruction: ${data.instruction?.trim() || "Extract every class slot exactly as printed."}`,
        ),
      ],
      {
        instructions:
          "You convert university timetable documents into structured class slots. " +
          "Return one entry per class session. dayOfWeek: 0=Sunday … 6=Saturday. " +
          "startTime and endTime use 24-hour HH:MM. unitCode is the course code as printed (uppercase, no spaces); " +
          "unitName is the unit title if printed, otherwise repeat the code. " +
          "venue, lecturer and groupLabel are empty strings when not stated. Never invent classes that are not in the document.",
        jsonSchema: {
          name: "timetable_entries",
          schema: TIMETABLE_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    );

    let parsed: { entries?: Array<Record<string, unknown>> };
    try {
      parsed = JSON.parse(raw) as { entries?: Array<Record<string, unknown>> };
    } catch {
      throw new Error(
        "AI could not read that timetable. Try a clearer file or a more specific instruction.",
      );
    }
    const entries = parsed.entries ?? [];
    if (!entries.length) throw new Error("No class slots were found in that document.");

    const { data: existingUnits } = await supabaseAdmin.from("units").select("id,code");
    const unitByCode = new Map<string, string>(
      (existingUnits ?? []).map((unit) => [unit.code.toUpperCase(), unit.id]),
    );

    const rows: Array<Record<string, unknown>> = [];
    for (const entry of entries) {
      const code = String(entry["unitCode"] ?? "")
        .toUpperCase()
        .replace(/\s+/g, "");
      const start = normaliseTime(String(entry["startTime"] ?? ""));
      const end = normaliseTime(String(entry["endTime"] ?? ""));
      const day = Number(entry["dayOfWeek"]);
      if (!code || !start || !end || Number.isNaN(day) || day < 0 || day > 6) continue;

      let unitId = unitByCode.get(code);
      if (!unitId) {
        const { data: created, error: unitError } = await supabaseAdmin
          .from("units")
          .insert({ code, name: String(entry["unitName"] ?? code) || code })
          .select("id")
          .single();
        if (unitError) continue;
        unitId = created.id;
        unitByCode.set(code, unitId);
      }

      rows.push({
        unit_id: unitId,
        day_of_week: day,
        start_time: start,
        end_time: end,
        venue: String(entry["venue"] ?? ""),
        lecturer: String(entry["lecturer"] ?? ""),
        group_label: String(entry["groupLabel"] ?? ""),
        status: "draft",
        source_file: data.fileName,
      });
    }
    if (!rows.length)
      throw new Error("The extracted rows were incomplete. Try a more specific instruction.");

    const { error: insertError } = await supabaseAdmin.from("timetable").insert(rows as never);
    if (insertError) throw new Error(insertError.message);
    return { drafted: rows.length };
  });


/** Everything administrators have deleted, newest first — recoverable. */
export const adminListArchive = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("archived_records")
      .select("id,table_name,record_id,label,deleted_at")
      .order("deleted_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Put a deleted record back exactly as it was. */
export const restoreArchivedRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Archive id is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: entry, error } = await supabaseAdmin
      .from("archived_records")
      .select("id,table_name,payload")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!entry) throw new Error("That deleted item is no longer available.");
    const allowed = ["resources", "units", "announcements", "timetable", "quick_links", "assignments"];
    if (!allowed.includes(entry.table_name)) throw new Error("This item cannot be restored.");
    const { error: insertError } = await supabaseAdmin
      .from(entry.table_name as never)
      .upsert(entry.payload as never, { onConflict: "id" });
    if (insertError) throw new Error(insertError.message);
    await supabaseAdmin.from("archived_records").delete().eq("id", entry.id);
    return { ok: true };
  });
