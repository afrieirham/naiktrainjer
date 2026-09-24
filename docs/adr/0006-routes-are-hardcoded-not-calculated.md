# 0006 — Routes are stored by hand, not calculated from coordinates

**Status:** accepted. Amends ADR-0001's "the Route frame is replaceable".

## Context

The Route frame was built at click time from a Place's coordinates and a single nearest Station
(ADR-0001). That guessed the route rather than stating it: it often named the wrong walking
entrance, it ignored the pedestrian bridge, and a pair of coordinates cannot imply a route to more
than one Station. A Place can sit near several Stations, each with its own walk.

## Decision

A Place carries a required Map link and one or more **Connections**, each a Station plus an
optional **Route frame**:

1. **Stored, never calculated.** The maintainer (or a Contributor) pastes the Google Maps walking
   embed for that Place→Station pair. Nothing derives a route from coordinates, and Measurement
   stays retired (ADR-0007).
2. **One link, two views.** The stored frame is the walking route; the driving view is the same
   link with its mode segment swapped. A Connection without a frame falls back to the Place's Map
   link, so a Place can enter the directory before its routes are researched.
3. **Every Connection is equal.** There is no "nearest station": a Place near two Stations answers
   the walk question for each, and shows under each.

## Considered Options

- Keep calculating from coordinates — rejected: the answer reads wrong, and one coordinate pair
  cannot serve several Stations.
- Store both a walk and a drive frame — rejected: the two views come from one link, so storing two
  invites them to drift apart.

## Consequences

- Adding or correcting a route is a data edit, reviewed in a pull request like any other.
- A Place no longer records coordinates; the data validator forbids them, so no route can be
  calculated behind the maintainer's back.
