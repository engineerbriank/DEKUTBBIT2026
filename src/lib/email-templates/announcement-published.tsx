import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

import type { TemplateEntry } from './registry'
import {
  SITE_NAME,
  SITE_URL,
  brandLine,
  button,
  container,
  detailBox,
  detailLabel,
  detailValue,
  footer,
  h1,
  main,
  signOff,
  text,
} from './brand'

interface Props {
  recipientName?: string
  title?: string
  body?: string
}

const AnnouncementPublishedEmail = ({
  recipientName,
  title = 'Class announcement',
  body = '',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${title} — class announcement`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandLine}>DEKUT BBIT 2026</Text>
        <Heading style={h1}>{title}</Heading>
        <Text style={text}>
          {recipientName ? `Hi ${recipientName},` : 'Hi,'} a new announcement was published on the
          DEKUT BBIT 2026 Digital Student Platform.
        </Text>

        {body ? (
          <Section style={detailBox}>
            <Text style={detailLabel}>Announcement</Text>
            <Text style={{ ...detailValue, fontWeight: 'normal' as const, margin: '0' }}>
              {body}
            </Text>
          </Section>
        ) : null}

        <Button href={`${SITE_URL}/announcements`} style={button}>
          Open Announcements
        </Button>

        <Text style={signOff}>
          Regards,
          <br />
          Brian
          <br />
          BBIT 2026 Platform Team
        </Text>
        <Text style={footer}>{SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AnnouncementPublishedEmail,
  subject: (data: Record<string, any>) =>
    `${data['title'] ?? 'Class announcement'} — DEKUT BBIT 2026`,
  displayName: 'Announcement published',
  previewData: {
    recipientName: 'Jane',
    title: 'CAT 1 timetable released',
    body: 'CAT 1 starts on Monday. Check the timetable tab for venues.',
  },
} satisfies TemplateEntry

export default AnnouncementPublishedEmail
