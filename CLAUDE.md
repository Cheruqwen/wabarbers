# PitStop 87 / WaBarbers site

Static site (no build step) hosted on GitHub Pages from the `wabarbers` repo, branch `main`, folder `/` (root).
Pushing to `main` deploys: the live site updates 1–2 minutes later.

- Publish a change: `git add -A`, `git commit -m "..."`, `git push`.
- Test locally before pushing: `npm run demo`, then open http://localhost:8080 (staff app at /staff/).
- Run `npm test` after changing `supabase/schema.sql` or permission logic.
- Never commit `node_modules/` or `local-data/` (already in .gitignore).
- `config.js` holds only the public Supabase anon key. Never put the service_role/secret key in any file here.
- After a `supabase/schema.sql` change, remind the user to re-run it in the Supabase SQL Editor.
