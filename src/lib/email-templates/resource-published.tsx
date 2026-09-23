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
  title?: string
  unit?: string
  category?: string
  uploadedBy?: string
}

const ResourcePublishedEmail = ({
  recipientName,
  title = 'A new study file',
  unit = 'BBIT',
  category = 'Resource',
  uploadedBy,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${title} is now available on the platform`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandLine}>DEKUT BBIT 2026</Text>
        <Heading style={h1}>New resource published: {title}</Heading>
        <Text style={text}>
          {recipientName ? `Hi ${recipientName},` : 'Hi,'} a new study file has just been published
          on the DEKUT BBIT 2026 Digital Student Platform.
        </Text>

        <Section style={detailBox}>
          <Text style={detailLabel}>File</Text>
          <Text style={detailValue}>{title}</Text>
          <Text style={detailLabel}>Unit</Text>
          <Text style={detailValue}>{unit}</Text>
          <Text style={detailLabel}>Category</Text>
          <Text style={{ ...detailValue, margin: uploadedBy ? '0 0 12px' : '0' }}>{category}</Text>
          {uploadedBy ? (
            <>
              <Text style={detailLabel}>Published by</Text>
              <Text style={{ ...detailValue, margin: '0' }}>{uploadedBy}</Text>
            </>
          ) : null}
        </Section>

        <Text style={steps}>
          How to get it:
          <br />
          1. Open the platform and sign in with your student account.
          <br />
          2. Go to <strong>Resources</strong> (or open the unit directly).
          <br />
          3. Search the title above, then tap <strong>Download</strong>.
        </Text>

        <Button href={`${SITE_URL}/resources`} style={button}>
          Open Resources
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
  component: ResourcePublishedEmail,
  subject: (data: Record<string, any>) =>
    `New resource: ${data['title'] ?? 'study file'} — DEKUT BBIT 2026`,
  displayName: 'Resource published',
  previewData: {
    recipientName: 'Jane',
    title: 'Data Structures CAT 1',
    unit: 'BIT 2203 — Data Structures',
    category: 'CATs',
    uploadedBy: 'Brian Macharia',
  },
} satisfies TemplateEntry

export default ResourcePublishedEmail
