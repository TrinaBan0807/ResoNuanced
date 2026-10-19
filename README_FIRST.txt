ResoNuanced Beta 0.7 — COMPLETE Vercel website package
========================================================

This package REPLACES the existing site frontend and includes:
- One-page, layperson-friendly interface with no tabs
- Public discussions, replies, reporting and anonymous sessions
- Optional nicknames and impact reflections (Helpful / Harmful / Both / Not sure)
- Author-only deletion of discussions, replies and reflections
- AI explanations of text, images and sampled video frames
- Vercel-compatible /api/analyze backend
- Mobile-responsive, keyboard-accessible layout
- Existing Supabase project configuration (publishable key, NOT a secret)

BEFORE DEPLOYING
1. Keep your existing GitHub repo and Supabase project. BACK UP your GitHub branch first.
2. In Supabase SQL Editor, run beta07_migration.sql ONCE.
   Do not rerun schema.sql on the existing project.
3. In Supabase Authentication > Providers, enable Anonymous Sign-Ins.
4. Unzip this package locally. Upload the CONTENTS of this folder to the ROOT
   of the GitHub repo, replacing index.html and config.js. Add app.js, style.css,
   package.json, vercel.json, api/analyze.js, and beta07_migration.sql.
   Keep your existing schema.sql and other files (they are not needed at runtime).
   Do NOT upload the ZIP itself expecting GitHub to extract it.
5. Vercel > New Project > Import your existing GitHub repository.
   Framework Preset: Other. Root Directory: ./ (repo root).
   Build Command: leave empty; Output Directory: leave empty.
6. Vercel > Project Settings > Environment Variables:
   GEMINI_API_KEY = your existing Gemini API key (SERVER ONLY, NEVER config.js).
   Optional: RESO_GEMINI_MODEL = gemini-2.5-flash
   Deploy / redeploy after adding environment variables.
7. The new Vercel URL will be separate from the Netlify site.
   Test thoroughly before sharing publicly.

TEST CHECKLIST
[ ] Homepage loads with no tabs, good on mobile
[ ] Existing discussions appear
[ ] Start an anonymous session, publish a discussion, reload
[ ] Post reply, reload, delete own reply
[ ] Save Mixed impact reflection, reload, edit, delete it
[ ] Delete own discussion and confirm replies/reflections disappear
[ ] Other browser cannot delete someone else's content
[ ] Report a discussion and a reply
[ ] AI text and image analysis returns response
[ ] Video upload sampling works on supported browsers
[ ] Ending an anonymous session warns of losing control over old posts

IMPORTANT LIMITATIONS
- Public beta posting is limited to age 13+. Ages 12 and younger should not
  post until suitable moderation, child privacy safeguards and legal review exist.
- The age confirmation is self-reported and NOT robust age verification.
- There is no automatic moderation or administrator review dashboard.
- Reports are saved for administrator review in Supabase; they are not auto-actioned.
- Anonymous sessions are stored in the browser. Signing out or clearing storage
  can permanently remove your ability to delete prior contributions.
- Delete is permanent; uploaded media objects are NOT automatically deleted from
  Supabase Storage when the related discussion is deleted.
- Impact counts cover the 200 most recent responses per discussion.
- AI usage is subject to Vercel and Gemini free-tier limits. The serverless
  endpoint has no production-grade abuse prevention or persistent rate limiting.
- Users' public text and optional nicknames are visible to everyone.
- Images/video frames sent for AI analysis go to Gemini.
- Never commit GEMINI_API_KEY, Supabase service_role, or sb_secret_ keys.
- This package has syntax checks, but it has NOT been deployed or end-to-end
  tested against the live Supabase database in this environment.
