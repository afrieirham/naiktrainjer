import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteLoaderData } from "react-router";
import type { Route } from "./+types/root";
import "./app.css";

/**
 * No web-font link here on purpose: the site's one face, Archivo, is self-hosted
 * from `public/fonts/` and declared in `app.css`. That keeps a render-blocking
 * third-party request out of the critical path.
 */

/**
 * The analytics token is read on the server only and handed to the layout as
 * loader data. Reading `process.env` at module scope threw `process is not
 * defined` in the browser bundle, which broke hydration for the whole app.
 */
export function loader() {
  return {
    cfBeaconToken: process.env.CLOUDFLARE_ANALYTICS_TOKEN ?? "",
  };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  const cfBeaconToken = data?.cfBeaconToken ?? "";
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        {cfBeaconToken && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token":"${cfBeaconToken}"}`}
          />
        )}
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
