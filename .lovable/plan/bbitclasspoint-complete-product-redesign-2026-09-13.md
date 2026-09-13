# BBITClassPoint complete product redesign

## Goal
Transform the existing live platform into the polished, mobile-first BBITClassPoint experience shown in the references. Preserve all current accounts, roles, files, units, assignments, timetable entries, announcements, groups, AI history, storage, and permissions. No mock records will be introduced.

## What will be built

### 1. Shared visual system and navigation
- Rework the global navy, white, teal, green, blue, warning, border, shadow, spacing, type, and motion tokens to match the reference.
- Create reusable page headers, cards, status badges, segmented tabs, search fields, filters, empty/error panels, skeletons, file rows, unit rows, assignment rows, and group rows.
- Replace the phone-only centered frame with a true responsive shell: fixed five-item bottom navigation on phones, compact collapsible sidebar on desktop, and a More menu for secondary destinations.
- Keep route-aware active states, safe-area spacing, keyboard focus, accessible labels, and touch-friendly controls.

### 2. Public and account experience
- Rebuild the welcome screen around the BBITClassPoint identity, campus visual, tagline, and two clear account actions from the reference.
- Restyle sign-in, sign-up, recovery-code reset, password visibility, validation, progress, success, and error states as one cohesive account flow.
- Preserve the existing email/password and WhatsApp recovery behavior.

### 3. Student home and discovery
- Recompose the dashboard with real greeting/profile data, notification count, academic banner, six primary shortcuts, today's live timetable, announcements, upcoming assignments, and recent resources.
- Add a dedicated global search experience covering units, resources, assignments, announcements, and groups, grouped by result type.
- Keep all dashboard counts and cards linked to their real destinations.

### 4. Academic workspaces
- Timetable: mobile week/month controls and stacked class cards; denser desktop schedule using the same published timetable data.
- Units: current/previous filters, search, resource counts, lecturer details, and polished unit cards.
- Unit workspace: Overview, Notes, Slides, Past Papers, Assignments, Announcements, and other resource categories, all derived from live records.
- Resources: mobile category chips, unit filters, search, file metadata, view/download actions, and clear no-results/error states.
- Document viewer: add a protected resource route with a responsive PDF/document surface, title, back, download, page/zoom/fullscreen controls where supported; unsupported formats retain secure native viewing/download.
- Assignments: All/Pending/Completed filters, real progress updates, deadline/status logic, plus a shareable assignment detail page.

### 5. Community, calendar, and account
- Study groups: polished cards, create/join/leave actions, member counts, descriptions, and a group detail page showing permitted members and group information.
- Calendar: compact month selection with live timetable and assignment events listed for the selected date.
- Notifications: category filters, read/unread styling, per-item navigation, individual mark-read, mark-all-read, and badge counts.
- Profile/settings: real profile details and counts, edit profile, signed-in password change, support, quick links, logout, and role-aware management links.

### 6. Class representative and administrator areas
- Introduce a separate `class_rep` role in the secure role table and server-side role checks; never infer privileged access in the browser.
- Build a role-aware Class Representative dashboard for permitted announcements, resources, class members, study groups, and class information.
- Keep full administrator authority separate and protected.
- Reorganize the existing admin tools into mobile-safe sections for resources, units, AI timetable import/review/publish, assignments, announcements, quick links, members, and roles.
- Preserve the existing real upload, edit, publish, delete, AI timetable extraction, recovery-code, and member-management operations.

### 7. AI Student Helper
- Install and compose the official AI Elements conversation, message, prompt-input, and loading primitives.
- Preserve real document upload/extraction, saved conversations, document selection, delete, and grounded answers.
- Add markdown rendering, clear conversation, helpful grounded quick prompts, polished upload progress, and mobile/desktop chat layouts.
- Keep exam generation connected to real units/documents and actual downloadable PDFs.

### 8. Reliability and responsive validation
- Add consistent skeleton, empty, error, retry, disabled, upload-progress, and success states throughout.
- Reduce duplicate requests through shared queries and keep route preloading/caching; lazy-load document-heavy UI.
- Verify public and authenticated flows, administrator rejection for students, role boundaries, uploads, downloads, AI document questions, generated exam PDFs, and notification reads.
- Test every page at 320, 360, 375, 390, 412, 430, 768, 1024, and 1280+ pixels, fixing overflow, clipping, touch targets, forms, menus, tabs, and fixed navigation.

## Technical notes
- Existing TanStack routes, Lovable Cloud tables, private storage buckets, and server functions remain the source of truth.
- New routes will be created for search, resource viewer, assignment detail, group detail, settings, and class-representative management.
- Any schema additions will use explicit grants, row-level security, and server-validated roles. Existing tables/data will not be dropped or reseeded.
- Reference screenshots are visual guidance only and will not be embedded as page images.
- All content routes will retain unique page metadata.

## Acceptance checks
- Every visible count, list, button, form, upload, download, status, search, and AI action uses real data or a real operation.
- Students cannot invoke administrator or class-representative writes.
- The five-item mobile navigation and collapsible desktop sidebar work on every authenticated page.
- No horizontal scrolling, clipped controls, overlapping content, or unusable tables at required widths.
- Existing authentication, recovery, resource storage, timetable extraction, AI chat, and exam PDF generation still work end to end.
