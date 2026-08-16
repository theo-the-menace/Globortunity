import type { NormalizedJobInput } from "@globortunity/domain";

export interface CollectionResult {
  status: "succeeded" | "skipped";
  pagesRequested: number;
  jobs: NormalizedJobInput[];
  reason?: string;
}

export interface Collector {
  readonly source: {
    id: string;
    label: string;
    baseUrl: string | null;
    enabled: boolean;
    policyStatus: "pending" | "approved" | "paused" | "blocked";
  };
  collect(): Promise<CollectionResult>;
}

const web3Pattern = /\b(?:web3|crypto(?:currency)?|blockchain|bitcoin|ethereum|solidity|defi|dao|stablecoin|smart[ -]?contract|on[ -]?chain|wallet)\b/iu;

function isWeb3Role(title: string, description: string, tags: string[]): boolean {
  const taggedText = `${title} ${tags.join(" ")}`;
  return web3Pattern.test(taggedText) || (/\bprotocol\b/iu.test(title) && web3Pattern.test(description));
}

function stripHtml(value: unknown): string {
  return String(value ?? "").replace(/<[^>]*>/gu, " ").replace(/&(?:nbsp|amp|lt|gt|quot);/gu, " ").replace(/\s+/gu, " ").trim();
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function salary(min: unknown, max: unknown, currency: unknown, period: unknown) {
  const lower = typeof min === "number" ? min : null;
  const upper = typeof max === "number" ? max : null;
  const hasRange = lower !== null || upper !== null;
  const unit = String(period ?? "").toLowerCase();
  const normalizedPeriod = unit.includes("hour") ? "hour" as const : unit.includes("month") ? "month" as const : unit.includes("year") || unit.includes("annual") ? "year" as const : null;
  return { min: lower, max: upper, currency: hasRange ? String(currency ?? "USD") : null, period: normalizedPeriod, text: hasRange ? `${currency ?? "USD"} ${lower ?? "?"}-${upper ?? "?"} / ${normalizedPeriod ?? "period"}` : null };
}

function parseLimit(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class HimalayasCollector implements Collector {
  readonly source = { id: "himalayas", label: "Himalayas", baseUrl: "https://himalayas.app", enabled: true, policyStatus: "approved" as const };

  constructor(private readonly options: { maxPages?: number; delayMs?: number; fetchImpl?: typeof fetch } = {}) {}

  async collect(): Promise<CollectionResult> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const maxPages = this.options.maxPages ?? parseLimit(process.env.HIMALAYAS_MAX_PAGES, 100);
    const delayMs = this.options.delayMs ?? parseLimit(process.env.HIMALAYAS_DELAY_MS, 1000);
    const jobs: NormalizedJobInput[] = [];
    let totalCount = Number.POSITIVE_INFINITY;
    let seenCount = 0;
    let pagesRequested = 0;
    for (let page = 0; page < maxPages && seenCount < totalCount; page += 1) {
      if (page > 0) await sleep(delayMs);
      pagesRequested += 1;
      let response = await fetchImpl(`https://himalayas.app/jobs/api?offset=${page * 20}&limit=20`, { headers: { Accept: "application/json", "User-Agent": "Globortunity/1.0 (+https://github.com/theo-the-menace/Globortunity)" } });
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : Math.max(delayMs, 5000));
        response = await fetchImpl(`https://himalayas.app/jobs/api?offset=${page * 20}&limit=20`, { headers: { Accept: "application/json", "User-Agent": "Globortunity/1.0 (+https://github.com/theo-the-menace/Globortunity)" } });
      }
      if (!response.ok) throw new Error(`Himalayas returned HTTP ${response.status}`);
      const payload = await response.json() as { totalCount?: number; jobs?: Array<Record<string, unknown>> };
      totalCount = payload.totalCount ?? totalCount;
      seenCount += payload.jobs?.length ?? 0;
      for (const item of payload.jobs ?? []) {
        const title = String(item.title ?? "");
        const description = stripHtml(item.description ?? item.excerpt);
        const tags = [...(Array.isArray(item.categories) ? item.categories.map(String) : []), ...(Array.isArray(item.parentCategories) ? item.parentCategories.map(String) : [])];
        if (!isWeb3Role(title, description, tags)) continue;
        const id = String(item.guid ?? item.companySlug ?? `${title}-${item.companyName}`);
        const restrictions = Array.isArray(item.locationRestrictions) ? item.locationRestrictions.map(String) : [];
        jobs.push({ sourceId: this.source.id, externalId: id, sourceUrl: String(item.applicationLink ?? `https://himalayas.app/jobs/${id}`), title, companyName: String(item.companyName ?? "Unknown company"), location: restrictions.length ? restrictions.join(", ") : "Remote / Worldwide", description, remoteScope: "remote", remoteConfidence: 0.98, employmentType: String(item.employmentType ?? "").toLowerCase().includes("contract") ? "contract" : "full-time", salary: salary(item.minSalary, item.maxSalary, item.currency, item.salaryPeriod), tags, publishedAt: asDate(item.pubDate), rawData: { source: "himalayas", guid: id, companySlug: item.companySlug ?? null } });
      }
      if (!(payload.jobs?.length)) break;
    }
    return { status: "succeeded", pagesRequested, jobs };
  }
}

export class RemoteOkCollector implements Collector {
  readonly source = { id: "remoteok", label: "Remote OK", baseUrl: "https://remoteok.com", enabled: true, policyStatus: "approved" as const };

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async collect(): Promise<CollectionResult> {
    const response = await this.fetchImpl("https://remoteok.com/api", { headers: { Accept: "application/json", "User-Agent": "Globortunity/1.0 (+https://github.com/theo-the-menace/Globortunity)" } });
    if (!response.ok) throw new Error(`Remote OK returned HTTP ${response.status}`);
    const payload = await response.json() as Array<Record<string, unknown>>;
    const jobs = payload.filter((item) => item.id && isWeb3Role(String(item.position ?? ""), String(item.description ?? ""), Array.isArray(item.tags) ? item.tags.map(String) : [])).map((item) => {
      const tags = Array.isArray(item.tags) ? item.tags.map(String) : [];
      const id = String(item.id);
      return { sourceId: this.source.id, externalId: id, sourceUrl: `https://remoteok.com/remote-jobs/${String(item.slug ?? id)}`, title: String(item.position ?? "Untitled role"), companyName: String(item.company ?? "Unknown company"), location: String(item.location ?? "Remote / Worldwide"), description: stripHtml(item.description), remoteScope: "remote" as const, remoteConfidence: 0.98, employmentType: "full-time" as const, salary: salary(item.salary_min, item.salary_max, "USD", "year"), tags, publishedAt: asDate(item.date), rawData: { source: "remoteok", slug: item.slug ?? null } } satisfies NormalizedJobInput;
    });
    return { status: "succeeded", pagesRequested: 1, jobs };
  }
}

export class BossCollector implements Collector {
  readonly source;
  private readonly authorized: boolean;

  constructor(options: { enabled: boolean; authorized: boolean }) {
    this.authorized = options.authorized;
    this.source = {
      id: "boss-zhipin",
      label: "BOSS Zhipin",
      baseUrl: "https://www.zhipin.com",
      enabled: options.enabled,
      policyStatus: options.authorized ? ("paused" as const) : ("pending" as const),
    };
  }

  async collect(): Promise<CollectionResult> {
    if (!this.source.enabled) {
      return { status: "skipped", pagesRequested: 0, jobs: [], reason: "Source disabled" };
    }
    if (!this.authorized) {
      return {
        status: "skipped",
        pagesRequested: 0,
        jobs: [],
        reason: "Authorized BOSS access has not been confirmed",
      };
    }
    return {
      status: "skipped",
      pagesRequested: 0,
      jobs: [],
      reason: "No permitted BOSS transport is configured; see docs/boss-source-plan.md",
    };
  }
}

export class StaticCollector implements Collector {
  readonly source = {
    id: "demo",
    label: "Demo feed",
    baseUrl: "https://example.com",
    enabled: true,
    policyStatus: "approved" as const,
  };

  constructor(private readonly jobs: NormalizedJobInput[]) {}

  async collect(): Promise<CollectionResult> {
    return { status: "succeeded", pagesRequested: 0, jobs: this.jobs };
  }
}
