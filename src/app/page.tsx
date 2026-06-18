"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ArrowUpRight, Award, Crown, X } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function LandingPage() {
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

  // States and refs for seamless background video looping with crossfade
  const [activeVideo, setActiveVideo] = useState<'A' | 'B'>('A');
  const videoRefA = useRef<HTMLVideoElement>(null);
  const videoRefB = useRef<HTMLVideoElement>(null);
  const transitionTargetRef = useRef<'A' | 'B' | null>(null);
  const fadeDuration = 2; // Crossfade duration in seconds



  useEffect(() => {
    // Preload audio files
    const hoverAudio = new Audio("/sounds/deck_ui_navigation.wav");
    hoverAudio.preload = "auto";
    hoverAudioRef.current = hoverAudio;

    const clickAudio = new Audio("/sounds/deck_ui_default_activation.wav");
    clickAudio.preload = "auto";
    clickAudioRef.current = clickAudio;

    // Interaction handler to unlock audio engine in browsers
    const unlockAudio = () => {
      if (hoverAudio) {
        hoverAudio.play().then(() => {
          hoverAudio.pause();
          hoverAudio.currentTime = 0;
        }).catch(() => {});
      }
      if (clickAudio) {
        clickAudio.play().then(() => {
          clickAudio.pause();
          clickAudio.currentTime = 0;
        }).catch(() => {});
      }
      // Remove listeners once unlocked
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };

    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);
  // Play Video A when the component mounts
  useEffect(() => {
    if (videoRefA.current) {
      videoRefA.current.load();
      videoRefA.current.play().catch(err => {
        console.log("Video A play blocked:", err);
      });
    }
    if (videoRefB.current) {
      videoRefB.current.load();
      videoRefB.current.pause();
      videoRefB.current.currentTime = 0;
    }
    setActiveVideo('A');
    transitionTargetRef.current = null;
  }, []);

  const handleTimeUpdate = (videoKey: 'A' | 'B') => {
    const currentVideo = videoKey === 'A' ? videoRefA.current : videoRefB.current;
    const nextVideo = videoKey === 'A' ? videoRefB.current : videoRefA.current;
    
    if (!currentVideo || !nextVideo) return;
    
    const timeRemaining = currentVideo.duration - currentVideo.currentTime;
    
    // Trigger transition when there is less than fadeDuration left, and we haven't initiated it yet
    if (currentVideo.duration && timeRemaining <= fadeDuration && activeVideo === videoKey) {
      const targetKey = videoKey === 'A' ? 'B' : 'A';
      if (transitionTargetRef.current !== targetKey) {
        transitionTargetRef.current = targetKey;
        nextVideo.currentTime = 0;
        nextVideo.play().then(() => {
          setActiveVideo(targetKey);
        }).catch(err => {
          console.error("Failed to start crossfade video:", err);
          transitionTargetRef.current = null;
        });
      }
    }
  };

  const handleVideoEnded = (videoKey: 'A' | 'B') => {
    const endedVideo = videoKey === 'A' ? videoRefA.current : videoRefB.current;
    if (endedVideo) {
      endedVideo.pause();
      endedVideo.currentTime = 0;
    }
  };

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isMusicPlaying) {
      audioRef.current.pause();
      setIsMusicPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsMusicPlaying(true);
      }).catch(err => {
        console.log("Audio play blocked:", err);
      });
    }
  };

  const playHoverSound = () => {
    if (!hoverAudioRef.current) return;
    try {
      const playInstance = hoverAudioRef.current.cloneNode(true) as HTMLAudioElement;
      playInstance.volume = 0.65;
      playInstance.play().catch((err) => {
        console.log("Hover sound playback blocked:", err);
      });
    } catch (err) {
      console.error("Failed to play hover sound:", err);
    }
  };

  const playClickSound = () => {
    if (!clickAudioRef.current) return;
    try {
      const playInstance = clickAudioRef.current.cloneNode(true) as HTMLAudioElement;
      playInstance.volume = 1.0;
      playInstance.play().catch((err) => {
        console.log("Click sound playback blocked:", err);
      });
    } catch (err) {
      console.error("Failed to play click sound:", err);
    }
  };

  const navLinks = [
    { name: "Reconstructor", href: "/dashboard", external: false, status: "available" },
    { name: "Image AI", href: "#", external: false, status: "progress" },
    { name: "Diagrams", href: "#", external: false, status: "progress" },
    { name: "Creator", href: "https://creamypanda-coder.github.io/Porto/#hero", external: true, status: "available" },
  ];

  const handleNavLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, link: typeof navLinks[0]) => {
    playClickSound();
    if (link.status === "progress") {
      e.preventDefault();
      toast("Fitur ini sedang dalam pengembangan (On Progress)", "info", "Belum Tersedia");
    }
  };

  const stats = [
    { value: "50K+", label: "Models Rebuilt" },
    { value: "99.9%", label: "Priority Uptime" },
    { value: "3x", label: "Faster Generation" },
  ];

  return (
    <div className="relative w-full h-screen h-[100dvh] overflow-hidden bg-black select-none text-white flex flex-col font-inter">
      {/* Background Music */}
      <audio ref={audioRef} src="/music/backsound_music.mp3" loop />

      {/* Background Video */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0 pointer-events-none bg-black">
        {/* Video A */}
        <video
          ref={videoRefA}
          autoPlay
          muted
          playsInline
          src="/video/Background3.mp4"
          onPlay={() => setIsVideoLoaded(true)}
          onTimeUpdate={() => handleTimeUpdate('A')}
          onEnded={() => handleVideoEnded('A')}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full w-auto h-auto object-cover"
          style={{
            opacity: isVideoLoaded && activeVideo === 'A' ? 0.8 : 0,
            transition: "opacity 2s ease-in-out",
          }}
        />

        {/* Video B */}
        <video
          ref={videoRefB}
          muted
          playsInline
          src="/video/Background4.mp4"
          onPlay={() => setIsVideoLoaded(true)}
          onTimeUpdate={() => handleTimeUpdate('B')}
          onEnded={() => handleVideoEnded('B')}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full w-auto h-auto object-cover"
          style={{
            opacity: isVideoLoaded && activeVideo === 'B' ? 0.8 : 0,
            transition: "opacity 2s ease-in-out",
          }}
        />
      </div>

      {/* Navbar */}
      <nav className="relative z-30 flex items-center justify-between w-full px-6 sm:px-10 lg:px-16 py-5 lg:py-7">
        {/* Left Brand Logo */}
        <Link
          href="/"
          className="font-podium font-bold uppercase text-2xl sm:text-3xl tracking-wider text-white"
          onMouseEnter={playHoverSound}
          onClick={playClickSound}
        >
          TOMS WORKSPACE
        </Link>

        {/* Center Navigation Links (Hidden on Mobile) */}
        <div className="hidden md:flex items-center space-x-8 lg:space-x-12">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="text-white/80 text-sm tracking-widest uppercase hover:text-white transition-colors duration-300 font-medium"
              onMouseEnter={playHoverSound}
              onClick={(e) => handleNavLinkClick(e, link)}
            >
              {link.name}
            </a>
          ))}
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-4 z-30">
          {/* Music Toggle */}
          <button
            onClick={() => {
              playClickSound();
              toggleMusic();
            }}
            onMouseEnter={playHoverSound}
            className={`group p-3 border transition-all duration-500 flex items-center justify-center cursor-pointer rounded-full ${
              isMusicPlaying
                ? "border-[#e6c687]/40 bg-[#e6c687]/10 text-[#e6c687] shadow-[0_0_15px_rgba(230,198,135,0.25)] hover:border-[#e6c687]/70 hover:bg-[#e6c687]/20"
                : "border-white/20 bg-black/45 text-white/60 hover:border-white/50 hover:bg-white/10 hover:text-white"
            }`}
            title={isMusicPlaying ? "Mute Music" : "Play Music"}
            aria-label="Toggle Music"
          >
            {isMusicPlaying ? (
              <div className="flex items-end justify-between w-4 h-4 px-[1.5px] gap-[2px]">
                <span className="w-[2px] bg-current rounded-full animate-eq-1" />
                <span className="w-[2px] bg-current rounded-full animate-eq-2" />
                <span className="w-[2px] bg-current rounded-full animate-eq-3" />
                <span className="w-[2px] bg-current rounded-full animate-eq-4" />
              </div>
            ) : (
              <div className="flex items-end justify-between w-4 h-4 px-[1.5px] gap-[2px] relative">
                <span className="w-[2px] h-[4px] bg-current rounded-full" />
                <span className="w-[2px] h-[4px] bg-current rounded-full" />
                <span className="w-[2px] h-[4px] bg-current rounded-full" />
                <span className="w-[2px] h-[4px] bg-current rounded-full" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[18px] h-[1.5px] bg-current rotate-45 transform origin-center" />
                </div>
              </div>
            )}
          </button>

          {/* Right CTA Button (Hidden on Mobile) */}
          <div className="hidden md:block">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 border border-white/30 hover:border-white/60 px-6 py-3 text-xs tracking-widest uppercase hover:bg-white/10 transition-all duration-300 font-medium"
              onMouseEnter={playHoverSound}
              onClick={playClickSound}
            >
              LAUNCH APP
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>

          {/* Hamburger Menu (Mobile Only) */}
          <button
            onClick={() => {
              playClickSound();
              setMenuOpen(true);
            }}
            onMouseEnter={playHoverSound}
            className="flex flex-col items-end space-y-1.5 md:hidden focus:outline-none p-2 -mr-2 cursor-pointer"
            aria-label="Open Menu"
          >
            <div className="w-6 h-0.5 bg-white transition-all"></div>
            <div className="w-6 h-0.5 bg-white transition-all"></div>
            <div className="w-4 h-0.5 bg-white transition-all"></div>
          </button>
        </div>
      </nav>

      {/* Hero Content Area */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-16 pt-4 pb-6 sm:pb-8 lg:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full relative">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 flex flex-col items-start relative z-20 max-w-2xl">
            {/* 1. Tagline */}
            <div className="inline-flex items-center gap-2.5 mb-4 lg:mb-5">
              <Crown className="w-4 h-4 text-white/70" />
              <span className="text-white/70 text-xs sm:text-sm tracking-[0.3em] uppercase font-semibold">
                Next-Generation AI Creation Workspace
              </span>
            </div>

            {/* Soft Radial Glow behind Heading */}
            <div 
              className="absolute pointer-events-none -z-10 rounded-full"
              style={{
                top: "10%",
                left: "-10%",
                width: "100%",
                height: "90%",
                background: "radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(230, 198, 135, 0.05) 55%, rgba(0, 0, 0, 0) 100%)",
                filter: "blur(90px)",
              }}
            />

            {/* 2. Main Heading */}
            <h1 className="font-podium text-white uppercase leading-[0.88] tracking-tight text-[clamp(2.3rem,7vw,5.2rem)] flex flex-col select-none">
              <span>Design.</span>
              <span>Generate.</span>
              <span>Reconstruct.</span>
            </h1>

            {/* 3. Subtext */}
            <p className="text-white/70 text-sm sm:text-base leading-relaxed max-w-md mt-4 lg:mt-5 font-normal">
              We build intelligent visual tools
              <br />
              that don't just speed up design — <span className="text-white font-bold">they reshape it.</span>
            </p>

            {/* 4. CTA Row */}
            <div className="mt-5 lg:mt-6 flex flex-wrap items-center gap-4 sm:gap-6">
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 bg-white hover:bg-neutral-200 text-black px-5 sm:px-7 py-3 sm:py-3.5 text-[11px] sm:text-xs tracking-widest uppercase transition-colors duration-300 font-medium"
                onMouseEnter={playHoverSound}
                onClick={playClickSound}
              >
                OPEN WORKSTATION
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>

              <div className="hidden sm:flex items-center gap-3 select-none">
                <Award className="w-8 h-8 text-white/50" />
                <div className="text-white/60 text-xs tracking-wider uppercase leading-tight font-medium">
                  <div>Next-Gen</div>
                  <div>AI Workspace</div>
                </div>
              </div>
            </div>

            {/* 5. Stats Row */}
            <div className="mt-6 sm:mt-8 lg:mt-8 flex flex-wrap gap-6 sm:gap-12 lg:gap-16">
              {stats.map((stat, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-white text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                    {stat.value}
                  </span>
                  <span className="text-white/50 text-[9px] sm:text-xs tracking-widest uppercase mt-1 font-medium">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column Spacer (Desktop) - keeps layout clear so character in background video is visible */}
          <div className="hidden lg:block lg:col-span-5 h-full pointer-events-none"></div>
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col justify-between transition-all duration-500 ${
          menuOpen ? "opacity-100 visible pointer-events-auto" : "opacity-0 invisible pointer-events-none"
        }`}
      >
        {/* Header row matching the navbar */}
        <div className="flex items-center justify-between w-full px-6 sm:px-10 py-5">
          <span className="font-podium font-bold uppercase text-2xl sm:text-3xl tracking-wider text-white">
            TOMS WORKSPACE
          </span>
          <button
            onClick={() => {
              playClickSound();
              setMenuOpen(false);
            }}
            onMouseEnter={playHoverSound}
            className="text-white hover:text-white/85 p-2 transition-colors duration-300 focus:outline-none cursor-pointer"
            aria-label="Close Menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Centered navigation items with staggered delay */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 sm:space-y-8 px-6">
          {navLinks.map((link, i) => (
            <a
              key={link.name}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              onClick={(e) => {
                handleNavLinkClick(e, link);
                if (link.status !== "progress") {
                  setMenuOpen(false);
                }
              }}
              onMouseEnter={playHoverSound}
              className="font-podium text-4xl sm:text-5xl text-white uppercase tracking-wider hover:text-white/70 transition-all duration-300 cursor-pointer"
              style={{
                transitionDelay: `${i * 80 + 100}ms`,
                transform: menuOpen ? "translateY(0)" : "translateY(20px)",
                opacity: menuOpen ? 1 : 0,
                transitionProperty: "transform, opacity",
                transitionDuration: "500ms",
                transitionTimingFunction: "ease-out",
              }}
            >
              {link.name}
            </a>
          ))}

          {/* Bordered GET IN TOUCH button inside mobile overlay */}
          <Link
            href="/dashboard"
            onClick={() => {
              playClickSound();
              setMenuOpen(false);
            }}
            onMouseEnter={playHoverSound}
            className="inline-flex items-center gap-2 border border-white/30 hover:border-white/60 px-8 py-4 text-xs tracking-widest uppercase hover:bg-white/10 text-white font-medium transition-all duration-300 cursor-pointer"
            style={{
              transitionDelay: `${navLinks.length * 80 + 100}ms`,
              transform: menuOpen ? "translateY(0)" : "translateY(20px)",
              opacity: menuOpen ? 1 : 0,
              transitionProperty: "transform, opacity",
              transitionDuration: "500ms",
              transitionTimingFunction: "ease-out",
            }}
          >
            LAUNCH WORKSPACE
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Bottom Spacer to balance the top logo row height */}
        <div className="h-[72px] sm:h-[88px] invisible pointer-events-none"></div>
      </div>


    </div>
  );
}
