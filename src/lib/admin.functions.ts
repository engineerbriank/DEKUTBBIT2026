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

    const { error } = await context.supabase.from("resources").update(patch as never).eq("id", data.id);
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
    const { data: resource } = await context.supabase
      .from("resources")
      .select("file_path")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await context.supabase.from("resources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (resource?.file_path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from("resources").remove([resource.file_path]);
    }
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
    const { error } = await context.supabase.from("units").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string; title: string; body: string; status: "published" | "draft" }) => {
    if (!input?.title?.trim()) throw new Error("Title is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = { title: data.title.trim(), body: data.body ?? "", status: data.status };
    const query = data.id
      ? context.supabase.from("announcements").update(payload).eq("id", data.id)
      : context.supabase.from("announcements").insert(payload);
    const { error } = await query;
    if (error) throw new Error(error.message);
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
    const { error } = await context.supabase.from("timetable").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
