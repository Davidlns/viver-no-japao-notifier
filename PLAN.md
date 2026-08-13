# Plano — Discord "Viver no Japão - Comunidade"

Servidor do amigo. Sprint 1 focado em: (1) bot de notificações, (2) polimento visual do servidor.

## Escopo do Sprint 1

### O que o amigo pediu (texto original resumido)
1. Deixar o servidor mais bonito / com mais cores. Manter o que já existe. Adicionar banner/GIF ou algo em cada canal, mensagens fixadas.
2. Uma área só de notícias, com bot puxando de NHK / Portal Mie / imigração automaticamente.

### Decisões travadas
- **Idioma das notícias:** português.
- **Canal (revisado 2026-08-13):** dois canais, não um só. `#🎥-vídeos-novos` (destaque, topo da categoria `INFORMAÇÕES`) recebe só notificação de vídeo novo do YouTube — é a prioridade pros membros acompanharem. `#📰-notícias` recebe as fontes de notícia (NHK, Portal Mie). Categoria `INFORMAÇÕES` posicionada no topo do servidor (logo abaixo de Canais de Texto/Voz padrão), pra ficar em destaque.
- **Boost do servidor:** assumir Nível 0. Trabalhar só com recursos gratuitos.
- **Primeiro run do bot:** salva estado sem notificar (evita spam de vídeos/notícias antigas).
- **Arquitetura:** um repo, um processo Node, múltiplos "checkers" rodando no mesmo cron.
- **"Banner/GIF em cada canal":** Discord não tem banner nativo por canal (só banner de servidor, via boost). Equivalente funcional escolhido: **mensagem fixada com imagem/GIF no topo de cada canal**, ver item (d) do Balde 2.
- **Canal do YouTube monitorado:** `@brunotesserjapao` ("Bruno Tesser") → Channel ID `UC1J-WP24znzMGxPYtB_HvUw`.
- **Automação de admin via Discord Bot API (mudança de rumo, 2026-08-12):** o Balde 2 (config visual do servidor) deixa de ser 100% manual. Vamos criar uma **Discord Application + Bot** própria (separada do webhook do notifier) só pra rodar ações administrativas via código: criar/renomear canal, cor de cargo, pin de mensagem, upload de emoji. Webhook continua existindo só pra postar as notificações do bot de notícias/YouTube — são credenciais e propósitos diferentes, não se substituem.
  - **Trade-off aceito:** Bot Token é uma credencial mais poderosa que o webhook (pode fazer qualquer ação que a permissão concedida permitir). Mitigação: permissões concedidas ao bot ficam restritas ao necessário (Manage Channels, Manage Roles, Manage Messages, Manage Emojis and Stickers, Manage Guild — sem `Administrator`), script roda só localmente sob comando explícito, nunca fica hospedado 24/7.
  - Ações **destrutivas ou de alto impacto** (deletar canal, mudar ícone/nome do servidor) continuam pedindo confirmação explícita antes de executar, mesmo com a automação pronta. Ações aditivas/reversíveis (criar canal, pin, cor de cargo) podem rodar direto do comando do user, dado que ele pediu explicitamente esse fluxo.

### Princípios do sprint (dados pelo user no início)
- Terminar o setup do bot em menos de ~40 minutos — priorizar simplicidade sobre robustez enterprise.
- Código limpo, comentado só em pontos não óbvios — sem over-engineering, sem abstração prematura.
- Sinalizar trade-offs de decisão de design em vez de decidir calado.
- Passos manuais feitos um de cada vez, com confirmação antes do próximo.

## Separação por natureza do trabalho

### Balde 1 — Bot (código)
| # | Item | Status |
|---|---|---|
| 1 | YouTube notifier (polling → embed no Discord) | Código pronto, aguardando setup |
| 2 | Refatorar mensagem YouTube pra embed colorido | Pendente |
| 3 | Refatorar repo pra múltiplos checkers | Pendente |
| 4 | Checker NHK World PT (RSS `www3.nhk.or.jp/nhkworld/pt/rss/index.xml`) | Pendente |
| 5 | Checker Portal Mie (RSS se existir, senão scraping leve) | Pendente |
| 6 | Deploy (Railway ou Render) com cron a cada 15min | Pendente |

### Balde 2 — Config do servidor Discord (sem código)
| # | Item | Depende de |
|---|---|---|
| a | Criar canal `📰-notícias` | Permissão Gerenciar Canais ✅ |
| b | Renomear canais existentes adicionando emoji no nome | Permissão Gerenciar Canais ✅ |
| c | Definir paleta de cores dos cargos | Permissão Gerenciar Cargos ✅ |
| d | Escrever mensagens fixadas por canal (usando embeds via webhook) | Permissão Gerenciar Mensagens ✅ |
| e | Upload de ícone/banner do servidor | Permissão Gerenciar Servidor ✅ + Boost pra banner |
| f | Upload de emojis customizados | Permissão Gerenciar Emojis ✅ |
| g | Paleta geral de cores/tema do servidor (mais cor, menos preto e branco) | Depende de c, e, f combinados |

### Balde 3 — Bots de terceiros (backlog, fora do sprint 1)
- **Sesh / Apollo** — agenda de eventos da comunidade
- **Statbot** — contadores dinâmicos (X membros online)
- **Carl-bot / YAGPDB** — welcome message automática, reaction roles (usuário clica em emoji pra pegar cargo)

## Fontes de notícias — investigação e decisão final (2026-08-13)

| Fonte | Resultado da investigação |
|---|---|
| NHK World Portuguese | ❌ **Sem RSS público.** Site é um app React que busca conteúdo via API GraphQL interna, não documentada. Reverse engineering possível mas desproporcional pro escopo. |
| Portal Mie | ❌ **Bloqueado por Cloudflare** (`Cf-Mitigated: challenge`, desafio anti-bot ativo). Contornar isso é bypass de anti-bot — fora dos limites do que faço, independente de viabilidade técnica. |
| Alternativa Online (`alternativa.co.jp`) | ❌ Feed em `/feed/` devolve HTML, não XML — RSS quebrado/desativado. |
| IPC Digital (`ipcdigital.com`) | ❌ Domínio ativo mas conteúdo sem relação (blog de tecnologia genérico). |
| Revista Alternativa (`revistaalternativa.jp`) | ⚠️ RSS válido, mas é revista de **lifestyle** (beleza, culinária, moda) — não notícia dura. Testada e descartada depois que o user notou que o conteúdo não batia com "notícia". |
| RPJNEWS, IPC Digital, International Press (edição PT) | ❌ Feeds quebrados / domínios mortos ou repassados / edição PT fora do ar |
| **NHK doméstica** (`www3.nhk.or.jp/rss/news/cat0.xml`) | ✅ **RSS válido, notícia dura de verdade** — mas em japonês |
| Imigração Japão (出入国在留管理庁) | Não investigado ainda — adiado pra sprint 2 se houver demanda. |

**Decisão final (2026-08-13):** checker de notícias consome a **NHK doméstica** (japonês) e traduz título+descrição via **DeepL API Free** (500 mil caracteres/mês, nunca expira) antes de postar no Discord. Trade-off aceito: mais uma credencial no setup, em troca de notícia dura de verdade em vez de conteúdo de lifestyle.

## Passos manuais que dependem do user

- [x] Discord: dono concedeu permissões (Webhooks, Canais, Mensagens, Emojis, Cargos, Servidor)
- [x] **YouTube:** Channel ID achado programaticamente — `UC1J-WP24znzMGxPYtB_HvUw`
- [ ] **Discord:** criar canal `📰-notícias` e webhook nele — *não confirmado, ver PROGRESS.md*
- [ ] **Google Cloud:** criar projeto + ativar YouTube Data API v3 + gerar API Key — *em andamento*
- [ ] **Local:** preencher `.env` e rodar `node index.js` pra validar
- [ ] **Deploy:** escolher Railway/Render, conectar GitHub, configurar cron

Progresso detalhado, passo a passo, fica em [`PROGRESS.md`](./PROGRESS.md) — atualizado a cada etapa concluída.

## Arquitetura (implementada, 2026-08-13)

```
index.js              → orquestrador: chama todos os checkers em paralelo (Promise.allSettled)
checkers/
  youtube.js          → polling YouTube Data API v3
  news.js             → polling RSS da Revista Alternativa
lib/
  discord.js          → postEmbed(webhookUrl, embed, content)
  state.js            → loadState/saveState genéricos
state.json            → { youtube: {videoId, seenAt}, news: {guid, seenAt} }

admin/                → scripts de administração via Discord Bot API (rodados sob demanda, não em cron)
  discord-admin.js     → CLI com fetch puro: create-channel, create-category, rename-channel,
                          set-position, set-role-color, create-webhook, set-webhook-avatar,
                          list-messages, delete-message, list-guilds/channels/roles
```

Um cron único (GitHub Actions, `.github/workflows/notify.yml`) chama `node index.js`; cada checker é independente. O `admin/` é separado — roda local, sob comando pontual, nunca em cron.

## Custos previstos
- **YouTube API:** ~2 unidades de quota por run. Limite gratuito: 10.000/dia. Rodar de 15 em 15min = 192/dia. Folgado.
- **Hospedagem:** Railway free tier (500h/mês) ou Render free (cron nativo). Bot roda por segundos e dorme — free tier resolve.
- **Discord:** webhooks são gratuitos e ilimitados.
