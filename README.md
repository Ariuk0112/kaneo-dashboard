# Сургалтын албаны хүсэлтийн тойм

Next.js dashboard for student requests, with live data from every project in a Kaneo workspace
(`KANEO_WORKSPACE_ID`; projects named like `KANEO_EXCLUDE_PROJECTS`, default `staging,test`, are skipped).

## Run

```bash
nvm use                       # Node 22 (see .nvmrc)
npm install
cp .env.example .env.local    # then set KANEO_API_TOKEN
npm run dev                   # http://localhost:3000
```

Production: `npm run build && npm start`.

## Code map

```
src/
  lib/
    env.ts               settings from .env.local, validated with zod
    kaneo/
      schema.d.ts        Kaneo API types — GENERATED, run `npm run kaneo:types`
      client.ts          typed Kaneo API calls (openapi-fetch)
      requests.ts        Kaneo task → StudentRequest; cached with "use cache"
    dashboard.ts         all dashboard numbers (date-fns, Ulaanbaatar time)
  components/            one file per widget; charts use Recharts
  app/page.tsx           reads ?period=7d|1m|6m and renders the widgets
```

Data flows one way: **Kaneo API → `client.ts` → `requests.ts` → `dashboard.ts` → components.**
Everything in `lib/` runs on the server only (`server-only`), so the token never reaches the browser.

## Packages

| Package | Used for |
|---|---|
| `openapi-fetch` + `openapi-typescript` | Kaneo API calls typed from Kaneo's own OpenAPI spec |
| `zod` | validating env vars and Kaneo's untyped `eventData` |
| `date-fns` + `@date-fns/tz` | date math in Ulaanbaatar time |
| `p-limit` | at most 8 parallel Kaneo requests |
| `recharts` | weekly bar chart and today's pie |
| `clsx` | conditional class names |

If Kaneo's API changes, run `npm run kaneo:types`; TypeScript will then point at any code that needs updating.

## Where each number comes from

| Widget | Kaneo source |
|---|---|
| Ирсэн / Шийдвэрлэсэн / Татгалзсан | task `status` (`done`, `rejected`, others = open) |
| Хамгийн их ирсэн хүсэлтүүд | the `**Хүсэлт:**` (or older `**Хүсэлтийн төрөл:**`) line in the description |
| Татгалзсан шалтгаанууд | red labels on the task |
| Хугацаа хэтэрсэн | `dueDate` passed while open, or closed after it |
| Дундаж хугацаа | created → last `status_changed` to done/rejected |
| Weekly chart / Өдрийн гүйцэтгэл | close date of `done` tasks; arrivals by `createdAt` |

Excluded: archived tasks, tasks with no request-type line (internal work), and test
submissions matching `KANEO_TEST_MARKERS`.

**Azaa AI:** Kaneo has no field for it. Put the Kaneo user id(s) the AI closes requests with in
`KANEO_AI_USER_IDS`; until then every resolution counts as "Ажилтан".

Kaneo data is cached for `KANEO_REVALIDATE_SECONDS` (default 60 s). The header shows when it was
last loaded and from which projects; the **Шинэчлэх** button reloads from Kaneo right away.
