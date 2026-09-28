import { describe, it, expect } from "vitest";
import { pureReadinessIssues } from "@/app/(dashboard)/mis-negocios/[businessId]/anuncios/create/readiness-rules";
import { emptyDraft, type CampaignDraft } from "@/app/(dashboard)/mis-negocios/[businessId]/anuncios/create/campaign-types";
import type { MetaConnection } from "@/lib/meta/connection-types";
import { derivePublishState } from "@/lib/meta/publish-state";
import { dsaRequiredFor, validateDsaInput, DSA_REQUIRED_COUNTRIES } from "@/lib/meta/dsa";

const connection: MetaConnection = {
  id: "c1", businessId: "b1", status: "connected",
  metaUserId: null, metaBusinessId: null, metaBusinessName: null,
  adAccountId: "act_1", adAccountName: "A", adAccountCurrency: "EUR", adAccountTimezone: "Europe/Madrid",
  pageId: "p1", pageName: "P", pixelId: null, pixelName: null,
  scopes: [], tokenExpiresAt: null, lastError: null, connectedAt: null, disconnectedAt: null,
  createdAt: "2026-01-01", updatedAt: "2026-01-01",
};

function draft(startsAt: string, country = "ES"): CampaignDraft {
  const d = emptyDraft("EUR", "Europe/Madrid");
  d.startsAt = startsAt;
  d.timezone = "Europe/Madrid";
  d.audience.includedLocations = [{
    key: country, name: country, type: "country", countryCode: country, countryName: country, region: null,
  }];
  return d;
}

const codes = (d: CampaignDraft, opts: Parameters<typeof pureReadinessIssues>[2]) =>
  pureReadinessIssues(d, connection, opts).map((i) => `${i.code}:${i.severity}`);

describe("start time in the past blocks publishing", () => {
  const now = new Date("2026-09-28T12:00:00Z");

  it("a past start is an ERROR, not a warning", () => {
    expect(codes(draft("2026-09-10T09:00"), { now })).toContain("SCHEDULE_START_IN_PAST:error");
  });
  it("a future start passes", () => {
    expect(codes(draft("2026-10-10T09:00"), { now }).some((c) => c.startsWith("SCHEDULE_START_IN_PAST")))
      .toBe(false);
  });
  it("is compared in the campaign's zone, exactly", () => {
    // 14:30 Madrid (CEST) = 12:30Z → 30 min in the future of 12:00Z.
    expect(codes(draft("2026-09-28T14:30"), { now }).some((c) => c.startsWith("SCHEDULE_START_IN_PAST")))
      .toBe(false);
    // 13:30 Madrid = 11:30Z → 30 min in the past.
    expect(codes(draft("2026-09-28T13:30"), { now })).toContain("SCHEDULE_START_IN_PAST:error");
  });
});

describe("DSA readiness", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  it("EU country with no declaration → DSA_MISSING error", () => {
    expect(codes(draft("2026-09-10T09:00"), { now, dsa: null })).toContain("DSA_MISSING:error");
  });
  it("EU country with a declaration → no DSA issue", () => {
    const c = codes(draft("2026-09-10T09:00"), { now, dsa: { beneficiary: "A", payor: "B" } });
    expect(c.some((x) => x.startsWith("DSA_"))).toBe(false);
  });
  it("non-EU country → not required", () => {
    expect(codes(draft("2026-09-10T09:00", "MX"), { now, dsa: null }).some((x) => x.startsWith("DSA_"))).toBe(false);
  });
  it("unknown (not checked) is never reported as missing", () => {
    expect(codes(draft("2026-09-10T09:00"), { now }).some((x) => x.startsWith("DSA_"))).toBe(false);
  });
});

describe("dsa.ts", () => {
  it("covers exactly the EU-27, and not unconfirmed EEA countries", () => {
    expect(DSA_REQUIRED_COUNTRIES.size).toBe(27);
    for (const c of ["ES", "FR", "DE", "GR", "IE"]) expect(dsaRequiredFor(c)).toBe(true);
    for (const c of ["NO", "IS", "LI", "GB", "CH", "MX", "US"]) expect(dsaRequiredFor(c)).toBe(false);
    expect(dsaRequiredFor(null)).toBe(false);
  });
  it("validates what a person typed", () => {
    expect(validateDsaInput({ beneficiary: " A ", payor: " B " })).toEqual({ ok: true, value: { beneficiary: "A", payor: "B" } });
    expect(validateDsaInput({ beneficiary: "", payor: "B" }).ok).toBe(false);
    expect(validateDsaInput({ beneficiary: "A", payor: "x".repeat(201) }).ok).toBe(false);
  });
});

describe("derivePublishState — which screen exists", () => {
  const none = { publishStatus: "idle" as const, metaCampaignId: null, metaAdSetId: null };

  it("draft when nothing exists in Meta", () => {
    expect(derivePublishState({ campaignStatus: "draft", link: null, adLinks: [] })).toBe("draft");
    expect(derivePublishState({ campaignStatus: "draft", link: { ...none, publishStatus: "failed" }, adLinks: [] }))
      .toBe("draft");
  });
  it("publishing while a run holds the lock", () => {
    expect(derivePublishState({ campaignStatus: "draft", link: { ...none, publishStatus: "running" }, adLinks: [] }))
      .toBe("publishing");
  });
  it("incomplete as soon as ANY object exists in Meta — editing is locked", () => {
    expect(derivePublishState({
      campaignStatus: "draft", link: { ...none, publishStatus: "partial", metaCampaignId: "1" }, adLinks: [],
    })).toBe("incomplete");
    expect(derivePublishState({
      campaignStatus: "draft", link: { ...none, publishStatus: "failed" },
      adLinks: [{ metaCreativeId: "c", metaAdId: null }],
    })).toBe("incomplete");
  });
  it("published if EITHER table says so", () => {
    expect(derivePublishState({ campaignStatus: "published", link: null, adLinks: [] })).toBe("published");
    expect(derivePublishState({
      campaignStatus: "draft", link: { ...none, publishStatus: "published" }, adLinks: [],
    })).toBe("published");
  });
});
