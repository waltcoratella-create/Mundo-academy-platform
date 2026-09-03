"use client";

import { useEffect, useRef } from "react";
import { publishCampaignSmokeTest } from "../publish-actions";

/**
 * Invisible, flag-gated entry point for the ONE smoke publish.
 *
 * Renders nothing, ever. When the edit page mounts it with `enabled` (which the
 * server only sets while META_PUBLISH_SMOKE_TEST_ENABLED is true), it exposes
 * `window.__smokePublishV1()` so the test can be fired deliberately from the
 * console of an authenticated owner — and from nowhere else. No button exists.
 *
 * This is a convenience surface, not a gate. Calling it forged buys nothing:
 * the server action re-checks the flag, the Clerk session, business ownership
 * and the campaign's membership before any Meta call, and the DB lock makes a
 * double invocation come back "busy" instead of double-publishing.
 */
export function SmokePublishBridge({
  businessId,
  campaignId,
  enabled,
}: {
  businessId: string;
  campaignId: string;
  enabled: boolean;
}) {
  const inFlight = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const w = window as typeof window & {
      __smokePublishV1?: () => Promise<unknown>;
    };
    w.__smokePublishV1 = async () => {
      if (inFlight.current) return { ok: false, code: "BUSY", error: "Ya hay una llamada en curso en esta pestaña." };
      inFlight.current = true;
      try {
        return await publishCampaignSmokeTest(businessId, campaignId);
      } finally {
        inFlight.current = false;
      }
    };
    return () => { delete w.__smokePublishV1; };
  }, [enabled, businessId, campaignId]);

  return null;
}
