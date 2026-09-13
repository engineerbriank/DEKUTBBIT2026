import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { userId: string; supabase: any }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  const isAdmin = (data ?? []).some((row: { role: string }) => row.role === "admin");
  if (!isAdmin) throw new Error("Only administrators can do this.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type AssignmentRow = {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  weight_percent: number;
  status: string;
  created_at: string;
  unit: { id: string; code: string; name: string } | null;
  state: "not_started" | "pending" | "completed";
};

/* ------------------------------- assignments ------------------------------ */

export const listAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: rows, error }, { data: progress }] = await Promise.all([
      context.supabase
        .from("assignments")
        .select("id,title,description,due_date,weight_percent,status,created_at,unit:units(id,code,name)")
        .eq("status", "published")
        .order("due_date", { ascending: true, nullsFirst: false }),
      context.supabase.from("assignment_progress").select("assignment_id,state").eq("user_id", context.userId),
    ]);
    if (error) throw new Error(error.message);
    const states = new Map<string, string>();
    for (const row of progress ?? []) states.set(row.assignment_id, row.state);
    return (rows ?? []).map((row) => ({
      ...row,
      state: (states.get(row.id) ?? "not_started") as AssignmentRow["state"],
    })) as unknown as AssignmentRow[];
  });

export const setAssignmentState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; state: "not_started" | "pending" | "completed" }) => {
    if (!input?.id) throw new Error("Assignment is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("assignment_progress").upsert(
      { assignment_id: data.id, user_id: context.userId, state: data.state, updated_at: new Date().toISOString() },
      { onConflict: "assignment_id,user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context);
    const { data, error } = await admin
      .from("assignments")
      .select("id,title,description,due_date,weight_percent,status,created_at,unit:units(id,code,name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      unitId: string;
      title: string;
      description?: string;
      dueDate?: string;
      weight?: number;
      status?: string;
    }) => {
      if (!input?.unitId) throw new Error("Select a unit");
      if (!input?.title?.trim()) throw new Error("Enter a title");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    const { data: row, error } = await admin
      .from("assignments")
      .insert({
        unit_id: data.unitId,
        title: data.title.trim(),
        description: data.description?.trim() ?? "",
        due_date: data.dueDate || null,
        weight_percent: data.weight ?? 0,
        status: data.status ?? "published",
        created_by: context.userId,
      })
      .select("id,title")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data.status !== "draft") {
      await admin.from("notifications").insert({
        kind: "assignment",
        title: `New assignment: ${data.title.trim()}`,
        body: data.dueDate ? `Due ${data.dueDate}` : "Check the assignments page for details",
        link: "/assignments",
      });
    }
    return row;
  });

export const deleteAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Assignment is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    const { error } = await admin.from("assignments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------ study groups ------------------------------ */

export const listStudyGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: groups, error }, { data: members }] = await Promise.all([
      context.supabase
        .from("study_groups")
        .select("id,name,description,join_code,created_by,created_at")
        .order("created_at", { ascending: false }),
      context.supabase.from("group_members").select("group_id,user_id"),
    ]);
    if (error) throw new Error(error.message);
    return (groups ?? []).map((group) => {
      const rows = (members ?? []).filter((row) => row.group_id === group.id);
      return {
        ...group,
        memberCount: rows.length,
        joined: rows.some((row) => row.user_id === context.userId),
        isOwner: group.created_by === context.userId,
      };
    });
  });

export const createStudyGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; description?: string }) => {
    if (!input?.name?.trim()) throw new Error("Enter a group name");
    return input;
  })
  .handler(async ({ data, context }) => {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { data: group, error } = await context.supabase
      .from("study_groups")
      .insert({
        name: data.name.trim(),
        description: data.description?.trim() ?? "",
        join_code: code,
        created_by: context.userId,
      })
      .select("id,join_code")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (group) {
      await context.supabase.from("group_members").insert({ group_id: group.id, user_id: context.userId });
    }
    return group;
  });

export const joinStudyGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code?: string; groupId?: string }) => input ?? {})
  .handler(async ({ data, context }) => {
    let groupId = data.groupId;
    if (!groupId) {
      const code = (data.code ?? "").trim().toUpperCase();
      if (!code) throw new Error("Enter a group code");
      const { data: group } = await context.supabase
        .from("study_groups")
        .select("id")
        .eq("join_code", code)
        .maybeSingle();
      if (!group) throw new Error("No group matches that code.");
      groupId = group.id;
    }
    const { error } = await context.supabase
      .from("group_members")
      .upsert({ group_id: groupId, user_id: context.userId }, { onConflict: "group_id,user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const leaveStudyGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { groupId: string }) => {
    if (!input?.groupId) throw new Error("Group is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("group_members")
      .delete()
      .eq("group_id", data.groupId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------ notifications ----------------------------- */

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: rows, error }, { data: reads }] = await Promise.all([
      context.supabase
        .from("notifications")
        .select("id,kind,title,body,link,created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase.from("notification_reads").select("notification_id").eq("user_id", context.userId),
    ]);
    if (error) throw new Error(error.message);
    const read = new Set((reads ?? []).map((row) => row.notification_id));
    const items = (rows ?? []).map((row) => ({ ...row, read: read.has(row.id) }));
    return { items, unread: items.filter((item) => !item.read).length };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows } = await context.supabase.from("notifications").select("id").limit(200);
    const payload = (rows ?? []).map((row) => ({ notification_id: row.id, user_id: context.userId }));
    if (payload.length) {
      await context.supabase
        .from("notification_reads")
        .upsert(payload, { onConflict: "notification_id,user_id", ignoreDuplicates: true });
    }
    return { ok: true };
  });

export const createNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { title: string; body?: string; kind?: string; link?: string }) => {
    if (!input?.title?.trim()) throw new Error("Enter a title");
    return input;
  })
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    const { error } = await admin.from("notifications").insert({
      title: data.title.trim(),
      body: data.body?.trim() ?? "",
      kind: data.kind ?? "system",
      link: data.link ?? "",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------- quick links ------------------------------ */

export const listQuickLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("quick_links")
      .select("id,label,subtitle,url,sort_order")
      .eq("active", true)
      .order("sort_order")
      .order("label");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminListQuickLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context);
    const { data, error } = await admin
      .from("quick_links")
      .select("id,label,subtitle,url,sort_order,active")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createQuickLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { label: string; subtitle?: string; url: string; sortOrder?: number }) => {
    if (!input?.label?.trim()) throw new Error("Enter a label");
    if (!input?.url?.trim()) throw new Error("Enter a link address");
    return input;
  })
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    const url = data.url.trim().startsWith("http") ? data.url.trim() : `https://${data.url.trim()}`;
    const { error } = await admin.from("quick_links").insert({
      label: data.label.trim(),
      subtitle: data.subtitle?.trim() ?? "",
      url,
      sort_order: data.sortOrder ?? 0,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteQuickLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Link is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    const { error } = await admin.from("quick_links").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------- profile -------------------------------- */

export const getProfileOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: roles }, { data: groups }, { data: code }] = await Promise.all([
      context.supabase.from("profiles").select("id,full_name,email,created_at").eq("id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase.from("group_members").select("group_id").eq("user_id", context.userId),
      context.supabase.from("recovery_codes").select("code").eq("user_id", context.userId).maybeSingle(),
    ]);
    const roleList = (roles ?? []).map((row) => row.role as string);
    return {
      fullName: profile?.full_name ?? "",
      email: profile?.email ?? "",
      joinedAt: profile?.created_at ?? null,
      isAdmin: roleList.includes("admin"),
      groupCount: (groups ?? []).length,
      recoveryCode: code?.code ?? "",
    };
  });

export const updateProfileName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fullName: string }) => {
    if (!input?.fullName?.trim()) throw new Error("Enter your name");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ full_name: data.fullName.trim() })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------- calendar -------------------------------- */

export const getCalendar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: slots }, { data: assignments }] = await Promise.all([
      context.supabase
        .from("timetable")
        .select("id,day_of_week,start_time,end_time,venue,lecturer,unit:units(code,name)")
        .eq("status", "published")
        .order("day_of_week")
        .order("start_time"),
      context.supabase
        .from("assignments")
        .select("id,title,due_date,unit:units(code,name)")
        .eq("status", "published")
        .not("due_date", "is", null),
    ]);
    return { slots: slots ?? [], assignments: assignments ?? [] };
  });
