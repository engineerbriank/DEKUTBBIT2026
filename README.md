# Companion Pro (17)

BUILD A FULLY WORKING PLATFORM USE THE 20 CREDITS, AND THE LAST MESSAGE FROM U SHOULD BE UR ROJECT IS READY FOR PUBLISH

For BBITClassPoint, the requirement should be:

If a button, card, form, counter, search box, upload control, download button, AI feature, or dashboard statistic appears in the UI, it must be connected to a real backend operation and real data. No simulated interactions, mock arrays, fake counters, placeholder responses, or “coming soon” functionality.

What “fully working” means

FeatureMust actually happenDashboardLoads real data from databaseUnitsRetrieved from databaseNotesRetrieved from database/storageUploadActually uploads file to storage + creates DB recordViewOpens the actual uploaded documentDownloadDownloads the actual stored fileSearchSearches actual database recordsCategoriesReal database categoriesAssignmentsReal uploaded assignmentsTimetableReal timetable recordsAnnouncementsReal published announcementsAdminReal authenticated admin accountAdmin uploadChanges what students seeEdit resourceUpdates databaseDeleteRemoves/archives actual resourceAIReal AI API, not generated placeholder textAI file uploadReads the actual uploaded documentAI questionsBased on actual document/contextExam generatorActually generates exam contentPDFActually creates a downloadable PDFAuthenticationReal login/session managementPermissionsStudents cannot perform admin operations

And the dashboard must be data-driven

For example, if the dashboard says:

24 Notes

that number cannot be typed into the frontend.

It should effectively work like:

Database
   ↓
Published resources
   ↓
Backend query
   ↓
Dashboard API
   ↓
"24 Notes"

Upload another note:

Admin uploads note
       ↓
File stored
       ↓
Database record created
       ↓
Resource published
       ↓
Dashboard query changes
       ↓
"25 Notes"

That's the standard I mean by working.

Admin → Student connection

This is especially important for your idea.

You should be able to log into the admin panel as the administrator, upload:

BEC 2110 — Lecture 3 Notes.pdf

with:

Category: Notes
Unit: BEC 2110
Topic: [topic]
Description: [description]
Status: Published

Then, without changing any frontend code:

Student opens BBITClassPoint → BEC 2110 → sees the new resource → View → actual PDF opens → Download → actual file downloads.

That entire chain must be implemented.

AI must also be real

Not:

"Here is an AI response."

hardcoded into JavaScript.

Instead:

Student
 ↓
AI interface
 ↓
Backend
 ↓
AI service
 ↓
Context/document retrieval
 ↓
Real AI response
 ↓
Student

For uploaded notes:

PDF/DOCX/PPTX
      ↓
Text extraction
      ↓
Document processing
      ↓
Chunking/indexing
      ↓
Knowledge retrieval
      ↓
AI
      ↓
Answer based on the material

And I would add a real admin upload pipeline

ADMIN
  │
  ├── Select category
  ├── Select unit
  ├── Enter title
  ├── Enter description
  ├── Select lecturer
  ├── Upload file
  └── Publish
          │
          ▼
      VALIDATION
          │
          ▼
     FILE STORAGE
          │
          ▼
       DATABASE
          │
          ▼
    RESOURCE INDEX
          │
          ▼
       STUDENTS

Most importantly: testing

The build prompt should force the coding AI to test functionality rather than merely saying it works.

For example:

Test 1

Admin uploads a PDF.

Expected:

File exists in storage.

Database record exists.

Student can see it.

View opens it.

Download retrieves it.

Dashboard count updates.

Test 2

Admin deletes/unpublishes it.

Expected:

It disappears from student resources.

Dashboard count updates.

Student cannot access it through the normal resource listing.

Test 3

Student tries to access admin functionality.

Expected:

Server rejects the request.

Test 4

Student uploads notes to AI.

Expected:

Actual document is processed.

AI can answer questions about its contents.

Test 5

Student requests an exam.

Expected:

Real questions are generated.

PDF is actually created.

PDF can actually be opened/downloaded.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://real-class-link.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ec7c4771-4200-49d8-98f7-b9adac9988cc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
