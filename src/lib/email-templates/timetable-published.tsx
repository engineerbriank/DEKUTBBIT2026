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
  steps,
  text,
} from './brand'

interface Props {
  recipientName?: string
  classCount?: number
}

const TimetablePublishedEmail = ({ recipientName, classCount }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>The class timetable has been updated</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandLine}>DEKUT BBIT 2026</Text>
        <Heading style={h1}>The class timetable has been updated</Heading>
        <Text style={text}>
          {recipientName ? `Hi ${recipientName},` : 'Hi,'} the BBIT 2026 class timetable has just
          been published on the platform.
        </Text>

        <Section style={detailBox}>
          <Text style={detailLabel}>Classes now live</Text>
          <Text style={{ ...detailValue, margin: '0' }}>
            {typeof classCount === 'number' ? classCount : 'All'} class sessions
          </Text>
        </Section>

        <Text style={steps}>
          How to see it:
          <br />
          1. Open the platform and sign in.
          <br />
          2. Tap <strong>Timetable</strong> to see every lesson, venue and lecturer.
          <br />
          3. Check <strong>Calendar</strong> for what is coming up next.
        </Text>

        <Button href={`${SITE_URL}/timetable`} style={button}>
          Open Timetable
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
  component: TimetablePublishedEmail,
  subject: 'Class timetable updated — DEKUT BBIT 2026',
  displayName: 'Timetable published',
  previewData: { recipientName: 'Jane', classCount: 24 },
} satisfies TemplateEntry

export default TimetablePublishedEmail
