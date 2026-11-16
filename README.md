# CoopFlow
1. `cp .env.example .env` puis renseigner Supabase + DATABASE_URL
2. `npm i && npx prisma migrate dev --name init`
3. `npm run dev` → http://localhost:3000/fr
4. `npm test` (nécessite une base de test)

Règle : ne jamais importer `prisma` directement dans une page ; toujours passer par `requireUser().db`.

## Seed de démonstration
`npm run db:seed` recrée la « Coopérative Tazrout » (idempotent). Avec `SUPABASE_SERVICE_ROLE_KEY` défini, les comptes
admin@tazrout.demo / comptable@tazrout.demo / stock@tazrout.demo sont créés dans Supabase Auth ; le mot de passe est
`SEED_PASSWORD` (ou généré et affiché). Ne jamais lancer le seed sur une base de production.
