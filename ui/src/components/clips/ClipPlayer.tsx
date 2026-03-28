"use client";

import { useRef, useState, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils";

interface ClipPlayerProps {
  src: string;
  poster?: string;
  className?: string;
}

const SEEK_POINTS = [0.25, 0.5, 0.75];

export function ClipPlayer({ src, poster, className }: ClipPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [generatedPoster, setGeneratedPoster] = useState<string | null>(null);
  const [posterFailed, setPosterFailed] = useState(false);
  const seekAttemptRef = useRef(0);
  const needsPosterRef = useRef(false);

  const tryCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    const sample = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let totalBrightness = 0;
    const pixels = sample.data;
    for (let i = 0; i < pixels.length; i += 16) {
      totalBrightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    }
    const avgBrightness = totalBrightness / (pixels.length / 16);

    if (avgBrightness > 15) {
      setGeneratedPoster(canvas.toDataURL("image/jpeg", 0.85));
      needsPosterRef.current = false;
    } else if (seekAttemptRef.current < SEEK_POINTS.length - 1) {
      seekAttemptRef.current += 1;
      video.currentTime = video.duration * SEEK_POINTS[seekAttemptRef.current];
    } else {
      setGeneratedPoster(canvas.toDataURL("image/jpeg", 0.85));
      needsPosterRef.current = false;
    }
  }, []);

  const handleLoadedData = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration ?? 0);

    if (posterFailed || !poster) {
      needsPosterRef.current = true;
      seekAttemptRef.current = 0;
      video.currentTime = Math.max(video.duration * SEEK_POINTS[0], 0.5);
    }
  }, [poster, posterFailed]);

  const handleSeeked = useCallback(() => {
    if (!playing && needsPosterRef.current && !generatedPoster) {
      tryCapture();
    }
  }, [playing, generatedPoster, tryCapture]);

  const activePoster = generatedPoster ?? (posterFailed ? undefined : poster);

  const toggle = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className={cn("relative group rounded-xl overflow-hidden bg-black", className)}>
      <video
        ref={videoRef}
        src={src}
        poster={activePoster}
        muted={muted}
        preload="metadata"
        className="w-full h-full object-contain"
        onLoadedData={handleLoadedData}
        onSeeked={handleSeeked}
        onTimeUpdate={() =>
          setCurrentTime(videoRef.current?.currentTime ?? 0)
        }
        onLoadedMetadata={() =>
          setDuration(videoRef.current?.duration ?? 0)
        }
        onEnded={() => setPlaying(false)}
        onClick={toggle}
      />

      <canvas ref={canvasRef} className="hidden" />

      {poster && !posterFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          className="hidden"
          onError={() => setPosterFailed(true)}
        />
      )}

      {/* Overlay controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center gap-3">
          <button onClick={toggle} className="text-white cursor-pointer hover:scale-110 transition-transform">
            {playing ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </button>

          {/* Time display */}
          <span className="text-xs text-foreground font-mono bg-white/10 rounded-full px-2.5 py-0.5">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>

          <div className="flex-1" />

          <button
            onClick={() => setMuted(!muted)}
            className="text-white cursor-pointer hover:scale-110 transition-transform"
          >
            {muted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>

          <button
            onClick={() => videoRef.current?.requestFullscreen()}
            className="text-white cursor-pointer hover:scale-110 transition-transform"
          >
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Play button overlay — elevation shadow */}
      {!playing && (
        <button
          onClick={toggle}
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
        >
          <div className="bg-accent/80 rounded-full p-4 shadow-elevation-2 hover:shadow-elevation-3 transition-shadow duration-200">
            <Play className="h-8 w-8 text-white" />
          </div>
        </button>
      )}
    </div>
  );
}
