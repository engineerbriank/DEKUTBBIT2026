# Landing, Admin Links, AI Access, and Study Groups

## What will change

### 1. Landing page
- Upload the provided campus photograph through the project asset system and use it as the full landing-page background.
- Add a readable blue overlay while keeping the campus clearly visible.
- Center the BBITClassPoint message and both actions: **Create account** and **I have an account**.
- Keep the live platform statistics connected to the existing backend, without fake values.
- Check the composition on phone, tablet, and desktop sizes.

### 2. Admin-managed quick links
- Add a **Quick Links** tab to the Admin panel using the existing live quick-links backend.
- Let administrators add a label, optional description, clickable address, and display order.
- Show all saved links with their active status and allow deletion.
- Keep student-facing links on the Profile page connected to these saved records.

### 3. Make AI and Exam Maker admin-only
- Remove AI Assistant and Exam Maker from student dashboard, menu, and profile links.
- Keep both links visible for administrators.
- Add server-side administrator checks to AI chat, document processing, document deletion, message history, exam generation, and saved exams so direct URL or request access is also blocked.
- Show students a clear **Administrator access required** screen if they open either URL directly.
- Keep the detailed Lovable AI credit/top-up error visible only to administrators, since only administrators can run those features.
- This reduces student AI usage but does not make AI independent of Lovable AI credits; administrators will still need available AI credits for AI chat, exam generation, and timetable extraction.

### 4. Full study-group system
- Extend groups with a WhatsApp link, approval status, approved leader, approval timestamps, and administrator approval details.
- Keep existing groups safely migrated; they will enter a pending review state rather than being deleted.
- New groups are created as **Pending approval** and are not visible or joinable by other students until an administrator approves them.
- The creator is registered as the first member automatically.
- Students can register/join approved groups by button or group code, leave groups, and see real member counts.
- Add a dedicated group page showing group details, approved leader, registered members, WhatsApp action, and announcements.
- Only registered members can open the WhatsApp link and read/post group announcements.
- All registered members can post announcements; authors can remove their own posts, and administrators can moderate all posts.
- Add a Study Groups tab to Admin where administrators can review pending groups, select the leader from registered members, approve or reject groups, and moderate approved groups.
- Send live in-app notifications when a group is approved and when a new group announcement is posted.

## Data and security

- Add new public tables/columns through one non-destructive migration, with explicit authenticated/service-role grants before enabling row-level security.
- Create group announcement records tied to the author and group.
- Enforce group visibility, membership-only WhatsApp access, announcement access, leader selection, and approval on the server and through row-level policies.
- Validate WhatsApp links as `https://chat.whatsapp.com/...` or `https://wa.me/...` addresses.
- Keep administrator role checks server-side; no role decisions will use browser storage.
- Update generated application-facing database types after the migration.

## Verification

- Run the database migration and security checks.
- Verify administrator quick-link creation/deletion and student link opening.
- Verify students cannot see or call AI/Exam Maker, while administrators can and receive the real credit error when applicable.
- Verify the full group lifecycle: create pending group, admin selects leader and approves, student joins, opens WhatsApp, posts announcement, and leaves.
- Run lint, type checking, and the production build.
- Test the landing page and group/admin flows at mobile and desktop sizes with no overflow or console errors.
