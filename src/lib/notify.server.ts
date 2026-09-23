import { sendTemplateEmail } from '@/lib/email-templates/send-email'

/**
 * Server-only email notifications for platform publishing events.
 *
 * Each call sends one email to one recipient — the signed-in member who
 * triggered the event — and never throws: a delivery problem must not roll back
 * the publish it confirms.
 */
async function recipientFor(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', context.userId)
    .maybeSingle()
  const email = (data?.email ?? '').trim()
  if (!email.includes('@')) return null
  return { email, name: (data?.full_name ?? '').trim() || undefined }
}

async function send(
  context: { supabase: any; userId: string },
  templateName: string,
  templateData: Record<string, unknown>,
  idempotencyKey: string,
) {
  try {
    const recipient = await recipientFor(context)
    if (!recipient) return
    await sendTemplateEmail(templateName, recipient.email, {
      templateData: { recipientName: recipient.name, ...templateData },
      idempotencyKey,
    })
  } catch (error) {
    console.error('email notification failed', templateName, error)
  }
}

export function notifyResourcePublished(
  context: { supabase: any; userId: string },
  input: { resourceId: string; title: string; unit: string; category: string; uploadedBy?: string },
) {
  return send(
    context,
    'resource-published',
    {
      title: input.title,
      unit: input.unit,
      category: input.category,
      uploadedBy: input.uploadedBy,
    },
    `resource-published-${input.resourceId}`,
  )
}

export function notifyTimetablePublished(
  context: { supabase: any; userId: string },
  input: { classCount: number; batchKey: string },
) {
  return send(
    context,
    'timetable-published',
    { classCount: input.classCount },
    `timetable-published-${input.batchKey}`,
  )
}

export function notifyAnnouncementPublished(
  context: { supabase: any; userId: string },
  input: { announcementId: string; title: string; body: string },
) {
  return send(
    context,
    'announcement-published',
    { title: input.title, body: input.body },
    `announcement-published-${input.announcementId}`,
  )
}
