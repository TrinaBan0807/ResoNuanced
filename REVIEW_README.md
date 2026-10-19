# ResoNuanced — Safety Review Release 0.8 (development candidate)

This package is **not a production-ready public moderation service**. It is a reviewable integration candidate built on the previous beta 0.7 files. No deployment has been made.

## Included
- Existing Supabase community discussion, image/audio/video attachments and Gemini analysis.
- New multimodal format selector and click-to-play YouTube embeds.
- Optional email OTP/magic-link login and My Space listing of owned discussions.
- Authenticated server-side text screening before new discussion publishing. Screening returns allow/review/hold; only allow publishes. Screening errors fail closed.

## IMPORTANT limitations
- **The AI does not scan attached image/audio/video bytes before publication**. The screening endpoint receives only text and attachment MIME type. Do not represent this release as autonomous multimodal moderation.
- REVIEW and HOLD do not yet create durable moderation queue records. Authors receive a message and the content is not published.
- The current backend has no verified abuse-rate limiting, moderation dashboard, appeal process, or notification system.
- The existing anonymous sessions are not automatically merged into new email identities. Existing anonymous content may be inaccessible after sign-out.
- A public media storage bucket may expose uploaded files by URL. Check Supabase RLS, storage rules and retention.
- Email OTP requires Supabase Auth email provider and redirect URL configuration.
- Uploaded media and public YouTube links are NOT verified as authentic. No deepfake detection is implemented.
- Client-side gating is not a substitute for DB policies; existing clients could bypass /api/screen and write to Supabase directly. A database-enforced moderation gate or server-mediated publishing is mandatory before any public release.

## Environment
In Vercel set GEMINI_API_KEY, RESO_GEMINI_MODEL (a model your key supports), SUPABASE_URL and SUPABASE_ANON_KEY (publishable/anon, never service-role in browser). The browser config.js contains the public publishable key.

## Deployment and test
1. Upload the files to the repository, preserving paths. GitHub connector denied writes (403), so no live changes were made.
2. Configure Vercel environment variables and Supabase Auth redirect URLs.
3. Test anonymous browse, magic-link sign-in, upload, AI analysis, discussion posting, reports, deletion and mobile layout.
4. **Do not invite untrusted public users until backend enforcement, upload moderation, moderator queue and incident response are implemented and validated.**
