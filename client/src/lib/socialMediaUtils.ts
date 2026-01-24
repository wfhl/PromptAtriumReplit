export interface SocialContext {
  platform: 'twitter' | 'reddit' | 'youtube' | 'instagram' | 'tiktok' | 'web' | 'unknown';
  originalUrl?: string;
  title?: string;
  text?: string;
  author?: string;
  mediaUrls: string[];
  html?: string;
  thumbnail?: string;
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

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=))([\w-]{10,12})\b/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;

      if (videoId) {
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
          mediaUrls: [thumb],
          thumbnail: thumb,
          text: title
        };
      }
    }

    if (url.includes('instagram.com')) {
      const cleanUrl = url.split('?')[0];
      const idMatch = cleanUrl.match(/(?:instagr\.am|instagram\.com)\/(?:p|reel|tv|stories)\/([a-zA-Z0-9_-]+)/);
      const videoId = idMatch ? idMatch[1] : null;

      if (videoId) {
        let title = "Instagram Post";
        let author = "Instagram User";
        let thumb = undefined;

        try {
          const meta = await fetchNoEmbed(cleanUrl);
          if (meta && meta.title !== "Instagram" && !meta.title?.includes("Login")) {
            title = meta.title || title;
            author = meta.author_name || author;
            thumb = meta.thumbnail_url;
          }
        } catch {}

        return {
          ...baseContext,
          platform: 'instagram',
          title,
          author,
          mediaUrls: thumb ? [thumb] : [],
          thumbnail: thumb,
          text: title
        };
      }
    }

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
                thumbnail: mediaUrls[0],
              };
            }
          }
        } catch {}
      }
    }

    if (url.includes('reddit.com') || url.includes('redd.it')) {
      let title = "Reddit Post";
      let author = "Reddit User";
      let text = "";
      let mediaUrls: string[] = [];

      try {
        let cleanUrl = url.split('?')[0].replace(/\/$/, '');
        if (!cleanUrl.endsWith('.json')) {
          cleanUrl += '.json';
        }

        const resp = await fetch(cleanUrl);
        if (resp.ok) {
          const data = await resp.json();
          const post = data[0]?.data?.children?.[0]?.data;

          if (post) {
            title = post.title || title;
            author = post.author ? `u/${post.author}` : author;
            text = post.selftext || "";

            if (post.is_gallery && post.media_metadata) {
              const ids = post.gallery_data?.items?.map((item: any) => item.media_id) || Object.keys(post.media_metadata);
              for (const id of ids) {
                const meta = post.media_metadata[id];
                if (meta?.s?.u) {
                  mediaUrls.push(meta.s.u.replace(/&amp;/g, '&'));
                } else if (meta?.s?.gif) {
                  mediaUrls.push(meta.s.gif.replace(/&amp;/g, '&'));
                }
              }
            } else if (post.is_video && post.media?.reddit_video?.fallback_url) {
              mediaUrls.push(post.media.reddit_video.fallback_url.split('?')[0]);
            } else {
              const linkUrl = post.url_overridden_by_dest || post.url;
              if (linkUrl) {
                if (linkUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                  mediaUrls.push(linkUrl);
                } else if (post.preview?.images?.[0]?.source?.url) {
                  mediaUrls.push(post.preview.images[0].source.url.replace(/&amp;/g, '&'));
                }
              }
            }
          }
        }
      } catch {}

      return {
        ...baseContext,
        platform: 'reddit',
        title,
        author,
        text,
        mediaUrls,
        thumbnail: mediaUrls[0],
      };
    }

    if (url.includes('tiktok.com')) {
      let title = "TikTok Video";
      let author = "TikTok User";
      
      try {
        const meta = await fetchNoEmbed(url);
        if (meta) {
          title = meta.title || title;
          author = meta.author_name || author;
        }
      } catch {}

      return {
        ...baseContext,
        platform: 'tiktok',
        title,
        author,
        mediaUrls: [],
        text: title
      };
    }

    const meta = await fetchNoEmbed(url);
    if (meta) {
      return {
        ...baseContext,
        platform: 'web',
        title: meta.title,
        author: meta.author_name,
        html: meta.html,
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
