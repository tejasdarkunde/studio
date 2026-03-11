
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

// Add a global type for the YouTube player API, to be used within this module
declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

type VideoPlayerProps = {
  url: string;
};

const YouTubePlayer = ({ videoId }: { videoId: string }) => {
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerApiRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  let controlsTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadYouTubeAPI = () => {
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        window.onYouTubeIframeAPIReady = () => setIsReady(true);
      } else {
        setIsReady(true);
      }
    };
    loadYouTubeAPI();

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      const player = playerApiRef.current;
      if (player && typeof player.destroy === 'function') {
        player.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (isReady && videoId && playerContainerRef.current) {
      const playerElement = playerContainerRef.current.querySelector('.yt-player-target');
      if (playerElement) {
        const player = new window.YT.Player(playerElement, {
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            showinfo: 0,
          },
          events: {
            onReady: (event: any) => {
              playerApiRef.current = event.target;
              setDuration(event.target.getDuration());
            },
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
              } else {
                setIsPlaying(false);
              }
            },
          },
        });
      }
    }
  }, [isReady, videoId]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isPlaying) {
      intervalId = setInterval(() => {
        const player = playerApiRef.current;
        if (player && typeof player.getCurrentTime === 'function') {
          const currentTime = player.getCurrentTime();
          const newProgress = (currentTime / duration) * 100;
          setProgress(newProgress);
        }
      }, 500);
    }
    return () => clearInterval(intervalId);
  }, [isPlaying, duration]);

  const handlePlayPause = () => {
    const player = playerApiRef.current;
    if (isPlaying) player?.pauseVideo();
    else player?.playVideo();
  };

  const handleSeek = (value: number[]) => {
    const player = playerApiRef.current;
    if(!player || !duration) return;
    const newTime = (value[0] / 100) * duration;
    player?.seekTo(newTime, true);
    setProgress(value[0]);
  };

  const handleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handlePointerMove = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
  };
  
  const formatTime = (seconds: number) => {
      if (isNaN(seconds) || seconds < 0) return '00:00';
      const date = new Date(seconds * 1000);
      const hh = date.getUTCHours();
      const mm = date.getUTCMinutes();
      const ss = date.getUTCSeconds().toString().padStart(2, '0');
      
      if (hh > 0) {
          return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
      }
      return `${mm}:${ss}`;
  }

  return (
    <div 
      ref={playerContainerRef} 
      className="relative w-full aspect-video bg-black group"
      onPointerMove={handlePointerMove}
      onMouseLeave={() => { if(isPlaying) setShowControls(false) }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="yt-player-target w-full h-full" />
      <div className="absolute inset-0" onClick={handlePlayPause}></div>
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 z-10 p-2 sm:p-4 bg-gradient-to-t from-black/70 to-transparent transition-opacity",
          (showControls || !isPlaying) ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="flex items-center gap-2 sm:gap-4 text-white">
            <Button variant="ghost" size="icon" onClick={handlePlayPause}>
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
            
            <span className="text-xs font-mono">{formatTime(progress / 100 * duration)}</span>
            
            <Slider
                value={[progress]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="w-full"
            />
            
            <span className="text-xs font-mono">{formatTime(duration)}</span>

            <Button variant="ghost" size="icon" onClick={handleFullscreen}>
                {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
            </Button>
        </div>
      </div>
    </div>
  );
};


export function VideoPlayer({ url }: VideoPlayerProps) {
  const getYouTubeVideoId = (url: string): string | null => {
    let videoId: string | null = null;
    try {
      if (url.includes("youtube.com/watch")) {
        const urlParams = new URL(url).searchParams;
        videoId = urlParams.get("v");
      } else if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1]?.split(/[?&]/)[0];
      } else if (url.includes("youtube.com/embed/")) {
        videoId = url.split("/embed/")[1]?.split(/[?&]/)[0];
      }
    } catch (e) {
      console.error("Invalid YouTube URL", e);
      return null;
    }
    return videoId;
  };

  const getVimeoEmbedUrl = (url: string): string | null => {
    if (url.includes('vimeo.com/')) {
        const videoId = url.split('vimeo.com/')[1].split('?')[0];
        return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
    return null;
  }
  
  const videoId = getYouTubeVideoId(url);
  const vimeoUrl = getVimeoEmbedUrl(url);

  if (videoId) {
    return <YouTubePlayer videoId={videoId} />;
  }

  const embedUrl = vimeoUrl || url;
  
  if (!vimeoUrl && !url.startsWith('http')) {
      return (
          <div className="aspect-video w-full flex items-center justify-center bg-black text-white">
            <p>Invalid video URL provided.</p>
          </div>
      )
  }
  
  return (
    <div className="aspect-video w-full">
      <iframe
        width="100%"
        height="100%"
        src={embedUrl}
        title="Video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      ></iframe>
    </div>
  );
}
