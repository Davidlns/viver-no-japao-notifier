# Discord Notifier — Viver no Japão

Bot em Node.js que roda vários "checkers" do canal do YouTube via polling e notifica no Discord quando encontra algo novo. Deployado via GitHub Actions, rodando a cada 15min, sem servidor próprio.

## Arquitetura

```
[GitHub Actions, a cada 15min] → node index.js (orquestrador)
                                        ↓
                    ┌───────────────────┴───────────────────┐
                    ↓                                        ↓
          checkers/youtube.js                    checkers/community.js
          (YouTube Data API v3)              (aba Comunidade, scraping)
                    ↓                                        ↓
    #「🎥」vídeos-novos (webhook)         #「📮」comunidade-yt (webhook)
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
| `DISCORD_WEBHOOK_URL_VIDEOS` | sim | URL do webhook do canal `#「🎥」vídeos-novos` |
| `DISCORD_WEBHOOK_URL_COMMUNITY` | sim | URL do webhook do canal `#「📮」comunidade-yt` |
| `DISCORD_MESSAGE_PREFIX` | não | Texto antes do embed de vídeo. Default: `Vídeo novo no ar!` |
| `DISCORD_COMMUNITY_PREFIX` | não | Texto antes do embed de post. Default: `Post novo na comunidade!` |
| `STATE_FILE` | não | Path do arquivo de estado. Default: `state.json` |

## Checkers

### `checkers/youtube.js`
Polling na YouTube Data API v3 (`channels` + `playlistItems`, ~2 unidades de quota por run — folgado dentro do limite gratuito de 10.000/dia mesmo rodando a cada 15min).

### `checkers/community.js`
Sem API oficial pra Community Post do YouTube — extrai do `ytInitialData` embutido no HTML público da aba Comunidade do canal (`/channel/{id}/community`). Frágil a mudanças de estrutura de página, mas não contorna nenhuma proteção anti-bot.

A dedup guarda os últimos 20 IDs vistos (`seenPostIds`) em vez de só o último: o feed dessa página não é estável entre requisições, e comparar só com o último ID causava notificação duplicada.

## Checker de notícias (removido em 15/09/2026)

Existiu um `checkers/news.js` que consumia o RSS da NHK doméstica e traduzia via DeepL. Foi removido porque:
- O feed da NHK (`www3.nhk.or.jp/rss/news/cat0.xml`) parou de atualizar em 08/08/2026 (confirmado pelo header `Last-Modified` do servidor deles)
- O canal `#📰-notícias` foi apagado do servidor e o webhook morreu (404)

Fontes de notícia investigadas e descartadas na época: NHK World PT (sem RSS, API GraphQL interna), Portal Mie (Cloudflare anti-bot), Revista Alternativa (RSS OK mas é revista de lifestyle, não notícia dura), Alternativa Online / IPC Digital / RPJNEWS / International Press PT (feeds quebrados ou fora do ar). Se um dia voltar o assunto, o histórico está no `PROGRESS.md`.

## Deploy

GitHub Actions ([`.github/workflows/notify.yml`](.github/workflows/notify.yml)), repositório público (minutos de Actions ilimitados). Secrets configurados em Settings → Secrets and variables → Actions.

## Ferramenta de administração

[`admin/discord-admin.js`](admin/discord-admin.js) — CLI separado (não faz parte do deploy) pra ações administrativas no servidor Discord via Bot API: criar canal, cor de cargo, avatar de webhook, fixar/apagar mensagem, etc. Ver `PROGRESS.md` pra lista completa de comandos.
