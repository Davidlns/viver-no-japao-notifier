import { postEmbed } from "../lib/discord.js";

const { YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID, DISCORD_WEBHOOK_URL_VIDEOS, DISCORD_MESSAGE_PREFIX = "Vídeo novo no ar!" } =
  process.env;

// Cor de acento "Sakura" do guia de identidade visual.
const EMBED_COLOR = 0xf2a6c0;

// Pega o ID da playlist de uploads do canal (é um "UU..." derivado do "UC...")
// e o avatar do canal, numa chamada só (mesmo custo de quota, part extra é de graça).
async function getChannelInfo(channelId) {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "contentDetails,snippet");
  url.searchParams.set("id", channelId);
  url.searchParams.set("key", YOUTUBE_API_KEY);

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube channels API ${res.status}: ${body}`);
  }
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) throw new Error(`Canal não encontrado: ${channelId}`);
  return {
    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
    channelAvatarUrl: item.snippet.thumbnails?.default?.url,
  };
}

async function getLatestUpload(playlistId) {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("playlistId", playlistId);
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("key", YOUTUBE_API_KEY);

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube playlistItems API ${res.status}: ${body}`);
  }
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) return null;

  const thumb = item.snippet.thumbnails || {};
  return {
    videoId: item.contentDetails.videoId,
    title: item.snippet.title,
    publishedAt: item.contentDetails.videoPublishedAt || item.snippet.publishedAt,
    channelTitle: item.snippet.channelTitle,
    thumbnailUrl: thumb.maxres?.url || thumb.high?.url || thumb.medium?.url || thumb.default?.url,
  };
}

async function postVideo(video, channelAvatarUrl) {
  const embed = {
    title: video.title,
    url: `https://youtu.be/${video.videoId}`,
    color: EMBED_COLOR,
    image: video.thumbnailUrl ? { url: video.thumbnailUrl } : undefined,
    author: {
      name: video.channelTitle,
      url: `https://www.youtube.com/channel/${YOUTUBE_CHANNEL_ID}`,
      icon_url: channelAvatarUrl,
    },
    timestamp: video.publishedAt,
  };
  await postEmbed(DISCORD_WEBHOOK_URL_VIDEOS, embed, DISCORD_MESSAGE_PREFIX);
}

export async function check(previousState) {
  if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID || !DISCORD_WEBHOOK_URL_VIDEOS) {
    throw new Error(
      "Variáveis ausentes: YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID ou DISCORD_WEBHOOK_URL_VIDEOS"
    );
  }

  const { uploadsPlaylistId, channelAvatarUrl } = await getChannelInfo(YOUTUBE_CHANNEL_ID);
  const latest = await getLatestUpload(uploadsPlaylistId);
  if (!latest) {
    return { state: previousState, message: "nenhum vídeo encontrado no canal" };
  }

  if (!previousState) {
    return {
      state: { videoId: latest.videoId, seenAt: new Date().toISOString() },
      message: `primeiro run — estado inicial salvo (${latest.videoId}), sem notificar`,
    };
  }

  if (previousState.videoId === latest.videoId) {
    return { state: undefined, message: "sem vídeo novo" };
  }

  await postVideo(latest, channelAvatarUrl);
  return {
    state: { videoId: latest.videoId, seenAt: new Date().toISOString() },
    message: `vídeo novo notificado (${latest.videoId})`,
  };
}
