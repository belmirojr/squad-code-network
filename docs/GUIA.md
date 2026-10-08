# 📘 SQUAD/CODE - Guia completo

Interface HTML interativa para organizar um squad de agentes de desenvolvimento. A direção visual usa as referências de mapas/menus fornecidas: cidade escura, menus flutuantes, etiquetas brancas, seleção em ciano, marcadores em losango e rotas roxas de handoff.

> Pré-requisitos, instalação, como rodar e o primeiro teste estão no [README](../README.md). Este guia descreve as funcionalidades em detalhe.

## 🚦 Como a execução funciona

**Projeto completo antes de executar.** Nenhuma sprint, feature ou spawn individual roda, nem na demonstração, enquanto algum campo salvo do projeto estiver vazio. Entram na conta nome, briefing, squad, visão do produto, escopo dentro e fora, glossário, arquitetura e ao menos um ADR, com título e conteúdo em cada ADR. A seção de sprints e features mostra o aviso **Execução bloqueada** com o que falta, e os botões de executar, a barra de espaço e o comandante respondem dizendo o que preencher.

**O comandante planeja, você aprova, a squad conversa.** Executar uma sprint ou uma feature leva você à tela **Squad**, no escritório isométrico, e abre o **chat da operação** no lugar da lista de agentes (que volta quando você fecha o chat), um chat em grupo da squad no estilo WhatsApp:

1. **Planejamento.** O comandante da squad lê o briefing, as features pendentes e a squad, e monta o plano de execução: a rota de cada feature (quem trabalha e em que ordem) e uma instrução curta para cada agente. No modo real ele roda como um `opencode run` sem ferramentas e a mensagem dele aparece enquanto é escrita. Se ele não devolver um plano válido, entra a distribuição padrão da squad, com um aviso.
2. **Aprovação.** O plano aparece como um card com **Executar plano** e **Cancelar**. Nada é gravado nas features e nada roda antes da sua aprovação. Cancelar não altera nenhuma feature.
3. **Execução.** Cada agente diz o que vai fazer ("Peguei a F02 com ECHO. Minha parte: ..."), fala enquanto trabalha e mostra o que fez em chips (arquivos lidos e editados, comandos rodados). No fim da etapa, um **card de bastão** mostra a passagem da entrega para o próximo agente; a última etapa passa o bastão para você, com o botão **Revisar**. Ao fim da rodada, o comandante resume o que foi para revisão e o que ficou pendente.
4. **Chamadas entre agentes.** Durante a própria etapa, um agente pode chamar um colega da squad (subagentes do opencode, ferramenta `task`): um card roxo mostra o pedido, a fala do chamado aparece no fio e a resposta fecha o card. O chamado usa as próprias instruções e ferramentas, sempre dentro do limite das ferramentas de quem chamou, e trabalha na mesma pasta do projeto.

O chat ocupa o lado esquerdo inteiro, de cima a baixo e por cima da barra do topo (as abas e o status passam para a direita dele), e o mapa se recentraliza no espaço que sobra; arraste a borda direita do chat para mudar a largura (as setas do teclado também funcionam, e um duplo clique volta ao padrão). A largura fica salva no workspace. A faixa da equipe, no topo do chat, mostra quem está com o bastão, quem está atendendo uma chamada, quem está na fila e quem já entregou. Durante a execução o chat pode ser minimizado: vira uma barra com a última mensagem e o número de não lidas, e o escritório continua mostrando, sobre cada agente em ação, o que ele está fazendo e a última fala dele. Ao fim, o chat fica aberto com o resumo até você fechá-lo; ele reabre pelo botão **Chat da operação** (seção de sprints e features, HUD e Painel) ou clicando na War Room. O console técnico continua a um clique. O spawn individual roda sem o comandante, mas também no chat. Na demonstração, o plano, as falas e as chamadas são simulados.

Com o bridge conectado e o modo **opencode real** ativo, cada etapa da rota de uma feature cria um processo `opencode run --format json`:

- **System prompt**: as instruções do agente (estúdio › Instruções), combinadas com o prompt da etapa e enviadas por stdin.
- **Prompt** (via stdin): briefing, feature, critérios, entregas aprovadas das dependências, contexto de handoff, o resultado das etapas anteriores da rota, a instrução do comandante para aquele agente e a lista de colegas que ele pode chamar.
- **Colegas**: os outros membros da squad vão para um arquivo temporário de configuração do opencode (`OPENCODE_CONFIG`), como subagentes que o agente da etapa chama pela ferramenta `task`. O relatório do colega volta embutido na resposta da ferramenta.
- **Modelo**: o do agente, ou o modelo global das configurações. `inherit` usa o padrão do opencode.
- **Ferramentas**: com "Restringir às ferramentas do agente" ligado, só as ferramentas marcadas no estúdio (mais as regras extras) ficam habilitadas, via o objeto `tools` do config temporário do opencode; desligado, o agente usa as ferramentas padrão do opencode.
- **Permissões**: seguem a configuração do opencode. O modo `--auto` (aprovar tudo que não estiver negado) só é usado quando você o ativa.

O resultado de cada agente vira o contexto de handoff do próximo. A última etapa envia a feature para **Revisão humana**; somente a aprovação a conclui e libera as dependentes. Pausar deixa a etapa em andamento terminar. Encerrar mata o processo (`taskkill /T` no Windows). Uma falha devolve a feature para Prontas.

O **Console** (tecla `C`, ou a faixa de transmissões durante a operação) mostra ao vivo o comando, a sessão, as ferramentas usadas, o texto do agente e o custo.

### Segurança do bridge

- Escuta apenas em `127.0.0.1`. Toda chamada `/api` exige um token aleatório gerado a cada início e injetado na página, e `Host`/`Origin` precisam ser locais.
- As opções são validadas por whitelist (modelo, variante, nomes de ferramentas, diretórios existentes). O prompt vai por stdin, sem interpolação em shell.
- O modo `--auto` (aprovar tudo que não estiver negado) só é usado quando você o ativa; revise as permissões no seu `opencode.json`.

## ⚙️ Configurações do opencode

Menu de configurações (ícone ou clique no status), aba **Opencode**: modo (real/demo), executável, pasta dos projetos (somente leitura; veja abaixo), modelo global e variante de raciocínio (quando preenchidos, sobrescrevem o modelo e a variante de cada agente), tempo limite, execuções simultâneas, regras extras de allowedTools, diretórios adicionais e restrição de ferramentas. **Testar conexão** consulta `opencode --version` pelo bridge.

Aba **opencode.json**: carrega, valida e salva os arquivos reais de configuração do opencode — global em `~/.config/opencode/opencode.json` (usuário) e do projeto em `projects/<pasta>/opencode.json`, na pasta da operação atual. Antes de gravar, o arquivo atual é copiado para `.bak`.

**Uma pasta por projeto.** Cada operação tem a sua pasta em `projects/<pasta>/`, ao lado do `server.js`, e é nela que os agentes leem e escrevem tudo o que implementam. O nome sai do código e do nome da operação quando ela é criada (por exemplo `op-001-atlas-commerce`) e não muda se a operação for renomeada. O bridge cria a pasta na primeira execução, e ela aparece no cabeçalho da operação, no console e no preview do comando. Excluir a operação não apaga a pasta. Para cada execução o bridge combina as instruções do agente com o prompt da etapa e envia tudo por stdin, sem interpolção em shell. Cada pasta de projeto também é um repositório git próprio (o bridge roda `git init` antes da primeira execução, se o Git estiver instalado) e o git dos agentes não passa de `projects/`: `git status` e commits são sempre os do projeto, nunca os do repositório do SQUAD/CODE. Uma execução sem pasta de projeto é recusada pelo bridge, em vez de rodar na pasta do app. As ferramentas de arquivo dos agentes também não leem fora da pasta do projeto (nem do que estiver em **Diretórios adicionais**). Para usar outra raiz, inicie o bridge com `SQUAD_PROJECTS_DIR`.

## 👥 Estúdio de agentes

Crie, edite, duplique e exclua agentes. Configure codinome, função, descrição, **modelo** (no formato do opencode, `provedor/modelo`, como `anthropic/claude-sonnet-4-6`, ou Herdar da sessão), **variante de raciocínio** (Padrão do modelo, low, medium, high ou max), instruções, ferramentas, preferência de handoff e projetos associados. O squad é focado em **desenvolvimento de software**. Todo agente usa um **codinome**, salvo em maiúsculas, único no workspace, com letras, números, espaço ou hífen. Cada especialidade traz um codinome padrão, preenchido ao criar o agente se estiver livre, além de instruções, ícone e retrato:

| Grupo | Especialidade | Codinome padrão |
|---|---|---|
| Liderança | Comandante / Tech Lead | VANGUARD |
| Liderança | Gestor de Projetos / Scrum | COMPASS |
| Produto & Design | Product Owner | ECHO |
| Produto & Design | UX/UI Designer | PRISM |
| Engenharia | Arquiteto | PROPHET |
| Engenharia | Backend Engineer | FORGE |
| Engenharia | Frontend Engineer | PIXEL |
| Engenharia | Mobile Engineer | VALETE |
| Engenharia | QA / Reviewer | SENTINEL |
| Plataforma & Segurança | DevOps / SRE | DEPLOYER |
| Plataforma & Segurança | Segurança (AppSec) | MOTHER WOLF |
| Plataforma & Segurança | Engenharia de Dados | DATABIRD |
| Documentação | Documentação Técnica | SCRIBE |
| Outra | Especialista personalizado | NOVA |

Na aba Identidade, a área **Aparência na mesa do squad** tem dois cartões, **Foto** e **Ícone**. Clicar em cada um abre a galeria correspondente: todas as fotos (retratos embutidos e avatares de `assets/`) ou 50 ícones, sempre com a opção AUTO. Nos agentes template, AUTO é a foto de identidade do template; nos criados do zero, é a foto do agente padrão da especialidade (FORGE no backend, PRISM no design…). A escolha aparece no marcador do mapa e na lista do squad.

Cada um dos 60 agentes template (comandantes, reconhecedores, todos os operadores do catálogo, PROPHET e COMPASS) tem uma foto de identidade própria, definida em `TEMPLATE_AVATARS` (`src/app.js`). As 48 fontes de `assets/` são todas usadas. Como há mais agentes que fotos, 12 fontes são compartilhadas por dois agentes de categorias distantes, nunca na mesma categoria nem com comandantes, reconhecedores ou generalistas. Workspaces antigos que guardavam uma cópia da foto do template passam a seguir o mapa atual; fotos escolhidas na galeria são mantidas.

O campo opcional **Título da especialidade** (ex.: Tech Lead de Pagamentos) substitui o nome da categoria na interface e no prompt. No especialista personalizado ele é obrigatório. Features também podem ser atribuídas a essas áreas. Mobile segue a rota PO > Arquiteto > Mobile > QA, e as demais áreas vão direto ao especialista. Agentes de especialidades removidas em versões anteriores (jurídico, marketing etc.) são migrados ao carregar: viram Especialista personalizado e mantêm o rótulo antigo como título.

Na aba IDENTIDADE, a **SOUL** descreve a personalidade do agente (quem é, como fala, ritmo, humor) e as **mensagens iniciais**: variações de cumprimento, uma sorteada a cada conversa. Ela muda o jeito de conversar nos chats (a co-escrita de features começa com um cumprimento sorteado do agente, digitado na hora, e as respostas seguem o tom dele), sem mudar as regras nem o conteúdo técnico. A SOUL é o temperamento do agente, não um personagem: as conversas soam humanas, sem bordões, sem travessões e sem cara de texto de IA, e no celular o agente pode usar um emoji quando combina com o momento. Todos os agentes do catálogo têm uma SOUL única e 3 mensagens iniciais que misturam a personalidade com a especialidade (o VOLT fala de Supabase e RLS, o SNIPER de testes E2E, o AEGIS de Angular…), e ficam sempre de prontidão. Agentes criados do zero já vêm com uma SOUL genérica e 3 mensagens iniciais que citam a especialidade dele (o título da especialidade, se houver, ou a área); enquanto não forem editadas, elas acompanham a troca de especialidade. Tudo é editável, com até 8 variações por agente. SOULs e listas de uma versão anterior do catálogo que não foram editadas são atualizadas sozinhas. A SOUL vai na exportação `.md` e no pacote do projeto e volta ao padrão com **Restaurar default**.

O upload aceita JPEG, PNG ou WebP de até 10 MB. A imagem é redimensionada e armazenada localmente. Também é possível exportar uma definição `.md` com frontmatter e instruções; o download não instala ou executa o agente.

Agentes template (os do catálogo do Squad Studio, como VANGUARD, FORGE ou VOLT, mesmo depois de renomeados) têm **Restaurar default** no lado esquerdo do rodapé do estúdio. O formulário volta aos padrões do template: codinome, especialidade, ícone, foto, modelo, responsabilidade, SOUL, instruções, ferramentas e diretrizes. Estágio, mesa, conexões e squads são mantidos. **Salvar agente** aplica e **Cancelar** descarta. Cópias feitas com **Duplicar** não são templates.

## 📐 Diretrizes do agente (convenções e boas práticas)

No estúdio do agente, a aba **DIRETRIZES** guarda o guia de convenções e boas práticas do agente, em Markdown: nomenclatura (variáveis, constantes, prefixos e sufixos de funções), formatação e indentação, estrutura de pastas, padrões de projeto preferidos, testes e entregas.

- O guia acompanha o tipo do agente (detectado pela especialidade e subespecialidade: Node.js, React, PostgreSQL, Supabase, Firebase, Kubernetes, ADR, PRD...); ao mudar a especialidade, o tipo se ajusta.
- O **template base** é escolhido num dropdown com **pelo menos 4 opções do próprio tipo** (ex.: Node.js → JavaScript (ESM), TypeScript estrito, TypeScript + NestJS, Express, Fastify + TypeScript; o agente de ADR tem 7 formatos de ADR: Nygard, MADR 4 completo, MADR mínimo, Y-Statement, Tyree & Akerman, Merson e Caso de negócio; Supabase → essencial, Segurança e RLS, Banco e migrações, Edge Functions, App cliente; Firebase → essencial, Security Rules, Modelagem Firestore, Cloud Functions, App cliente + Auth), além dos seus templates desse tipo salvos na biblioteca. Aplicar substitui o guia base, com **Desfazer**; editar o texto marca o template como "Personalizado (editado)".
- **Subsets** são blocos de regras extras anexados ao guia base, editáveis e removíveis. **Adicionar subset** abre uma busca por tema, com 11 grupos com ícone (Estilo de código, Qualidade de código, Arquitetura, Testes, Git & entrega, Segurança, Frontend & UX, Backend & APIs, Dados, Operação, Comunicação), sugestões para o agente, sua biblioteca e um subset em branco. ↑/↓ navegam, Enter adiciona, Esc fecha a busca.
- **Estilo de código** fica nas diretrizes, não nas instruções do agente: o grupo tem um subset por linguagem (TypeScript, JavaScript, Python, Go, Java, C#, PHP, Kotlin, Swift, Dart, SQL, CSS, Shell, YAML e Terraform), com nomenclatura, formatador e lint de referência, tipos, erros e imports. Cada agente do catálogo já vem com o estilo da sua stack (VIPER com Python, TUSK com SQL, VOLT com TypeScript e SQL, PIXEL com TypeScript e CSS...), e as sugestões da busca começam por ele. Os subsets de estilo também saem em `docs/standards/coding-style.md` na exportação.
- As **instruções** dos agentes do catálogo são em português e descrevem só o papel. Agentes antigos cujas instruções e diretrizes não foram editadas são atualizados automaticamente na carga (e na importação de backup): instruções para o português e estilo de código da stack nas diretrizes. O que você editou fica como está.
- **Minha biblioteca**: salve o guia base como template ou um bloco como subset para reutilizar. A biblioteca vai junto no backup do workspace.
- A **pré-visualização final** mostra o guia completo (base + subsets).
- Sempre que o agente é executado, o guia completo é anexado às instruções do agente (combinadas com o prompt da etapa e enviadas por stdin), e o prompt da etapa pede que ele seja seguido. O guia também sai na exportação `.md` do agente.

## 👥 Squads e Squad Studio

Toda **squad** tem um nome e uma cadeia de comando fixa:

| Posição | Quantidade | Papel |
|---|---|---|
| **Comandante** | 1 | Lê o briefing e as features e delega para os operadores (especialidade Comandante). |
| **Reconhecedores** | 2 | 1 agente de **ADR** (decisões de arquitetura, especialidade Arquiteto) e 1 de **PRD** (requisitos de produto, especialidade Product Owner). |
| **Operadores** | 1 ou mais | Especialistas: backend, front-end, banco de dados, Dev C#, Dev Java, Dev Node, React, Angular, QA, DevOps… |

O **Squad Studio** (cards de squads no Painel, botão **SQUAD STUDIO** no painel lateral ou tecla `G`) mostra a squad como uma **árvore hierárquica** com uma faixa por cadeia (01 Comando: recebe o briefing, toma decisões e delega; 02 Inteligência: transforma requisitos e contexto em plano de missão; 03 Operadores: executa tecnicamente a missão) e o ícone de cada agente. Clique numa posição para abrir o seletor: os itens deslizam no estilo do menu de itens de Metal Gear Solid (← → para navegar, Enter para escolher, Esc para fechar). Há agentes pré-prontos para cada posição, criados no workspace na primeira escolha e reutilizados depois:

- Comandantes: **VANGUARD**, **ABELHA-RAINHA**, **PROFETA**, **ZERO**;
- ADR: ATLAS, BLUEPRINT, LEDGER (arquitetura de dados), KEYSTONE (domínio/DDD), SKYLINE (plataforma e qualidade), BASTION (segurança) · PRD: ECHO, SCOUT. Cada ADR novo já vem com o formato de ADR do seu foco nas diretrizes (Tyree & Akerman, MADR 4, Caso de negócio e Merson);
- Operadores: qualquer círculo da camada de operadores (novo ou já preenchido) abre primeiro a faixa de **cards de especialidade**, que desliza para os lados (a especialidade atual vem centralizada e marcada como ATUAL). Enter ou duplo clique abrem a especialidade e a faixa passa a mostrar os agentes por **subespecialidade**, igual ao seletor de comandante, sempre com o **generalista** primeiro (se já estiver na squad, aparece como "já nesta squad"). ‹ Especialidades ou Backspace voltam:

  | Categoria | Generalista | Subespecialistas |
  |---|---|---|
  | Backend | FORGE | NODE RUNNER (Node.js), ESPRESSO (Java), SHARPSHOOTER (C#/.NET), VIPER (Python), RAPTOR (Go), PHANTOM (PHP), VOLT (Supabase), BLAZE (Firebase) |
  | Frontend | PIXEL | VANILLA (HTML + CSS + JS), ATOMIC (React), AEGIS (Angular), VERTEX (Vue), NEXUS (Next.js) |
  | Banco de Dados | VAULT | TUSK (PostgreSQL), MARLIN (MySQL), MONGOOSE (MongoDB), REDLINE (Redis), FEATHER (SQLite), QUILL (SQLite na borda: Turso, libSQL, D1), PEBBLE (SQLite offline-first), KEEL (Supabase Postgres e migrações), GATEKEEPER (Supabase RLS e Auth), SURGE (Supabase Edge Functions e Realtime), ORBIT (Supabase Vector / pgvector) |
  | DevOps / Cloud | DEPLOYER | KRAKEN (Docker/Kubernetes), STRATUS (AWS), CERULEAN (Azure), BEDROCK (Terraform), PIPELINE (CI/CD) |
  | QA / Testes | SENTINEL | SNIPER (E2E), SCALPEL (unitários/integração), TEMPO (performance), BEACON (acessibilidade) |
  | Mobile | VALETE | HUMMINGBIRD (Flutter), RIPTIDE (React Native), SWIFTWING (iOS/Swift), KESTREL (Android/Kotlin) |
  | Segurança | MOTHER WOLF | INFILTRATOR (pentest), WARDEN (code review AppSec), KEYMASTER (IAM/autenticação) |
  | Dados | DATABIRD | CONDUIT (pipelines/ETL), TORRENT (Kafka/streaming), INSIGHT (analytics/BI) |
  | Design | PRISM | CANVAS (Figma/UI), MOSAIC (design system) |
  | Documentação | SCRIBE | LEXICON (docs de API), GUIDE (tutoriais/onboarding) |

  A subespecialidade vai para o título da especialidade do agente e para as instruções. A categoria **Outros** aparece quando há agentes de outras especialidades no workspace;
- ou **Customizado**, que abre o estúdio do agente e coloca o novo agente direto na posição.

A squad só é salva completa (nome, comandante, ADR, PRD e ao menos um operador). Toda operação é associada a **uma squad inteira** no formulário do projeto; squads incompletas não podem ser escolhidas. Editar uma squad atualiza as operações que a usam. Não é possível excluir uma squad em uso, nem excluir ou trocar a especialidade de um agente que ocupa a posição de comandante, ADR ou PRD. Squads antigas são migradas: o primeiro Arquiteto vira ADR, o primeiro Product Owner vira PRD e os demais viram operadores.

## 📁 Projetos e features

Cada projeto tem briefing, comandante e squad associado. Suas features têm escopo, prioridade, critérios de aceitação, dependências e estado. Há criação, edição, exclusão e busca. Dependências circulares são rejeitadas.

**Nova operação** (aba Projetos ou Painel) pergunta em duas etapas: primeiro o **nome do projeto**, depois quem vai executar, **Selecionar squad existente** (escolha entre as squads completas) ou **Criar nova squad** (abre o Squad Studio marcado "PARA A OPERAÇÃO ..."; ao clicar em **Criar squad e operação**, a squad e a operação são criadas juntas; cancelar ou sair do Studio não cria nada). **Voltar** mantém o nome digitado. A operação é criada na hora, com a pasta `projects/<código>-<nome>` e a Sprint 01 já começando pela feature **F00 Setup do projeto**, e abre a página do projeto com o briefing vazio: escreva-o no formulário ou abra o **Agent Teams** para co-escrever com a squad. Salvar o projeto não exige o briefing, mas nenhuma sprint roda enquanto ele e a documentação não estiverem preenchidos.

No Painel, cada card de operação tem **Abrir projeto** (vai para a página da operação) e **Abrir times** (torna a operação ativa e abre o Agent Teams dela; só com o bridge ligado).

A aba **Projetos** é uma página dedicada: à esquerda ficam as operações (clique para torná-la ativa, ou **Nova operação**); à direita, o **briefing** editável no próprio formulário e a lista de **features**, visualização em **Lista** ou **Quadro** (kanban), busca, **Distribuir features** (o plano do comandante aparece na própria página) e **Iniciar operação**. **Nova feature** e o clique numa feature pendente abrem o **editor de feature** em modal: título, área, prioridade, dependências e os blocos **Escopo**, **Critérios de aceitação** e **Tarefas** em Markdown. Cada bloco aparece renderizado como a pré-visualização das diretrizes; um clique (ou **Editar**) abre o texto-fonte com barra de formatação (negrito, itálico, subtítulo, lista, checklist e código; Ctrl/⌘+B e Ctrl/⌘+I), e Esc ou sair do campo volta à visualização. Os blocos podem ser recolhidos e mostram a contagem (palavras, critérios, tarefas). Ao lado fica a **co-escrita** com o Reconhecedor PRD da squad (ex.: ECHO), com o modelo em uso ao lado do nome (o global das configurações, se houver, senão o do agente). A conversa tem cara de iMessage: balões azuis (você) e cinza (agente) com rabinho no último de cada sequência, separadores de horário, Entregue/Lido, indicador de digitação e rolagem suave (se você subir para reler, aparece **Nova mensagem ↓** em vez de puxar a tela). Você pode continuar mandando mensagens enquanto ele digita; elas vão juntas na próxima resposta. Quando a resposta chega, o agente edita os campos um de cada vez ("✎ editando Critérios…"): o bloco rola para a vista, mostra o selo do agente e o conteúdo aparece linha a linha. No fim, a resposta traz os campos alterados (clique para ir até eles) e **Desfazer**. Erros viram um aviso com **Tentar de novo**. A conversa de cada feature fica guardada enquanto a página estiver aberta. Você edita os campos à vontade a qualquer momento. A conversa leva o briefing, o escopo do projeto, as outras features e o estado atual do formulário. Ela roda pelo bridge (`opencode run`, sem ferramentas, até 180 s por resposta, custo exibido em cada resposta) e só vive enquanto o editor está aberto. Sem o bridge, o editor funciona normalmente e o painel explica como conectar. Features em execução, revisão ou concluídas abrem o painel lateral de revisão de entrega (aprovar / solicitar ajustes). Os atalhos `F` e `B` também abrem esta página.

**Setup do projeto.** Toda operação começa pela **F00 Setup do projeto**, a primeira feature da Sprint 01: estrutura do repositório, dependências da stack, lint, formatação e testes conforme as diretrizes, scripts de build e execução, `.env.example` e README. O comandante a distribui para arquiteto, backend, frontend e QA. Todas as outras features dependem dela e ficam **Bloqueadas** até o setup ser aprovado na revisão humana. Dá para editar o título, o escopo, os critérios e as tarefas, mas o setup não pode ser excluído nem sair da primeira sprint. Operações criadas antes desta regra ganham o setup automaticamente, em backlog.

O quadro separa **A fazer**, **Prontas**, **Em execução**, **Revisão humana** e **Concluídas**. Projetos podem reutilizar os mesmos agentes, mas features e suas sequências pertencem a cada projeto.

### Documentação do projeto

Cada operação tem **uma única squad** (obrigatória no formulário; uma squad em uso por alguma operação não pode ser excluída). Além de nome e briefing, o formulário do projeto tem o bloco **Documentação do projeto**, com seções recolhíveis que mostram se estão preenchidas:

- **Visão do produto**: para quem é, problema, proposta de valor e metas;
- **Escopo**: dentro e fora do escopo, um item por linha;
- **Glossário**: `Termo: definição`, um por linha;
- **Arquitetura**: visão geral e a lista de **decisões (ADR)**, com título, status (Proposto, Aceito, Rejeitado, Depreciado, Substituído) e texto já com Contexto/Decisão/Consequências. **Adicionar ADR** e a lixeira renumeram ADR-001, ADR-002…

#### Agent Teams: o kickoff em reunião online

Os primeiros dados da operação (briefing, visão do produto, escopo, glossário, arquitetura e ADRs) são co-escritos no **Agent Teams**, um meetup online no estilo do Microsoft Teams. Ele abre pelo botão **Agent Teams** na seção de briefing ou pelos retratos no rótulo do briefing e nas linhas da documentação. Participam o **comandante**, o **Reconhecedor PRD** e o **Reconhecedor ADR** da squad:

- **A chamada:** cada agente aparece num vídeo com o retrato, o nome e o papel (o comandante é o organizador), e há um vídeo seu; todas as janelas têm efeito de CRT com scanlines, sincronizado entre as câmeras. O vídeo de quem está com a palavra mostra "pensando", depois acende e mostra "falando" quando ele começa a responder, e enquanto o agente escreve (a resposta ou um documento) aparece um balão de escrita no canto inferior direito. Não há áudio: tudo acontece pelo chat, ao lado.
- **Quem fala:** o comandante conduz. Ele segue a pauta pelo que falta, faz perguntas de forma consultiva, escreve o briefing e passa a palavra ao PRD (visão, escopo e glossário) ou ao ADR (arquitetura e ADRs) quando o assunto é deles; o colega fala logo em seguida, na mesma rodada. Para falar direto com alguém, marque com **@**, como no Teams: digitar `@` abre a lista dos participantes (↑/↓ e Enter ou Tab escolhem, Esc fecha), e também dá para marcar clicando na câmera do agente ou numa menção no chat. Vale o codinome (`@ECHO`) ou o papel (`@comandante`, `@prd`, `@adr`, `@arquiteto`); um nome escrito sem @ não direciona. A linha **Para** acima do campo mostra quem vai responder. Os agentes também se citam com @, e as menções aparecem destacadas nas mensagens.
- **Convidados:** quando uma demanda precisa de alguém da squad que não está na reunião (FORGE, PIXEL, SENTINEL…), um participante chama esse agente para a chamada. Você também pode chamar marcando com @ alguém da squad que está fora (a lista do @ mostra esses agentes em **Convidar para a reunião**). O convidado entra com uma câmera marcada como CONVIDADO, um aviso no chat diz quem chamou e por quê, ele responde à demanda com a especialidade dele e sai em seguida. Se ele precisar de uma decisão sua, pergunta com opções, espera a sua resposta, responde e então sai. Convidados não escrevem os documentos: eles dizem aos donos o que levar em conta. No máximo três convidados ficam na chamada ao mesmo tempo. Quem pergunta com opções recebe a resposta. Cada agente roda com as próprias instruções, SOUL, modelo e esforço, então uma rodada custa uma execução por agente que falou (no máximo três).
- **Tela compartilhada:** quando um agente escreve, ele compartilha a tela: os vídeos viram uma faixa e o palco mostra o documento sendo escrito, bloco a bloco. **Voltar à galeria** fecha a apresentação, que também sai sozinha na rodada seguinte.
- **Pauta e documentos:** a barra superior mostra o tempo de reunião e a pauta (Briefing, Visão, Escopo, Glossário e Arquitetura), marcada quando cada item está completo, com a mesma regra que libera a execução. A aba **Documentos** mostra tudo para ler e editar à mão; cada mudança dos agentes tem **Desfazer** no chat. A barra entre o palco e o painel lateral redimensiona o chat: arraste, use ← e → com ela em foco ou dê duplo clique para voltar ao padrão; a largura fica salva no workspace.
- **Salvar:** a reunião parte do que está no formulário, inclusive o que ainda não foi salvo. **Salvar no projeto** grava no projeto; numa operação nova, **Aplicar ao formulário** só preenche o formulário até você criar a operação. **Sair** (ou Esc) com documentos não salvos pergunta antes de fechar. A conversa fica guardada durante a sessão e continua de onde parou.

O Agent Teams usa o opencode real pelo bridge e não tem modo demonstração: sem o bridge ele não abre e explica como conectar. Trocar a squad no formulário troca os participantes.

Cada feature tem também o campo **Tarefas**, uma por linha.

### Exportar para o opencode

**Exportar**, no topo da operação, baixa `<código>-<nome>.zip` (ex.: `op-001-atlas-commerce.zip`) com a operação e a sua squad. Extraia na raiz do repositório:

```
AGENTS.md
opencode.json
docs/
├── project/        briefing.md · product-vision.md · scope.md · glossary.md
├── architecture/   overview.md · adr/ADR-001-<titulo>.md · diagrams/
├── standards/      coding-style.md · api-guidelines.md · database-guidelines.md · git-conventions.md · security-guidelines.md
└── features/       001-<feature>/spec.md · acceptance-criteria.md · tasks.md
.opencode/
├── agents/         um subagente por membro da squad
└── commands/       planejar-operacao.md · executar-feature.md · executar-sprint.md
```

| Caminho | Conteúdo |
|---|---|
| `AGENTS.md` | Como devemos trabalhar: projeto e squad, mapa da documentação, cadeia de comando, fluxo (briefing → PRD/ADR → operadores → revisão humana), features, uso no terminal, rotas por área e a configuração headless de referência. |
| `docs/project/` | Briefing; visão do produto; escopo com a tabela de features, a ordem sugerida (dependências → prioridade) e a legenda de status; glossário em tabela. Campos vazios saem como "_A definir_" com o que escrever. |
| `docs/architecture/` | `overview.md` (visão geral, tabela **Decisões** com link para cada ADR, diagramas), um `ADR-NNN-<titulo>.md` por decisão e `diagrams/` (versionada com `.gitkeep`). |
| `docs/standards/` | Compilados das **diretrizes** dos agentes da squad: guias base das especialidades de código em `coding-style`, dos de banco em `database-guidelines`, dos de segurança em `security-guidelines`, e os subsets por grupo (Backend & APIs → `api-guidelines`, Dados → `database-guidelines`, Git & entrega → `git-conventions`, Segurança → `security-guidelines`, Qualidade/Arquitetura/Testes/Frontend → `coding-style`). Blocos iguais são unidos citando os agentes de origem; sem regra na squad, entra o padrão do catálogo. |
| `docs/features/<NNN-feature>/` | `spec.md` com frontmatter YAML (`id`, `status`, `priority`, `area`, `depends_on`, `route`), escopo, dependências com link, rota, contexto de handoff e entregas; `acceptance-criteria.md` em checklist; `tasks.md` com as tarefas técnicas e as etapas da rota (PRD, ADR, implementação, QA, revisão humana). `NNN` vem da chave (F02 → 002). |
| `.opencode/agents/*.md` | Formato de subagente do opencode (`description`, `mode: subagent`, `model` quando `provedor/modelo`, `tools` como objeto), com instruções, guia de diretrizes, posição na squad, onde registrar (ADR em `docs/architecture/adr/`, PRD na pasta da feature, operadores em `tasks.md`) e regras de handoff. Caminhos antigos dos guias (`docs/adr/`, `docs/prd/`) são atualizados na exportação. |
| `.opencode/commands/` | `/planejar-operacao` (o comandante monta o plano, sem executar), `/executar-feature <F>` (roda a rota da feature, uma etapa por subagente, marcando `tasks.md`; termina em `review` e só vai para `done`, com critérios `[x]`, após aprovação humana) e `/executar-sprint <S>`. |
| `opencode.json` | `model` (quando definido como `provedor/modelo`) e `permission.external_directory` para os diretórios adicionais. |

O `status` do `spec.md` é a fonte da verdade no repositório. Features concluídas ou em revisão **só em simulação** saem como `backlog`, com uma nota, para que dado de demonstração não passe por código implementado. Entregas entram apenas quando vieram de execução real. O catálogo de diretrizes segue a mesma estrutura (ADR em `docs/architecture/adr/ADR-NNN-…`, PRD em `docs/features/<NNN-feature>/spec.md`, C4 em `docs/architecture/diagrams/`).

Como subagentes não chamam outros subagentes por padrão, a orquestração fica na sessão principal: os comandos acima, ou `opencode run --agent <comandante>`, que por isso recebe a ferramenta `task` na exportação. A exportação usa a versão salva da operação e da squad. O botão `.md` do estúdio do agente continua exportando um agente só, no mesmo formato de subagente do opencode.

## 🗺️ Tela Squad: cidade hexagonal

Ao abrir a aba **Squad** (navegação, **Abrir rede do squad** no Painel ou `Q`/`E`) com mais de uma operação, o app pergunta **de qual operação** você quer ver a squad; escolher uma a torna ativa e mostra o mapa dela, e Cancelar mantém a tela atual. Clicar em **Squad** de novo, já no mapa, troca de operação. Durante uma execução, a aba mostra direto a squad da operação em andamento.

O mapa é uma **cidade hexagonal em 3D**, renderizada com Three.js e embutida no HTML (funciona offline). É uma ilha escura e monocromática: prédios grafite iluminados de cima, com sombras suaves e oclusão de ambiente, ruas em linhas cinza-claro desenhadas no chão, parques e o litoral cercado de água escura, tudo se dissolvendo na névoa nas bordas. Cada hexágono é um quarteirão (três quadras separadas por ruas estreitas) e as bordas dos hexágonos são as avenidas, então a grade de slots continua visível. Os agentes ocupam **praças iluminadas** em azul elétrico, com borda em neon e um halo de luz no chão, e o VANGUARD (comandante) fica no centro. Nas linhas de conexão entre os agentes correm **sinais de transmissão**: pulsos de luz com rastro que saem de um agente e chegam ao outro, mais rápidos e intensos no link ativo. Os prédios são baixos perto do squad e as torres ficam nos anéis externos, formando o skyline sem tampar os agentes de nenhum ângulo; a cidade é propositalmente espaçada, com muitos lotes vazios, para a visão ficar leve. Clicar num slot livre faz os prédios dele descerem, deixando só o chão com o contorno do slot; clicar de novo no mesmo slot, num slot com agente ou fora da cidade traz os prédios de volta. Hexágonos ocupados por agentes ficam sempre sem prédios. Há animações leves: pulso do agente selecionado, varredura de radar, pacotes percorrendo os links ativos e prédios baixando quando um agente ocupa um hexágono. Com **Movimento** desligado nas configurações, ou com redução de movimento no sistema, a cena fica estática.

Em **Configurações**, **Gráficos da cidade em alta qualidade** liga as sombras, a oclusão de ambiente e o brilho. Desligado, a cidade é renderizada sem esses efeitos, mais leve para computadores modestos. Se os quadros ficarem lentos, a qualidade também cai sozinha, um efeito por vez. Sombras e oclusão só são recalculadas quando algo muda (câmera, prédios, praças), então a cidade parada custa pouco.

Os lugares do mapa (hexágonos na cidade, mesas no escritório) são **só da squad ativa**: agentes de outras squads não ocupam nem bloqueiam nada. Um mesmo lugar pode ser usado por agentes de squads diferentes; se um agente entra numa squad e cai num lugar já usado ali, ele vai para o lugar livre mais próximo.

**Cidade em modo planeta** (botão do planeta nos controles do mapa, tecla `P`, ou configurações, aba Workspace): a cidade vira um **planeta 3D completo**, no estilo Mario Galaxy. O botão só aparece na vista cidade e fica aceso enquanto ela é um planeta. A troca é animada (~2,6 s): um pulso sai do squad, a câmera recua e sobe, as bordas da cidade se levantam e se dobram por baixo até fechar a esfera, enquanto uma faixa de luz percorre os prédios do squad até a costa; desdobrar faz o caminho inverso, e apertar de novo no meio da animação volta de onde está. Os prédios apontam para fora, os agentes ficam no polo norte, o planeta flutua num céu estrelado com uma atmosfera ciano, e o polo oposto tem um núcleo decorativo (anéis, antena e farol). Arrastar o planeta (ou o espaço em volta) gira o mundo; os agentes do outro lado somem até você girar até eles. Zoom, rotação, selecionar, arrastar agentes para outro hexágono, Deslocar e duplo clique para recrutar funcionam como na cidade plana, e a transmorph para o escritório também. A escolha fica salva e vai no backup. Sem WebGL, a cidade continua plana.

- **Clique em um agente** (marcador, card do escritório ou lista lateral): seleciona, mostra o **Perfil do agente** e abre três **balões cinzas** em arco sobre o marcador dele, na cidade e no escritório: o **celular** abre a **conversa com ele**, descrita logo abaixo, as **setas** entram no modo **Deslocar** e o **lápis** abre o estúdio para editar. No modo Deslocar, um aviso no topo do mapa mostra quem está sendo movido (com **Cancelar**), o agente acompanha o cursor como prévia e uma etiqueta diz o que há sob o cursor ("Slot livre", "Ocupado por PIXEL" ou, no escritório, "Mesa A-03 · Open Space A · livre", com as mesas livres acesas); clicar num hexágono ou numa mesa livre leva o agente para lá. Esc, Cancelar, clicar em outro agente ou trocar de vista cancela; arrastar o fundo continua movendo o mapa. Clicar no vazio esconde os balões. **Duplo clique** no agente vai direto para a conversa. O painel **Perfil do agente** mostra os dados do agente e os atalhos **Squads** e **Spawn individual**; editar fica nos balões. **Duplicar** continua no rodapé do estúdio.
- **Duplo clique em um hexágono vazio**: abre o estúdio para recrutar um agente naquele lugar. No celular, toque duas vezes. O hexágono sob o cursor acende em ciano quando está livre.
- **Conectado a**: no estúdio, cada agente é ligado a um único agente, e o padrão é o comandante. O mapa desenha essa árvore. A conexão é organizacional e não altera a rota de execução das features (que continua usando a Preferência de handoff). Ciclos não são permitidos. Ao excluir um agente, os ligados a ele voltam para o comandante.
- **Um agente por hexágono**. Agentes criados pelo botão Novo agente (ou pela tecla `A`) vão para o hexágono livre mais próximo do agente conectado. Posições do mapa antigo (x/y) são convertidas automaticamente.
- Sem WebGL, o app mostra um aviso e mantém os marcadores posicionados e clicáveis, sem a cidade 3D.

### Conversa com o agente

A conversa (duplo clique no agente) abre num celular no centro da tela, no estilo do iMessage: balões, efeito de digitando, confirmação de entrega e leitura, e rolagem suave. No celular de verdade, ela ocupa a tela inteira. O agente cumprimenta com uma das saudações da sua SOUL e, a cada abertura, oferece as opções da sua função:

| Agente | Opções |
|---|---|
| Reconhecedor PRD | Tirar uma dúvida, **Editar uma feature** (lista as features editáveis; escolher uma abre o editor de feature), **Criar nova feature** (com o bridge, a ideia enviada no chat vira a primeira mensagem da co-escrita no editor) e Falar livremente |
| Reconhecedor ADR | Tirar uma dúvida, **Ver ADRs do projeto**, **Registrar um ADR** (abre a documentação do projeto com um ADR novo), **Revisar uma feature** e Falar livremente |
| Comandante | **Status da operação** (progresso, contagem por status, próximas da fila e quem está executando), **Distribuir features**, **Iniciar operação**, **Revisões pendentes** e Falar livremente |
| Operadores | **Minhas features** (as da sua rota, com a etapa em que ele entra), **Spawn individual**, Tirar uma dúvida técnica e Falar livremente |

Cada resposta traz **Voltar ao menu**. As opções de navegação funcionam também no modo demo. A conversa livre (dúvidas, revisão de feature, perguntas sobre um ADR ou uma feature) usa o opencode pelo bridge: um turno de `opencode run` sem ferramentas, com as instruções do agente, a SOUL e o contexto da operação (briefing, squad, features e, para o ADR, a arquitetura e os ADRs). Ele só conversa e não altera nada. Sem o bridge, essas opções somem e o celular mostra como conectar. A conversa fica na memória da sessão por agente: ao reabrir, o histórico continua e o agente oferece o menu de novo.

### Vista de escritório

Um único botão de vista nos controles do mapa (ou a tecla `V`) alterna entre a **cidade hexagonal** e um **escritório isométrico 3D**. O ícone dele é um pequeno cubo com as duas faces, que gira a cada troca. A troca é um **transmorph cinematográfico** (~1,2 s), como entrar no mundo invertido: faixas de cinema entram na tela, a vista atual tomba e gira até ficar de perfil, um feixe de luz e um piscar de luzes marcam o corte, e a outra vista surge por baixo, completando o giro até assentar. Os ícones dos agentes viajam de uma vista para a outra (como o morph do PowerPoint) e pousam nos seus lugares; os cards do escritório se recolhem para dentro dos ícones na saída e surgem em sequência na chegada. Ao voltar para a cidade, os prédios ressurgem em onda do centro para a borda, como hologramas brancos que esfriam até o tom grafite, e o mapa já fica clicável enquanto a onda termina. Com **Movimento** desligado, com redução de movimento no sistema ou sem WebGL, a troca é imediata (ou um fade curto). A escolha fica salva. O escritório tem 8 salas: 24 baias, 6 lugares na mesa de reunião e a War Room, no fim do corredor:

| Sala | Mesas |
|---|---|
| 01 Sala de Comando | CMD-1…2 |
| 02 Reconhecimento | REC-1…2 |
| 03 Sala de Reunião | R-1…6 |
| 04 Open Space B | B-01…04 |
| 05 Open Space A | A-01…08 |
| 06 Lab | LAB-1…4 |
| 07 Open Space C | C-01…04 |
| 08 War Room | nenhuma (abre o chat da operação) |

- Cada agente ocupa uma mesa. O comandante começa na Sala de Comando, os reconhecedores ADR e PRD no Reconhecimento, e os outros na primeira mesa livre (Open Space A, depois as salas generalistas Open Space B e C, depois o Lab). Agentes salvos em salas que não existem mais (Foco, Estúdio, Operações, Coworking) são realocados sozinhos.
- A **War Room** (a sala vermelha) ocupa a ponta leste, do fundo à frente, e o corredor termina na porta dela. Tem uma mesa de crise com mapa tático, cadeiras em volta, telões na parede do fundo, fitas de LED e luz vermelha. Sem operação ela fica em penumbra; enquanto o comandante planeja, aguarda aprovação ou a squad executa, ela **acende**: telões e mesa ligados, a luz e as fitas pulsam, o mapa rola e o rótulo mostra **AO VIVO** (pausado, fica acesa sem pulsar). Ela não tem mesas: **clicar nela abre o chat da operação**, com o plano e a conversa da squad.
- Cada **baia** tem mesa com gaveteiro, divisória em L, monitor com pé, teclado, mouse, caneca, luminária e cadeira giratória, todas viradas para a janela do fundo, com a cidade à noite. As paredes altas aparecem só no fundo: ao girar a câmera, elas trocam de lado e nunca tapam a sala.
- **Duplo clique numa mesa vazia** recruta um agente ali. **Clicar e arrastar** o agente leva ele para outra mesa livre; clicar numa mesa vazia ou no chão desmarca o agente e oculta o painel Perfil do agente. No estúdio, o campo **Mesa no escritório** lista as mesas livres por sala.
- As mesas mostram atividade: o **LED** na moldura do monitor fica verde (pronto), ciano pulsando (executando) ou âmbar (pausado), a tela mostra código quando a mesa está ocupada e acende forte durante a execução, a **luminária** da mesa de quem executa acende (âmbar e fraca quando pausado) e os arcos animados aparecem entre as mesas no handoff ativo. Quem já passou o bastão na feature em andamento ganha um **✓ verde** no marcador. Sobre o fundo da sala, um **relógio** mostra a hora local e o estado do squad: TRABALHANDO, PAUSADO, PLANEJANDO, AGUARDANDO APROVAÇÃO ou EM ESPERA. No modo Handoffs, os arcos roxos mostram os handoffs recentes. As conexões "Conectado a" aparecem só na cidade hexagonal.
- **Vida no escritório** (só na vista de escritório, com Movimento ligado): de tempos em tempos, de forma aleatória, os agentes saem da mesa e andam pelo corredor até outras salas. Podem se reunir na **Sala de Reunião** (2 a 4 agentes, com um selo **REUNIÃO** de transmissão sobre a cabeça e arcos verde-água com pacotes indo e voltando entre eles), visitar a mesa de outro agente (**CONVERSA**), ficar **EM CALL** na própria mesa ou fazer uma **PAUSA** no Lab ou no Reconhecimento; depois voltam para a mesa. O card com foto some enquanto o agente anda e reaparece quando ele se senta. É só visual: a mesa de cada agente não muda e nada é salvo. Por isso cada selo leva a marca **DEMO** (ex.: DEMO · REUNIÃO). Tudo volta ao lugar ao trocar de vista, ir para Handoffs, desligar o Movimento ou usar Deslocar.
- **Execução ao vivo no escritório**: quando uma sprint ou feature executa, a movimentação aleatória para e só se mexe o que a execução faz. O comandante vai à **War Room** enquanto monta o plano e espera a aprovação; aprovado, ele leva o **briefing** até a mesa do primeiro agente. Quem chama um colega faz o colega vir até a sua mesa enquanto a chamada dura, cada **handoff** é o agente levando o bastão até a mesa do próximo, e no fim a **entrega para revisão** vai até o comandante. Os agentes que não participam ficam nas mesas.
- **Popups da execução**: sobre cada agente envolvido aparece um popup com **quem** (foto, nome, especialidade, feature e etapa) e **o que** está fazendo: o estado (PLANEJANDO, AGUARDA APROVAÇÃO, TRABALHANDO, CHAMOU, ATENDENDO, PASSANDO O BASTÃO, BRIEFING, ENTREGA P/ REVISÃO, PAUSADO) e a ação atual (com o opencode, a última ferramenta usada, como "Editou app.js" ou "Rodou npm test"; na demo, as ações simuladas). O popup acompanha o agente quando ele anda, aparece mesmo com o Movimento desligado e um clique nele seleciona o agente. Na demo, com o escritório à vista, cada ação espera a caminhada terminar, então a execução fica mais lenta do que na cidade.
- **Execução na cidade**: na cidade hexagonal, quem está ativo **brilha** na cor do que está fazendo (praça pulsando, anéis saindo e uma coluna de luz: ciano trabalhando, vermelho planejando, âmbar aguardando ou pausado, azul em chamada), o marcador pulsa na mesma cor e uma etiqueta sobre ele mostra o estado (TRABALHANDO, CHAMOU, ATENDENDO...). Cada repasse de informação vira um **cometa** que percorre a conexão de quem envia até quem recebe (o briefing do comandante, o bastão para o próximo agente, a entrega para revisão), e quem recebe pulsa na chegada; a etiqueta de quem envia mostra o destino por um instante (ex.: PASSANDO O BASTÃO → FORGE). Uma chamada entre colegas aparece como uma conexão azul com sinais nos dois sentidos enquanto dura. Na demo, com a cidade à vista, as ações também aparecem uma de cada vez.
- O agente selecionado ganha um **card da mesa**, com código e sala, status, modelo, ferramentas, a feature atual e o atalho para o estúdio.
- Controles iguais aos da cidade: arrastar, zoom, botão direito para girar e `0` para centralizar.

O Three.js fica em `src/vendor/three.min.js` (r186, só as classes usadas, licença MIT). Para atualizar a versão: `node scripts/vendor-three.mjs 0.186.1`. O script instala `three` e `esbuild` em uma pasta temporária e gera o arquivo, sem adicionar dependências ao projeto.

## 🔀 Comandante e handoffs

A proposta de distribuição usa regras por escopo. Por exemplo, full-stack percorre PO, arquiteto, backend, frontend e QA. Especialidades ausentes são apontadas antes da aplicação do plano.

A simulação é sequencial, pode ser pausada, retomada ou interrompida e registra as transições. Um spawn individual atua somente com o agente selecionado. Um handoff manual escolhe origem, destino, feature e contexto, sem executar automaticamente a atividade.

## 🎮 Controles

| Controle | Ação |
|---|---|
| Arrastar o fundo | Mover o mapa |
| Botão direito + arrastar | Girar a câmera |
| `[` / `]` ou os botões de órbita (bloco com seta) | Girar a câmera 45° (cidade e escritório) |
| Duplo clique em hexágono vazio | Criar agente ali |
| `V` ou botão de vista (cubo) | Alternar cidade hexagonal / escritório (transmorph cinematográfico) |
| `P` ou botão do planeta | Na cidade: dobrar em planeta ou desdobrar |
| Roda do mouse ou `+` / `-` | Zoom |
| `0` | Centralizar e restaurar o zoom |
| Clicar no marcador, no card ou na lista | Selecionar agente e mostrar os balões de conversar, deslocar e editar |
| Balão Deslocar, depois clique num hexágono ou mesa livre | Mover o agente para lá (Esc cancela) |
| Duplo clique no agente | Abrir a conversa com ele |
| Clicar e arrastar marcador | Mover agente para outro hexágono (ou mesa) livre |
| `A` | Novo agente |
| `B` | Briefing do projeto |
| `F` | Quadro de features |
| `G` | Squad Studio |
| `L` | Log de operações |
| `Q` / `E` | Navegar entre Painel, Projetos, Rede e Handoffs |
| Logo SQUAD/CODE | Voltar ao Painel geral |
| `C` | Console do opencode |
| `H` | Ocultar ou restaurar os painéis |
| Espaço | Iniciar ou pausar a demonstração |
| `Esc` | Fechar o painel/modal |
| `?` | Ajuda de atalhos |

Os atalhos de edição não interrompem a digitação em campos de texto. Configurações oferecem movimento reduzido e velocidade de simulação.

## 💾 Dados locais e backup

Com o bridge, os dados ficam num banco SQLite local, `data/squad.db`, ao lado do `server.js` (outra pasta com `SQUAD_DATA_DIR`; o bridge usa o `better-sqlite3`, instalado com `npm install`). O banco guarda o workspace (uma tabela por entidade: agentes, squads, operações, ADRs, sprints, features, entregas, logs e handoffs), as mensagens da sala de cada operação (as 800 mais recentes), as conversas (co-escrita da feature, chat com agente e Agent Teams) e o histórico de execuções do `opencode run`, que o Console mostra em **Histórico** mesmo depois de reiniciar o bridge.

**Primeira execução.** O bridge não cria o banco sozinho. Sem `data/squad.db`, a página abre a janela **Nenhum banco encontrado**, que não fecha até a pessoa escolher como começar: **Começar do zero** (agentes e squad padrão e uma primeira operação vazia com o nome digitado, aberta em seguida para o briefing), **Carregar exemplo** (Atlas Commerce), **Importar backup** (`.json`) ou **Recuperar a cópia deste navegador** (quando houver; se outra opção for escolhida, essa cópia vira uma versão salva). A janela também mostra o caminho do banco e se o opencode foi encontrado. Nada é gravado antes da escolha.

O banco é a fonte principal: a página já chega com os dados dele, então limpar os dados do navegador, trocar de navegador ou usar `localhost` em vez de `127.0.0.1` não perde operações, squads nem agentes. O navegador guarda só uma cópia de trabalho do workspace (chave `squad-code.network.v2` no `localStorage`). Se outra aba ou janela salvou antes, a página carrega a versão do banco e guarda a sua nas versões salvas, e uma aba que volta ao foco já se atualiza. Se o bridge cair, as alterações ficam no navegador (o rodapé mostra `SALVO SÓ NO NAVEGADOR`) e vão para o banco ao recarregar a página com o bridge ativo.

**Versões salvas** (Configurações > Workspace): uma versão do workspace antes da primeira alteração de cada início do bridge, antes de importar ou restaurar e quando outra aba salva por cima; ficam as 30 mais recentes, cada uma com **Restaurar**. Na primeira subida depois da atualização, o bridge importa o `data/workspace.json` da versão anterior (e as cópias de `data/backups/`) e move os arquivos para `data/legacy-json/`.

Aberto como arquivo (`index.html`, modo demo), o workspace fica só no `localStorage`: a persistência depende das permissões e do armazenamento do navegador, e limpar os dados do navegador remove o workspace.

Use **Exportar workspace** nas configurações para guardar um backup JSON e **Importar workspace** para restaurá-lo. A importação exige confirmação, valida a estrutura e substitui o workspace atual. Falhas de gravação são sinalizadas na interface. Os dados não são sincronizados entre dispositivos.

## 🛠️ Código-fonte

```text
squad-code-network/
  index.html                 # Interface completa, pronta para abrir
  server.js                  # Bridge local: serve o HTML e executa opencode run
  db.js                      # Banco SQLite (better-sqlite3): workspace, versões, sala, conversas e execuções
  package.json               # npm start / npm test; dependência better-sqlite3
  build.py                   # Recompila o HTML sem dependências
  src/
    shell.html               # Estrutura base e ícones
    styles.css               # Tokens, componentes e layouts responsivos
    portraits.js             # Retratos incorporados em data URLs
    avatars.js               # Galeria de avatares gerada de assets/*.png (scripts/build-avatars.py)
    conventions.js           # Catálogo de diretrizes: 4+ templates por tipo de agente + subsets agrupados
    vendor/three.min.js      # Three.js embutido (gerado por scripts/vendor-three.mjs)
    city.js                  # Cidade hexagonal 3D, links, câmera e interação
    app.js                   # Estado, CRUD, formulários e simulador
  assets/                    # Retratos usados pelo protótipo
  previews/                  # Capturas reais da interface renderizada
  tests/
    bridge.test.mjs          # Testes do bridge (node --test), usa um opencode falso
    fake-opencode.mjs        # Simula opencode run --format json
    ui_test.py               # Fluxos e verificações de interface
    preview.py               # Renderiza uma captura do estado inicial
    ui-results.json          # Resultado da validação entregue
```

Após editar os arquivos em `src`, execute no diretório do pacote:

```sh
python build.py
```

O script gera `index.html`; com `python build.py --copy` também grava uma cópia `squad-code-network.html` no diretório acima da pasta do projeto. Python é necessário apenas para recompilar, não para usar o HTML já entregue. Para alterar retratos padrão no código-fonte, atualize `src/portraits.js`; trocar somente os JPEGs em `assets/` não altera o HTML. Já os avatares da galeria vêm de `assets/*.png`: basta adicionar ou trocar PNGs ali e rodar `python build.py` (requer Pillow), que reduz cada imagem para 320px e regenera `src/avatars.js`. O rótulo vem do nome do arquivo (`mother-protocol.png` → MOTHER PROTOCOL).

A cidade é uma cena Three.js (WebGL), e os marcadores/menus são elementos HTML interativos projetados sobre ela. Não é uma captura do jogo aplicada como fundo. Os retratos reutilizam recortes da imagem conceitual fornecida nesta conversa.

## ✅ Validação

Bridge: `npm test` (ou `node --test tests/bridge.test.mjs`). Os testes usam `tests/fake-opencode.mjs`, sem custo de API, e cobrem token/origem, health, execução com streaming, falha, cancelamento, validação de opções, leitura/gravação de settings.json com backup, porta ocupada e o banco SQLite (criação na primeira execução, gravação por diferença, ida e volta byte a byte, conflito de abas, versões, migração dos arquivos JSON, sala, conversas e histórico de execuções depois de reiniciar).

O fluxo completo também foi exercitado num Chrome headless contra o bridge: spawn individual, rota de 5 agentes com handoffs, revisão, aprovação e opencode.json. Uma execução real com o `opencode` criou um arquivo no diretório de trabalho.

Os testes de interface anteriores (`tests/ui_test.py`) cobrem o modo demo. Para executar os testes opcionais em um ambiente com Python e Playwright:

```sh
python -m pip install playwright
python -m playwright install chromium
python tests/ui_test.py
```

Os testes usam um Chromium encontrado no sistema ou o navegador instalado pelo Playwright. A variável `CHROMIUM_EXECUTABLE` permite indicar o executável. As novas capturas ficam em `previews/`, salvo quando `SQUAD_PREVIEW_DIR` define outro diretório.
