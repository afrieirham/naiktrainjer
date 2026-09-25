import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { RouteFrame } from "../app/components/RouteFrame.tsx";

const STORED = "https://www.google.com/maps/embed?pb=!3e2!walk";
const MAP_LINK = "https://maps.app.goo.gl/place";

describe("RouteFrame", () => {
  it("renders an iframe for a Connection that stored a Route frame", () => {
    const html = renderToStaticMarkup(
      <RouteFrame src={STORED} mode="walk" mapUrl={MAP_LINK} />,
    );
    assert.ok(html.includes("<iframe"), "a stored Route frame must render an iframe");
    assert.ok(html.includes(`src="${STORED}"`), "the iframe must carry the stored link");
    assert.ok(
      html.includes('title="Walking directions to LRT station"'),
      "the iframe must be titled for assistive tech",
    );
    assert.ok(
      !html.includes(MAP_LINK),
      "with a frame stored, no Map-link fallback may render",
    );
  });

  it("renders no iframe when the Connection stored none, offering the Map link", () => {
    const html = renderToStaticMarkup(
      <RouteFrame src={null} mode="walk" mapUrl={MAP_LINK} />,
    );
    assert.ok(
      !html.includes("<iframe"),
      "a Connection with no stored frame must never render an iframe",
    );
    assert.ok(
      html.includes(`href="${MAP_LINK}"`),
      "the Place's Map link must be reachable where the frame would sit",
    );
    assert.ok(
      html.includes("Place on Google Maps"),
      "the fallback must name the Map link for a visitor",
    );
  });

  it("never frames the Map link itself", () => {
    const html = renderToStaticMarkup(
      <RouteFrame src={MAP_LINK} mode="walk" mapUrl={MAP_LINK} />,
    );
    assert.ok(
      !html.includes(`<iframe src="${MAP_LINK}"`),
      "the Map link is a share/search link Google refuses to frame",
    );
  });

  it("titles the iframe for the driving view when the mode is drive", () => {
    const html = renderToStaticMarkup(
      <RouteFrame src={STORED} mode="drive" mapUrl={MAP_LINK} />,
    );
    assert.ok(
      html.includes('title="Driving directions to LRT station"'),
      "the drive view must carry its own title",
    );
  });
});
