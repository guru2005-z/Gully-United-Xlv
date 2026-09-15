"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Volume2, VolumeX, ArrowRight, Play } from "lucide-react";
import { LogoMark } from "./Logo";

interface IntroVideoSplashProps {
  forceShow?: boolean;
  onClose?: () => void;
}

export function IntroVideoSplash({ forceShow = false, onClose }: IntroVideoSplashProps) {
  const pathname = usePathname();
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgAudioRef = useRef<HTMLAudioElement>(null);
  const impactAudioRef = useRef<HTMLAudioElement>(null);
  const hasPlayedImpactSoundRef = useRef(false);

  const [visible, setVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Check session storage unless forceShow is passed
    const hasSeen = sessionStorage.getItem("guxlv_intro_seen");
    if (!hasSeen || forceShow) {
      setVisible(true);
      hasPlayedImpactSoundRef.current = false;
    }
  }, [forceShow]);

  // Interactive 3D Mouse Parallax Listener
  useEffect(() => {
    if (!visible) return;
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 2; // -1 to 1
      const y = (e.clientY / innerHeight - 0.5) * 2; // -1 to 1
      setTilt({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [visible]);

  // Handle browser autoplay policy & video playback
  useEffect(() => {
    if (!visible) return;

    const startMedia = async () => {
      // Start video playback
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.play().catch(() => {
          // If browser restricts unmuted video autoplay without prior gesture,
          // temporarily set video element muted property so video playback begins
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().catch((e) => console.warn("Video play error:", e));
          }
        });
      }
    };

    startMedia();

    // Auto-unmute on very first user interaction (e.g. mouse movement, touch, click, scroll)
    const handleFirstGesture = async () => {
      if (videoRef.current) {
        videoRef.current.muted = false;
      }

      setIsMuted(false);
      removeGestureListeners();
    };

    const events = ["pointerdown", "click", "mousemove", "touchstart", "keydown", "scroll"];

    const addGestureListeners = () => {
      events.forEach((evt) => window.addEventListener(evt, handleFirstGesture, { passive: true }));
    };

    const removeGestureListeners = () => {
      events.forEach((evt) => window.removeEventListener(evt, handleFirstGesture));
    };

    addGestureListeners();

    return () => {
      removeGestureListeners();
    };
  }, [visible]);

  if (pathname?.startsWith("/admin")) return null;

  const handleDismiss = () => {
    if (bgAudioRef.current) {
      bgAudioRef.current.pause();
      bgAudioRef.current.currentTime = 0;
    }
    if (impactAudioRef.current) {
      impactAudioRef.current.pause();
      impactAudioRef.current.currentTime = 0;
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setVisible(false);
    sessionStorage.setItem("guxlv_intro_seen", "true");
    if (onClose) onClose();
  };

  const playBgAudioAfterImpact = async () => {
    if (bgAudioRef.current && !isMuted) {
      try {
        if (bgAudioRef.current.paused) {
          bgAudioRef.current.currentTime = 0;
          await bgAudioRef.current.play();
        }
      } catch (e) {
        console.warn("Background audio play error:", e);
      }
    }
  };

  const playImpactSound = async () => {
    if (impactAudioRef.current && !hasPlayedImpactSoundRef.current) {
      hasPlayedImpactSoundRef.current = true;
      try {
        impactAudioRef.current.currentTime = 0;
        await impactAudioRef.current.play();
      } catch (err) {
        console.warn("Wicket hit sound error:", err);
        playBgAudioAfterImpact();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration || 1;
      const ratio = current / duration;
      setProgress(ratio * 100);

      // 1. Trigger wicket hit sound effect (intro-sound.mp3) precisely when ball hits the wicket (~34% frame ratio)
      if (ratio >= 0.34 && !hasPlayedImpactSoundRef.current && !isMuted) {
        playImpactSound();
      }

      // 2. Safety fallback: if past 37% ratio and impact sound triggered, play intro1-sound.mp3 if paused
      if (
        ratio >= 0.37 &&
        hasPlayedImpactSoundRef.current &&
        bgAudioRef.current &&
        bgAudioRef.current.paused &&
        !isMuted
      ) {
        playBgAudioAfterImpact();
      }
    }
  };

  const toggleMute = async () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }

    if (!nextMuted) {
      if (hasPlayedImpactSoundRef.current) {
        playBgAudioAfterImpact();
      }
    } else {
      if (bgAudioRef.current) bgAudioRef.current.pause();
      if (impactAudioRef.current) impactAudioRef.current.pause();
    }
  };

  if (!visible) return null;

  const isImpactMoment = progress >= 32 && progress <= 37;

  return (
    <div
      role="dialog"
      aria-label="Gully United XLV Video Intro"
      className="fixed inset-0 z-[100] flex flex-col justify-between bg-black text-white transition-opacity duration-700 animate-fadeIn perspective-[1000px] overflow-hidden"
    >
      {/* Background Intro Sound Track (plays AFTER wicket hit) */}
      <audio ref={bgAudioRef} src="/intro1-sound.mp3" preload="auto" />
      {/* Wicket Hit Impact Sound Effect (plays AT wicket hit ~34%) */}
      <audio
        ref={impactAudioRef}
        src="/intro-sound.mp3"
        preload="auto"
        onEnded={playBgAudioAfterImpact}
      />

      {/* 3D Hardware Accelerated Video Container with Mouse Parallax & 4K Color Grading */}
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black transition-transform duration-300 ease-out transform-gpu"
        style={{
          transform: `perspective(1000px) rotateX(${tilt.y * -3}deg) rotateY(${
            tilt.x * 3
          }deg) scale(1.02)`,
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleDismiss}
          className="h-full w-full object-contain sm:object-cover object-center transform-gpu will-change-transform contrast-[1.12] brightness-[1.06] saturate-[1.15]"
        >
          <source src="/intro.mp4" type="video/mp4" />
          <source src="/intro-fallback.webm" type="video/webm" />
        </video>
      </div>

      {/* Floating 3D Stadium Light Particles */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/5 w-2 h-2 rounded-full bg-[#CCFF00] opacity-60 shadow-[0_0_15px_#CCFF00] animate-pulse" />
        <div className="absolute top-2/3 right-1/4 w-3 h-3 rounded-full bg-[#CCFF00] opacity-40 shadow-[0_0_20px_#CCFF00] animate-bounce" />
        <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 rounded-full bg-white opacity-50 shadow-[0_0_10px_white] animate-pulse" />
        {/* Anamorphic Neon Horizontal Lens Streak */}
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#CCFF00]/30 to-transparent blur-[1px]" />
      </div>

      {/* 3D Impact Flash Burst Effect on Wicket Hit */}
      {isImpactMoment && (
        <div className="pointer-events-none absolute inset-0 z-20 bg-[#CCFF00]/10 backdrop-brightness-125 transition-opacity duration-300 animate-pulse" />
      )}

      {/* Modern Vignette & Depth Gradient Overlays */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-black/85" />

      {/* Top Header Controls with 3D Glassmorphic HUD styling */}
      <div
        className="relative z-30 flex items-center justify-between p-6 sm:p-8 transition-transform duration-300 ease-out"
        style={{
          transform: `translate3d(${tilt.x * 10}px, ${tilt.y * 10}px, 0px)`,
        }}
      >
        <div className="flex items-center gap-3">
          <LogoMark className="h-10 sm:h-12 drop-shadow-[0_0_20px_rgba(204,255,0,0.6)]" />
          <span className="hidden sm:inline-block h-4 w-[1px] bg-white/20" />
          <span className="hidden sm:inline-block text-[0.65rem] font-bold uppercase tracking-[0.2em] text-neutral-300">
            Kota, Andhra Pradesh
          </span>
        </div>

        <button
          onClick={toggleMute}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-widest backdrop-blur-xl transition-all ${
            !isMuted
              ? "border-[#CCFF00] bg-[#CCFF00]/20 text-[#CCFF00] shadow-[0_0_20px_rgba(204,255,0,0.5)] scale-105"
              : "border-white/20 bg-black/60 text-white hover:border-[#CCFF00] hover:text-[#CCFF00]"
          }`}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          <span>{isMuted ? "Enable Sound" : "Sound Active"}</span>
        </button>
      </div>

      {/* Center Branding Overlay - 3-Phase Dynamic Sync with 3D Parallax */}
      <div
        className={`relative z-30 mx-auto max-w-2xl px-6 text-center transition-all duration-700 pointer-events-none ${
          progress > 25 && progress < 60 ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
        style={{
          transform: `translate3d(${tilt.x * -15}px, ${tilt.y * -15}px, 0px)`,
        }}
      >
        {progress >= 60 ? (
          <div className="animate-fadeIn">
            <span className="inline-block rounded-full border border-[#CCFF00]/50 bg-[#CCFF00]/15 px-4 py-1.5 text-[0.65rem] font-extrabold uppercase tracking-[0.3em] text-[#CCFF00] backdrop-blur-xl shadow-[0_0_15px_rgba(204,255,0,0.3)]">
              Premier Match Arena
            </span>
            <h1 className="mt-4 text-4xl sm:text-7xl font-black uppercase tracking-tighter text-white drop-shadow-2xl">
              GULLY UNITED <br />
              <span className="text-[#CCFF00] neon-glow">XLV KOTA</span>
            </h1>
          </div>
        ) : (
          <div>
            <span className="inline-block rounded-full border border-[#CCFF00]/50 bg-[#CCFF00]/15 px-4 py-1.5 text-[0.65rem] font-extrabold uppercase tracking-[0.3em] text-[#CCFF00] backdrop-blur-xl shadow-[0_0_15px_rgba(204,255,0,0.3)]">
              Welcome to the Arena
            </span>
            <h1 className="mt-4 text-4xl sm:text-7xl font-black uppercase tracking-tighter text-white drop-shadow-2xl">
              KOTA&apos;S ULTIMATE <br />
              <span className="text-[#CCFF00] neon-glow">CRICKET TURF</span>
            </h1>
          </div>
        )}
      </div>

      {/* Bottom Control & Progress Bar */}
      <div
        className="relative z-30 p-6 sm:p-8 transition-transform duration-300 ease-out"
        style={{
          transform: `translate3d(${tilt.x * 10}px, ${tilt.y * 10}px, 0px)`,
        }}
      >
        <div className="mx-auto flex max-w-[1400px] flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-300">
            <Play size={14} className="text-[#CCFF00] animate-pulse" />
            <span>PLAYING 4K INTRO</span>
          </div>

          <button
            onClick={handleDismiss}
            className="group inline-flex items-center gap-3 rounded-2xl bg-[#CCFF00] px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-black shadow-[0_0_35px_rgba(204,255,0,0.6)] transition-all hover:bg-[#b8e600] hover:scale-105"
          >
            <span>Enter Website</span>
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Video Progress Bar */}
        <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full bg-[#CCFF00] transition-all duration-150 ease-linear shadow-[0_0_15px_#CCFF00]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
