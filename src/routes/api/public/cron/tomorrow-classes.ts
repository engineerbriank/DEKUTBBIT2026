import { createFileRoute } from "@tanstack/react-router";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const Route = createFileRoute("/api/public/cron/tomorrow-classes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const provided = request.headers.get("x-sms-cron-token") ?? "";
        const { data: setting } = await supabaseAdmin
          .from("internal_settings" as never)
          .select("value")
          .eq("key", "sms_cron_token")
          .maybeSingle();
        const expected = (setting as { value?: string } | null)?.value ?? "";
        const { timingSafeEqual } = await import("node:crypto");
        if (!expected || provided.length !== expected.length || !timingSafeEqual(Buffer.from(provided), Buffer.from(expected)))
          return new Response("Unauthorized", { status: 401 });
        // Nairobi is UTC+3 year-round.
        const nairobi = new Date(Date.now() + 3 * 3600000);
        const tomorrow = new Date(nairobi.getTime() + 86400000);
        const day = tomorrow.getUTCDay();
        const dateKey = tomorrow.toISOString().slice(0, 10);
        const { data: slots } = await supabaseAdmin
          .from("timetable")
          .select("start_time, end_time, venue, units(code)")
          .eq("status", "published")
          .eq("day_of_week", day)
          .order("start_time");
        const sms = await import("@/lib/sms.server");
        const lines = (slots ?? []).map(
          (s: any) => `${String(s.start_time).slice(0, 5)} ${s.units?.code ?? "Class"}${s.venue ? ` @${s.venue}` : ""}`,
        );
        const message = lines.length
          ? `DEKUT BBIT 2026: Tomorrow's classes (${DAYS[day]}):\n${lines.slice(0, 8).join("\n")}${lines.length > 8 ? `\n+${lines.length - 8} more` : ""}\nFull timetable: ${sms.SITE_LINK}/timetable`
          : `DEKUT BBIT 2026: No classes scheduled for tomorrow (${DAYS[day]}). Check updates: ${sms.SITE_LINK}/timetable`;
        const result = await sms.broadcastSms("tomorrow_classes", message, `tomorrow-${dateKey}`, null);
        return Response.json(result);
      },
    },
  },
});
