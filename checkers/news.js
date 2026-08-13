import { XMLParser } from "fast-xml-parser";
import { postEmbed } from "../lib/discord.js";

const { DISCORD_WEBHOOK_URL_NEWS, DISCORD_NEWS_PREFIX = "Notícia nova!" } = process.env;

const FEED_URL = "https://revistaalternativa.jp/feed/";
const SOURCE_NAME = "Revista Alternativa";
const SOURCE_URL = "https://revistaalternativa.jp/";

// Cor de acento "Coral" do guia de identidade visual — diferencia notícia de vídeo.
const EMBED_COLOR = 0xf2947c;

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&#8230;/g, "…")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// O WordPress sempre acrescenta "O post [...] apareceu primeiro em [site]." no fim
// do excerpt do RSS — corta essa parte, que não interessa pra notificação.
function cleanExcerpt(rawDescription) {
  const text = stripTags(rawDescription);
  const cut = text.indexOf("O post ");
  const excerpt = cut === -1 ? text : text.slice(0, cut).trim();
  return excerpt.length > 280 ? excerpt.slice(0, 277).trim() + "…" : excerpt;
}

async function getLatestPost() {
  const res = await fetch(FEED_URL);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Revista Alternativa RSS ${res.status}: ${body}`);
  }
  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: true });
  const data = parser.parse(xml);
  const rawItems = data?.rss?.channel?.item;
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  const item = items[0];
  if (!item) return null;

  const categories = [].concat(item.category || []).filter(Boolean);

  return {
    guid: String(item.guid?.["#text"] ?? item.guid),
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    excerpt: cleanExcerpt(item.description || ""),
    category: categories[0],
  };
}

async function postNews(post) {
  const embed = {
    title: post.title,
    url: post.link,
    color: EMBED_COLOR,
    description: post.excerpt || undefined,
    author: { name: SOURCE_NAME, url: SOURCE_URL },
    footer: post.category ? { text: post.category } : undefined,
    timestamp: new Date(post.pubDate).toISOString(),
  };
  await postEmbed(DISCORD_WEBHOOK_URL_NEWS, embed, DISCORD_NEWS_PREFIX);
}

export async function check(previousState) {
  if (!DISCORD_WEBHOOK_URL_NEWS) {
    throw new Error("Variável ausente: DISCORD_WEBHOOK_URL_NEWS");
  }

  const latest = await getLatestPost();
  if (!latest) {
    return { state: previousState, message: "nenhuma notícia encontrada no feed" };
  }

  if (!previousState) {
    return {
      state: { guid: latest.guid, seenAt: new Date().toISOString() },
      message: `primeiro run — estado inicial salvo (${latest.guid}), sem notificar`,
    };
  }

  if (previousState.guid === latest.guid) {
    return { state: undefined, message: "sem notícia nova" };
  }

  await postNews(latest);
  return {
    state: { guid: latest.guid, seenAt: new Date().toISOString() },
    message: `notícia nova notificada (${latest.guid})`,
  };
}
