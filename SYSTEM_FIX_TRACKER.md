# System fix tracker

Updated November 8, 2026. Complete fixes sequentially unless a bundle is explicitly agreed before implementation.

## Authorization and security fixes

- [x] **Fix 1 — Correct IQA Auditor scope behavior**
  - Campus-scoped IQA Auditors retain campus-wide review access.
  - Office-scoped IQA Auditors are limited to their assigned office and mapped ISO processes.
  - Office-scoped reviewers do not automatically receive all academic programs or cross-office access.

- [x] **Fix 2 — Enforce scope on every review endpoint**
  - Validate the parent office, program, or college for AACCUP, CHED, ISO, QMS, and accreditation review operations.
  - Separate campus-review, office-review, academic-scope, and global-configuration guards.

- [x] **Fix 3 — Make Supabase document Storage private**
  - Change the `documents` bucket to private and serve files only through authorized, short-lived signed URLs.
  - Verify repository files, evidence, Paper Trail attachments, certificates, previews, and downloads.

- [x] **Fix 4 — Require authentication for the AI Assistant**
  - Require an authenticated account for `/ask-policy`.
  - Use the authenticated email and role instead of accepting identity fields from the request.

- [x] **Fix 5 — Restrict AI analytics and raw query information**
  - Limit verbatim recent questions to System Administrators or replace them with anonymized aggregates.
  - Review global dashboard totals exposed to Personnel.

- [x] **Fix 6 — Protect remaining public utility endpoints**
  - Remove or protect `/test-db`.
  - Require accreditation access for AACCUP requirements.
  - Require governance access and rate limiting for CAR extraction.

- [x] **Fix 7 — Repair frontend permission definitions**
  - Resolve nonexistent permission keys used by AI Document Generator and Student Records routes.
  - Align sidebars, protected routes, and direct-URL checks.
  - Include TypeScript checking in verification.

- [x] **Fix 8 — Make Paper Trail support multiple assignments**
  - Use every active office assignment for visibility and custody instead of the legacy single-office field.
  - Preserve participant, recipient, and Document Controller access.

- [x] **Fix 9 — Remove duplicate backend routes**
  - Consolidate announcement, announcement-read, and user-count routes into one protected implementation.

- [x] **Fix 10 — Harden Supabase database permissions**
  - Remove unnecessary Data API privileges and public function execution.
  - Set a safe search path for vector-search functions and rerun security advisors.

- [x] **Fix 11 — Resolve live authorization configuration gaps**
  - Review the unassigned Personnel account, designate a Document Controller if required, and confirm the remaining office-to-ISO mappings.

- [x] **Fix 12 — Expand authorization tests and complete the final audit**
  - Cover every base role, assignment type, review endpoint, multi-office user, anonymous denial, direct frontend route, and private-file path.
  - Run backend, RAG, frontend, database-integrity, and Supabase advisor checks.
  - Verified 59 backend/RAG/security tests, TypeScript, production build, npm dependency audit, live RBAC integrity, private Storage, Data API grants, and Supabase security/performance/health advisors.
  - Added the four missing governance foreign-key indexes reported by the performance advisor; retained newly created and workload-critical indexes despite the expected immediate `unused_index` informational notices.

- [x] **Detour — Detect duplicate repository uploads**
  - Compute SHA-256 before OCR, chunking, or embedding and enforce the decision again on the backend.
  - Block byte-identical files in the same office/program scope, warn before a legitimate cross-scope copy, and route a same-name/different-content file into the existing version workflow.
  - Keep one private, race-safe `document_uploads` registry row per file and link every vector chunk to it.
  - Backfilled the two existing repository files and all 132 current chunks so duplicate detection also covers previously uploaded documents.
  - Preserve the current version until a replacement finishes processing successfully.

## Repository and accreditation fixes discovered during review

- [x] **Fix 13 — Correct repository scope and AACCUP upload consistency**
  - Preserve `program` and other scope metadata when uploading a new document version.
  - Upload AACCUP evidence only through Accreditation Support so program, area, and requirement are always attached.
  - Remove or redirect the incomplete `Accreditation Evidence` option in the general repository upload.
  - Make general repository scope explicit: campus-wide, office, or academic program.
  - Automatically lock a single authorized program; require a selection when the user has several authorized programs.
  - Enforce the selected scope on the backend for every applicable document category.
  - Applied explicit `CAMPUS`, `OFFICE`, and `PROGRAM` metadata to the live database; backfilled both current repository files and all 132 chunks as campus-wide.
  - Made duplicate checks, metadata edits, file access, archive/approval actions, and new-version uploads scope-specific so same-name documents in different scopes cannot affect each other.
  - Removed general-repository AACCUP uploads and generic evidence mutation; AACCUP evidence now retains its program scope through Accreditation Support.

- [x] **Fix 14 — Add the accreditation-cycle and level-transition foundation**
  - Introduce a stable accreditation-cycle record for each program and level attempt.
  - When a program is promoted, close the previous cycle without deleting or reassigning its evidence, then open a new active cycle for the new level.
  - Backfill existing accreditation data into a clearly labelled legacy/current baseline cycle during migration.
  - Added one database-enforced active cycle per program and separate attempt numbers for repeated accreditation at the same level.
  - Backfilled 10 active program baselines and 7 closed historical cycles; all existing accreditation-history records are linked to a cycle.
  - Level promotion now atomically closes the prior cycle and opens the next cycle without changing prior evidence metadata.
  - New AACCUP uploads are stamped with the active cycle, level, and attempt in preparation for the Fix 15 history browser.
  - Restricted level calibration, promotion, and certificate changes to campus QA/IQA reviewers and System Administrators.

- [x] **Fix 15 — Browse and preserve evidence from previous accreditation levels**
  - Link every AACCUP evidence upload to its cycle, program, area, and requirement.
  - Add a Current Level / Previous Levels selector to Accreditation Support.
  - Keep previous cycles read-only and allow authorized users to view or download their evidence and certificate.
  - Keep repeated reaccreditation attempts separate even when they use the same level name.
  - Added a Current Level / Previous Levels selector with level and attempt labels.
  - Scoped compliance totals, area details, requirements, and evidence lists to the selected cycle.
  - Added stable evidence IDs so same-named files and repeated attempts cannot update each other accidentally.
  - Previous cycles allow authorized evidence and certificate viewing through fresh private URLs, while review, upload, archive, and requirement-edit controls are disabled.
  - Enforced read-only history on the backend, so direct API calls cannot review or archive evidence from closed cycles.

- [x] **Fix 16 — Add ISO outcomes to the existing Accreditation Results tab**
  - Keep active ISO requirements, findings, CAR/PAR work, and action plans in the ISO workflow tab.
  - Add a separate ISO Results section inside Accreditation Results alongside AACCUP outcomes.
  - Record each audit cycle's type, standard version, dates, finding counts, conclusion, and authorized sign-off.
  - Clearly distinguish internal audit conclusions from external certification, surveillance, or recertification results.
  - Attach private audit reports and, when applicable, external certificates or other proof using authorized file access.
  - Preserve prior cycles as read-only history and replace any wording that implies an internal audit issued ISO certification.
  - Added stable ISO audit-cycle and result records, with separate internal and external audit types, finding totals, conclusions, sign-off, and standard versions.
  - Added private audit-report and external-certificate attachments with fresh authorized URLs; internal audits cannot attach or claim an ISO certificate.
  - Limited result creation, editing, artifact upload, and finalization to campus QA/IQA reviewers and System Administrators. Finalized records are immutable and cannot be deleted from the application.
  - Added AACCUP Results / ISO Results views inside the existing Accreditation Results tab, including campus-wide access for QA personnel without an academic-program assignment.

## Likely safe implementation bundles

These bundles reduce repeated work without combining unrelated high-risk changes:

1. Fix 2 with its Fix 12 endpoint regression tests.
2. Fixes 4, 5, and 6 with their authentication/privacy tests.
3. Fixes 3 and 10 as one Supabase security pass, with Storage verification performed separately inside the pass.
4. Fixes 7 and 9 as application cleanup and build/type-check verification.
5. Fix 8 with its multi-assignment tests.
6. Fix 13 as one repository-consistency pass.
7. Fixes 14 and 15 as one accreditation-history migration and UI pass because Fix 15 depends on the cycle foundation.
8. Fix 16 establishes the ISO cycle/history pattern first; Fixes 14 and 15 can reuse the same historical-record approach for AACCUP.
9. Fix 11 remains a configuration review; finish with the remaining Fix 12 full-system audit.
