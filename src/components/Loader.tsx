import { useEffect, useRef, useState } from "react";
import intro from "@/assets/intro.asset.json";

/**
 * Opening intro: plays the Gully United XLV brand video full-screen once per
 * session. When playback finishes, the video stays on screen for 3 more seconds
 * before the homepage is revealed.
 */
export function Loader() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false);
  const [seen, setSeen] = useState(false);

  function transitionToHome() {
    if (doneRef.current) return;
    doneRef.current = true;
    videoRef.current?.pause();
    try {
      window.sessionStorage.setItem("guxlv.loaded", "1");
    } catch {
      // Storage can be unavailable in private browsing; playback still completes.
    }
    setSeen(true);
  }

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem("guxlv.loaded")) {
        doneRef.current = true;
        setSeen(true);
        return;
      }
    } catch {
      // Continue with the intro when session storage is unavailable.
    }

    const video = videoRef.current;
    if (!video) {
      transitionToHome();
      return;
    }

    // Try to start playback explicitly, but never skip the video if a browser
    // blocks autoplay — the native autoplay attribute will still attempt it.
    video.play().catch(() => {});

    // Failsafe only applies if the browser never emits ended/error.
    const timeout = window.setTimeout(transitionToHome, 20000);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (seen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[100] bg-black"
    >
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        muted
        playsInline
        autoPlay
        preload="auto"
        onEnded={() => {
          // Hold the final frame for 6 seconds, then reveal the homepage.
          window.setTimeout(transitionToHome, 6000);
        }}
        onError={transitionToHome}
      >
        <source src={intro.url} type="video/mp4" />
        <source src="/intro-fallback.webm" type="video/webm" />
      </video>
    </div>
  );
}
