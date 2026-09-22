import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  onRequestPost,
  type ContributeDeps,
} from "../functions/api/contribute.ts";
import {
  withinRateLimit,
  type CounterStore,
} from "../functions/lib/rate-limit.ts";
import type { Env } from "../functions/lib/types.ts";
import type { ContributionPullRequest } from "../functions/lib/github.ts";

const PR_URL = "https://github.com/afrieirham/naiktrainjer/pull/1";

const VALID = {
  name: "Amcorp Service Suite",
  station: "KJ20",
  type: "service-apartment",
  map: "https://maps.app.goo.gl/x",
  note: "Ten minutes from the station.",
  contributorName: "Emily Yeo",
  contributorHref: "https://example.com/me",
  turnstileToken: "token",
};

function env(overrides: Partial<Env> = {}): Env {
  return {
    RATE_LIMIT: { get: async () => null, put: async () => {} },
    TURNSTILE_SECRET: "secret",
    GITHUB_TOKEN: "token",
    GITHUB_REPO: "afrieirham/naiktrainjer",
    ...overrides,
  };
}

function request(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request("https://naiktrainjer.com/api/contribute", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function deps(overrides: Partial<ContributeDeps> = {}): ContributeDeps {
  return {
    verifyChallenge: async () => true,
    withinLimit: async () => true,
    openPullRequest: async () => PR_URL,
    ...overrides,
  };
}

describe("POST /api/contribute", () => {
  it("refuses a failed challenge and writes nothing", async () => {
    let wrote = false;
    const response = await onRequestPost(
      { request: request(VALID), env: env() },
      deps({
        verifyChallenge: async () => false,
        openPullRequest: async () => {
          wrote = true;
          return PR_URL;
        },
      }),
    );

    assert.equal(response.status, 403);
    assert.equal(wrote, false, "nothing may be written before the challenge passes");
  });

  it("refuses an over-limit request before the challenge, and writes nothing", async () => {
    let challenged = false;
    let wrote = false;
    const response = await onRequestPost(
      { request: request(VALID), env: env() },
      deps({
        withinLimit: async () => false,
        verifyChallenge: async () => {
          challenged = true;
          return true;
        },
        openPullRequest: async () => {
          wrote = true;
          return PR_URL;
        },
      }),
    );

    assert.equal(response.status, 429);
    assert.equal(challenged, false, "the challenge is not spent over the limit");
    assert.equal(wrote, false, "nothing may be written over the limit");
  });

  it("returns field errors for invalid input and writes nothing", async () => {
    let wrote = false;
    const response = await onRequestPost(
      {
        request: request({ name: "", station: "XX9", turnstileToken: "token" }),
        env: env(),
      },
      deps({
        openPullRequest: async () => {
          wrote = true;
          return PR_URL;
        },
      }),
    );

    assert.equal(response.status, 422);
    const body = (await response.json()) as {
      errors?: Record<string, string>;
    };
    assert.match(body.errors?.name ?? "", /name/);
    assert.match(body.errors?.station ?? "", /station/);
    assert.equal(wrote, false);
  });

  it("files one pull request adding the Contribution on a clean submission", async () => {
    const requests: ContributionPullRequest[] = [];
    const response = await onRequestPost(
      {
        request: request(VALID, { "cf-connecting-ip": "1.2.3.4" }),
        env: env(),
      },
      deps({
        verifyChallenge: async (_secret, token, remoteIp) =>
          token === "token" && remoteIp === "1.2.3.4",
        openPullRequest: async (input) => {
          requests.push(input);
          return PR_URL;
        },
      }),
    );

    assert.equal(response.status, 200);
    const body = (await response.json()) as { prUrl?: string };
    assert.equal(body.prUrl, PR_URL);

    assert.equal(requests.length, 1, "exactly one pull request is opened");
    const input = requests[0];
    const id = input.files[0].path.match(/c-[0-9a-f]{8}/)?.[0];

    assert.ok(id, "the Contribution id is in the file path");
    assert.equal(input.branch, `contribution/${id}`);
    assert.match(input.title, /Amcorp Service Suite/);
    assert.equal(input.files.length, 1);
    assert.equal(input.files[0].path, `data/contributions/${id}.json`);

    const record = JSON.parse(input.files[0].contents) as Record<string, unknown>;
    assert.equal(record.name, "Amcorp Service Suite");
    assert.equal(record.station, "KJ20");
    assert.equal(record.id, id);
  });

  it("reports a pull request that could not be filed", async () => {
    const response = await onRequestPost(
      { request: request(VALID), env: env() },
      deps({
        openPullRequest: async () => {
          throw new Error("github is down");
        },
      }),
    );

    assert.equal(response.status, 502);
  });

  it("refuses when the write path is not configured", async () => {
    const response = await onRequestPost(
      { request: request(VALID), env: env({ TURNSTILE_SECRET: "" }) },
      deps(),
    );

    assert.equal(response.status, 503);
  });
});

describe("withinRateLimit", () => {
  function fakeStore(initial: Record<string, string> = {}) {
    const values = new Map(Object.entries(initial));
    const expiries: (number | undefined)[] = [];

    return {
      values,
      expiries,
      get: async (key: string) => values.get(key) ?? null,
      put: async (
        key: string,
        value: string,
        options?: { expirationTtl?: number },
      ) => {
        values.set(key, value);
        expiries.push(options?.expirationTtl);
      },
    } satisfies CounterStore & { values: Map<string, string>; expiries: (number | undefined)[] };
  }

  const options = { limit: 3, windowSeconds: 3600 };

  it("allows up to the limit and then refuses", async () => {
    const store = fakeStore();

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      assert.equal(
        await withinRateLimit(store, "1.2.3.4", options),
        true,
        `attempt ${attempt}`,
      );
    }
    assert.equal(await withinRateLimit(store, "1.2.3.4", options), false);
  });

  it("counts each source separately", async () => {
    const store = fakeStore();

    await withinRateLimit(store, "1.2.3.4", options);
    await withinRateLimit(store, "1.2.3.4", options);
    await withinRateLimit(store, "1.2.3.4", options);

    assert.equal(await withinRateLimit(store, "1.2.3.4", options), false);
    assert.equal(await withinRateLimit(store, "5.6.7.8", options), true);
  });

  it("starts again in the next window", async () => {
    const store = fakeStore();
    const start = 1_700_000_000_000;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      assert.equal(
        await withinRateLimit(store, "1.2.3.4", { ...options, now: start }),
        true,
      );
    }
    assert.equal(
      await withinRateLimit(store, "1.2.3.4", { ...options, now: start }),
      false,
    );
    assert.equal(
      await withinRateLimit(store, "1.2.3.4", {
        ...options,
        now: start + 3_600_000,
      }),
      true,
    );
  });

  it("lets counters expire rather than holding them forever", async () => {
    const store = fakeStore();

    await withinRateLimit(store, "1.2.3.4", options);

    assert.deepEqual(store.expiries, [7200]);
  });
});
