# Progress Log

Atualizado a cada passo concluído. Ver plano completo em [`PLAN.md`](./PLAN.md).

## Status geral
**Fase atual:** Tasks #1, #2, #3, #6, #8 concluídas. Bot multi-checker (YouTube + notícias da Revista Alternativa) rodando em produção via GitHub Actions. Falta: cor do cargo Equipe (bloqueado, aguardando dono do servidor), emoji nos canais restantes (bloqueado, categorias privadas), mensagens fixadas, emojis customizados.

## Checklist — Refactor multi-checker + checker de notícias (Tasks #3/#4/#5)
- [x] Investigação de fontes: NHK sem RSS (API GraphQL não documentada), Portal Mie bloqueado por Cloudflare (não contornado, é linha rígida), Alternativa Online com feed quebrado, IPC Digital domínio errado
- [x] Fonte escolhida: **Revista Alternativa** (`revistaalternativa.jp/feed/`) — RSS WordPress padrão válido, `pt-BR`
- [x] Dependência `fast-xml-parser` adicionada (parsing de RSS)
- [x] `lib/state.js` e `lib/discord.js` criados (helpers compartilhados)
- [x] `checkers/youtube.js` — lógica movida de `index.js`, mesma interface `check(previousState)`
- [x] `checkers/news.js` — novo checker: busca RSS, limpa o excerpt (remove boilerplate "O post... apareceu primeiro em..." que o WordPress injeta), extrai categoria, cor coral (`#F2947C`) diferenciando de vídeo (sakura `#F2A6C0`)
- [x] `index.js` reescrito como orquestrador — roda os 2 checkers com `Promise.allSettled` (falha de um não derruba o outro)
- [x] Migração de estado: `last_video.json` → `state.json` com chaves por fonte (`youtube`, `news`)
- [x] Teste local completo: primeiro run do checker de notícia (sem notificar) + teste de notícia nova (postou certo, com categoria no rodapé)
- [x] Workflow do GitHub Actions atualizado: novo nome (`Notifier`), env `DISCORD_WEBHOOK_URL_NEWS`, commit-back de `state.json` em vez de `last_video.json`
- [x] Secret `DISCORD_WEBHOOK_URL_NEWS` adicionado no GitHub Actions
- [x] README.md reescrito refletindo a arquitetura nova

**Tasks #3 e #4 concluídas**. **Task #5 (Portal Mie) abandonada** — bloqueio de Cloudflare não é contornável dentro das minhas regras.

## Checklist — Pivô de fonte: Revista Alternativa → NHK + DeepL (2026-08-13, mesmo dia)
- [x] User notou que o post de teste (coluna "Imagem", moda/estilo) não parecia notícia — investigação mais a fundo
- [x] Categorias reais da Revista Alternativa levantadas via API REST do WordPress: é revista de lifestyle (Beleza, Saúde, Culinária dominam), não notícia dura
- [x] Busca por fonte de notícia dura em português: International Press (edição PT fora do ar, só ES ativo em internationalpress.jp), RPJNEWS (feed 404), IPC Digital (domínio repassado, sem relação) — todas descartadas
- [x] NHK doméstica (`www3.nhk.or.jp/rss/news/cat0.xml`) confirmada: RSS real, notícia dura, japonês
- [x] Confirmado tier gratuito real da DeepL (500k chars/mês, nunca expira) antes de pedir pro user criar conta
- [x] `checkers/news.js` reescrito: busca NHK, traduz título+descrição via DeepL API Free, posta embed com aviso de tradução automática no rodapé
- [x] `DEEPL_API_KEY` — user criou conta e colou no `.env`
- [x] `state.json` resetado (formato de guid mudou de fonte)
- [x] Teste local completo: primeiro run + notícia nova traduzida postada com sucesso
- [x] Workflow do GitHub Actions atualizado com `DEEPL_API_KEY`, secret criado
- [x] README/PLAN atualizados

## Checklist — Reestruturação de canais (2026-08-13)
- [x] Canal `#🎥-vídeos-novos` criado dentro de `INFORMAÇÕES` (id `1537298557856649286`)
- [x] Categoria `INFORMAÇÕES` reposicionada pro topo (posição 0, acima de tudo exceto Canais de Texto/Voz padrão — user confirmou que está ótimo assim)
- [x] Dentro da categoria: `#🎥-vídeos-novos` antes de `#📰-notícias` (destaque)
- [x] Post de teste antigo apagado de `#📰-notícias` (mensagem `1537297644282449970`, via `admin/discord-admin.js delete-message`)
- [x] Webhook novo criado pro canal de vídeos (`DISCORD_WEBHOOK_URL_VIDEOS`)
- [x] Webhook antigo renomeado na intenção pra `DISCORD_WEBHOOK_URL_NEWS` (reservado pros checkers de notícia futuros)
- [x] `index.js` atualizado pra usar `DISCORD_WEBHOOK_URL_VIDEOS`
- [x] `.env`, `.env.example`, `README.md` atualizados com as novas variáveis
- [x] Reteste completo: vídeo simulado postou corretamente em `#🎥-vídeos-novos`
- [x] Estado (`last_video.json`) resetado pro ID real após os testes

**Nota técnica:** tentativa de reordenar outras categorias (`Comece aqui`, `Por momento`, etc.) deu 403 — são categorias privadas com cadeado, bot não tem acesso de visualização nelas. Não era necessário mesmo; a posição final ficou boa sem mexer nelas.

## Checklist — Deploy (Task #6): GitHub Actions
- [x] Correção de custo descoberta via pesquisa: Railway/Render não são mais gratuitos pra cron em 2026. Escolhido GitHub Actions (genuinamente grátis em repo público)
- [x] `last_video.json` removido do `.gitignore` de propósito — precisa ser versionado pro workflow persistir estado entre execuções (sem dado sensível)
- [x] `.github/workflows/notify.yml` criado: roda a cada 15min (`*/15 * * * *`) + `workflow_dispatch` pra disparo manual, commita `last_video.json` de volta se mudou
- [x] Repositório público criado: [github.com/Davidlns/viver-no-japao-notifier](https://github.com/Davidlns/viver-no-japao-notifier)
- [x] Scan de segurança: nenhum segredo vazado nos arquivos versionados (`.env` corretamente ignorado)
- [x] Secrets configurados no GitHub Actions via `gh secret set`, direto do `.env` local, sem expor no chat: `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID`, `DISCORD_WEBHOOK_URL_VIDEOS` (só o que o `index.js` precisa — token de admin fica só local)
- [x] Troubleshooting: workflow não indexou no primeiro push (comum em repo recém-criado); resolvido com um commit que efetivamente modifica o arquivo do workflow, forçando o GitHub a reprocessar
- [x] Teste manual (`workflow_dispatch`) rodou com sucesso: detectou o vídeo, comparou estado, corretamente disse "sem vídeo novo", sem precisar commitar

**Task #6 (Deploy com cron): CONCLUÍDA.** Bot roda sozinho a cada 15min, sem depender do PC ligado.

## Checklist — Identidade visual "Sakura Pastel" (Balde 2)
- [x] Style guide aprovado pelo user (artefato: paleta, cargos, convenção de canais)
- [x] Cor aplicada: `Senpai` → `#F2947C`, `Membro` → `#EFA0C3`, `Visitante` → `#C9A6DE`
- [ ] Cor `Equipe` → `#C6547C` — **bloqueado**: cargo `Equipe` está acima do próprio David na hierarquia (cadeado no Discord), nem o dono das permissões consegue mexer, só o dono real do servidor (`noone`). Mensagem enviada pedindo pra mover o cargo do bot acima de `Equipe`. **Aguardando resposta do dono.**
- [x] Task #2 concluída enquanto isso: embed colorido no bot de vídeos (thumbnail, cor Sakura `#F2A6C0`, avatar do canal, timestamp) — testado local e commitado
- [ ] Emoji nos nomes de canais existentes (leia-primeiro, apresente-se, etc.) — bloqueado igual: essas categorias são privadas, bot não tem `View Channel` nelas (erro 403 "Missing Access" visto antes). Precisa de acesso extra ou o próprio David fazer manual.
- [x] Convenção de nome de canal revisada pra `「emoji」nome` (inspirada em exemplo externo de organização, não copiado — só a convenção de colchete japonês). Aplicado nos dois canais do bot: `「🎥」vídeos-novos`, `「📰」notícias`
- [x] Mensagens de boas-vindas fixadas nos dois canais administrados pelo bot
- [x] 6 emojis customizados subidos: `:sakura_sim:`, `:sakura_amei:`, `:fuji_nao:`, `:matcha_boa:`, `:coral_novo:`, `:senpai_top:`
- [x] **Mapeamento de acesso real do bot** (2026-08-13): testado com rename no-op em todos os 26 canais/categorias — só a categoria `Comece aqui` (+ 5 canais dentro: leia-primeiro, regras-e-cultura, apresente-se, como-usar-a-comunidade, avisos) está bloqueada. Todo o resto (17 itens) o bot já alcançava, não precisava esperar o dono.
- [x] Todos os 17 canais/categorias acessíveis renomeados: canais no padrão `「emoji」nome`, categorias em CAIXA ALTA (sem emoji, mesmo padrão de `INFORMAÇÕES`)
- [x] Mensagens fixadas em todos os 9 canais de texto acessíveis (geral, 4 fases com progressão de cor lavanda→sakura-deep ecoando a hierarquia de cargo, pergunte-a-hiyori, conquistas, desabafo, materiais)
- [x] `「🗂️」arquivo-de-perguntas` (canal Fórum) — usa campo "diretrizes" (topic) em vez de pin, já que Fórum não aceita mensagem fixada tradicional
- [x] **Acesso liberado pelo dono (2026-08-13):** categoria `Comece aqui` tinha overwrite explícito negando "Ver Canal" pro `@everyone`, cargo do bot não estava na exceção. Resolvido adicionando o cargo do bot na permissão da categoria + sincronizando os 5 canais filhos (channel-level overwrite, diferente do problema de hierarquia de cargo resolvido antes)
- [x] Categoria renomeada: `COMECE AQUI`. 5 canais renomeados: `「📖」leia-primeiro`, `「📜」regras-e-cultura`, `「👋」apresente-se`, `「🧭」como-usar-a-comunidade`, `「📢」avisos`
- [x] Mensagem fixada nos 5 — conteúdo genérico/seguro pra regras (não inventei texto de regra específica, só reforço + aponta pra Equipe)
- [x] Cor do cargo `Equipe` aplicada (`#C6547C`) — desbloqueada quando o dono moveu o cargo do bot acima na hierarquia

## Checklist — Ícone e banner do servidor
- [x] Verificado nível de boost: `0` (features: `[]`) — **banner bloqueado**, precisa nível 2 (7 boosts). Documentado, não é algo que dá pra contornar.
- [x] Nenhum arquivo de ícone pronto no Downloads; decisão de gerar na paleta Sakura Pastel em vez de reaproveitar o avatar neon dos bots (evita inconsistência de linha visual)
- [x] Ícone gerado via SVG (flor de sakura de 5 pétalas, fundo `#221820`) → PNG 512×512 via `admin/generate-icon.js` (sharp, ferramenta pontual)
- [x] Ícone aplicado ao servidor via `setServerIcon` (novo em `admin/discord-admin.js`)
- [ ] Banner — pendente até o servidor atingir boost nível 2

## Checklist — Atribuição de cargo faltante (2026-08-13)
- [x] Server Members Intent ativado no Developer Portal (necessário pra listar membros via API)
- [x] Checados os 10 membros do servidor: só `tarcizo` estava sem nenhum dos 4 cargos — atribuído `🌸 Membro`
- [x] Esclarecido: membros offline sempre aparecem numa lista única sem agrupar por cargo — comportamento nativo do Discord, não é bug nem falta de configuração nossa

## Checklist — Lista de membros agrupada por cargo (2026-08-13)
- [x] `hoist` ativado nos 4 cargos (Equipe, Senpai, Membro, Visitante) — lista de membros agora agrupa por cargo em vez de só Disponível/Offline, no estilo do exemplo externo
- [x] Emoji nos cargos, resolvido sem boost: emoji direto no **nome** do cargo (não o recurso "ícone de cargo" que é boost-gated) — `⛩️ Equipe`, `🎓 Senpai`, `🌸 Membro`, `🍃 Visitante`

**Balde 2 (config visual): essencialmente completo.** Todos os 26 canais/categorias renomeados, todos os canais de texto com pin, 4 cargos com cor, 6 emojis customizados, ícone do servidor. Só falta o banner (bloqueado por boost) e possível expansão de hierarquia de cargo (descartada por enquanto).
- [ ] Hierarquia de cargos mais granular (Manager/Admin/Mod/Helper) — **descartado por enquanto**, comunidade pequena demais pra justificar

## Checklist — Avatar customizado do webhook de vídeos
- [x] Comando `set-webhook-avatar` adicionado ao `admin/discord-admin.js` (lê arquivo local, converte pra base64, PATCH `/webhooks/{id}`)
- [x] Avatar aplicado no webhook `Bot Vídeos` a partir de `D:\Users\David Lins\Downloads\avatar.png`
- [x] Confirmado via API que o hash do avatar foi salvo
- [x] Validado visualmente após reload do cliente Discord (era cache local, resolvido com Ctrl+R)

## Checklist — Setup do bot YouTube notifier

- [x] Estrutura do projeto criada (`index.js`, `package.json`, `.env.example`, `.gitignore`, `README.md`)
- [x] `npm install` rodado localmente — só `dotenv` instalado, 0 vulnerabilidades
- [x] Channel ID do YouTube encontrado: `UC1J-WP24znzMGxPYtB_HvUw` (canal "Bruno Tesser", `@brunotesserjapao`) — achado via scraping do HTML público + confirmado batendo contra o RSS feed público do canal (não precisou de API key)
- [x] **Discord:** canal `📰-notícias` criado — via `admin/discord-admin.js create-channel`, dentro da categoria `INFORMAÇÕES` (id `1537292819218173962`)
- [x] **Discord:** webhook criado nesse canal — via `admin/discord-admin.js create-webhook`, salvo direto em `.env` (`DISCORD_WEBHOOK_URL`), sem precisar de clique manual
- [x] **Google Cloud:** projeto criado (`discord-notifier`)
- [x] **Google Cloud:** YouTube Data API v3 ativada
- [x] **Google Cloud:** API Key gerada e restrita à YouTube Data API v3 (39 chars, formato `AIzaSy...`)
- [x] `.env` preenchido: `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_WEBHOOK_URL`
- [x] Teste local `node index.js` validado — primeiro run detectou vídeo e salvou estado sem notificar, conforme especificado
- [x] Teste end-to-end do webhook validado — simulei estado antigo, rodou de novo, postou no `#📰-notícias` com sucesso
- [ ] Deploy em Railway ou Render configurado
- [ ] Cron configurado (a cada ~15min)

**Task #1 (Finalizar setup do YouTube notifier): CONCLUÍDA.**

## Próximo passo imediato
Retomar Google Cloud: criar projeto, ativar YouTube Data API v3, gerar API Key restrita, colar em `YOUTUBE_API_KEY` no `.env`. Depois disso, rodar `node index.js` local pra validar o notifier (primeiro run: só salva estado, sem notificar).

## Checklist — Discord Bot de administração (Task #8)
- [x] Application criada no Developer Portal (`Viver no Japão - Admin`)
- [x] Bot user criado (nome: ミライ / Mirai)
- [x] Bot público desligado, Privileged Gateway Intents todos desativados
- [x] Permissões configuradas: Gerenciar servidor, Gerenciar cargos, Gerenciar canais, Alterar apelido, Gerenciar expressões, Ver canais, Enviar mensagens, Gerenciar mensagens, Fixar mensagens, Anexar arquivos, Ver histórico de mensagens, Usar emojis/figurinhas externas, Adicionar reações (permissions integer `2251938662296688`)
- [x] Token gerado e copiado pelo user
- [x] Bot convidado e autorizado no servidor "Viver no Japão - Comunidade" via OAuth2 URL Generator
- [x] Token colado no `.env` local
- [x] Guild ID resolvido via API (`list-guilds`, sem precisar de Modo Desenvolvedor): `1536904031509807305`
- [x] `admin/discord-admin.js` escrito — CLI com `list-guilds`, `list-channels`, `list-roles`, `create-channel`, `rename-channel`
- [x] Primeira ação testada: categoria `INFORMAÇÕES` (`1537292819218173962`) e canal `#📰-notícias` (`1537292839917191258`) criados via CLI
- [x] Permissão "Gerenciar Webhooks" adicionada ao cargo do bot (ajuste manual pós-convite, sem precisar regerar OAuth link)
- [x] Webhook do canal `#📰-notícias` criado via CLI (`create-webhook`) e salvo em `.env`

## Decisões/eventos registrados durante a execução
- Channel ID resolvido sem precisar de API key: fiz scraping do HTML da página `youtube.com/@brunotesserjapao`, extraí `externalId`, e confirmei contra o RSS público (`youtube.com/feeds/videos.xml?channel_id=...`), que mostrou o vídeo mais recente do canal certo.

---

## Checklist — Balde 1 (Bot, código) — visão macro
- [ ] #1 Setup YouTube notifier (detalhado acima)
- [ ] #2 Refatorar mensagem YouTube pra embed colorido
- [ ] #3 Refatorar repo pra múltiplos checkers (`checkers/`, `lib/`, `state.json`)
- [ ] #4 Checker NHK World PT
- [ ] #5 Checker Portal Mie
- [ ] #6 Deploy com cron

## Checklist — Balde 2 (Config Discord, manual/automatizável) — visão macro
- [x] Permissões concedidas ao user (Webhooks, Canais, Mensagens, Emojis, Cargos, Servidor)
- [x] (a) Canal `📰-notícias` criado
- [ ] (b) Canais renomeados com emoji
- [ ] (c) Paleta de cores dos cargos definida
- [ ] (d) Mensagens fixadas por canal (embed com imagem/gif — equivalente ao "banner por canal" pedido)
- [ ] (e) Ícone/banner do servidor
- [ ] (f) Emojis customizados
- [ ] (g) Paleta geral / tema de cor do servidor

## Checklist — Balde 3 (bots terceiros) — backlog, fora do sprint 1
- [ ] Sesh/Apollo (eventos)
- [ ] Statbot (contadores)
- [ ] Carl-bot/YAGPDB (welcome + reaction roles)
