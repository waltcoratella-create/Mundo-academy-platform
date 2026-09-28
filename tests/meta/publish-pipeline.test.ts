import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { emptyDraft, type CampaignDraft } from "@/app/(dashboard)/mis-negocios/[businessId]/anuncios/create/campaign-types";

/**
 * The orchestrator against a simulated Graph and database.
 *
 * What these pin down: nothing is created unless every gate passes, every
 * creation is PAUSED, a resume never recreates an object that has an id, a lost
 * lock or an unanswerable reconciliation stops the run BEFORE any POST, and
 * Meta's errors are stored with their code, subcode and trace.
 */

const m = vi.hoisted(() => ({
  graph: vi.fn(),
  getToken: vi.fn(),
  getConnection: vi.fn(),
  readiness: vi.fn(),
  getDsa: vi.fn(),
  acquire: vi.fn(),
  getAdLinks: vi.fn(),
  getCampaignLink: vi.fn(),
  saveCampaign: vi.fn(),
  saveAdSet: vi.fn(),
  saveCreative: vi.fn(),
  saveAd: vi.fn(),
  saveDsa: vi.fn(),
  markPublished: vi.fn(),
  markFailed: vi.fn(),
}));

vi.mock("@/lib/meta/graph", async () => {
  const actual = await vi.importActual<typeof import("@/lib/meta/graph")>("@/lib/meta/graph");
  return { ...actual, metaGraphRequest: m.graph };
});
vi.mock("@/lib/meta/connections", () => ({
  getMetaAccessToken: m.getToken, getMetaConnectionForBusiness: m.getConnection,
}));
vi.mock("@/lib/meta/publish-readiness", () => ({ validateMetaPublishReadiness: m.readiness }));
vi.mock("@/lib/meta/ad-settings", () => ({ getDsaSettings: m.getDsa }));
vi.mock("@/lib/meta/publish-links", () => ({
  acquirePublishLock: m.acquire,
  getAdLinks: m.getAdLinks,
  getCampaignLink: m.getCampaignLink,
  saveMetaCampaignId: m.saveCampaign,
  saveMetaAdSetId: m.saveAdSet,
  saveMetaCreativeId: m.saveCreative,
  saveMetaAdId: m.saveAd,
  saveDsaSnapshot: m.saveDsa,
  markPublished: m.markPublished,
  markFailed: m.markFailed,
  PublishLinkError: class PublishLinkError extends Error {},
}));

const { publishCampaignToMeta, describeMetaError, assertPaused, PAYMENT_METHOD_SUBCODE } =
  await import("@/lib/meta/publish");
const { MetaGraphError } = await import("@/lib/meta/graph");

const CAMPAIGN = "8f4c2b1e-9a77-4d3e-b0f5-1c2d3e4f5a6b";
const ACT = "act_2125346094861572";

function draft(): CampaignDraft {
  const d = emptyDraft("EUR", "Europe/Madrid");
  d.name = "Test"; d.objective = "traffic"; d.budgetType = "daily"; d.budgetAmount = "200";
  d.startsAt = "2030-09-10T09:00"; d.timezone = "Europe/Madrid";
  d.delivery = { ...d.delivery, budgetControl: "adset" };
  d.audience = { ...d.audience, advantageAudience: true, includedLocations: [{
    key: "ES", name: "España", type: "country", countryCode: "ES", countryName: "España", region: null,
  }] };
  d.creative = { ads: [{
    id: "ad-1", mediaUrl: "https://cdn.example.com/a.jpg", mediaType: "image",
    primaryText: "Texto", headline: "Titular", description: "", cta: "learn_more",
    destinationUrl: "https://mundoacademy.com.mx/",
  }] };
  return d;
}

const freshLink = {
  adCampaignId: CAMPAIGN, metaCampaignId: null, metaAdSetId: null,
  publishStatus: "running", publishStep: "campaign", publishError: null, attemptToken: "tok",
};

/** A Graph that finds nothing on reconciliation and answers POSTs with ids. */
function defaultGraph() {
  m.graph.mockImplementation(async (opts: { path: string; method?: string }) => {
    if (opts.method === "POST") return { id: `new${opts.path.split("/").pop()}` };
    return { data: [] };
  });
}

const posts = () =>
  m.graph.mock.calls.filter(([o]) => o.method === "POST").map(([o]) => o.path.split("/").pop());

const VERSION = "2026-09-28T10:00:00.123456+00:00";
const run = () =>
  publishCampaignToMeta({ businessId: "biz", adCampaignId: CAMPAIGN, draft: draft(), expectedVersion: VERSION });

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.META_PUBLISH_DISABLED;
  defaultGraph();
  m.getToken.mockResolvedValue("user-token");
  m.getConnection.mockResolvedValue({
    adAccountId: ACT, pageId: "PAGE", adAccountCurrency: "EUR", adAccountTimezone: "Europe/Madrid",
  });
  m.readiness.mockResolvedValue({ ready: true, checkedMeta: true, errors: [], warnings: [] });
  m.getDsa.mockResolvedValue({ beneficiary: "Mundo Academy", payor: "Grupo Mundo Ejecutivo", confirmedAt: "x" });
  m.acquire.mockResolvedValue({ ok: true, token: "tok", link: freshLink });
  m.getAdLinks.mockResolvedValue([]);
  m.getCampaignLink.mockResolvedValue({ ...freshLink, publishStatus: "published" });
  for (const f of [m.saveCampaign, m.saveAdSet, m.saveCreative, m.saveAd, m.saveDsa, m.markPublished, m.markFailed]) {
    f.mockResolvedValue(true);
  }
});
afterEach(() => { delete process.env.META_PUBLISH_DISABLED; });

describe("a fresh publish", () => {
  it("creates the four objects in order and closes the publish", async () => {
    const r = await run();
    expect(r.ok).toBe(true);
    expect(posts()).toEqual(["campaigns", "adsets", "adcreatives", "ads"]);
    expect(m.markPublished).toHaveBeenCalledWith(CAMPAIGN, "tok");
  });

  it("every creation that carries a status sends PAUSED", async () => {
    await run();
    for (const [opts] of m.graph.mock.calls) {
      if (opts.method !== "POST") continue;
      if ("status" in opts.params) expect(opts.params.status).toBe("PAUSED");
    }
  });

  it("records the DSA declaration BEFORE sending the ad set", async () => {
    await run();
    const snapOrder = m.saveDsa.mock.invocationCallOrder[0];
    const adsetPost = m.graph.mock.calls.findIndex(([o]) => o.method === "POST" && o.path.endsWith("/adsets"));
    expect(snapOrder).toBeLessThan(m.graph.mock.invocationCallOrder[adsetPost]);
    expect(m.saveDsa).toHaveBeenCalledWith(CAMPAIGN, "tok", { beneficiary: "Mundo Academy", payor: "Grupo Mundo Ejecutivo" });
  });
});

describe("gates — zero creation POSTs when any of them fails", () => {
  it("kill switch on → nothing read, nothing locked, nothing sent", async () => {
    process.env.META_PUBLISH_DISABLED = "true";
    const r = await run();
    expect(r).toMatchObject({ ok: false, code: "PUBLISH_DISABLED" });
    expect(m.readiness).not.toHaveBeenCalled();
    expect(m.acquire).not.toHaveBeenCalled();
    expect(m.graph).not.toHaveBeenCalled();
  });

  it("kill switch 'false' behaves as off", async () => {
    process.env.META_PUBLISH_DISABLED = "false";
    expect((await run()).ok).toBe(true);
  });

  it("not ready → no lock, no POST", async () => {
    m.readiness.mockResolvedValue({ ready: false, checkedMeta: true, errors: [{}], warnings: [] });
    expect(await run()).toMatchObject({ ok: false, code: "NOT_READY" });
    expect(m.acquire).not.toHaveBeenCalled();
    expect(posts()).toEqual([]);
  });

  it("ready but Meta unchecked → still refused", async () => {
    m.readiness.mockResolvedValue({ ready: true, checkedMeta: false, errors: [], warnings: [] });
    expect(await run()).toMatchObject({ ok: false, code: "NOT_READY" });
    expect(posts()).toEqual([]);
  });

  it("EU country without a DSA declaration → refused before the lock", async () => {
    m.getDsa.mockResolvedValue(null);
    expect(await run()).toMatchObject({ ok: false, code: "UNSUPPORTED" });
    expect(m.acquire).not.toHaveBeenCalled();
  });

});

describe("the atomic lock decides — and a refusal means zero calls to Meta", () => {
  it("correct version → the lock is requested with that exact version, then the run proceeds", async () => {
    const r = await run();
    expect(m.acquire).toHaveBeenCalledWith(CAMPAIGN, VERSION);
    expect(r.ok).toBe(true);
  });

  it("draft changed before the lock → DRAFT_CHANGED, zero Meta calls of any kind", async () => {
    m.acquire.mockResolvedValue({ ok: false, reason: "draft_changed" });
    expect(await run()).toMatchObject({ ok: false, code: "DRAFT_CHANGED" });
    expect(m.graph).not.toHaveBeenCalled();
    expect(m.markFailed).not.toHaveBeenCalled();
  });

  it("BUSY → zero Meta calls", async () => {
    m.acquire.mockResolvedValue({ ok: false, reason: "busy" });
    expect(await run()).toMatchObject({ ok: false, code: "BUSY" });
    expect(m.graph).not.toHaveBeenCalled();
  });

  it("ALREADY_PUBLISHED → zero Meta calls", async () => {
    m.acquire.mockResolvedValue({ ok: false, reason: "already_published" });
    expect(await run()).toMatchObject({ ok: false, code: "ALREADY_PUBLISHED" });
    expect(m.graph).not.toHaveBeenCalled();
  });

  it("not publishable → zero Meta calls", async () => {
    m.acquire.mockResolvedValue({ ok: false, reason: "not_publishable" });
    expect(await run()).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(m.graph).not.toHaveBeenCalled();
  });
});

describe("resume after a failure", () => {
  it("campaign and ad set exist → only the creative and the ad are created", async () => {
    m.acquire.mockResolvedValue({
      ok: true, token: "tok",
      link: { ...freshLink, publishStatus: "running", metaCampaignId: "C1", metaAdSetId: "S1" },
    });
    const r = await run();
    expect(r).toMatchObject({ ok: true, resumed: true });
    expect(posts()).toEqual(["adcreatives", "ads"]);
    expect(m.saveCampaign).not.toHaveBeenCalled();
    expect(m.saveAdSet).not.toHaveBeenCalled();
    expect(m.saveDsa).not.toHaveBeenCalled(); // the declaration was made when S1 was created
  });

  it("creative exists too → only the ad, wired to the stored ids", async () => {
    m.acquire.mockResolvedValue({
      ok: true, token: "tok", link: { ...freshLink, metaCampaignId: "C1", metaAdSetId: "S1" },
    });
    m.getAdLinks.mockResolvedValue([{ localAdId: "ad-1", metaCreativeId: "CR1", metaAdId: null }]);
    await run();
    expect(posts()).toEqual(["ads"]);
    const adPost = m.graph.mock.calls.find(([o]) => o.method === "POST")![0];
    expect(adPost.params.adset_id).toBe("S1");
    expect(JSON.parse(adPost.params.creative)).toEqual({ creative_id: "CR1" });
  });

  it("an orphan found by its name tag is adopted, not duplicated", async () => {
    m.graph.mockImplementation(async (opts: { path: string; method?: string }) => {
      if (opts.method === "POST") return { id: `new${opts.path.split("/").pop()}` };
      if (opts.path.endsWith("/campaigns")) return { data: [{ id: "ORPHAN", name: `[ma:${CAMPAIGN}] Test` }] };
      return { data: [] };
    });
    await run();
    expect(posts()).toEqual(["adsets", "adcreatives", "ads"]);
    expect(m.saveCampaign).toHaveBeenCalledWith(CAMPAIGN, "tok", "ORPHAN");
  });
});

describe("stops that protect against duplicates", () => {
  it("lost lock after the campaign → no further POST, and no write over the new owner", async () => {
    m.saveCampaign.mockResolvedValue(false);
    const r = await run();
    expect(r).toMatchObject({ ok: false, code: "LOCK_LOST" });
    expect(posts()).toEqual(["campaigns"]);
    expect(m.markFailed).not.toHaveBeenCalled();
  });

  it("a failed reconciliation lookup never becomes a blind POST", async () => {
    m.graph.mockImplementation(async (opts: { method?: string }) => {
      if (opts.method === "POST") return { id: "x" };
      throw new MetaGraphError({ message: "timeout", httpStatus: 500, traceId: "TR" });
    });
    const r = await run();
    expect(r.ok).toBe(false);
    expect(posts()).toEqual([]);
    expect(m.markFailed).toHaveBeenCalledWith(CAMPAIGN, "tok", "campaign", expect.stringMatching(/evitar duplicados/), false);
  });
});

describe("Meta errors are stored with everything support needs", () => {
  it("payment-method subcode is translated, keeps code/subcode/trace, marks partial at 'ad'", async () => {
    m.graph.mockImplementation(async (opts: { path: string; method?: string }) => {
      if (opts.method === "POST" && opts.path.endsWith("/ads")) {
        throw new MetaGraphError({
          message: "Actualiza el método de pago", code: 100, subcode: PAYMENT_METHOD_SUBCODE,
          httpStatus: 400, traceId: "A6rYGN",
        });
      }
      if (opts.method === "POST") return { id: `new${opts.path.split("/").pop()}` };
      return { data: [] };
    });
    const r = await run();
    expect(r).toMatchObject({ ok: false, code: "META_ERROR" });
    const [, , step, message, anythingCreated] = m.markFailed.mock.calls[0];
    expect(step).toBe("ad");
    expect(anythingCreated).toBe(true);
    expect(message).toMatch(/no tiene un método de pago válido/);
    expect(message).toMatch(/code 100 · subcode 1359188 · trace A6rYGN/);
  });

  it("describeMetaError keeps Meta's own text for other subcodes", () => {
    const e = new MetaGraphError({ message: "Otro error", code: 100, subcode: 3858081, httpStatus: 400, traceId: "T" });
    expect(describeMetaError(e)).toBe("Otro error · code 100 · subcode 3858081 · trace T");
  });

  it("assertPaused refuses anything but PAUSED", () => {
    expect(() => assertPaused({ status: "PAUSED" })).not.toThrow();
    expect(() => assertPaused({ status: "ACTIVE" })).toThrow();
    expect(() => assertPaused({})).toThrow();
  });
});
