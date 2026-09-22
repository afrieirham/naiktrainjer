# 0005 — Contributions arrive through one write path, and are approved in a pull request

**Status:** accepted.

## Context

The directory is prerendered with no server (ADR-0001), and Place suggestions arrived through an
embedded Tally form — a third-party iframe that owns the fields, the validation and the data, and
hands back nothing the directory can turn into a record. The maintainer wanted a native form and
a real review step, and the model now separates what a visitor can supply from what a Place
requires (a Place needs a Station and coordinates a visitor cannot reliably give).

## Decision

The only dynamic surface is Cloudflare Pages Functions under `/api/*`; everything else stays
prerendered.

1. **Contribute.** The public form posts to a Function that verifies a Turnstile challenge and a
   KV rate-limit counter, then opens a pull request adding `data/contributions/<id>.json`. The
   Contribution is not a Place: it is never rendered.
2. **Review.** The open pull request is the review screen: its diff and comment thread are the
   moderation UI, and no custom queue is built.
3. **Approve.** The maintainer checks the place by hand, then an **Access**-gated `/admin` form
   loads the Contribution, writes the finished `data/places/<slug>.json` to the same branch and
   deletes the Contribution. Merging publishes on the next build.
4. **No photos.** The form is text-only, so there is no object store, no image stripping and no
   cleanup sweep.

The write path holds a fine-grained GitHub token (contents and pull-requests write) as a Pages
secret, a Turnstile secret, a KV binding, and a Cloudflare Access application in front of
`/admin*`. The site remains statically served; contributors never touch the repository directly.

## Considered Options

- Tally, embedded — rejected: an iframe owns the fields and yields nothing structured.
- A database (D1) with an admin route and a deploy hook — rejected: a queue, an auth story and an
  admin UI to own, in exchange for the repository and pull requests already giving a review
  screen, an audit log and a publish trigger.
- Photos as evidence — rejected: the whole upload and cleanup apparatus for an image the site
  never shows.

## Consequences

- Publishing waits for a build, which the review step hides.
- The token is the crown jewel: it can write to the repository, so it is scoped and rotated.
- Every visitor Contribution and every maintainer edit is a pull request, so `main` stays
  reviewable and git remains the audit log.
