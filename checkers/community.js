import { postEmbed } from "../lib/discord.js";

const { YOUTUBE_CHANNEL_ID, DISCORD_WEBHOOK_URL_COMMUNITY, DISCORD_COMMUNITY_PREFIX = "Post novo na comunidade!" } =
  process.env;

// Cor de acento "Fuji" do guia de identidade visual — terceiro tipo de conteúdo, distinto de vídeo/notícia.
const EMBED_COLOR = 0xc9a6de;

// Sem API oficial pra Community Post do YouTube. Extrai do JSON que a própria página
// embute no HTML público (ytInitialData) — mesma técnica usada por diversos projetos
// open-source. Frágil a mudanças de estrutura da página, mas sem contornar proteção nenhuma.
function findFirst(obj, key) {
  if (!obj || typeof obj !== "object") return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findFirst(item, key);
      if (found) return found;
    }
    return null;
  }
  if (obj[key] !== undefined) return obj[key];
  for (const k in obj) {
    const found = findFirst(obj[k], key);
    if (found) return found;
  }
  return null;
}

async function getLatestPost() {
  const url = `https://www.youtube.com/channel/${YOUTUBE_CHANNEL_ID}/community`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });
  if (!res.ok) {
    throw new Error(`YouTube community page ${res.status}`);
  }
  const html = await res.text();
  const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!match) {
    throw new Error("ytInitialData não encontrado na página — estrutura pode ter mudado");
  }
  const data = JSON.parse(match[1]);

  const thread = findFirst(data, "backstagePostThreadRenderer");
  const post = thread?.post?.backstagePostRenderer;
  if (!post) return null;

  const text = (post.contentText?.runs || []).map((r) => r.text).join("");
  const thumbnails = post.backstageAttachment?.backstageImageRenderer?.image?.thumbnails;
  const imageUrl = thumbnails?.[thumbnails.length - 1]?.url;
  const publishedText = post.publishedTimeText?.runs?.[0]?.text;

  return {
    postId: post.postId,
    text,
    imageUrl,
    publishedText,
    link: `https://www.youtube.com/post/${post.postId}`,
  };
}

async function postCommunityUpdate(post) {
  const embed = {
    description: post.text.length > 3800 ? post.text.slice(0, 3797) + "…" : post.text,
    url: post.link,
    color: EMBED_COLOR,
    image: post.imageUrl ? { url: post.imageUrl } : undefined,
    author: { name: "Bruno Tesser · Comunidade YouTube", url: post.link },
    footer: post.publishedText ? { text: `Publicado ${post.publishedText}` } : undefined,
  };
  await postEmbed(DISCORD_WEBHOOK_URL_COMMUNITY, embed, DISCORD_COMMUNITY_PREFIX);
}

export async function check(previousState) {
  if (!YOUTUBE_CHANNEL_ID) throw new Error("Variável ausente: YOUTUBE_CHANNEL_ID");
  if (!DISCORD_WEBHOOK_URL_COMMUNITY) throw new Error("Variável ausente: DISCORD_WEBHOOK_URL_COMMUNITY");

  const latest = await getLatestPost();
  if (!latest) {
    return { state: previousState, message: "nenhum post de comunidade encontrado" };
  }

  if (!previousState) {
    return {
      state: { postId: latest.postId, seenAt: new Date().toISOString() },
      message: `primeiro run — estado inicial salvo (${latest.postId}), sem notificar`,
    };
  }

  if (previousState.postId === latest.postId) {
    return { state: undefined, message: "sem post novo" };
  }

  await postCommunityUpdate(latest);
  return {
    state: { postId: latest.postId, seenAt: new Date().toISOString() },
    message: `post novo notificado (${latest.postId})`,
  };
}
