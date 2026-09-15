export interface ErrorMeta {
  code: number | string;
  title: string;
  explanation: string;
  ctaText: string;
  ctaLink: string;
}

export const ERROR_CATALOG: Record<string, ErrorMeta> = {
  "400": {
    code: 400,
    title: "Bad Request",
    explanation: "The details sent in your request were invalid.",
    ctaText: "Book a Slot",
    ctaLink: "/book",
  },
  "401": {
    code: 401,
    title: "Sign In Required",
    explanation: "Please sign in to your account to view this page.",
    ctaText: "Sign In",
    ctaLink: "/auth",
  },
  "403": {
    code: 403,
    title: "Access Restricted",
    explanation: "You do not have administrative permissions for this area.",
    ctaText: "Return Home",
    ctaLink: "/",
  },
  "404": {
    code: 404,
    title: "Page Not Found",
    explanation: "The page or booking slot you are looking for does not exist.",
    ctaText: "Book a Slot",
    ctaLink: "/book",
  },
  "408": {
    code: 408,
    title: "Request Timeout",
    explanation: "The server took too long to respond. Please try again.",
    ctaText: "Try Again",
    ctaLink: "/",
  },
  "429": {
    code: 429,
    title: "Too Many Requests",
    explanation: "You have sent too many requests. Please wait 1 minute before trying again.",
    ctaText: "Return Home",
    ctaLink: "/",
  },
  "500": {
    code: 500,
    title: "Server Error",
    explanation: "Something went wrong on our end. We have recorded this issue.",
    ctaText: "Return Home",
    ctaLink: "/",
  },
  "503": {
    code: 503,
    title: "Service Temporarily Unavailable",
    explanation: "Gully United XLV turf system is briefly undergoing maintenance or scaling.",
    ctaText: "Contact Us",
    ctaLink: "/contact",
  },
  offline: {
    code: "OFFLINE",
    title: "No Internet Connection",
    explanation: "You are currently offline. Check your mobile network or Wi-Fi.",
    ctaText: "Retry Connection",
    ctaLink: "/",
  },
};

export function renderErrorPage(statusCode: number | string = 500): string {
  const meta = ERROR_CATALOG[String(statusCode)] || ERROR_CATALOG["500"]!;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${meta.code} ${meta.title} — Gully United XLV</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; background: #000; color: #fff; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; text-align: center; }
      .card { max-width: 28rem; width: 100%; border: 1px solid #262626; background: #0a0a0a; border-radius: 1.5rem; padding: 2.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); }
      .badge { color: #CCFF00; font-size: 3.5rem; font-weight: 900; margin: 0; line-height: 1; }
      h1 { font-size: 1.5rem; font-weight: 900; margin: 1rem 0 0.5rem; text-transform: uppercase; letter-spacing: -0.025em; }
      p { color: #a3a3a3; font-size: 0.875rem; margin: 0 0 2rem; line-height: 1.5; }
      .actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.75rem 1.25rem; border-radius: 0.75rem; font-size: 0.75rem; font-weight: 900; text-transform: uppercase; tracking: 0.1em; cursor: pointer; text-decoration: none; border: 1px solid transparent; transition: all 0.2s; }
      .primary { background: #CCFF00; color: #000; }
      .primary:hover { background: #b8e600; }
      .secondary { background: transparent; color: #a3a3a3; border-color: #262626; }
      .secondary:hover { color: #fff; border-color: #404040; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="badge">${meta.code}</div>
      <h1>${meta.title}</h1>
      <p>${meta.explanation}</p>
      <div class="actions">
        <a class="primary" href="${meta.ctaLink}">${meta.ctaText}</a>
        <a class="secondary" href="/contact">Contact Support</a>
      </div>
    </div>
  </body>
</html>`;
}
