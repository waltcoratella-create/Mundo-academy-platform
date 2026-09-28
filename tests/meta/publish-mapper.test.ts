import { describe, it, expect } from "vitest";
import { mapDraftToMetaV1, campaignTag, adTag, type PublishContext } from "@/lib/meta/publish-mapper";
import { emptyDraft, type CampaignDraft, type CampaignGeoLocation } from "@/app/(dashboard)/mis-negocios/[businessId]/anuncios/create/campaign-types";

const UUID = "8f4c2b1e-9a77-4d3e-b0f5-1c2d3e4f5a6b";
const DSA = { beneficiary: "Mundo Academy", payor: "Grupo Mundo Ejecutivo" };
const CTX: PublishContext = {
  adCampaignId: UUID, adAccountId: "act_2125346094861572", pageId: "PAGE1",
  currency: "EUR", timezone: "Europe/Madrid", dsa: DSA,
};

const geo = (over: Partial<CampaignGeoLocation>): CampaignGeoLocation => ({
  key: "ES", name: "España", type: "country", countryCode: "ES", countryName: "España", region: null, ...over,
});
const spain = geo({});
const france = geo({ key: "FR", name: "France", countryCode: "FR", countryName: "France" });
const mexico = geo({ key: "MX", name: "México", countryCode: "MX", countryName: "México" });
const madrid = geo({ key: "2420605", name: "Madrid", type: "city" });

function baseDraft(): CampaignDraft {
  const d = emptyDraft("EUR", "Europe/Madrid");
  d.name = "Campaña de prueba";
  d.objective = "traffic";
  d.budgetType = "daily";
  d.budgetAmount = "200";
  d.startsAt = "2026-09-10T09:00";
  d.timezone = "Europe/Madrid";
  d.delivery = { ...d.delivery, budgetControl: "adset" };
  d.audience = { ...d.audience, includedLocations: [spain], advantageAudience: true };
  d.creative = { ads: [{
    id: "ad-1", mediaUrl: "https://cdn.example.com/a.jpg", mediaType: "image",
    primaryText: "Texto principal", headline: "Titular", description: "",
    cta: "learn_more", destinationUrl: "https://mundo.academy/curso",
  }] };
  return d;
}

describe("deterministic names", () => {
  it("keep the FULL local ids", () => {
    expect(campaignTag(UUID)).toBe(`[ma:${UUID}]`);
    expect(adTag("ad_01J9XKQ2")).toBe("[ad:ad_01J9XKQ2]");
  });
  it("cut the human part, never the tag, at Meta's 400 chars", () => {
    const d = baseDraft(); d.name = "x".repeat(600);
    const r = mapDraftToMetaV1(d, CTX);
    expect(r.supported).toBe(true);
    if (r.supported) {
      expect(r.campaign.name.length).toBeLessThanOrEqual(400);
      expect(r.campaign.name.startsWith(`[ma:${UUID}] `)).toBe(true);
    }
  });
});

describe("the supported v1 shape", () => {
  const r = mapDraftToMetaV1(baseDraft(), CTX);
  if (!r.supported) throw new Error(JSON.stringify(r.reasons));

  it("every object that has a status is created PAUSED", () => {
    expect(r.campaign.status).toBe("PAUSED");
    expect(r.adSet.status).toBe("PAUSED");
    expect(r.ad.status).toBe("PAUSED");
  });
  it("campaign: traffic, no CBO, budget sharing declared off", () => {
    expect(r.campaign.objective).toBe("OUTCOME_TRAFFIC");
    expect(r.campaign.is_adset_budget_sharing_enabled).toBe(false);
    expect(Object.keys(r.campaign).sort()).toEqual(
      ["buying_type", "is_adset_budget_sharing_enabled", "name", "objective", "special_ad_categories", "status"]);
  });
  it("ad set: minor units, explicit offset, one country, Advantage+", () => {
    expect(r.adSet.daily_budget).toBe(20000);
    expect(r.adSet.start_time).toBe("2026-09-10T09:00:00+02:00");
    expect(r.adSet.optimization_goal).toBe("LINK_CLICKS");
    expect(r.adSet.billing_event).toBe("IMPRESSIONS");
    expect(r.adSet.bid_strategy).toBe("LOWEST_COST_WITHOUT_CAP");
    expect((r.adSet.targeting as { geo_locations: { countries: string[] } }).geo_locations.countries).toEqual(["ES"]);
  });
  it("creative: picture URL, CTA link equals link_data.link", () => {
    const ld = (r.creative.object_story_spec as { link_data: Record<string, any> }).link_data;
    expect(ld.picture).toBe("https://cdn.example.com/a.jpg");
    expect(ld.image_hash).toBeUndefined();
    expect(ld.call_to_action.type).toBe("LEARN_MORE");
    expect(ld.call_to_action.value.link).toBe(ld.link);
  });
});

describe("DSA, per business and per country", () => {
  it("EU country + declaration → both fields sent, payor distinct from beneficiary", () => {
    const r = mapDraftToMetaV1(baseDraft(), CTX);
    expect(r.supported).toBe(true);
    if (r.supported) {
      expect(r.adSet.dsa_beneficiary).toBe("Mundo Academy");
      expect(r.adSet.dsa_payor).toBe("Grupo Mundo Ejecutivo");
    }
  });
  it("EU country without a declaration → refused, never defaulted", () => {
    const r = mapDraftToMetaV1(baseDraft(), { ...CTX, dsa: null });
    expect(r.supported).toBe(false);
    if (!r.supported) expect(r.reasons.join()).toMatch(/anunciante y pagador/);
  });
  it("non-EU country → no declaration required and none sent", () => {
    const d = baseDraft(); d.audience.includedLocations = [mexico];
    const withDsa = mapDraftToMetaV1(d, CTX);
    const without = mapDraftToMetaV1(d, { ...CTX, dsa: null });
    expect(withDsa.supported && without.supported).toBe(true);
    if (withDsa.supported) {
      expect("dsa_beneficiary" in withDsa.adSet).toBe(false);
      expect("dsa_payor" in withDsa.adSet).toBe(false);
    }
  });
});

describe("refusals — named, never approximated", () => {
  const refuse = (label: string, mutate: (d: CampaignDraft) => void, match: RegExp) =>
    it(`refuses ${label}`, () => {
      const d = baseDraft(); mutate(d);
      const r = mapDraftToMetaV1(d, CTX);
      expect(r.supported).toBe(false);
      if (!r.supported) expect(r.reasons.join(" | ")).toMatch(match);
    });

  refuse("objective sales", (d) => { d.objective = "sales" as never; }, /objetivo/);
  refuse("lifetime budget", (d) => { d.budgetType = "lifetime" as never; }, /presupuesto total/);
  refuse("CBO", (d) => { d.delivery.budgetControl = "campaign"; }, /CBO/);
  refuse("two ads", (d) => { d.creative.ads = [d.creative.ads[0], { ...d.creative.ads[0], id: "ad-2" }]; }, /2 anuncios/);
  refuse("video", (d) => { d.creative.ads[0].mediaType = "video" as never; }, /vídeo/);
  refuse("two countries", (d) => { d.audience.includedLocations = [spain, france]; }, /2 países/);
  refuse("a city", (d) => { d.audience.includedLocations = [madrid]; }, /ciudades/);
  refuse("interests", (d) => { d.audience.interests = [{ id: "1", name: "x" } as never]; }, /intereses/);
  refuse("languages", (d) => { d.audience.languages = [{ key: 6 } as never]; }, /idiomas/);
  refuse("Advantage Audience off", (d) => { d.audience.advantageAudience = false; }, /audiencia manual/);
  refuse("end date", (d) => { d.endsAt = "2026-10-10T09:00"; }, /fecha de fin/);
  refuse("misaligned zone", (d) => { d.timezone = "America/Mexico_City"; }, /no coincide/);
  refuse("no image", (d) => { d.creative.ads[0].mediaUrl = null; }, /no tiene imagen/);
  refuse("empty budget", (d) => { d.budgetAmount = ""; }, /importe/i);
  refuse("objective leads", (d) => { d.objective = "leads" as never; }, /objetivo/);
  refuse("no objective", (d) => { d.objective = null; }, /objetivo/);
  refuse("zero budget", (d) => { d.budgetAmount = "0"; }, /importe/i);
  refuse("global reach", (d) => { d.audience.globalReach = true; }, /alcance global/);
  refuse("geo exclusions", (d) => { d.audience.excludedLocations = [france]; }, /exclusiones/);
  refuse("custom audiences", (d) => { d.audience.customAudiencesIncluded = [{ id: "1", name: "C" } as never]; }, /audiencias personalizadas/);
  refuse("Advantage Placements off", (d) => { d.delivery.advantagePlacements = false; }, /ubicaciones manuales/);
  refuse("bid strategy cost cap", (d) => { d.delivery.bidStrategy = "cost_cap" as never; }, /puja/);
  refuse("special ad category", (d) => { d.delivery.specialCategory = "credit" as never; }, /categorías especiales/);
  refuse("minimum daily spend", (d) => { d.delivery.minimumDailySpend = 10; }, /gasto mínimo/);
  refuse("dynamic creative", (d) => { d.delivery.dynamicCreative = true; }, /creatividad dinámica/);
  refuse("messaging destination", (d) => { d.delivery.conversionLocation = "messaging" as never; }, /mensajes/);
  refuse("no start date", (d) => { d.startsAt = ""; }, /fecha de inicio/);
  refuse("no destination url", (d) => { d.creative.ads[0].destinationUrl = ""; }, /URL de destino/);
  refuse("no primary text", (d) => { d.creative.ads[0].primaryText = "  "; }, /texto principal/);
  refuse("no headline", (d) => { d.creative.ads[0].headline = ""; }, /título/);

  it("refuses a missing page or ad account in the context", () => {
    const noPage = mapDraftToMetaV1(baseDraft(), { ...CTX, pageId: "" });
    const noAcct = mapDraftToMetaV1(baseDraft(), { ...CTX, adAccountId: "" });
    expect(!noPage.supported && noPage.reasons.some((r) => r.includes("página"))).toBe(true);
    expect(!noAcct.supported && noAcct.reasons.some((r) => r.includes("cuenta publicitaria"))).toBe(true);
  });

  it("refuses an unusable ad-account timezone", () => {
    const r = mapDraftToMetaV1(baseDraft(), { ...CTX, timezone: "Marte/Olympus" });
    expect(!r.supported && r.reasons.some((x) => x.includes("zona horaria"))).toBe(true);
  });

  it("a blank ad URL is covered by the campaign URL", () => {
    const d = baseDraft();
    d.creative.ads[0].destinationUrl = "";
    d.customUrl = "https://mundo.academy/inicio";
    expect(mapDraftToMetaV1(d, CTX).supported).toBe(true);
  });

  it("collects every reason, not just the first", () => {
    const d = baseDraft();
    d.objective = "sales" as never; d.budgetType = "lifetime" as never; d.audience.advantageAudience = false;
    const r = mapDraftToMetaV1(d, CTX);
    expect(!r.supported && r.reasons.length >= 3).toBe(true);
  });
});
