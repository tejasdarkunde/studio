
"use client";

import React from 'react';

type VideoPlayerProps = {
  url: string;
};

// Helper function to convert YouTube watch URL to embed URL
const getYouTubeEmbedUrl = (url: string): string | null => {
  let videoId: string | null = null;
  
  if (url.includes("youtube.com/watch")) {
    try {
        const urlParams = new URL(url).searchParams;
        videoId = urlParams.get("v");
    } catch (e) {
        // Invalid URL
        return null;
    }
  } else if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1]?.split("?")[0];
  } else if (url.includes("youtube.com/embed/")) {
    // Already an embed link
    try {
        const urlObj = new URL(url);
        urlObj.searchParams.set('rel', '0');
        return urlObj.toString();
    } catch (e) {
        // Invalid URL
        return url;
    }
  }

  return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0` : null;
};

// Basic helper for Vimeo, assumes a simple URL structure
const getVimeoEmbedUrl = (url: string): string | null => {
    if (url.includes('vimeo.com/')) {
        const videoId = url.split('vimeo.com/')[1].split('?')[0];
        return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
    return null;
}

export function VideoPlayer({ url }: VideoPlayerProps) {
  let embedUrl: string | null = null;

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    embedUrl = getYouTubeEmbedUrl(url);
  } else if (url.includes('vimeo.com')) {
    embedUrl = getVimeoEmbedUrl(url);
  } else {
    // Assume it's a direct embeddable link if not YouTube or Vimeo
    embedUrl = url;
  }

  if (!embedUrl) {
    return (
      <div className="aspect-video w-full flex items-center justify-center bg-black text-white">
        <p>Invalid video URL provided.</p>
      </div>
    );
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
