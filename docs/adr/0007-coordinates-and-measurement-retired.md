# 0007 — Coordinates and Measurement are retired

**Status:** accepted.

## Context

A Place used to carry a pair of coordinates and, earlier, walk and drive figures measured by the
Measure script. Measurement was already retired from the interface, but the coordinates remained,
and they were what the Route frame was calculated from (ADR-0001, amended by ADR-0006).

## Decision

A Place record no longer carries `coordinates`, and the data validator forbids the field. The
Klang Valley bounds and the coordinate inputs leave the Place rules.

1. **No coordinates on a Place.** A Place is located by its Map link, not by a latitude and
   longitude. The network reference still holds Station coordinates; those are the network's, not
   a Place's.
2. **Measurement stays retired.** `walkMinutes`, `walkMeters` and `driveMinutes` are forbidden,
   and nothing computes or surfaces a figure. The Route frame is the answer.

## Considered Options

- Keep coordinates as metadata — rejected: they imply a calculated route and a distance the
  directory does not stand behind.
- Reintroduce Measurement from the stored frame — rejected: the frame is a map, not a number, and
  the interface is deliberately number-free.

## Consequences

- The old single `station`, the `alsoNear` list and the coordinate pair all leave the record,
  replaced by required `map` and `connections`.
- A Place without a Map link cannot pass validation, so every published Place opens in Google
  Maps.
