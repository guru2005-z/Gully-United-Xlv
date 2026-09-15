import { useEffect, useRef, useState } from "react";
import intro from "@/assets/intro.asset.json";

/**
 * Opening intro: plays the Gully United XLV brand video full-screen once per
 * session. When playback finishes, the final frame stays on screen for 5 seconds
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

    // Ensure playback starts from the beginning and let the native autoplay
    // attribute handle the rest. Never skip the video if a browser blocks
    // autoplay — the fallback sources and the failsafe will handle it.
    video.currentTime = 0;
    video.play().catch(() => {});

    // Failsafe only applies if the browser never emits the standard ended event.
    const timeout = window.setTimeout(transitionToHome, 25000);
    return () => window.clearTimeout(timeout);
  }, []);

  if (seen) return null;

  return (
    <div role="presentation" className="fixed inset-0 z-[100] bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        muted
        playsInline
        autoPlay
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        onEnded={() => {
          // Hold the final frame for 5 seconds, then reveal the homepage.
          window.setTimeout(transitionToHome, 5000);
        }}
      >
        <source src={intro.url} type="video/mp4" />
        <source src="/intro-fallback.webm" type="video/webm" />
      </video>
    </div>
  );
}
