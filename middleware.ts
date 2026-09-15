import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Inject correlation ID into request & response headers
  response.headers.set("x-request-id", requestId);

  // Security Headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files & images
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
