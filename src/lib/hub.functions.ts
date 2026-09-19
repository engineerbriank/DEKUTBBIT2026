import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

async function assertAdmin(context: { userId: string; supabase: SupabaseClient<Database> }) {
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
        .select(
          "id,title,description,due_date,weight_percent,status,created_at,unit:units(id,code,name)",
        )
        .eq("status", "published")
        .order("due_date", { ascending: true, nullsFirst: false }),
      context.supabase
        .from("assignment_progress")
        .select("assignment_id,state")
        .eq("user_id", context.userId),
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
      {
        assignment_id: data.id,
        user_id: context.userId,
        state: data.state,
        updated_at: new Date().toISOString(),
      },
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
      .select(
        "id,title,description,due_date,weight_percent,status,created_at,unit:units(id,code,name)",
      )
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

function normalizeWhatsAppGroupUrl(value: string) {
  const raw = value.trim().replace(/\s+/g, "");
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("Enter a valid WhatsApp invite link");
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const allowedHost = host === "chat.whatsapp.com" || host === "wa.me" || host === "whatsapp.com";
  const validPath = parsed.pathname.length > 1;
  if (!allowedHost || !validPath || !["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Enter a valid WhatsApp group, community, channel, or wa.me link");
  }
  parsed.protocol = "https:";
  return parsed.toString();
}

async function signedImageUrls(paths: Array<string | null>) {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (!unique.length) return new Map<string, string>();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from("user-images").createSignedUrls(unique, 3600);
  return new Map((data ?? []).filter((item) => item.signedUrl).map((item) => [item.path, item.signedUrl]));
}

async function isAdminUser(context: { userId: string; supabase: SupabaseClient<Database> }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(data);
}

export const listStudyGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: groups, error }, { data: memberships }] = await Promise.all([
      context.supabase
        .from("study_groups")
        .select("id,name,description,join_code,created_by,created_at,status,leader_id,logo_path")
        .order("created_at", { ascending: false }),
      context.supabase
        .from("group_members")
        .select("group_id,user_id")
        .eq("user_id", context.userId),
    ]);
    if (error) throw new Error(error.message);
    const admin = await isAdminUser(context);
    const visible = (groups ?? []).filter(
      (group) => group.status === "approved" || group.created_by === context.userId || admin,
    );
    const groupIds = visible.map((group) => group.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: allMembers } = groupIds.length
      ? await supabaseAdmin
          .from("group_members")
          .select("group_id,user_id")
          .in("group_id", groupIds)
      : { data: [] };
    const imageUrls = await signedImageUrls(visible.map((group) => group.logo_path));
    return visible.map((group) => ({
      ...group,
      logoUrl: group.logo_path ? imageUrls.get(group.logo_path) ?? "" : "",
      memberCount: (allMembers ?? []).filter((row) => row.group_id === group.id).length,
      joined: (memberships ?? []).some((row) => row.group_id === group.id),
      isOwner: group.created_by === context.userId,
      isAdmin: admin,
    }));
  });

export const createStudyGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; description?: string; whatsappUrl: string; logoPath?: string }) => {
    if (!input?.name?.trim() || input.name.trim().length > 100)
      throw new Error("Enter a group name under 100 characters");
    if ((input.description?.trim().length ?? 0) > 500)
      throw new Error("Keep the description under 500 characters");
    const whatsappUrl = normalizeWhatsAppGroupUrl(input.whatsappUrl ?? "");
    return { ...input, whatsappUrl };
  })
  .handler(async ({ data, context }) => {
    if (data.logoPath && !data.logoPath.startsWith(`${context.userId}/groups/`)) {
      throw new Error("That group logo does not belong to your account");
    }
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { data: group, error } = await context.supabase
      .from("study_groups")
      .insert({
        name: data.name.trim(),
        description: data.description?.trim() ?? "",
        whatsapp_url: data.whatsappUrl,
        logo_path: data.logoPath?.trim() || null,
        join_code: code,
        created_by: context.userId,
        status: "pending",
      })
      .select("id,join_code")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (group) {
      const { error: memberError } = await context.supabase
        .from("group_members")
        .insert({ group_id: group.id, user_id: context.userId });
      if (memberError) throw new Error(`Group created, but registration failed: ${memberError.message}`);
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
        .select("id,status")
        .eq("join_code", code)
        .maybeSingle();
      if (!group) throw new Error("No group matches that code.");
      if (group.status !== "approved")
        throw new Error("This group is still waiting for administrator approval.");
      groupId = group.id;
    }
    const { data: group } = await context.supabase
      .from("study_groups")
      .select("id,status")
      .eq("id", groupId)
      .maybeSingle();
    if (!group || group.status !== "approved")
      throw new Error("This group is not available to join.");
    const { data: existing } = await context.supabase
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) return { ok: true, alreadyMember: true };
    const { error } = await context.supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true, alreadyMember: false };
  });


export const getStudyGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { groupId: string }) => {
    if (!input?.groupId) throw new Error("Group is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const admin = await isAdminUser(context);
    const { data: group, error } = await context.supabase
      .from("study_groups")
      .select("id,name,description,join_code,created_by,created_at,status,leader_id,whatsapp_url,logo_path")
      .eq("id", data.groupId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!group) throw new Error("Group not found.");
    const { data: ownMembership } = await context.supabase
      .from("group_members")
      .select("id")
      .eq("group_id", group.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    const joined = Boolean(ownMembership);
    if (group.status !== "approved" && group.created_by !== context.userId && !admin)
      throw new Error("Group not found.");

    const privileged = joined || admin;
    let members: Array<{ userId: string; fullName: string; joinedAt: string; isLeader: boolean; avatarUrl: string }> =
      [];
    let announcements: Array<{
      id: string;
      body: string;
      createdAt: string;
      createdBy: string;
      authorName: string;
      canDelete: boolean;
    }> = [];
    if (privileged) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [{ data: memberships }, { data: posts }] = await Promise.all([
        supabaseAdmin
          .from("group_members")
          .select("user_id,joined_at")
          .eq("group_id", group.id)
          .order("joined_at"),
        supabaseAdmin
          .from("group_announcements")
          .select("id,body,created_at,created_by")
          .eq("group_id", group.id)
          .order("created_at", { ascending: false }),
      ]);
      const userIds = [
        ...new Set([
          ...(memberships ?? []).map((row) => row.user_id),
          ...(posts ?? []).map((row) => row.created_by),
        ]),
      ];
      const { data: profiles } = userIds.length
        ? await supabaseAdmin.from("profiles").select("id,full_name,email,avatar_path").in("id", userIds)
        : { data: [] };
      const imageUrls = await signedImageUrls([
        group.logo_path,
        ...(profiles ?? []).map((profile) => profile.avatar_path),
      ]);
      const names = new Map(
        (profiles ?? []).map((profile) => [
          profile.id,
          profile.full_name || profile.email || "Member",
        ]),
      );
      members = (memberships ?? []).map((row) => ({
        userId: row.user_id,
        fullName: names.get(row.user_id) ?? "Member",
        joinedAt: row.joined_at,
        isLeader: row.user_id === group.leader_id,
        avatarUrl: (() => {
          const path = (profiles ?? []).find((profile) => profile.id === row.user_id)?.avatar_path;
          return path ? imageUrls.get(path) ?? "" : "";
        })(),
      }));
      announcements = (posts ?? []).map((post) => ({
        id: post.id,
        body: post.body,
        createdAt: post.created_at,
        createdBy: post.created_by,
        authorName: names.get(post.created_by) ?? "Member",
        canDelete: admin || post.created_by === context.userId,
      }));
    }
    return {
      ...group,
      logoUrl: group.logo_path ? (await signedImageUrls([group.logo_path])).get(group.logo_path) ?? "" : "",
      whatsapp_url: privileged ? group.whatsapp_url : "",
      joined,
      isAdmin: admin,
      members,
      announcements,
      leaderName:
        members.find((member) => member.userId === group.leader_id)?.fullName ?? "Not selected",
    };
  });

export const postGroupAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { groupId: string; body: string }) => {
    const body = input?.body?.trim();
    if (!input?.groupId || !body || body.length > 2000)
      throw new Error("Enter an announcement under 2,000 characters");
    return { groupId: input.groupId, body };
  })
  .handler(async ({ data, context }) => {
    const { data: group } = await context.supabase
      .from("study_groups")
      .select("id,name,status")
      .eq("id", data.groupId)
      .maybeSingle();
    if (!group || group.status !== "approved") throw new Error("This group is not approved.");
    const { data: membership } = await context.supabase
      .from("group_members")
      .select("id")
      .eq("group_id", data.groupId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!membership) throw new Error("Join this group before posting announcements.");
    const { error } = await context.supabase
      .from("group_announcements")
      .insert({ group_id: data.groupId, created_by: context.userId, body: data.body });
    if (error) throw new Error(error.message);
    const admin = await getServiceClient();
    await admin.from("notifications").insert({
      kind: "group",
      title: `New update in ${group.name}`,
      body: data.body.slice(0, 160),
      link: `/groups/${group.id}`,
      group_id: group.id,
    });
    return { ok: true };
  });

async function getServiceClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const deleteGroupAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Announcement is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const admin = await isAdminUser(context);
    let query = context.supabase.from("group_announcements").delete().eq("id", data.id);
    if (!admin) query = query.eq("created_by", context.userId);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------ group chat ------------------------------- */

async function assertGroupMember(
  context: { userId: string; supabase: SupabaseClient<Database> },
  groupId: string,
) {
  const { data: membership } = await context.supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", context.userId)
    .maybeSingle();
  const admin = await isAdminUser(context);
  if (!membership && !admin) throw new Error("Join this group to use the group chat.");
  return { admin };
}

export const listGroupMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { groupId: string }) => {
    if (!input?.groupId) throw new Error("Group is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { admin } = await assertGroupMember(context, data.groupId);
    const service = await getServiceClient();
    const { data: rows, error } = await service
      .from("group_messages")
      .select("id,body,created_at,user_id")
      .eq("group_id", data.groupId)
      .order("created_at", { ascending: true })
      .limit(300);
    if (error) throw new Error(error.message);
    const userIds = [...new Set((rows ?? []).map((row) => row.user_id))];
    const { data: profiles } = userIds.length
      ? await service.from("profiles").select("id,full_name,email,avatar_path").in("id", userIds)
      : { data: [] };
    const imageUrls = await signedImageUrls((profiles ?? []).map((profile) => profile.avatar_path));
    return (rows ?? []).map((row) => {
      const profile = (profiles ?? []).find((item) => item.id === row.user_id);
      return {
        id: row.id,
        body: row.body,
        createdAt: row.created_at,
        userId: row.user_id,
        authorName: profile?.full_name || profile?.email || "Member",
        avatarUrl: profile?.avatar_path ? imageUrls.get(profile.avatar_path) ?? "" : "",
        isMine: row.user_id === context.userId,
        canDelete: admin || row.user_id === context.userId,
      };
    });
  });

export const sendGroupMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { groupId: string; body: string }) => {
    const body = input?.body?.trim();
    if (!input?.groupId || !body) throw new Error("Type a message first");
    if (body.length > 2000) throw new Error("Keep messages under 2,000 characters");
    return { groupId: input.groupId, body };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("group_messages")
      .insert({ group_id: data.groupId, user_id: context.userId, body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGroupMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Message is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("group_messages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------- group leader panel --------------------------- */

export const updateGroupSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { groupId: string; whatsappUrl?: string; description?: string }) => {
    if (!input?.groupId) throw new Error("Group is required");
    const out: { groupId: string; whatsappUrl?: string; description?: string } = {
      groupId: input.groupId,
    };
    if (typeof input.whatsappUrl === "string") {
      out.whatsappUrl = input.whatsappUrl.trim()
        ? normalizeWhatsAppGroupUrl(input.whatsappUrl)
        : "";
    }
    if (typeof input.description === "string") {
      if (input.description.trim().length > 500)
        throw new Error("Keep the description under 500 characters");
      out.description = input.description.trim();
    }
    return out;
  })
  .handler(async ({ data, context }) => {
    const admin = await isAdminUser(context);
    const { data: group } = await context.supabase
      .from("study_groups")
      .select("id,leader_id,created_by,status")
      .eq("id", data.groupId)
      .maybeSingle();
    if (!group) throw new Error("Group not found.");
    const isLeader = group.leader_id === context.userId;
    if (!admin && !isLeader) throw new Error("Only the group leader can change these settings.");
    const patch: { whatsapp_url?: string; description?: string } = {};
    if (data.whatsappUrl !== undefined) patch.whatsapp_url = data.whatsappUrl;
    if (data.description !== undefined) patch.description = data.description;
    if (!Object.keys(patch).length) return { ok: true };
    const service = await getServiceClient();
    const { error } = await service.from("study_groups").update(patch).eq("id", data.groupId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListStudyGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context);
    const { data: groups, error } = await admin
      .from("study_groups")
      .select("id,name,description,status,whatsapp_url,join_code,leader_id,created_by,created_at,logo_path")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const groupIds = (groups ?? []).map((group) => group.id);
    const { data: memberships } = groupIds.length
      ? await admin
          .from("group_members")
          .select("group_id,user_id,joined_at")
          .in("group_id", groupIds)
      : { data: [] };
    const userIds = [...new Set((memberships ?? []).map((row) => row.user_id))];
    const { data: profiles } = userIds.length
      ? await admin.from("profiles").select("id,full_name,email").in("id", userIds)
      : { data: [] };
    const names = new Map(
      (profiles ?? []).map((profile) => [
        profile.id,
        profile.full_name || profile.email || "Member",
      ]),
    );
    const imageUrls = await signedImageUrls((groups ?? []).map((group) => group.logo_path));
    return (groups ?? []).map((group) => ({
      ...group,
      logoUrl: group.logo_path ? imageUrls.get(group.logo_path) ?? "" : "",
      members: (memberships ?? [])
        .filter((row) => row.group_id === group.id)
        .map((row) => ({ userId: row.user_id, fullName: names.get(row.user_id) ?? "Member" })),
    }));
  });

export const adminReviewStudyGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { groupId: string; decision: "approved" | "rejected"; leaderId?: string }) => {
      if (!input?.groupId) throw new Error("Group is required");
      if (input.decision === "approved" && !input.leaderId)
        throw new Error("Select a registered group leader");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    if (data.decision === "approved") {
      const { data: member } = await admin
        .from("group_members")
        .select("id")
        .eq("group_id", data.groupId)
        .eq("user_id", data.leaderId ?? "")
        .maybeSingle();
      if (!member) throw new Error("The selected leader must be a registered group member.");
    }
    const { data: group, error } = await admin
      .from("study_groups")
      .update({
        status: data.decision,
        leader_id: data.decision === "approved" ? (data.leaderId ?? null) : null,
        approved_by: context.userId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", data.groupId)
      .select("id,name")
      .single();
    if (error) throw new Error(error.message);
    await admin.from("notifications").insert({
      kind: "group",
      title:
        data.decision === "approved"
          ? `${group.name} was approved`
          : `${group.name} was not approved`,
      body:
        data.decision === "approved"
          ? "The study group is now open to registered students."
          : "Review the group details or contact the administrator.",
      link: `/groups/${group.id}`,
      group_id: group.id,
    });
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
      context.supabase
        .from("notification_reads")
        .select("notification_id")
        .eq("user_id", context.userId),
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
    const payload = (rows ?? []).map((row) => ({
      notification_id: row.id,
      user_id: context.userId,
    }));
    if (payload.length) {
      await context.supabase
        .from("notification_reads")
        .upsert(payload, { onConflict: "notification_id,user_id", ignoreDuplicates: true });
    }
    return { ok: true };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Notification is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notification_reads")
      .upsert(
        { notification_id: data.id, user_id: context.userId },
        { onConflict: "notification_id,user_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
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
  .inputValidator(
    (input: { label: string; subtitle?: string; url: string; sortOrder?: number }) => {
      if (!input?.label?.trim() || input.label.trim().length > 80)
        throw new Error("Enter a label under 80 characters");
      if ((input.subtitle?.trim().length ?? 0) > 160)
        throw new Error("Keep the description under 160 characters");
      if (!input?.url?.trim() || input.url.trim().length > 500)
        throw new Error("Enter a valid link address");
      const candidate = input.url.trim().startsWith("http")
        ? input.url.trim()
        : `https://${input.url.trim()}`;
      try {
        const parsed = new URL(candidate);
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      } catch {
        throw new Error("Enter a valid http or https link address");
      }
      return input;
    },
  )
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
    const [{ data: profile }, { data: roles }, { data: groups }, { data: code }] =
      await Promise.all([
        context.supabase
          .from("profiles")
          .select("id,full_name,email,created_at,avatar_path")
          .eq("id", context.userId)
          .maybeSingle(),
        context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
        context.supabase.from("group_members").select("group_id").eq("user_id", context.userId),
        context.supabase
          .from("recovery_codes")
          .select("code")
          .eq("user_id", context.userId)
          .maybeSingle(),
      ]);
    const roleList = (roles ?? []).map((row) => row.role as string);
    const avatarUrls = await signedImageUrls([profile?.avatar_path ?? null]);
    return {
      fullName: profile?.full_name ?? "",
      email: profile?.email ?? "",
      joinedAt: profile?.created_at ?? null,
      isAdmin: roleList.includes("admin"),
      isClassRep: roleList.includes("class_rep"),
      roles: roleList,
      groupCount: (groups ?? []).length,
      recoveryCode: code?.code ?? "",
      avatarUrl: profile?.avatar_path ? avatarUrls.get(profile.avatar_path) ?? "" : "",
    };
  });

/* -------------------------- class representative -------------------------- */

export const getClassRepOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ownRoles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const allowed = (ownRoles ?? []).some(
      (row) => row.role === "class_rep" || row.role === "admin",
    );
    if (!allowed) throw new Error("Class representative access is required.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [profiles, roles, groups, assignments, resources] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,full_name,email,created_at").order("full_name"),
      supabaseAdmin.from("user_roles").select("user_id,role"),
      supabaseAdmin.from("study_groups").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("assignments")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      supabaseAdmin
        .from("resources")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
    ]);
    const roleMap = new Map<string, string[]>();
    for (const row of roles.data ?? [])
      roleMap.set(row.user_id, [...(roleMap.get(row.user_id) ?? []), row.role]);
    return {
      members: (profiles.data ?? []).map((profile) => ({
        ...profile,
        roles: roleMap.get(profile.id) ?? [],
      })),
      groupCount: groups.count ?? 0,
      assignmentCount: assignments.count ?? 0,
      resourceCount: resources.count ?? 0,
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

export const updateProfilePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { avatarPath: string }) => {
    if (!input?.avatarPath?.trim()) throw new Error("Upload a photo first");
    return input;
  })
  .handler(async ({ data, context }) => {
    if (!data.avatarPath.startsWith(`${context.userId}/avatars/`)) {
      throw new Error("That photo does not belong to your account");
    }
    const { error } = await context.supabase
      .from("profiles")
      .update({ avatar_path: data.avatarPath })
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
