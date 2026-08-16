import { describe, expect, it } from "vitest";
import { BossCollector, HimalayasCollector, RemoteOkCollector } from "./collectors.js";

describe("BossCollector policy gate", () => {
  it("does not make requests when disabled", async () => {
    const result = await new BossCollector({ enabled: false, authorized: false }).collect();
    expect(result).toMatchObject({ status: "skipped", pagesRequested: 0, jobs: [] });
  });

  it("does not implement access merely because flags are enabled", async () => {
    const result = await new BossCollector({ enabled: true, authorized: true }).collect();
    expect(result.status).toBe("skipped");
    expect(result.reason).toContain("No permitted BOSS transport");
  });
});

describe("public feed collectors", () => {
  it("normalizes Web3 jobs from the paged Himalayas API", async () => {
    const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({ totalCount: 1, jobs: [{ guid: "h-1", title: "Solidity Engineer", companyName: "Chain Co", description: "Build smart contracts", applicationLink: "https://himalayas.app/jobs/h-1", employmentType: "Full Time", minSalary: 120000, maxSalary: 180000, salaryPeriod: "annual", currency: "USD", pubDate: "2026-08-01T00:00:00Z", categories: ["Blockchain"] }] }), { status: 200, headers: { "content-type": "application/json" } });
    const result = await new HimalayasCollector({ maxPages: 1, fetchImpl }).collect();
    expect(result).toMatchObject({ status: "succeeded", pagesRequested: 1 });
    expect(result.jobs[0]).toMatchObject({ sourceId: "himalayas", externalId: "h-1", remoteScope: "remote", salary: { min: 120000, max: 180000, currency: "USD", period: "year" } });
  });

  it("filters Remote OK to relevant Web3 roles and preserves attribution URLs", async () => {
    const fetchImpl: typeof fetch = async () => new Response(JSON.stringify([{ id: "r-1", slug: "solidity-engineer-1", position: "Solidity Engineer", company: "Protocol Labs", description: "Work on smart contract security", tags: ["blockchain"], date: "2026-08-01T00:00:00Z" }, { id: "r-2", slug: "generic-role", position: "Account Executive", company: "SaaS Co", description: "Sell SaaS", tags: ["sales"], date: "2026-08-01T00:00:00Z" }]), { status: 200, headers: { "content-type": "application/json" } });
    const result = await new RemoteOkCollector(fetchImpl).collect();
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]).toMatchObject({ externalId: "r-1", sourceUrl: "https://remoteok.com/remote-jobs/solidity-engineer-1" });
  });
});
