import fs from "node:fs/promises";
import path from "node:path";
import "dotenv/config";

const { DISCORD_BOT_TOKEN, DISCORD_GUILD_ID } = process.env;

if (!DISCORD_BOT_TOKEN) {
  console.error("DISCORD_BOT_TOKEN ausente no .env");
  process.exit(1);
}

const API = "https://discord.com/api/v10";

async function discordFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord API ${res.status} em ${path}: ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function listGuilds() {
  return discordFetch("/users/@me/guilds");
}

export function listChannels(guildId = DISCORD_GUILD_ID) {
  return discordFetch(`/guilds/${guildId}/channels`);
}

export function createChannel(name, { type = 0, parentId, guildId = DISCORD_GUILD_ID } = {}) {
  return discordFetch(`/guilds/${guildId}/channels`, {
    method: "POST",
    body: JSON.stringify({ name, type, parent_id: parentId }),
  });
}

export function renameChannel(channelId, name) {
  return discordFetch(`/channels/${channelId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function createMessage(channelId, payload) {
  return discordFetch(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function pinMessage(channelId, messageId) {
  return discordFetch(`/channels/${channelId}/pins/${messageId}`, { method: "PUT" });
}

export function setChannelTopic(channelId, topic) {
  return discordFetch(`/channels/${channelId}`, {
    method: "PATCH",
    body: JSON.stringify({ topic }),
  });
}

export function setChannelPosition(channelId, position) {
  return discordFetch(`/channels/${channelId}`, {
    method: "PATCH",
    body: JSON.stringify({ position }),
  });
}

export function listMessages(channelId, limit = 10) {
  return discordFetch(`/channels/${channelId}/messages?limit=${limit}`);
}

export function deleteMessage(channelId, messageId) {
  return discordFetch(`/channels/${channelId}/messages/${messageId}`, { method: "DELETE" });
}

export function setWebhookAvatar(webhookId, dataUri) {
  return discordFetch(`/webhooks/${webhookId}`, {
    method: "PATCH",
    body: JSON.stringify({ avatar: dataUri }),
  });
}

export function setServerIcon(dataUri, guildId = DISCORD_GUILD_ID) {
  return discordFetch(`/guilds/${guildId}`, {
    method: "PATCH",
    body: JSON.stringify({ icon: dataUri }),
  });
}

export function setServerBanner(dataUri, guildId = DISCORD_GUILD_ID) {
  return discordFetch(`/guilds/${guildId}`, {
    method: "PATCH",
    body: JSON.stringify({ banner: dataUri }),
  });
}

export function createEmoji(name, dataUri, guildId = DISCORD_GUILD_ID) {
  return discordFetch(`/guilds/${guildId}/emojis`, {
    method: "POST",
    body: JSON.stringify({ name, image: dataUri }),
  });
}

export function createWebhook(channelId, name) {
  return discordFetch(`/channels/${channelId}/webhooks`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function listRoles(guildId = DISCORD_GUILD_ID) {
  return discordFetch(`/guilds/${guildId}/roles`);
}

export function setRoleColor(roleId, color, guildId = DISCORD_GUILD_ID) {
  return discordFetch(`/guilds/${guildId}/roles/${roleId}`, {
    method: "PATCH",
    body: JSON.stringify({ color }),
  });
}

// --- CLI ---
const [, , command, ...args] = process.argv;

async function main() {
  switch (command) {
    case "list-guilds": {
      const guilds = await listGuilds();
      console.table(guilds.map((g) => ({ id: g.id, name: g.name })));
      break;
    }
    case "list-channels": {
      const channels = await listChannels();
      console.table(
        channels
          .map((c) => ({ id: c.id, name: c.name, type: c.type, parent_id: c.parent_id, position: c.position }))
          .sort((a, b) => (a.parent_id || "").localeCompare(b.parent_id || "") || a.position - b.position)
      );
      break;
    }
    case "list-roles": {
      const roles = await listRoles();
      console.table(
        roles
          .map((r) => ({ id: r.id, name: r.name, color: r.color.toString(16), position: r.position }))
          .sort((a, b) => b.position - a.position)
      );
      break;
    }
    case "create-channel": {
      const [name, parentId] = args;
      if (!name) throw new Error("Uso: create-channel <nome> [parentId]");
      const channel = await createChannel(name, { parentId });
      console.log(`Canal criado: #${channel.name} (${channel.id})`);
      break;
    }
    case "create-category": {
      const [name] = args;
      if (!name) throw new Error("Uso: create-category <nome>");
      const category = await createChannel(name, { type: 4 });
      console.log(`Categoria criada: ${category.name} (${category.id})`);
      break;
    }
    case "create-webhook": {
      const [channelId, name] = args;
      if (!channelId || !name) throw new Error("Uso: create-webhook <channelId> <nome>");
      const webhook = await createWebhook(channelId, name);
      const url = `https://discord.com/api/webhooks/${webhook.id}/${webhook.token}`;
      console.log(`Webhook criado: ${webhook.name}`);
      console.log(`URL: ${url}`);
      break;
    }
    case "rename-channel": {
      const [channelId, name] = args;
      if (!channelId || !name) throw new Error("Uso: rename-channel <channelId> <novoNome>");
      const channel = await renameChannel(channelId, name);
      console.log(`Canal renomeado: #${channel.name} (${channel.id})`);
      break;
    }
    case "list-messages": {
      const [channelId, limit] = args;
      if (!channelId) throw new Error("Uso: list-messages <channelId> [limite]");
      const messages = await listMessages(channelId, limit ? Number(limit) : 10);
      console.table(
        messages.map((m) => ({
          id: m.id,
          author: m.author?.username,
          content: (m.content || "").slice(0, 60),
        }))
      );
      break;
    }
    case "delete-message": {
      const [channelId, messageId] = args;
      if (!channelId || !messageId) throw new Error("Uso: delete-message <channelId> <messageId>");
      await deleteMessage(channelId, messageId);
      console.log(`Mensagem ${messageId} apagada.`);
      break;
    }
    case "set-webhook-avatar": {
      const [webhookId, filePath] = args;
      if (!webhookId || !filePath) throw new Error("Uso: set-webhook-avatar <webhookId> <caminhoDoArquivo>");
      const ext = path.extname(filePath).slice(1).toLowerCase();
      const mime = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp" }[ext];
      if (!mime) throw new Error(`Extensão não suportada: .${ext}`);
      const buffer = await fs.readFile(filePath);
      const dataUri = `data:${mime};base64,${buffer.toString("base64")}`;
      await setWebhookAvatar(webhookId, dataUri);
      console.log(`Avatar do webhook ${webhookId} atualizado.`);
      break;
    }
    case "set-role-color": {
      const [roleId, hex] = args;
      if (!roleId || !hex) throw new Error("Uso: set-role-color <roleId> <hexSemAlmofadinha>");
      const color = parseInt(hex.replace(/^#/, ""), 16);
      const role = await setRoleColor(roleId, color);
      console.log(`Cargo ${role.name} -> #${hex.replace(/^#/, "")}`);
      break;
    }
    case "create-emoji": {
      const [name, filePath] = args;
      if (!name || !filePath) throw new Error("Uso: create-emoji <nome> <caminhoDoArquivo>");
      const ext = path.extname(filePath).slice(1).toLowerCase();
      const mime = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif" }[ext];
      if (!mime) throw new Error(`Extensão não suportada: .${ext}`);
      const buffer = await fs.readFile(filePath);
      const dataUri = `data:${mime};base64,${buffer.toString("base64")}`;
      const emoji = await createEmoji(name, dataUri);
      console.log(`Emoji criado: :${emoji.name}: (${emoji.id})`);
      break;
    }
    case "set-position": {
      const [channelId, position] = args;
      if (!channelId || position === undefined) throw new Error("Uso: set-position <channelId> <posição>");
      await setChannelPosition(channelId, Number(position));
      console.log(`Posição de ${channelId} definida para ${position}`);
      break;
    }
    default:
      console.log(
        "Comandos: list-guilds, list-channels, list-roles, create-channel <nome> [parentId], rename-channel <id> <nome>, create-webhook <channelId> <nome>, set-position <channelId> <posição>"
      );
  }
}

if (command) {
  main().catch((err) => {
    console.error(`[erro] ${err.message}`);
    process.exit(1);
  });
}
