import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * The server action in front of the pipeline: ownership, campaign scoping,
 * the version stamp and the kill switch, all before the pipeline runs.
 */

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  getBusinessById: vi.fn(),
  campaignRow: vi.fn(),
  pipeline: vi.fn(),
  getCampaignDraft: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: m.auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/queries", () => ({
  getBusinessById: m.getBusinessById,
  getBusinessPaymentLinks: vi.fn(async () => ({ links: [], tableExists: true })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    // Records the business_id the campaign lookup was scoped to.
    const filters: Record<string, unknown> = {};
    const chain = {
      select: () => chain,
      eq: (col: string, val: unknown) => { filters[col] = val; return chain; },
      maybeSingle: async () => ({ data: m.campaignRow(filters), error: null }),
    };
    return { from: () => chain };
  },
}));
vi.mock("@/lib/meta/publish", async () => {
  const actual = await vi.importActual<typeof import("@/lib/meta/publish")>("@/lib/meta/publish");
  return { ...actual, publishCampaignToMeta: m.pipeline };
});
vi.mock("@/app/(dashboard)/mis-negocios/[businessId]/anuncios/campaign-actions", () => ({
  getCampaignDraft: m.getCampaignDraft,
}));

const { publishCampaign } = await import(
  "@/app/(dashboard)/mis-negocios/[businessId]/anuncios/publish-actions"
);

const V = "2026-09-28T10:00:00.000000+00:00";

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.META_PUBLISH_DISABLED;
  m.auth.mockResolvedValue({ userId: "owner" });
  m.getBusinessById.mockResolvedValue({ id: "biz_1", name: "B", logo_url: null });
  m.campaignRow.mockImplementation((f: Record<string, unknown>) =>
    f.business_id === "biz_1" && f.id === "camp_1" ? { id: "camp_1", status: "draft", updated_at: V } : null);
  m.getCampaignDraft.mockResolvedValue({ ok: true, draft: {}, campaignId: "camp_1", status: "draft", publishState: "draft" });
  m.pipeline.mockResolvedValue({ ok: true, link: {}, resumed: false });
});
afterEach(() => { delete process.env.META_PUBLISH_DISABLED; });

describe("publishCampaign", () => {
  it("publishes an owned, unchanged draft", async () => {
    expect(await publishCampaign("biz_1", "camp_1", V)).toEqual({ ok: true, publishState: "published" });
    expect(m.pipeline).toHaveBeenCalledWith(expect.objectContaining({ businessId: "biz_1", adCampaignId: "camp_1" }));
  });

  it("kill switch → refused before even checking the session", async () => {
    process.env.META_PUBLISH_DISABLED = "true";
    expect(await publishCampaign("biz_1", "camp_1", V)).toMatchObject({ ok: false, code: "PUBLISH_DISABLED" });
    expect(m.auth).not.toHaveBeenCalled();
    expect(m.pipeline).not.toHaveBeenCalled();
  });

  it("not the owner → FORBIDDEN, pipeline never runs", async () => {
    m.getBusinessById.mockResolvedValue(null);
    expect(await publishCampaign("biz_other", "camp_1", V)).toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(m.pipeline).not.toHaveBeenCalled();
  });

  it("a campaign of another business is not found, even for a valid owner", async () => {
    expect(await publishCampaign("biz_1", "camp_of_someone_else", V)).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(m.pipeline).not.toHaveBeenCalled();
  });

  it("passes the confirmed version to the pipeline instead of judging it itself", async () => {
    await publishCampaign("biz_1", "camp_1", "the-confirmed-version");
    expect(m.pipeline).toHaveBeenCalledWith(expect.objectContaining({ expectedVersion: "the-confirmed-version" }));
  });

  it("DRAFT_CHANGED from the lock is passed through", async () => {
    m.pipeline.mockResolvedValue({ ok: false, code: "DRAFT_CHANGED", message: "cambió" });
    expect(await publishCampaign("biz_1", "camp_1", "old")).toMatchObject({ ok: false, code: "DRAFT_CHANGED" });
  });

  it("the pipeline's refusal is passed through with its reasons", async () => {
    m.pipeline.mockResolvedValue({ ok: false, code: "UNSUPPORTED", message: "no", reasons: ["r1"] });
    expect(await publishCampaign("biz_1", "camp_1", V)).toEqual({ ok: false, code: "UNSUPPORTED", error: "no", reasons: ["r1"] });
  });
});
