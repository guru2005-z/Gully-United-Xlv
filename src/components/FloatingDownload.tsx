/**
 * Floating download button — fixed to the corner of the screen on every page,
 * lets visitors grab the full source code zip of the site.
 */
export function FloatingDownload() {
  return (
    <a
      href="/gully-united-xlv-source.zip"
      download="gully-united-xlv-source.zip"
      aria-label="Download full source code"
      title="Download full source code"
      className="fixed bottom-24 right-4 z-[90] flex h-12 w-12 items-center justify-center rounded-full border border-primary/50 bg-background/80 text-primary shadow-[0_0_24px_rgba(190,242,100,0.25)] backdrop-blur transition hover:scale-105 hover:bg-primary hover:text-primary-foreground sm:bottom-6 sm:right-6"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </a>
  );
}
