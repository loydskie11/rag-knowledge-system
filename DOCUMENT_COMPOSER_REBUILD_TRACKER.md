# Document Composer Rebuild Tracker

The replacement is being built beside the legacy `DocumentGenerator`. The legacy editor remains available until every required template passes comparison and adviser acceptance.

## Phase 1 — Foundation and safety

- [x] 1. Create a tracked implementation-plan file.
- [x] 2. Create `TemplateDocumentComposer` separately from the existing editor.
- [x] 3. Define shared types for templates, fields, repeating rows, and generated values.
- [x] 4. Sanitize repository template HTML before rendering.
- [x] 5. Escape database and user-provided values before substitution.
- [x] 6. Render templates inside a script-disabled, isolated iframe preview.
- [x] 7. Preserve the existing Document Generator as the default legacy fallback.

## Phase 2 — Template model

- [x] 8. Define controlled template metadata.
- [x] 9. Define supported field types.
- [x] 10. Create formal schemas instead of guessing bracketed placeholders.
- [x] 11. Validate required fields and unsupported placeholders.
- [x] 12. Add template-version metadata support.
- [x] 13. Keep controlled metadata read-only in the composer.

### Phase 1–2 acceptance notes

- No database migration was introduced for the pilot foundation.
- Repository templates remain the canonical template source.
- The new route is `/app/document-composer`; the legacy route remains `/app/document-generator`.
- Sanitization is enforced again at the preview boundary. Server-side upload validation remains scheduled for Phase 9.
- Built-in schemas from the foundation cover the Memo and MRC Forms 2–7; CAR Form 1 was added and connected to canonical workflow data in Phase 3.

## Phase 3 — CAR Form 1 pilot

- [x] 14. Create the CAR Form 1 schema.
- [x] 15. Map canonical CAR database fields to placeholders.
- [x] 16. Map classifications and nonconformity checkboxes.
- [x] 17. Map corrective-action, root-cause, and verification information.
- [x] 18. Lock controlled CAR fields.
- [x] 19. Allow editing only for permitted narrative fields.
- [x] 20. Display missing required fields before generation.
- [x] 21. Add live CAR Form 1 preview.
- [x] 22. Add print and Save as PDF.
- [x] 23. Record the CAR ID and template revision in generated output.

### Phase 3 acceptance notes

- CAR data is loaded from the authorized `/car-forms/{id}/report-data` endpoint; the browser does not trust a CAR payload supplied through navigation state.
- CAR number, revision, campus, dates, finding, classification, office, signatories, workflow status, follow-up result, and closure data are locked to the canonical record.
- Immediate Action, Root Cause, and Corrective Measures permit output-only adjustments and explicitly warn that they do not update the canonical workflow record.
- The generated HTML carries the CAR record ID, CAR number, template code/version, generator, and generation timestamp as provenance metadata.
- Print / Save PDF uses the sanitized iframe output. The legacy export remains available.
- The approved CAR Form 1 HTML is seeded idempotently as a campus-scoped, non-RAG `Forms / Templates` repository record.

## Phase 4 — Safe parallel testing

- [x] 24. Add New Composer beside the current CAR export action.
- [x] 25. Keep Open Legacy Editor available.
- [x] 26. Test a blank CAR.
- [x] 27. Test a partially completed CAR.
- [x] 28. Test a fully completed and closed CAR.
- [ ] 29. Test long findings and corrective measures.
- [x] 30. Test missing optional values.
- [x] 31. Test special characters and multiline content.
- [ ] 32. Test portrait printing and PDF output.
- [ ] 33. Test desktop, tablet, and mobile preview.
- [ ] 34. Compare output against the approved physical CAR Form 1.

### Phase 4 progress notes

- Automated fixture validation passes for blank, partial, fully closed, missing-optional-value, multiline, special-character, and multiple-action CAR data.
- Long findings and corrective measures pass mapping and escaping validation; visual page-overflow inspection remains open under item 29.
- The seeded CAR Form 1 template declares portrait page dimensions, but an actual printed/PDF artifact still requires visual inspection under item 32.
- Both New Composer and Legacy Export remain available in the Accreditation Support interface.
- Run `npm run validate:car-composer` to repeat the permanent Phase 4 regression checks.

## Phase 5 — CAR Form 3 migration

- [x] 35. Create the CAR Form 3 schema.
- [x] 36. Retrieve canonical CAR master-log rows.
- [x] 37. Generate controlled repeating rows.
- [x] 38. Handle multiple printed pages.
- [x] 39. Preserve column headers on subsequent pages.
- [x] 40. Test empty, short, and long cycle logs.
- [x] 41. Add print and PDF output.

### Phase 5 acceptance notes

- The composer retrieves office-scoped master-log data from the authorized `/car-reports/master-log` endpoint for the selected audit cycle.
- CAR rows and the audit-cycle label are controlled and cannot be changed in the composer.
- The logsheet renders exactly the canonical rows returned for the cycle; it does not add artificial blank rows, and longer logs preserve every record.
- Landscape print CSS repeats the table header on subsequent pages and prevents rows from splitting across pages.
- The new composer is available beside the retained legacy CAR Form 3 export.
- Run `npm run validate:car-form-3` to repeat the empty, short, long, pagination, schema, and fallback checks.

## Phase 6 — MRC form migration

- [x] 42. Migrate MRC Form 2.
- [x] 43. Migrate MRC Form 3.
- [x] 44. Migrate MRC Form 4.
- [x] 45. Migrate MRC Form 5.
- [x] 46. Migrate MRC Form 6.
- [x] 47. Migrate MRC Form 7.
- [x] 48. Validate orientation for every form.
- [x] 49. Validate repeating rows and signatories.
- [ ] 50. Compare every output with its official reference.

### Phase 6 acceptance notes

- MRC Forms 2-7 are seeded idempotently as campus-scoped, non-RAG `Forms / Templates` records.
- Automated structural comparison confirms each template retains its university heading, form number, revision, title, table columns, and signatory footer. Final page-by-page visual comparison with the approved references remains open under item 50.
- Form 2 uses portrait orientation; Forms 3-7 use landscape orientation.
- Tabular forms use dynamic repeating rows, repeated print headers, and row-splitting protection.
- Existing legacy MRC exporters remain available during adviser acceptance.
- Run `npm run validate:mrc-templates` to repeat schema, orientation, placeholder, heading, signatory, and print-rule checks.

## Phase 7 — General institutional templates

- [x] 51. Migrate the Memorandum schema.
- [x] 52. Add structured recipient rows.
- [x] 53. Add controlled sender and signatory fields.
- [x] 54. Allow optional AI drafting only for the memorandum body.
- [x] 55. Identify AI-generated text for human review.
- [ ] 56. Add other approved templates individually as they are formally supplied and approved.

### Phase 7 acceptance notes

- The official memorandum is seeded as a campus-scoped, non-RAG repository template.
- Sender name, office, and title are filled from the authenticated profile and primary assignment and remain controlled.
- Recipients use structured name/office and title rows instead of free-form HTML.
- AI drafting is optional and limited to the memorandum body; generated text is visibly marked for mandatory human review.
- Optional PNG, JPEG, or WebP header and footer images up to 5 MB can be added to any generated copy and repeat in print output without enabling template scripts.
- Additional institutional templates must continue to be introduced individually with an approved schema; item 56 remains open until another formally approved template is supplied.
- Run `npm run validate:memo-composer` to repeat Phase 7 structural and safety checks.

## Phase 8 — Drafts and generated-document records

- [x] 57. Add generated-document database records.
- [x] 58. Store the template and template version.
- [x] 59. Store field values separately from rendered HTML.
- [x] 60. Add Draft, Finalized, Superseded, and Voided statuses.
- [x] 61. Save and reopen drafts.
- [x] 62. Record creator, last editor, and timestamps.
- [x] 63. Link generated CAR documents to their CAR record.
- [x] 64. Link MRC documents to source records or audit cycles.
- [x] 65. Preserve finalized versions.
- [x] 66. Record generation and finalization in the Audit Trail.

### Phase 8 progress notes

- Drafts store field values separately from their rendered HTML, including uploaded header/footer images needed to reopen the same output.
- Ownership and source authorization are derived from the authenticated backend session. System Administrators may inspect all generated records; other users see their own records.
- Finalized records are immutable. Reopening creates a new draft and preserves the prior version as `SUPERSEDED`.
- Generated CAR Form 1 records link to the canonical CAR UUID; CAR Form 3 records retain their audit-cycle reference.
- Lifecycle events record creation, updates, finalization, superseding, reopening, and voiding and are available to the System Administrator audit endpoint.
- MRC Forms opened from Accreditation Support retain the selected ISO audit-cycle reference in their generated-document record.
- Run `npm run validate:document-lifecycle` to repeat the Phase 8 structural and authorization checks.

## Phase 9 — Template administration

- [x] 67. Add Template Management.
- [x] 68. Restrict template management permissions.
- [x] 69. Validate uploaded HTML on the backend.
- [x] 70. Display placeholders and schema compatibility.
- [x] 71. Reject unsafe active content.
- [x] 72. Preview before activation.
- [x] 73. Activate, supersede, and archive versions.
- [x] 74. Protect versions referenced by finalized documents.

Phase 9 implementation notes:

- Template Management is available only to System Administrators and personnel with the Document Controller assignment.
- Uploaded HTML is validated against the selected approved schema, supported placeholders, and unsafe active-content rules on the backend.
- Every uploaded version begins as a draft. The exact version must be previewed before the interface enables activation.
- Activating a version supersedes the previous active version. The normal composer lists only active templates.
- Active versions cannot be archived. Versions referenced by finalized or superseded generated documents remain protected for traceability.
- Run `npm run validate:template-management` to verify the Phase 9 controls.
- The guided New Document Type flow detects HTML placeholders, lets an administrator confirm field labels, input types, and required fields, and stores the approved dynamic schema with the template.

## Phase 10 — Export reliability

- [x] 75. Ensure consistent PDF and print output.
- [x] 76. Test Chrome, Edge, and offline deployment.
- [x] 77. Preserve page dimensions and orientation.
- [x] 78. Verify borders, row splitting, and signatures.
- [x] 79. Add page-break rules.
- [x] 80. Evaluate DOCX export separately.
- [x] 81. Disable DOCX per template when fidelity is inadequate.

Phase 10 implementation notes:

- Printable HTML now receives a final controlled print stylesheet with exact Letter, A4, or Legal dimensions and portrait or landscape orientation.
- Table headers repeat across pages, rows and signature/approval blocks avoid splitting, and explicit before/after page-break markers are supported.
- Printing waits for document fonts and images before opening the browser print dialog.
- Chrome and Edge use the same standards-based isolated iframe and browser Save as PDF workflow, including in the local offline deployment.
- DOCX remains intentionally unavailable in the controlled composer. Converting arbitrary HTML to DOCX cannot currently preserve institutional form fidelity reliably enough for official output.
- Run `npm run validate:document-export` to verify the Phase 10 export controls.

## Phase 11 — Security and permissions

- [x] 82. Enforce document access on the backend.
- [x] 83. Enforce template-management permissions on the backend.
- [x] 84. Prevent unauthorized source-record access.
- [x] 85. Sanitize on upload and before rendering.
- [x] 86. Escape all inserted values.
- [x] 87. Prevent scripts and event handlers.
- [x] 88. Restrict external resources.
- [x] 89. Test malicious templates and field content.

Phase 11 implementation notes:

- Generated documents are owner-scoped on every read and mutation endpoint; System Administrators retain oversight.
- Creation is bound to an active, readable repository template with an exact matching name, code, and version.
- CAR, audit-cycle, master-log, and management-review source references are validated on the backend before linkage.
- Draft and superseded template content is hidden from ordinary personnel even when its repository name is known.
- Direct Knowledge Repository template uploads are checked for unsafe content and held as Draft until completed through Template Management.
- Backend validation rejects active elements, event handlers, JavaScript/VBScript URLs, meta refresh, external resources, and remote CSS URLs. The isolated preview applies a restrictive Content Security Policy as defense in depth.
- Inserted field values are HTML escaped before rendering. The backend independently rejects unsafe final HTML during create and update.
- Local `generated_documents` and `generated_document_events` tables have RLS enabled with no client policies; access is exclusively through the authenticated backend.
- The permanent authorization suite includes malicious HTML, dynamic-schema completeness, and owner-scope tests. Run `npm run validate:document-security` and `python -m unittest backend.test_authorization`.

## Phase 12 — Acceptance and legacy retirement

- [x] 90. Run regression tests for every migrated template.
- [ ] 91. Obtain QA adviser inspection.
- [ ] 92. Correct approved-template discrepancies.
- [x] 93. Make the composer default after internal acceptance.
- [x] 94. Keep the legacy editor temporarily available to System Administrators.
- [x] 95. Monitor fallback use.
- [ ] 96. Remove the legacy editor only after all templates pass.
- [ ] 97. Remove obsolete code and dependencies after the fallback is retired.
- [x] 98. Update user and deployment documentation.

Phase 12 internal acceptance notes:

- Document Generator is now the user-facing side-menu and accessible-route destination; the controlled composer remains its internal implementation.
- CAR and MRC user actions route to the controlled composer; duplicate legacy buttons were removed.
- Prepared MRC values are transferred into the appropriate approved schema instead of injected into the free-form editor.
- The legacy editor route and link are restricted to System Administrators. Every fallback opening creates an audit event.
- User-facing composer terminology was simplified for readability, and the primary workflow remains responsive from mobile through desktop.
- The QA adviser inspection, any adviser-requested template corrections, final legacy deletion, and obsolete dependency removal remain explicit external acceptance gates.
- Run `npm run validate:document-acceptance` for the internal Phase 12 checks.
