import { useEffect, useRef, useState } from "react";
import intro from "@/assets/intro.asset.json";

const HOLD_AFTER_END_MS = 5000;
/** Absolute worst case — only used if the video never reports progress at all. */
const FAILSAFE_MS = 45000;

/**
 * Opening intro: plays the Gully United XLV brand video full-screen once per
 * session. The homepage is revealed only after the video has actually reached
 * its end, plus a 5 second hold on the final frame.
 */
export function Loader() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false);
  const holdRef = useRef<number | null>(null);
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

  /** Called on `ended` — verify we really reached the end before holding. */
  function handleEnded() {
    const video = videoRef.current;
    if (!video) return transitionToHome();

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    // Some browsers fire `ended` on a stalled buffer. If we are clearly short of
    // the end, seek back to where we stopped and keep playing instead of exiting.
    if (duration > 0 && video.currentTime < duration - 0.75) {
      void video.play().catch(() => {});
      return;
    }
    if (holdRef.current !== null) return;
    holdRef.current = window.setTimeout(transitionToHome, HOLD_AFTER_END_MS);
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

    video.currentTime = 0;
    void video.play().catch(() => {});

    // Keep playback alive: browsers can pause a background/offscreen video, and
    // an unnoticed pause is exactly what makes the intro look "cut short".
    const keepAlive = window.setInterval(() => {
      if (doneRef.current || holdRef.current !== null) return;
      if (video.paused && !video.ended) void video.play().catch(() => {});
    }, 500);

    const failsafe = window.setTimeout(transitionToHome, FAILSAFE_MS);

    return () => {
      window.clearInterval(keepAlive);
      window.clearTimeout(failsafe);
      if (holdRef.current !== null) window.clearTimeout(holdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (seen) return null;

  return (
    <div role="presentation" className="fixed inset-0 z-[100] bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        muted
        playsInline
        autoPlay
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        onEnded={handleEnded}
      >
        <source src={intro.url} type="video/mp4" />
        <source src="/intro-fallback.webm" type="video/webm" />
      </video>
    </div>
  );
}
