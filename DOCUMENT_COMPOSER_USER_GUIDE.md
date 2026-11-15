# Document Generator User Guide

## Purpose

The Document Generator creates official documents from approved institutional templates while preserving their controlled layout, version, and source record.

## Create an official document

1. Open **Document Generator** from the side menu.
2. Select a document template.
3. Complete the displayed fields. Locked fields come from the official source workflow and cannot be changed here.
4. Review the live document preview.
5. Select **Save draft** to continue later.
6. Select **Finalize** only after checking the content. A finalized version becomes read-only.
7. Select **Print / PDF** and choose the correct paper size. Disable browser headers and footers when saving an official PDF.

Use **Reopen** when a finalized document requires revision. The finalized copy is preserved and a new editable draft is created.

## CAR and MRC documents

- Generate CAR Forms from **Accreditation Support** so the composer receives the correct controlled CAR record.
- Generate MRC forms from their Accreditation Support actions. Prepared values are transferred to the approved template and remain editable where permitted.
- Do not recreate a CAR or MRC form as an unrelated custom document type.

## Manage templates

Only a System Administrator or Document Controller can open **Manage templates**.

- Use **New version** to replace an existing official template.
- Use **New document type** for a new form containing `[PLACEHOLDER]` fields.
- Check every detected field, preview the exact saved version, and activate it only after verification.
- Activation supersedes the former active version. Finalized documents continue referencing their original template version.

Template files may be imported from Word (`.docx`), PDF, or HTML. Word is recommended because its paragraphs and tables convert more reliably. Add markers such as `[DATE]`, `[TITLE]`, or `[APPROVED_BY]` directly in the Word document wherever an editable field belongs. PDF imports require closer review, and scanned PDFs may need OCR correction. Every converted template remains a draft until it is checked, previewed, and activated.

## Temporary legacy fallback

The old editor is available only to System Administrators during the adviser-acceptance period. Every fallback opening is recorded in the audit log. Remove it after the adviser confirms all migrated templates.

## Local deployment verification

After rebuilding or transferring the system:

1. Run `npm run local:start`.
2. Confirm the backend health endpoint is online.
3. Run the document composer validation commands listed in `DOCUMENT_COMPOSER_REBUILD_TRACKER.md`.
4. Test one portrait form, one landscape form, draft saving, finalization, reopening, and Save as PDF.
