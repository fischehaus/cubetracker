/**
 * React-Query-Key-Hierarchie (Single-Source).
 *
 * Hintergrund (W.cache-invalidation-prefix, 2026-05-29):
 *   Vorher hatten 8+ Mutation-Cluster jeweils 5-13 Zeilen
 *   `qc.invalidateQueries({ queryKey: ["…"] })` hintereinander, mit
 *   wortwörtlich identischen Listen in mehreren Hooks (z.B. die 13-Key-
 *   Liste bei createSolve / updateSolve / deleteSolve war 3× wörtlich
 *   wiederholt). Drift war vorprogrammiert: neuer Stats-Endpoint → in
 *   3+ Hooks nachziehen, leicht vergessen → UI zeigt stale Werte.
 *   Bonus: ein Cluster (wipeDemoData) invalidierte `["activity"]`,
 *   `["temporal"]`, `["by-cube"]` — die echten Keys heißen aber
 *   `["stats-activity"]`, `["stats-temporal"]`, `["stats-by-cube"]`,
 *   also stille No-Ops.
 *
 * Lösung: jeder Query-Key startet mit einem **Domain-Prefix**
 * (`["solves-domain", …]`, `["sessions-domain", …]`, …). React-Query
 * invalidiert per Default alles, dessen queryKey **mit dem angegebenen
 * Key beginnt**. D.h. ein Aufruf `invalidateQueries({ queryKey:
 * qk.solves.all() })` invalidiert in einem Rutsch alle Solve-list,
 * Stats-overall, Stats-by-cube, … Queries.
 *
 * **Migrations-Hinweis:** Die Domain-Suffixe (`-domain`) sind absichtlich
 * NEU. Bestehende localStorage-Cache-Persistierung wird nicht benutzt
 * (kein `persistQueryClient`), also kein Cache-Migration nötig — bei
 * Deploy einfach Hard-Reload, die alten Keys verschwinden mit dem
 * InMemory-QueryClient.
 *
 * Konvention pro Domain:
 *   - `qk.domain.all()`     → reiner Prefix, für **Invalidation** (matcht alles unter der Domain)
 *   - `qk.domain.list(p)`   → konkrete Query mit Params (für useQuery)
 *   - `qk.domain.detail(id)` → einzelner Datensatz
 *
 * Params bleiben bewusst `unknown` (queryKey braucht keine Compile-Typ-
 * Sicherheit; jeder Hook kennt seinen Returntyp via `queryFn`).
 */

type QueryKeyParams = unknown;

export const qk = {
  // =====================================================================
  // SOLVES-Domain — alles was sich durch eine Solve-Mutation ändert:
  // - solves selbst (list)
  // - alle Stats-Varianten (overall, by-cube, by-session, by-hardware,
  //   temporal, activity, by-alg-case)
  // - pb-history, recent-pbs
  // =====================================================================
  solves: {
    all: () => ["solves-domain"] as const,
    list: (params: QueryKeyParams) => ["solves-domain", "list", params] as const,
    statsOverall: (params: QueryKeyParams) =>
      ["solves-domain", "stats", "overall", params] as const,
    statsByCube: (params: QueryKeyParams) =>
      ["solves-domain", "stats", "by-cube", params] as const,
    statsBySession: (params: QueryKeyParams) =>
      ["solves-domain", "stats", "by-session", params] as const,
    statsByHardware: (params: QueryKeyParams) =>
      ["solves-domain", "stats", "by-hardware", params] as const,
    statsTemporal: (params: QueryKeyParams) =>
      ["solves-domain", "stats", "temporal", params] as const,
    statsActivity: (params: QueryKeyParams) =>
      ["solves-domain", "stats", "activity", params] as const,
    statsByAlgCase: (subset: string) =>
      ["solves-domain", "stats", "by-alg-case", subset] as const,
    pbHistory: (params: QueryKeyParams) =>
      ["solves-domain", "pb-history", params] as const,
    recentPbs: (limit: number) =>
      ["solves-domain", "recent-pbs", limit] as const,
  },

  // =====================================================================
  // SESSIONS-Domain — sessions-Liste + suggest-Query.
  // suggest hat per-cubeType-Subkey; suggestAll() ist der Prefix zum
  // Mass-Invalidieren über alle cubeTypes.
  // =====================================================================
  sessions: {
    all: () => ["sessions-domain"] as const,
    list: () => ["sessions-domain", "list"] as const,
    suggestAll: () => ["sessions-domain", "suggest"] as const,
    suggest: (cubeType: string | undefined) =>
      ["sessions-domain", "suggest", cubeType] as const,
  },

  // =====================================================================
  // HARDWARE-Domain — analog Sessions.
  // =====================================================================
  hardware: {
    all: () => ["hardware-domain"] as const,
    list: (params: QueryKeyParams) =>
      ["hardware-domain", "list", params] as const,
    suggestAll: () => ["hardware-domain", "suggest"] as const,
    suggest: (cubeType: string | undefined) =>
      ["hardware-domain", "suggest", cubeType] as const,
  },

  // =====================================================================
  // ACHIEVEMENTS — einzige Query, eigene Domain für klarere Mutations.
  // =====================================================================
  achievements: {
    all: () => ["achievements-domain"] as const,
  },

  // =====================================================================
  // CHALLENGES-Domain — today + history(days).
  // =====================================================================
  challenges: {
    all: () => ["challenges-domain"] as const,
    today: () => ["challenges-domain", "today"] as const,
    history: (days: number) =>
      ["challenges-domain", "history", days] as const,
  },

  // =====================================================================
  // FRIENDS-Domain — list + search(q).
  // =====================================================================
  friends: {
    all: () => ["friends-domain"] as const,
    list: () => ["friends-domain", "list"] as const,
    search: (q: string) => ["friends-domain", "search", q] as const,
  },

  // =====================================================================
  // FEEDBACK — getrennt user/admin, damit Admin-Updates nicht den User-
  // Tab refetchen und umgekehrt.
  // =====================================================================
  feedback: {
    user: {
      all: () => ["my-feedback-domain"] as const,
      list: () => ["my-feedback-domain", "list"] as const,
      unread: () => ["my-feedback-domain", "unread"] as const,
    },
    admin: {
      all: () => ["admin-feedback-domain"] as const,
      list: (status: string | undefined, category: string | undefined) =>
        ["admin-feedback-domain", "list", status ?? "all", category ?? "all"] as const,
      stats: () => ["admin-feedback-domain", "stats"] as const,
    },
  },

  // =====================================================================
  // ADMIN-Domain — Users + Stats (gehören zusammen, beide ändern sich
  // bei User-Mutation).
  // =====================================================================
  admin: {
    all: () => ["admin-domain"] as const,
    users: () => ["admin-domain", "users"] as const,
    stats: () => ["admin-domain", "stats"] as const,
  },

  // =====================================================================
  // ADMIN-LIVE-TESTS — eigene Domain (3 Mutations).
  // =====================================================================
  adminLiveTests: {
    all: () => ["admin-live-tests-domain"] as const,
    list: (statusFilter: string | undefined) =>
      ["admin-live-tests-domain", "list", statusFilter ?? "all"] as const,
  },

  // =====================================================================
  // ROADMAP — single key.
  // =====================================================================
  roadmap: {
    all: () => ["roadmap-domain"] as const,
  },

  // =====================================================================
  // WCA — Profile + Upcoming-Comps (params: distance/limit/days).
  // =====================================================================
  wca: {
    all: () => ["wca-domain"] as const,
    meProfile: () => ["wca-domain", "me-profile"] as const,
    upcoming: (maxDistanceKm: number, limit: number, daysAhead: number) =>
      ["wca-domain", "upcoming", maxDistanceKm, limit, daysAhead] as const,
  },

  // =====================================================================
  // NEWS — single query mit limit.
  // =====================================================================
  news: {
    all: () => ["news-domain"] as const,
    latest: (limit: number) => ["news-domain", "latest", limit] as const,
  },

  // =====================================================================
  // LEADERBOARD — bisher nirgendwo invalidiert (Bug #2 vor Refactor).
  // Solve-Mutations triggern jetzt qk.leaderboard.all() →
  // Eigene Position im Ranking aktualisiert sich live.
  // =====================================================================
  leaderboard: {
    all: () => ["leaderboard-domain"] as const,
    cubeTypes: () => ["leaderboard-domain", "cube-types"] as const,
    byCube: (cubeType: string | null) =>
      ["leaderboard-domain", "by-cube", cubeType] as const,
  },

  // =====================================================================
  // SNAPSHOTS (BackupPanel) — separater Lifecycle, keine Cross-Domain-
  // Invalidation nötig.
  // =====================================================================
  snapshots: {
    all: () => ["snapshots-domain"] as const,
  },

  // =====================================================================
  // PATCH-NOTES — statisch, kein Invalidate erwartet.
  // =====================================================================
  patchNotes: {
    all: () => ["patch-notes-domain"] as const,
  },

  // =====================================================================
  // HEALTH — Version-Badge. Kein Invalidate, refetchInterval-only.
  // Lebt trotzdem in der Hierarchie, damit kein „freier" Key im Code
  // außerhalb von qk.* steht (Audit-Hygiene).
  // =====================================================================
  health: {
    all: () => ["health-domain"] as const,
  },
} as const;
