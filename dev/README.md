# Permission tests (for developers)

Not needed to run the website. These tests load `supabase/schema.sql` into an in-memory Postgres (PGlite) and check, role by role, that each person can only see and do what they should.

From the main folder:

```
npm install
npm test
```
