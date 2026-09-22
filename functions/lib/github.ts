export interface ContributionPullRequest {
  repo: string;
  token: string;
  /** Defaults to the public GitHub API. */
  api?: string;
  baseBranch: string;
  branch: string;
  files: { path: string; contents: string }[];
  title: string;
  body: string;
}

/** A read of one file at one ref, for the admin pages that prefill from a branch. */
export interface GithubRead {
  repo: string;
  token: string;
  /** Defaults to the public GitHub API. */
  api?: string;
  path: string;
  ref?: string;
}

export interface GithubWrite {
  repo: string;
  token: string;
  api?: string;
  branch: string;
  path: string;
  contents: string;
  message: string;
}

export interface GithubDelete {
  repo: string;
  token: string;
  api?: string;
  branch: string;
  path: string;
  message: string;
}

interface GithubAuth {
  repo: string;
  token: string;
  api?: string;
}

/**
 * Opens one pull request holding every file of a Contribution, using the
 * repository as the store and the pull request as the moderation queue.
 */
export async function openContributionPullRequest(
  input: ContributionPullRequest,
): Promise<string> {
  const { api, headers } = auth(input);
  const base = await call<{ object: { sha: string } }>(
    `${api}/git/ref/heads/${input.baseBranch}`,
    { headers },
  );

  await call(`${api}/git/refs`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ref: `refs/heads/${input.branch}`,
      sha: base.object.sha,
    }),
  });

  for (const file of input.files) {
    await call(`${api}/contents/${file.path}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `Add ${file.path.split("/").slice(-2).join("/")}`,
        content: base64(file.contents),
        branch: input.branch,
      }),
    });
  }

  const pull = await call<{ html_url: string }>(`${api}/pulls`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: input.title,
      body: input.body,
      head: input.branch,
      base: input.baseBranch,
    }),
  });

  return pull.html_url;
}

/** Read one file at one ref. A missing file is `null`, not an error. */
export async function readGithubFile(input: GithubRead): Promise<string | null> {
  const { api, headers } = auth(input);
  const ref = input.ref ? `?ref=${encodeURIComponent(input.ref)}` : "";
  const response = await fetch(`${api}/contents/${input.path}${ref}`, {
    headers,
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `GitHub ${response.status} for ${input.path}: ${detail.slice(0, 200)}`,
    );
  }

  const body = (await response.json()) as { content?: string };
  return decodeBase64(body.content ?? "");
}

/** Add or replace one file on an existing branch. */
export async function putGithubFile(input: GithubWrite): Promise<void> {
  const { api, headers } = auth(input);
  await call(`${api}/contents/${input.path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: input.message,
      content: base64(input.contents),
      branch: input.branch,
    }),
  });
}

/** Remove one file from an existing branch, looking up the blob it deletes. */
export async function deleteGithubFile(input: GithubDelete): Promise<void> {
  const { api, headers } = auth(input);
  const existing = await call<{ sha: string }>(
    `${api}/contents/${input.path}?ref=${encodeURIComponent(input.branch)}`,
    { headers },
  );

  await call(`${api}/contents/${input.path}`, {
    method: "DELETE",
    headers,
    body: JSON.stringify({
      message: input.message,
      sha: existing.sha,
      branch: input.branch,
    }),
  });
}

function auth(input: GithubAuth) {
  return {
    api: `${input.api ?? "https://api.github.com"}/repos/${input.repo}`,
    headers: {
      authorization: `Bearer ${input.token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      // GitHub rejects requests without one.
      "user-agent": "naiktrainjer-contribute",
    } satisfies Record<string, string>,
  };
}

async function call<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub ${response.status} for ${url}: ${detail.slice(0, 200)}`);
  }

  return (await response.json()) as T;
}

function base64(value: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(value)));
}

function decodeBase64(value: string): string {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
