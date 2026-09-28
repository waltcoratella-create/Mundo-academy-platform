import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveSelection, type DiscoveryForValidation } from "@/lib/meta/asset-validation";

// ── Fixtures: what Meta returned for THIS business's token ──────────────────
const ours = {
  id: "act_111", accountId: "111", name: "Mundo Academy",
  currency: "EUR", timezone: "Europe/Madrid", status: 1, usable: true,
};
const discovered = (over: Partial<DiscoveryForValidation> = {}): DiscoveryForValidation => ({
  adAccounts: { items: [ours], available: true, truncated: false },
  pages: { items: [{ id: "page_1", name: "Mundo Academy" }], available: true, truncated: false },
  pixels: { items: [{ id: "px_1", name: "Pixel" }], available: true, truncated: false },
  ...over,
});

describe("resolveSelection — the pure gate", () => {
  it("accepts ids Meta returned and copies names/currency/timezone from Meta", () => {
    const r = resolveSelection({ adAccountId: "act_111", pageId: "page_1", pixelId: "px_1" }, discovered());
    expect(r).toEqual({
      ok: true,
      selection: {
        adAccountId: "act_111", adAccountName: "Mundo Academy",
        adAccountCurrency: "EUR", adAccountTimezone: "Europe/Madrid",
        pageId: "page_1", pageName: "Mundo Academy",
        pixelId: "px_1", pixelName: "Pixel",
      },
    });
  });

  it("refuses an adAccountId that is not in the discovery (another tenant's account)", () => {
    const r = resolveSelection({ adAccountId: "act_999_OTHER", pageId: "page_1" }, discovered());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons.join()).toMatch(/cuenta publicitaria no está entre los activos/);
  });

  it("refuses a pageId the connected person has no role on", () => {
    const r = resolveSelection({ adAccountId: "act_111", pageId: "page_OTHER" }, discovered());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons.join()).toMatch(/página no está entre los activos/);
  });

  it("refuses a pixel of a different ad account", () => {
    const r = resolveSelection({ adAccountId: "act_111", pageId: "page_1", pixelId: "px_OTHER" }, discovered());
    expect(r.ok).toBe(false);
  });

  it("near-miss ids are not normalised into a match", () => {
    expect(resolveSelection({ adAccountId: "111", pageId: "page_1" }, discovered()).ok).toBe(false);
    expect(resolveSelection({ adAccountId: "act_1111", pageId: "page_1" }, discovered()).ok).toBe(false);
  });

  it("an unavailable edge is 'could not verify', never a pass", () => {
    const r = resolveSelection(
      { adAccountId: "act_111", pageId: "page_1" },
      discovered({ pages: { items: [], available: false, truncated: false } })
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons.join()).toMatch(/No se pudo verificar la página/);
  });

  it("a truncated list says it could not verify instead of accusing", () => {
    const r = resolveSelection(
      { adAccountId: "act_222", pageId: "page_1" },
      discovered({ adAccounts: { items: [ours], available: true, truncated: true } })
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons.join()).toMatch(/más activos de los que/);
  });

  it("refuses when Meta did not return currency or timezone — no client fallback", () => {
    const r = resolveSelection(
      { adAccountId: "act_111", pageId: "page_1" },
      discovered({ adAccounts: { items: [{ ...ours, currency: null }], available: true, truncated: false } })
    );
    expect(r.ok).toBe(false);
  });
});

// ── The server action, with Clerk / DB / Meta mocked ─────────────────────────
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getBusinessById: vi.fn(),
  discoverForValidation: vi.fn(),
  selectMetaAssets: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/queries", () => ({ getBusinessById: mocks.getBusinessById }));
vi.mock("@/lib/meta/discovery", () => ({
  discoverForValidation: mocks.discoverForValidation,
  discoverMetaAssets: vi.fn(),
}));
vi.mock("@/lib/meta/connections", () => ({
  selectMetaAssets: mocks.selectMetaAssets,
  getMetaConnectionForBusiness: vi.fn(),
  disconnectMetaConnection: vi.fn(),
}));

const { saveMetaSelection } = await import(
  "@/app/(dashboard)/mis-negocios/[businessId]/configuraciones/meta-actions"
);

describe("saveMetaSelection — manipulation attempts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: "user_owner" });
    mocks.getBusinessById.mockResolvedValue({ id: "biz_1", name: "B", logo_url: null });
    mocks.discoverForValidation.mockResolvedValue({ ok: true, discovered: discovered() });
    mocks.selectMetaAssets.mockImplementation(async (input) => ({ ok: true, connection: input }));
  });

  it("persists Meta's currency/timezone even if the browser sends forged ones", async () => {
    const forged = {
      businessId: "biz_1", adAccountId: "act_111", pageId: "page_1",
      // Extra fields the old API accepted — now ignored by construction.
      adAccountCurrency: "USD", adAccountTimezone: "UTC", adAccountName: "Hacked",
    } as unknown as Parameters<typeof saveMetaSelection>[0];

    const r = await saveMetaSelection(forged);
    expect(r.ok).toBe(true);
    const persisted = mocks.selectMetaAssets.mock.calls[0][0];
    expect(persisted.adAccountCurrency).toBe("EUR");
    expect(persisted.adAccountTimezone).toBe("Europe/Madrid");
    expect(persisted.adAccountName).toBe("Mundo Academy");
  });

  it("writes nothing when the adAccountId is not discoverable", async () => {
    const r = await saveMetaSelection({ businessId: "biz_1", adAccountId: "act_999", pageId: "page_1" });
    expect(r.ok).toBe(false);
    expect(mocks.selectMetaAssets).not.toHaveBeenCalled();
  });

  it("writes nothing when the pageId is not discoverable", async () => {
    const r = await saveMetaSelection({ businessId: "biz_1", adAccountId: "act_111", pageId: "page_x" });
    expect(r.ok).toBe(false);
    expect(mocks.selectMetaAssets).not.toHaveBeenCalled();
  });

  it("never discovers with another business's connection when not the owner", async () => {
    mocks.getBusinessById.mockResolvedValue(null);
    const r = await saveMetaSelection({ businessId: "biz_other", adAccountId: "act_111", pageId: "page_1" });
    expect(r.ok).toBe(false);
    expect(mocks.discoverForValidation).not.toHaveBeenCalled();
    expect(mocks.selectMetaAssets).not.toHaveBeenCalled();
  });

  it("validates against the discovery of the business in the request", async () => {
    await saveMetaSelection({ businessId: "biz_1", adAccountId: "act_111", pageId: "page_1" });
    expect(mocks.discoverForValidation).toHaveBeenCalledWith("biz_1", "act_111");
  });
});
