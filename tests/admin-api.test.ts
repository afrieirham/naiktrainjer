import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  onRequestGet as getContribution,
  onRequestPost as approveContribution,
} from "../functions/api/admin/contribution/[id].ts";
import { onRequestPost as addPlace } from "../functions/api/admin/place/index.ts";
import { onRequestPost as editPlace } from "../functions/api/admin/place/[slug].ts";
import type { AdminDeps } from "../functions/lib/admin.ts";
import type { ContributionPullRequest } from "../functions/lib/github.ts";
import type { Env } from "../functions/lib/types.ts";

const ID = "c-1a2b3c4d";
const PR_URL = "https://github.com/afrieirham/naiktrainjer/pull/7";

const CONTRIBUTION = {
  name: "Amcorp Service Suite",
  connections: [{ station: "KJ20", embed: null }],
  type: "service-apartment",
  map: "https://maps.app.goo.gl/x",
  note: "Ten minutes from the station.",
  contributor: { name: "Emily Yeo", href: "https://example.com/me" },
};

const PLACE = {
  name: "Amcorp Service Suite",
  kind: "building",
  type: "service-apartment",
  map: "https://maps.app.goo.gl/x",
  connections: [{ station: "KJ20", embed: "" }],
  source: "contributed",
  contributorName: "Emily Yeo",
  contributorHref: "https://example.com/me",
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

function request(body?: unknown): Request {
  return new Request("https://naiktrainjer.com/api/admin", {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** A call log shared by the fakes, so the write order can be asserted. */
function recorder(reads: Record<string, string | null> = {}) {
  const calls: { op: "read" | "put" | "delete"; path: string; branch: string }[] =
    [];
  const pulls: ContributionPullRequest[] = [];

  const deps: AdminDeps = {
    readFile: async (input) => {
      calls.push({ op: "read", path: input.path, branch: input.ref ?? "" });
      return reads[`${input.path}@${input.ref ?? ""}`] ?? null;
    },
    putFile: async (input) => {
      calls.push({ op: "put", path: input.path, branch: input.branch });
    },
    deleteFile: async (input) => {
      calls.push({ op: "delete", path: input.path, branch: input.branch });
    },
    openPullRequest: async (input) => {
      pulls.push(input);
      return PR_URL;
    },
  };

  return { calls, pulls, deps };
}

function contributionFile(): string {
  return JSON.stringify({ id: ID, ...CONTRIBUTION });
}

describe("GET /api/admin/contribution/:id", () => {
  it("reads the Contribution from its branch and prefills a Place draft", async () => {
    const { deps, calls } = recorder({
      [`data/contributions/${ID}.json@contribution/${ID}`]: contributionFile(),
    });

    const response = await getContribution(
      { request: request(), env: env(), params: { id: ID } },
      deps,
    );

    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      branch: string;
      draft: Record<string, unknown>;
    };
    assert.equal(body.branch, `contribution/${ID}`);
    assert.equal(body.draft.name, "Amcorp Service Suite");
    assert.equal(body.draft.source, "contributed");
    assert.equal(body.draft.contributorName, "Emily Yeo");
    assert.deepEqual(body.draft.connections, [{ station: "KJ20", embed: "" }]);

    assert.equal(calls[0].op, "read");
    assert.equal(calls[0].path, `data/contributions/${ID}.json`);
    assert.equal(calls[0].branch, `contribution/${ID}`);
  });

  it("404s for a malformed id without reading the repository", async () => {
    const { deps, calls } = recorder();
    const response = await getContribution(
      { request: request(), env: env(), params: { id: "../etc/passwd" } },
      deps,
    );

    assert.equal(response.status, 404);
    assert.equal(calls.length, 0);
  });

  it("503s when the repository is not configured", async () => {
    const response = await getContribution(
      { request: request(), env: env({ GITHUB_TOKEN: "" }), params: { id: ID } },
      recorder().deps,
    );
    assert.equal(response.status, 503);
  });
});

describe("POST /api/admin/contribution/:id (approve)", () => {
  it("adds the Place, then removes the Contribution, on the same branch", async () => {
    const { deps, calls, pulls } = recorder({
      [`data/contributions/${ID}.json@contribution/${ID}`]: contributionFile(),
    });

    const response = await approveContribution(
      { request: request(PLACE), env: env(), params: { id: ID } },
      deps,
    );

    assert.equal(response.status, 200);
    const body = (await response.json()) as { branch: string; slug: string };
    assert.equal(body.slug, "amcorp-service-suite");
    assert.equal(body.branch, `contribution/${ID}`);

    assert.equal(pulls.length, 0, "approving keeps the existing pull request");

    const ops = calls.map((call) => call.op);
    assert.deepEqual(
      ops,
      ["read", "read", "put", "delete"],
      "the Place is written before the Contribution is deleted",
    );

    const put = calls.find((call) => call.op === "put")!;
    const del = calls.find((call) => call.op === "delete")!;
    assert.equal(put.path, "data/places/amcorp-service-suite.json");
    assert.equal(del.path, `data/contributions/${ID}.json`);
    assert.equal(put.branch, `contribution/${ID}`, "both writes share the branch");
    assert.equal(del.branch, `contribution/${ID}`, "both writes share the branch");
  });

  it("refuses to overwrite an existing Place and writes nothing", async () => {
    const { deps, calls } = recorder({
      [`data/contributions/${ID}.json@contribution/${ID}`]: contributionFile(),
      "data/places/amcorp-service-suite.json@main": "{}",
    });

    const response = await approveContribution(
      { request: request(PLACE), env: env(), params: { id: ID } },
      deps,
    );

    assert.equal(response.status, 422);
    const body = (await response.json()) as { errors?: Record<string, string> };
    assert.match(body.errors?.slug ?? "", /already lives/);
    assert.equal(calls.some((call) => call.op === "put"), false);
    assert.equal(calls.some((call) => call.op === "delete"), false);
  });

  it("returns field errors for a bad Place and writes nothing", async () => {
    const { deps, calls } = recorder({
      [`data/contributions/${ID}.json@contribution/${ID}`]: contributionFile(),
    });

    const response = await approveContribution(
      {
        request: request({
          ...PLACE,
          kind: "castle",
          connections: [{ station: "XX9", embed: "" }],
        }),
        env: env(),
        params: { id: ID },
      },
      deps,
    );

    assert.equal(response.status, 422);
    const body = (await response.json()) as { errors?: Record<string, string> };
    assert.match(body.errors?.kind ?? "", /kind/);
    assert.match(body.errors?.connections ?? "", /not a station/);
    assert.equal(calls.some((call) => call.op === "put"), false);
  });

  it("404s when the Contribution is not on its branch", async () => {
    const response = await approveContribution(
      { request: request(PLACE), env: env(), params: { id: ID } },
      recorder().deps,
    );
    assert.equal(response.status, 404);
  });
});

describe("POST /api/admin/place (add)", () => {
  it("opens one pull request adding data/places/<slug>.json", async () => {
    const { deps, pulls } = recorder();

    const response = await addPlace(
      { request: request({ ...PLACE, source: "owner" }), env: env() },
      deps,
    );

    assert.equal(response.status, 200);
    const body = (await response.json()) as { prUrl: string; slug: string };
    assert.equal(body.prUrl, PR_URL);
    assert.equal(body.slug, "amcorp-service-suite");

    assert.equal(pulls.length, 1);
    assert.equal(pulls[0].baseBranch, "main");
    assert.equal(pulls[0].branch, "place/amcorp-service-suite");
    assert.equal(pulls[0].files[0].path, "data/places/amcorp-service-suite.json");

    const record = JSON.parse(pulls[0].files[0].contents) as Record<string, unknown>;
    assert.equal(record.slug, "amcorp-service-suite");
    assert.equal(record.source, "owner");
  });

  it("refuses a Place whose slug already exists", async () => {
    const { deps, pulls } = recorder({
      "data/places/amcorp-service-suite.json@main": "{}",
    });

    const response = await addPlace(
      { request: request(PLACE), env: env() },
      deps,
    );

    assert.equal(response.status, 422);
    const body = (await response.json()) as { errors?: Record<string, string> };
    assert.match(body.errors?.slug ?? "", /already lives/);
    assert.equal(pulls.length, 0);
  });

  it("returns field errors for a bad Place", async () => {
    const response = await addPlace(
      {
        request: request({ ...PLACE, kind: "", type: "castle" }),
        env: env(),
      },
      recorder().deps,
    );

    assert.equal(response.status, 422);
    const body = (await response.json()) as { errors?: Record<string, string> };
    assert.match(body.errors?.kind ?? "", /kind/);
    assert.match(body.errors?.type ?? "", /type/);
  });
});

describe("POST /api/admin/place/:slug (edit)", () => {
  it("opens a pull request replacing the existing record", async () => {
    const { deps, pulls } = recorder({
      "data/places/amcorp-service-suite.json@main": JSON.stringify({
        slug: "amcorp-service-suite",
        ...PLACE,
      }),
    });

    const response = await editPlace(
      {
        request: request({ ...PLACE, name: "Amcorp Service Suites" }),
        env: env(),
        params: { slug: "amcorp-service-suite" },
      },
      deps,
    );

    assert.equal(response.status, 200);
    assert.equal(pulls.length, 1);
    assert.equal(pulls[0].branch, "place/amcorp-service-suite-edit");
    assert.equal(pulls[0].files[0].path, "data/places/amcorp-service-suite.json");
    assert.equal(
      JSON.parse(pulls[0].files[0].contents).name,
      "Amcorp Service Suites",
    );
  });

  it("404s for an unknown slug and writes nothing", async () => {
    const { deps, pulls } = recorder();

    const response = await editPlace(
      {
        request: request(PLACE),
        env: env(),
        params: { slug: "not-a-place" },
      },
      deps,
    );

    assert.equal(response.status, 404);
    assert.equal(pulls.length, 0);
  });

  it("404s for a malformed slug without reading the repository", async () => {
    const { deps, calls } = recorder();
    const response = await editPlace(
      {
        request: request(PLACE),
        env: env(),
        params: { slug: "../../secret" },
      },
      deps,
    );

    assert.equal(response.status, 404);
    assert.equal(calls.length, 0);
  });
});
