import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const {
  YOUTUBE_API_KEY,
  YOUTUBE_CHANNEL_ID,
  DISCORD_WEBHOOK_URL_VIDEOS,
  DISCORD_MESSAGE_PREFIX = "Vídeo novo no ar!",
  STATE_FILE,
} = process.env;

const STATE_PATH = path.resolve(__dirname, STATE_FILE || "last_video.json");

function requireEnv() {
  const missing = [];
  if (!YOUTUBE_API_KEY) missing.push("YOUTUBE_API_KEY");
  if (!YOUTUBE_CHANNEL_ID) missing.push("YOUTUBE_CHANNEL_ID");
  if (!DISCORD_WEBHOOK_URL_VIDEOS) missing.push("DISCORD_WEBHOOK_URL_VIDEOS");
  if (missing.length) {
    throw new Error(`Variáveis de ambiente ausentes: ${missing.join(", ")}`);
  }
}

async function loadState() {
  try {
    const raw = await fs.readFile(STATE_PATH, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

async function saveState(state) {
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

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

// Cor de acento "Sakura" do guia de identidade visual (#F2A6C0).
const EMBED_COLOR = 0xf2a6c0;

async function postToDiscord(video, channelAvatarUrl) {
  const link = `https://youtu.be/${video.videoId}`;

  const payload = {
    content: DISCORD_MESSAGE_PREFIX,
    embeds: [
      {
        title: video.title,
        url: link,
        color: EMBED_COLOR,
        image: video.thumbnailUrl ? { url: video.thumbnailUrl } : undefined,
        author: {
          name: video.channelTitle,
          url: `https://www.youtube.com/channel/${YOUTUBE_CHANNEL_ID}`,
          icon_url: channelAvatarUrl,
        },
        timestamp: video.publishedAt,
      },
    ],
  };

  const res = await fetch(DISCORD_WEBHOOK_URL_VIDEOS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord webhook ${res.status}: ${body}`);
  }
}

async function main() {
  requireEnv();
  console.log(`[${new Date().toISOString()}] Iniciando verificação...`);

  const { uploadsPlaylistId, channelAvatarUrl } = await getChannelInfo(YOUTUBE_CHANNEL_ID);
  const latest = await getLatestUpload(uploadsPlaylistId);
  if (!latest) {
    console.log("Nenhum vídeo encontrado no canal.");
    return;
  }
  console.log(`Último upload: ${latest.videoId} — "${latest.title}"`);

  const state = await loadState();

  if (!state) {
    // Primeiro run: salva o estado atual sem notificar (evita spammar vídeos antigos).
    await saveState({ videoId: latest.videoId, seenAt: new Date().toISOString() });
    console.log("Primeiro run: estado inicial salvo, sem enviar notificação.");
    return;
  }

  if (state.videoId === latest.videoId) {
    console.log("Sem vídeo novo.");
    return;
  }

  console.log("Vídeo novo detectado — enviando pro Discord...");
  await postToDiscord(latest, channelAvatarUrl);
  await saveState({ videoId: latest.videoId, seenAt: new Date().toISOString() });
  console.log("Notificação enviada e estado atualizado.");
}

main().catch((err) => {
  console.error(`[erro] ${err.message}`);
  process.exit(1);
});
