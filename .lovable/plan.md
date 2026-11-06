# StudyLyn academic tools

## Plan
- Restore the Assignments page by showing published resources in the Assignment category separately from other resources, and add admin controls to create, edit, publish, and remove assignment tasks. Keep assignment progress attached to task records.
- Add a date-based Classes page for upcoming published sessions, with admin controls for class date, start/end time, venue, and details. Keep the existing weekly timetable intact and connect published classes to the student calendar.
- Add a persistent study timer where each student can create, start, pause, resume, complete, and review their own timed study sessions.
- Expand About Us with the supplied StudyLyn purpose, Brian’s founder story, platform goals, values, vision, and promise. Keep Brian’s existing photo and remove the other people and profiles.

## Technical details
- Use authenticated server functions for all private reads and writes; verify administrator access before publishing or changing shared classes and assignments.
- Add database storage for date-based classes and student-owned study sessions, with explicit grants and row-level security. Preserve existing rows and weekly timetable behavior.
- Update navigation and page metadata for the Classes and Study Timer experiences. Keep assignment-category files out of the general resource list while making them available on Assignments.
- Validate admin publishing, student visibility, private timer records, and assignment completion; inspect the updated pages in the preview.
