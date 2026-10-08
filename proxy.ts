import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=(self)",
  );

  // Content Security Policy — allow Mapbox tiles/glyphs/workers without
  // opening the app to arbitrary third-party script.
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://api.mapbox.com",
    "img-src 'self' data: blob: https://*.mapbox.com https://*.tiles.mapbox.com",
    "connect-src 'self' https://*.mapbox.com https://*.tiles.mapbox.com https://api.mapbox.com https://events.mapbox.com",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "child-src blob:",
    "font-src 'self' data: https://*.mapbox.com",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
