import { useEffect, useRef, useState } from "react";
import intro from "@/assets/intro.asset.json";

/**
 * Opening intro: plays the Gully United XLV brand video full-screen once per
 * session, then reveals the homepage when playback finishes.
 */
export function Loader() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false);
  const [seen, setSeen] = useState(false);

  function finish() {
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
      finish();
      return;
    }

    video.play().catch(finish);
    // Failsafe only applies if a browser fails to emit the standard ended event.
    const timeout = window.setTimeout(finish, 15000);
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
        onEnded={finish}
        onError={finish}
      >
        <source src={intro.url} type="video/mp4" />
        <source src="/intro-fallback.webm" type="video/webm" />
      </video>
    </div>
  );
}
