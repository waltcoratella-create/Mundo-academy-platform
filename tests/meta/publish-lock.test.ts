import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The two halves of the version/lock race, at the app boundary.
 *
 *  · acquirePublishLock is one RPC call; the SQL (acquire_publish_lock) owns
 *    the decision. These tests pin what we send it and how we read it back.
 *  · saveCampaignDraft only writes if the row is still at the version it read,
 *    so a save queued behind the lock writes nothing once the lock moves it.
 *
 * The SQL itself was exercised against Postgres inside a rolled-back
 * transaction (see the unit's report); here we pin the contract around it.
 */

const m = vi.hoisted(() => ({
  rpc: vi.fn(),
  ops: [] as Array<{ table: string; op: string; filters: Record<string, unknown> }>,
  rows: {} as Record<string, unknown>,
  getCampaignLink: vi.fn(),
  getAdLinks: vi.fn(),
  auth: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: m.rpc,
    from: (table: string) => {
      const rec = { table, op: "select", filters: {} as Record<string, unknown> };
      const chain: Record<string, unknown> = {
        select: () => chain,
        update: () => { rec.op = "update"; return chain; },
        insert: () => { rec.op = "insert"; return chain; },
        eq: (col: string, val: unknown) => { rec.filters[col] = val; return chain; },
        maybeSingle: async () => { m.ops.push(rec); return { data: m.rows[`${table}:${rec.op}`] ?? null, error: null }; },
        single: async () => { m.ops.push(rec); return { data: m.rows[`${table}:${rec.op}`] ?? null, error: null }; },
      };
      return chain;
    },
  }),
}));

// ── acquirePublishLock ──────────────────────────────────────────────────────
describe("acquirePublishLock — one RPC, the SQL decides", async () => {
  const { acquirePublishLock } = await vi.importActual<typeof import("@/lib/meta/publish-links")>(
    "@/lib/meta/publish-links"
  );

  beforeEach(() => { vi.clearAllMocks(); m.ops.length = 0; m.rows = {}; });

  it("sends the campaign, the EXACT expected version, a fresh token and the stale threshold", async () => {
    m.rpc.mockResolvedValue({ data: "ACQUIRED", error: null });
    m.rows["meta_campaign_links:select"] = {
      ad_campaign_id: "c1", publish_status: "running", publish_step: "campaign", attempt_token: "t",
    };
    const r = await acquirePublishLock("c1", "2026-09-28T10:00:00.123456+00:00");

    expect(m.rpc).toHaveBeenCalledTimes(1);
    const [fn, args] = m.rpc.mock.calls[0];
    expect(fn).toBe("acquire_publish_lock");
    expect(args.p_ad_campaign_id).toBe("c1");
    expect(args.p_expected_updated_at).toBe("2026-09-28T10:00:00.123456+00:00");
    expect(args.p_attempt_token).toMatch(/^[0-9a-f-]{36}$/);
    expect(Date.parse(args.p_stale_before)).toBeLessThan(Date.now() - 9 * 60_000);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.token).toBe(args.p_attempt_token);
  });

  it.each([
    ["DRAFT_CHANGED", "draft_changed"],
    ["BUSY", "busy"],
    ["ALREADY_PUBLISHED", "already_published"],
    ["NOT_FOUND", "not_found"],
    ["NOT_PUBLISHABLE", "not_publishable"],
  ])("%s → %s, and nothing else is read or written", async (outcome, reason) => {
    m.rpc.mockResolvedValue({ data: outcome, error: null });
    expect(await acquirePublishLock("c1", "v")).toEqual({ ok: false, reason });
    expect(m.ops).toEqual([]);
  });

  it("an unknown answer is an error, never a lock", async () => {
    m.rpc.mockResolvedValue({ data: "SOMETHING_ELSE", error: null });
    await expect(acquirePublishLock("c1", "v")).rejects.toThrow();
  });
});

// ── saveCampaignDraft ───────────────────────────────────────────────────────
vi.mock("@clerk/nextjs/server", () => ({ auth: m.auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/meta/publish-links", async () => ({
  ...(await vi.importActual<object>("@/lib/meta/publish-links")),
  getCampaignLink: m.getCampaignLink,
  getAdLinks: m.getAdLinks,
}));
vi.mock("@/app/(dashboard)/mis-negocios/[businessId]/anuncios/meta-account", () => ({
  getMetaAccountBinding: vi.fn(async () => ({ bound: false, apiAvailable: false })),
}));

describe("saveCampaignDraft — only writes the version it read", async () => {
  const { saveCampaignDraft } = await import(
    "@/app/(dashboard)/mis-negocios/[businessId]/anuncios/campaign-actions"
  );
  const { emptyDraft } = await import(
    "@/app/(dashboard)/mis-negocios/[businessId]/anuncios/create/campaign-types"
  );

  const V0 = "2026-09-28T10:00:00.123456+00:00";
  const draft = () => { const d = emptyDraft("EUR", "Europe/Madrid"); d.objective = "traffic"; return d; };

  beforeEach(() => {
    vi.clearAllMocks(); m.ops.length = 0;
    m.auth.mockResolvedValue({ userId: "clerk_1" });
    m.rows = {
      "users:select": { id: "user_1" },
      "businesses:select": { id: "biz_1" },
      "ad_campaigns:select": { updated_at: V0 },
      "ad_campaigns:update": { id: "camp_1" },
    };
    m.getCampaignLink.mockResolvedValue(null);
    m.getAdLinks.mockResolvedValue([]);
  });

  it("conditions the UPDATE on the updated_at it just read", async () => {
    const r = await saveCampaignDraft({ businessId: "biz_1", campaignId: "camp_1", draft: draft() });
    expect(r.ok).toBe(true);
    const update = m.ops.find((o) => o.table === "ad_campaigns" && o.op === "update")!;
    expect(update.filters).toMatchObject({ id: "camp_1", business_id: "biz_1", status: "draft", updated_at: V0 });
  });

  it("a row that moved on (a publish took the lock) → nothing written, clear message", async () => {
    delete m.rows["ad_campaigns:update"]; // the conditional UPDATE matched no row
    const r = await saveCampaignDraft({ businessId: "biz_1", campaignId: "camp_1", draft: draft() });
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/cambió o se está publicando/) });
  });

  it("a publish already running → refused before any UPDATE", async () => {
    m.getCampaignLink.mockResolvedValue({
      publishStatus: "running", metaCampaignId: null, metaAdSetId: null,
    });
    const r = await saveCampaignDraft({ businessId: "biz_1", campaignId: "camp_1", draft: draft() });
    expect(r.ok).toBe(false);
    expect(m.ops.some((o) => o.table === "ad_campaigns" && o.op === "update")).toBe(false);
  });
});
