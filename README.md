# YouTube → Discord Notifier

Bot em Node.js que faz polling no YouTube Data API v3 e, quando detecta um vídeo novo no seu canal, dispara uma mensagem num webhook do Discord.

## Arquitetura

```
[cron a cada 15min] → node index.js → YouTube API
                                    ↓
                        (compara com last_video.json)
                                    ↓
                          Discord Webhook → canal
```

Sem banco de dados: o estado (último `videoId` visto) mora num arquivo `last_video.json`.

## Comportamento do primeiro run

Na primeira execução (sem `last_video.json`), ele **salva o estado atual sem enviar notificação**. Isso evita spammar quando o bot sobe pela primeira vez. Se quiser forçar uma notificação de teste, apague `last_video.json` **depois** de já ter um vídeo novo mais recente que o salvo — ou edite o arquivo à mão colocando um `videoId` antigo.

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
| `YOUTUBE_CHANNEL_ID` | sim | ID do canal (começa com `UC...`) |
| `DISCORD_WEBHOOK_URL_VIDEOS` | sim | URL do webhook do canal `#🎥-vídeos-novos` |
| `DISCORD_WEBHOOK_URL_NEWS` | não (ainda) | URL do webhook do canal `#📰-notícias`, reservado pros checkers de notícias (NHK/Portal Mie) |
| `DISCORD_MESSAGE_PREFIX` | não | Texto antes do link. Default: `Vídeo novo no ar!` |
| `STATE_FILE` | não | Path do arquivo de estado. Default: `last_video.json` |

## Custo de quota do YouTube API

Cada execução consome **~2 unidades** de quota (1 chamada em `channels`, 1 em `playlistItems`). O free tier são 10.000 unidades/dia, então rodar a cada 15min (96×/dia) gasta ~192 unidades — folgado.

*Otimização futura*: dá pra cachear o `uploadsPlaylistId` no `last_video.json` e cair pra 1 unidade por run.

## Deploy

Ver seção correspondente no fluxo do setup — recomendado Railway ou Render com um cron scheduler.
