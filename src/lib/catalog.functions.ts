import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ResourceRow = {
  id: string;
  title: string;
  description: string;
  topic: string;
  lecturer: string;
  status: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  download_count: number;
  created_at: string;
  unit: { id: string; code: string; name: string } | null;
  category: { id: string; slug: string; name: string } | null;
};

const RESOURCE_SELECT =
  "id,title,description,topic,lecturer,status,file_name,file_size,mime_type,download_count,created_at,unit:units(id,code,name),category:categories(id,slug,name)";

/**
 * Makes sure the signed-in member has a profile row, a role and a recovery code.
 * Approved emails (admin_allowlist) are granted administrator access automatically.
 */
async function provisionMember(userId: string, claims: Record<string, unknown>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { makeCode } = await import("./recovery.functions");

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = (authUser?.user?.email ?? (claims["email"] as string) ?? "").trim().toLowerCase();
  const metadata = (authUser?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = ((metadata["full_name"] as string) ?? "").trim();

  await supabaseAdmin
    .from("profiles")
    .upsert({ id: userId, email, full_name: fullName }, { onConflict: "id" });

  await supabaseAdmin
    .from("recovery_codes")
    .upsert(
      { user_id: userId, code: makeCode() },
      { onConflict: "user_id", ignoreDuplicates: true },
    );

  const { data: existingRoles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (existingRoles ?? []).map((row) => row.role as string);

  if (email) {
    const { data: approved } = await supabaseAdmin
      .from("admin_allowlist")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    if (approved && !roles.includes("admin")) {
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
      roles.push("admin");
    }
  }

  if (roles.length === 0) {
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "student" });
    roles.push("student");
  }

  return { email, fullName, roles };
}

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const provisioned = await provisionMember(
      context.userId,
      (context.claims ?? {}) as Record<string, unknown>,
    );
    const [{ data: profile }, { data: roles }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id,full_name,email")
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);
    const roleList = (roles ?? []).map((row) => row.role as string);
    if (roleList.length === 0) roleList.push(...provisioned.roles);
    return {
      userId: context.userId,
      email: profile?.email || provisioned.email,
      fullName: profile?.full_name || provisioned.fullName,
      isAdmin: roleList.includes("admin"),
      roles: roleList,
    };
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [resources, units, announcements, categories, timetable, recent] = await Promise.all([
      supabase
        .from("resources")
        .select("id,category:categories(slug,name)")
        .eq("status", "published"),
      supabase.from("units").select("id", { count: "exact", head: true }),
      supabase
        .from("announcements")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      supabase.from("categories").select("id,slug,name").order("name"),
      supabase
        .from("timetable")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      supabase
        .from("resources")
        .select(RESOURCE_SELECT)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    const perCategory = new Map<string, { slug: string; name: string; count: number }>();
    for (const category of categories.data ?? []) {
      perCategory.set(category.slug, { slug: category.slug, name: category.name, count: 0 });
    }
    for (const row of resources.data ?? []) {
      const category = row.category as unknown as { slug: string; name: string } | null;
      if (!category) continue;
      const entry = perCategory.get(category.slug);
      if (entry) entry.count += 1;
    }

    return {
      totalResources: resources.data?.length ?? 0,
      totalUnits: units.count ?? 0,
      totalAnnouncements: announcements.count ?? 0,
      totalClasses: timetable.count ?? 0,
      categories: Array.from(perCategory.values()),
      recent: (recent.data ?? []) as unknown as ResourceRow[],
    };
  });

export const listUnits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: units, error } = await context.supabase
      .from("units")
      .select("id,code,name,lecturer,year,semester,description")
      .order("code");
    if (error) throw new Error(error.message);
    const { data: published } = await context.supabase
      .from("resources")
      .select("unit_id")
      .eq("status", "published");
    const counts = new Map<string, number>();
    for (const row of published ?? []) counts.set(row.unit_id, (counts.get(row.unit_id) ?? 0) + 1);
    return (units ?? []).map((unit) => ({ ...unit, resourceCount: counts.get(unit.id) ?? 0 }));
  });

export const listCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("categories")
      .select("id,slug,name,description")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listResources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { search?: string; unitCode?: string; categorySlug?: string }) => input ?? {},
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("resources")
      .select(RESOURCE_SELECT)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    const search = data.search?.trim();
    if (search) {
      const escaped = search.replace(/[%,()]/g, " ");
      query = query.or(
        `title.ilike.%${escaped}%,description.ilike.%${escaped}%,topic.ilike.%${escaped}%,lecturer.ilike.%${escaped}%,file_name.ilike.%${escaped}%`,
      );
    }

    if (data.unitCode) {
      const { data: unit } = await context.supabase
        .from("units")
        .select("id")
        .eq("code", data.unitCode)
        .maybeSingle();
      if (!unit) return [];
      query = query.eq("unit_id", unit.id);
    }

    if (data.categorySlug) {
      const { data: category } = await context.supabase
        .from("categories")
        .select("id")
        .eq("slug", data.categorySlug)
        .maybeSingle();
      if (!category) return [];
      query = query.eq("category_id", category.id);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as ResourceRow[];
  });

export const getUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => {
    if (!input?.code) throw new Error("Unit code is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: unit, error } = await context.supabase
      .from("units")
      .select("id,code,name,lecturer,year,semester,description")
      .eq("code", data.code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!unit) throw new Error("Unit not found");

    const [{ data: resources }, { data: classes }] = await Promise.all([
      context.supabase
        .from("resources")
        .select(RESOURCE_SELECT)
        .eq("unit_id", unit.id)
        .eq("status", "published")
        .order("created_at", { ascending: false }),
      context.supabase
        .from("timetable")
        .select("id,day_of_week,start_time,end_time,venue,lecturer")
        .eq("unit_id", unit.id)
        .order("day_of_week"),
    ]);

    return {
      unit,
      resources: (resources ?? []) as unknown as ResourceRow[],
      classes: classes ?? [],
    };
  });

/** Creates a short-lived signed URL for viewing or downloading a stored file. */
export const getResourceLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; download?: boolean }) => {
    if (!input?.id) throw new Error("Resource id is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: resource, error } = await context.supabase
      .from("resources")
      .select("id,file_path,file_name,status")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!resource) throw new Error("This resource is not available.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from("resources")
      .createSignedUrl(
        resource.file_path,
        300,
        data.download ? { download: resource.file_name } : undefined,
      );
    if (signError || !signed) throw new Error(signError?.message ?? "Could not open this file.");

    if (data.download) {
      const { data: current } = await supabaseAdmin
        .from("resources")
        .select("download_count")
        .eq("id", resource.id)
        .maybeSingle();
      await supabaseAdmin
        .from("resources")
        .update({ download_count: (current?.download_count ?? 0) + 1 })
        .eq("id", resource.id);
    }

    return { url: signed.signedUrl, fileName: resource.file_name };
  });

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("announcements")
      .select("id,title,body,status,created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listTimetable = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("timetable")
      .select(
        "id,day_of_week,start_time,end_time,venue,lecturer,group_label,unit:units(id,code,name)",
      )
      .eq("status", "published")
      .order("day_of_week")
      .order("start_time");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Public (no login) stats for the landing page, read with the publishable key. */
export const getPublicStats = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
  const [units, categories] = await Promise.all([
    client.from("units").select("code,name", { count: "exact" }).order("code"),
    client.from("categories").select("slug,name").order("name"),
  ]);
  return {
    unitCount: units.count ?? 0,
    units: (units.data ?? []).slice(0, 6),
    categories: categories.data ?? [],
  };
});
