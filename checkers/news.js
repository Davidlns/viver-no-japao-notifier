import { XMLParser } from "fast-xml-parser";
import { postEmbed } from "../lib/discord.js";

const { DISCORD_WEBHOOK_URL_NEWS, DEEPL_API_KEY, DISCORD_NEWS_PREFIX = "Notícia nova!" } = process.env;

const FEED_URL = "https://www3.nhk.or.jp/rss/news/cat0.xml";
const SOURCE_NAME = "NHK News (traduzido)";
const SOURCE_URL = "https://www3.nhk.or.jp/news/";

// Cor de acento "Coral" do guia de identidade visual — diferencia notícia de vídeo.
const EMBED_COLOR = 0xf2947c;

function stripTags(html) {
  return (html || "").replace(/<[^>]+>/g, "").trim();
}

// DeepL API Free: 500k caracteres/mês, nunca expira. Endpoint free é separado do pago.
async function translate(texts) {
  const res = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: texts, source_lang: "JA", target_lang: "PT-BR" }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DeepL API ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.translations.map((t) => t.text);
}

async function getLatestNews() {
  const res = await fetch(FEED_URL);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`NHK RSS ${res.status}: ${body}`);
  }
  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: true });
  const data = parser.parse(xml);
  const rawItems = data?.rss?.channel?.item;
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  const item = items[0];
  if (!item) return null;

  return {
    guid: String(item.guid?.["#text"] ?? item.guid ?? item.link),
    titleJa: stripTags(item.title),
    descriptionJa: stripTags(item.description || ""),
    link: item.link,
    pubDate: item.pubDate,
  };
}

async function postNews(post) {
  const toTranslate = [post.titleJa, post.descriptionJa].filter(Boolean);
  const [titlePt, descPt] = await translate(toTranslate);

  const embed = {
    title: titlePt || post.titleJa,
    url: post.link,
    color: EMBED_COLOR,
    description: descPt || undefined,
    author: { name: SOURCE_NAME, url: SOURCE_URL },
    footer: { text: "Traduzido automaticamente do japonês (NHK News)" },
    timestamp: new Date(post.pubDate).toISOString(),
  };
  await postEmbed(DISCORD_WEBHOOK_URL_NEWS, embed, DISCORD_NEWS_PREFIX);
}

export async function check(previousState) {
  if (!DISCORD_WEBHOOK_URL_NEWS) throw new Error("Variável ausente: DISCORD_WEBHOOK_URL_NEWS");
  if (!DEEPL_API_KEY) throw new Error("Variável ausente: DEEPL_API_KEY");

  const latest = await getLatestNews();
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
