import { describe, it, expect } from "vitest";
import {
  canAcquire, acquireFilter, nextStatusOnFailure, resumeStepFrom, staleThreshold,
} from "@/lib/meta/publish-state";

const now = new Date("2026-09-03T12:00:00Z");
const fresh = new Date(now.getTime() - 60_000).toISOString();
const stale = new Date(now.getTime() - 30 * 60_000).toISOString();

describe("canAcquire — the predicate the conditional UPDATE encodes", () => {
  it("idle, partial and failed are acquirable", () => {
    expect(canAcquire("idle", null, now)).toBe(true);
    expect(canAcquire("partial", null, now)).toBe(true);
    expect(canAcquire("failed", null, now)).toBe(true);
  });
  it("published is NEVER acquirable, however old", () => {
    expect(canAcquire("published", null, now)).toBe(false);
    expect(canAcquire("published", stale, now)).toBe(false);
  });
  it("a fresh running lock is busy; a stale one can be taken over", () => {
    expect(canAcquire("running", fresh, now)).toBe(false);
    expect(canAcquire("running", stale, now)).toBe(true);
  });
  it("a running lock without a usable timestamp stays busy", () => {
    expect(canAcquire("running", null, now)).toBe(false);
    expect(canAcquire("running", "not-a-date", now)).toBe(false);
  });
});

describe("acquireFilter", () => {
  it("is built from exactly the acquirable statuses", () => {
    expect(acquireFilter("T").startsWith("publish_status.in.(idle,partial,failed),")).toBe(true);
    expect(acquireFilter("T")).not.toContain("published");
    expect(acquireFilter("T")).toContain("and(publish_status.eq.running,attempt_started_at.lt.T)");
  });
  it("uses a 10 minute stale window", () => {
    expect(staleThreshold(now)).toBe(new Date(now.getTime() - 600_000).toISOString());
  });
});

describe("failure and resume", () => {
  it("partial when something exists in Meta, failed when nothing does", () => {
    expect(nextStatusOnFailure(true)).toBe("partial");
    expect(nextStatusOnFailure(false)).toBe("failed");
  });
  it("resumes from the first missing id", () => {
    expect(resumeStepFrom({})).toBe("campaign");
    expect(resumeStepFrom({ metaCampaignId: "1" })).toBe("adset");
    expect(resumeStepFrom({ metaCampaignId: "1", metaAdSetId: "2" })).toBe("creative");
    expect(resumeStepFrom({ metaCampaignId: "1", metaAdSetId: "2", metaCreativeId: "3" })).toBe("ad");
    expect(resumeStepFrom({ metaCampaignId: "1", metaAdSetId: "2", metaCreativeId: "3", metaAdId: "4" })).toBe("done");
  });
});
