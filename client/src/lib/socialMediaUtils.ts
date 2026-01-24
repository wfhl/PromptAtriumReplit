export interface SocialContext {
  platform: 'twitter' | 'reddit' | 'youtube' | 'instagram' | 'tiktok' | 'web' | 'unknown';
  originalUrl?: string;
  title?: string;
  text?: string;
  author?: string;
  mediaUrls: string[];
  html?: string; // For rendering the embed (iframe or oEmbed HTML)
  thumbnail?: string;
  rawResponse?: any; // To pass raw JSON to AI if needed
}

interface OEmbedData {
  title?: string;
  author_name?: string;
  author_url?: string;
  html?: string;
  thumbnail_url?: string;
  provider_name?: string;
  type?: string;
  version?: string;
}

export const fetchNoEmbed = async (url: string): Promise<OEmbedData | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const apiUrl = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const data = await response.json();
    if (data.error) return null;
    return data as OEmbedData;
  } catch {
    return null;
  }
};

export const fetchSocialContext = async (url: string): Promise<SocialContext | null> => {
  try {
    const baseContext = { originalUrl: url };

    // 1. YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=))([\w-]{10,12})\b/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;

      if (videoId) {
        // Sandboxed iframe for security
        const iframeHtml = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" allowfullscreen style="aspect-ratio: 16/9; border-radius: 0.5rem; width: 100%;"></iframe>`;
        const thumb = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

        let title = "YouTube Video";
        let author = "YouTube Channel";

        const meta = await fetchNoEmbed(url);
        if (meta) {
          title = meta.title || title;
          author = meta.author_name || author;
        }

        return {
          ...baseContext,
          platform: 'youtube',
          title,
          author,
          html: iframeHtml,
          mediaUrls: [thumb],
          thumbnail: thumb,
          text: title
        };
      }
    }

    // 2. Instagram
    if (url.includes('instagram.com')) {
      // Clean URL: Remove tracking params like ?igsh=... or ?share_id=...
      const cleanUrl = url.split('?')[0];
      // Support more variations (p, reel, tv, stories)
      const typeMatch = cleanUrl.match(/(?:instagr\.am|instagram\.com)\/(p|reel|tv|stories)\/([a-zA-Z0-9_-]+)/);
      const postType = typeMatch ? typeMatch[1] : null;
      const postId = typeMatch ? typeMatch[2] : null;

      if (postId && postType) {
        // Use correct embed path based on post type
        const embedPath = postType === 'stories' ? 'p' : postType; // stories don't have embeds, fallback to /p/
        const iframeHtml = `<iframe src="https://www.instagram.com/${embedPath}/${postId}/embed/captioned" width="100%" height="600" frameborder="0" scrolling="yes" allowtransparency="true" sandbox="allow-scripts allow-same-origin" style="border-radius: 8px; overflow: hidden; min-width: 320px;"></iframe>`;

        let title = "Instagram Post";
        let author = "Instagram User";
        let thumb = undefined;
        let isGeneric = true;

        // Attempt metadata fetch
        try {
          const meta = await fetchNoEmbed(cleanUrl);
          isGeneric = !meta || meta.title === "Instagram" || meta.title?.includes("Login");

          if (meta && !isGeneric) {
            title = meta.title || title;
            author = meta.author_name || author;
            thumb = meta.thumbnail_url;
          }
        } catch {
          // Ignore metadata errors, we still have the iframe
        }

        return {
          ...baseContext,
          platform: 'instagram',
          title: isGeneric ? "Instagram Post (Analysis Recommended)" : title,
          author,
          html: iframeHtml,
          mediaUrls: thumb ? [thumb] : [],
          thumbnail: thumb,
          text: isGeneric ? "" : title
        };
      }
    }

    // 3. Twitter / X
    if (url.match(/(twitter\.com|x\.com)/)) {
      const tweetIdMatch = url.match(/\/status\/(\d+)/);
      if (tweetIdMatch) {
        const tweetId = tweetIdMatch[1];
        try {
          const resp = await fetch(`https://api.fxtwitter.com/status/${tweetId}`);
          if (resp.ok) {
            const data = await resp.json();
            const tweet = data.tweet;
            if (tweet) {
              const mediaUrls = (tweet.media?.photos || []).map((p: any) => p.url);
              if (tweet.media?.videos) {
                tweet.media.videos.forEach((v: any) => mediaUrls.push(v.url));
              }
              return {
                ...baseContext,
                platform: 'twitter',
                title: `Tweet by ${tweet.author?.name} (@${tweet.author?.screen_name})`,
                text: tweet.text,
                author: tweet.author?.name,
                mediaUrls: mediaUrls,
                html: '', // Force custom card
                thumbnail: mediaUrls[0],
                rawResponse: tweet
              };
            }
          }
        } catch {
          console.warn("FxTwitter fetch failed");
        }
      }
    }

    // 4. Reddit
    if (url.includes('reddit.com') || url.includes('redd.it')) {
      let title = "Reddit Post";
      let author = "Reddit User";
      let text = "";
      let mediaUrls: string[] = [];
      let rawResponse = {};

      // Attempt A: JSON Fetch (Primary)
      try {
        // Ensure URL ends in .json and clean params
        let cleanUrl = url.split('?')[0].replace(/\/$/, '');
        if (!cleanUrl.endsWith('.json')) {
          cleanUrl += '.json';
        }

        const resp = await fetch(cleanUrl);
        if (resp.ok) {
          const data = await resp.json();
          // Reddit JSON structure: array where first item is the Listing for the post
          const post = data[0]?.data?.children?.[0]?.data;

          if (post) {
            rawResponse = post;
            title = post.title || title;
            author = post.author ? `u/${post.author}` : author;
            text = post.selftext || "";

            // Extraction 1: Gallery (Multiple Images)
            if (post.is_gallery && post.media_metadata) {
              const ids = post.gallery_data?.items?.map((item: any) => item.media_id) || Object.keys(post.media_metadata);
              for (const id of ids) {
                const meta = post.media_metadata[id];
                // s.u is url, s.gif is gif
                if (meta?.s?.u) {
                  mediaUrls.push(meta.s.u.replace(/&amp;/g, '&'));
                } else if (meta?.s?.gif) {
                  mediaUrls.push(meta.s.gif.replace(/&amp;/g, '&'));
                }
              }
            }
            // Extraction 2: Native Video
            else if (post.is_video && post.media?.reddit_video?.fallback_url) {
              mediaUrls.push(post.media.reddit_video.fallback_url.split('?')[0]);
            }
            // Extraction 3: Standard Link/Image
            else {
              const linkUrl = post.url_overridden_by_dest || post.url;
              if (linkUrl) {
                if (linkUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                  mediaUrls.push(linkUrl);
                }
                // Handle preview images if main link isn't an image
                else if (post.preview?.images?.[0]?.source?.url) {
                  mediaUrls.push(post.preview.images[0].source.url.replace(/&amp;/g, '&'));
                }
              }
            }
          }
        }
      } catch {
        console.warn("Reddit JSON fetch failed");
      }

      // Attempt B: NoEmbed (Fallback)
      if (mediaUrls.length === 0 && (!text || text.length === 0)) {
        const meta = await fetchNoEmbed(url);
        if (meta) {
          title = meta.title || title;
          author = meta.author_name || author;
          if (meta.thumbnail_url) mediaUrls.push(meta.thumbnail_url);
        }
      }

      return {
        ...baseContext,
        platform: 'reddit',
        title,
        author,
        text,
        html: '', // Force custom card
        mediaUrls,
        thumbnail: mediaUrls[0],
        rawResponse
      };
    }

    // 5. TikTok - Note: TikTok oEmbed returns script-based HTML that won't render in React
    // We just get metadata and show a simple preview instead
    if (url.includes('tiktok.com')) {
      let title = "TikTok Video";
      let author = "TikTok User";
      let thumb = undefined;
      
      try {
        const meta = await fetchNoEmbed(url);
        if (meta) {
          title = meta.title || title;
          author = meta.author_name || author;
          thumb = meta.thumbnail_url;
        }
      } catch {}

      return {
        ...baseContext,
        platform: 'tiktok',
        title,
        author,
        html: '', // Don't use script-based HTML
        mediaUrls: thumb ? [thumb] : [],
        thumbnail: thumb,
        text: title
      };
    }

    // 6. Fallback - Don't use raw oEmbed HTML for security (XSS risk)
    const meta = await fetchNoEmbed(url);
    if (meta) {
      return {
        ...baseContext,
        platform: 'web',
        title: meta.title,
        author: meta.author_name,
        html: '', // Don't use raw oEmbed HTML from unknown sources
        mediaUrls: meta.thumbnail_url ? [meta.thumbnail_url] : [],
        thumbnail: meta.thumbnail_url,
        text: meta.title
      };
    }

    return null;
  } catch (e) {
    console.error("Context fetch failed", e);
    return null;
  }
};

export const imageUrlToBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const getPlatformIcon = (platform: string): string => {
  switch (platform) {
    case 'twitter': return '𝕏';
    case 'reddit': return '🔴';
    case 'youtube': return '▶️';
    case 'instagram': return '📷';
    case 'tiktok': return '🎵';
    default: return '🌐';
  }
};
