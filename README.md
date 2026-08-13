# Discord Notifier — Viver no Japão

Bot em Node.js que roda vários "checkers" (YouTube, notícias) via polling e notifica no Discord quando encontra algo novo. Deployado via GitHub Actions, rodando a cada 15min, sem servidor próprio.

## Arquitetura

```
[GitHub Actions, a cada 15min] → node index.js (orquestrador)
                                        ↓
                    ┌───────────────────┴───────────────────┐
                    ↓                                        ↓
          checkers/youtube.js                       checkers/news.js
          (YouTube Data API v3)                (RSS Revista Alternativa)
                    ↓                                        ↓
       #🎥-vídeos-novos (webhook)              #📰-notícias (webhook)
```

Cada checker é independente — se um falhar (API fora do ar, etc.), o outro continua funcionando normalmente (`Promise.allSettled`).

Sem banco de dados: o estado (último item visto de cada fonte) mora em `state.json`, versionado no próprio repositório. Como o GitHub Actions não tem disco persistente entre execuções, o workflow commita esse arquivo de volta a cada run que encontrar novidade.

## Comportamento do primeiro run

Na primeira execução de cada checker (sem entrada correspondente em `state.json`), ele **salva o estado atual sem notificar** — evita notificar conteúdo antigo quando um checker novo é adicionado.

## Setup local

```bash
npm install
cp .env.example .env
# preencha as variáveis no .env
node index.js
```

## Variáveis de ambiente

| Nome | Obrigatório | Descrição |
|---|---|---|
| `YOUTUBE_API_KEY` | sim | API Key do Google Cloud com a YouTube Data API v3 habilitada |
| `YOUTUBE_CHANNEL_ID` | sim | ID do canal do YouTube (começa com `UC...`) |
| `DISCORD_WEBHOOK_URL_VIDEOS` | sim | URL do webhook do canal `#🎥-vídeos-novos` |
| `DISCORD_WEBHOOK_URL_NEWS` | sim | URL do webhook do canal `#📰-notícias` |
| `DISCORD_MESSAGE_PREFIX` | não | Texto antes do embed de vídeo. Default: `Vídeo novo no ar!` |
| `DISCORD_NEWS_PREFIX` | não | Texto antes do embed de notícia. Default: `Notícia nova!` |
| `STATE_FILE` | não | Path do arquivo de estado. Default: `state.json` |

## Checkers

### `checkers/youtube.js`
Polling na YouTube Data API v3 (`channels` + `playlistItems`, ~2 unidades de quota por run — folgado dentro do limite gratuito de 10.000/dia mesmo rodando a cada 15min).

### `checkers/news.js`
Consome o RSS público da [Revista Alternativa](https://revistaalternativa.jp/feed/) (WordPress padrão). Sem custo de quota — é só um GET.

**Fontes descartadas nessa investigação:** NHK World Português não tem RSS público (site é um app React com API GraphQL interna, não documentada); Portal Mie está atrás de proteção Cloudflare anti-bot.

## Deploy

GitHub Actions ([`.github/workflows/notify.yml`](.github/workflows/notify.yml)), repositório público (minutos de Actions ilimitados). Secrets configurados em Settings → Secrets and variables → Actions.

## Ferramenta de administração

[`admin/discord-admin.js`](admin/discord-admin.js) — CLI separado (não faz parte do deploy) pra ações administrativas no servidor Discord via Bot API: criar canal, cor de cargo, avatar de webhook, fixar/apagar mensagem, etc. Ver `PROGRESS.md` pra lista completa de comandos.
