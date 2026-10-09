# 🗺️ SQUAD/CODE - Development Network

![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A522-339933?logo=nodedotjs&logoColor=white)
![opencode](https://img.shields.io/badge/opencode-CLI-111?logo=opencode&logoColor=white)
![Dependências](https://img.shields.io/badge/depend%C3%AAncias-better--sqlite3-0aa)
![Plataformas](https://img.shields.io/badge/Windows%20%7C%20macOS%20%7C%20Linux-suportado-555)

Interface web para montar e comandar um **squad de agentes de desenvolvimento de software**: um comandante,
dois reconhecedores (ADR e PRD) e operadores especialistas (backend, frontend, QA, DevOps...). O comandante
planeja cada sprint, você aprova o plano e os agentes executam as features de verdade com o
**opencode em modo headless** (`opencode run`), conversando entre si num chat da operação, enquanto você acompanha cada um no escritório.

Tudo roda na sua máquina: um app de página única servido por um bridge local em Node.js, que guarda os dados num banco SQLite local.

---

## 📑 Sumário

- [Como funciona](#-como-funciona)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Como rodar](#️-como-rodar)
- [Primeiro teste](#-primeiro-teste)
- [Configuração](#️-configuração)
- [Desenvolvimento, build e testes](#️-desenvolvimento-build-e-testes)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Solução de problemas](#-solução-de-problemas)
- [Segurança e custos](#-segurança-e-custos)
- [Documentação completa](#-documentação-completa)

---

## 🧩 Como funciona

```text
 Navegador (index.html)  ──HTTP + token──▶  server.js (bridge, 127.0.0.1:4317)  ──stdin──▶  opencode run
   estado, mapa 3D, chats                     valida as opções e transmite            um processo por etapa,
   e orquestração                             os eventos em streaming                 dentro de projects/<pasta>/
```

O app tem três modos de uso:

| Modo | Para quê | Precisa de |
|---|---|---|
| **Real** (`npm start`) | Agentes executam as features com o opencode | Node.js + opencode com um provedor configurado |
| **Desenvolvimento** (`npm run dev`) | Editar o código de `src/` com rebuild automático | Node.js (+ opencode para execução real) |
| **Demo** (abrir `index.html`) | Conhecer a interface com uma simulação local, sem custo | Só um navegador |

---

## ✅ Pré-requisitos

### Obrigatórios para a execução real

| Ferramenta | Versão | Para quê | Download |
|---|---|---|---|
| **Git** | qualquer versão recente | Clonar o repositório | [git-scm.com/downloads](https://git-scm.com/downloads) |
| **Node.js** | 22 ou superior (recomendado: LTS mais recente) | Rodar o bridge `server.js` e os scripts npm | [nodejs.org/pt-br/download](https://nodejs.org/pt-br/download) |
| **opencode** (CLI) | versão atual | Executar os agentes (`opencode run`) | [opencode.ai](https://opencode.ai) |
| **Provedor de modelo** | — | Autenticar o opencode (Anthropic, OpenAI, OpenRouter, Google...) | [opencode.ai/docs](https://opencode.ai/docs) |
| **Navegador moderno** com WebGL | Chrome, Edge ou Firefox atualizados | Abrir a interface (o mapa 3D usa WebGL, com fallback 2D) | [Chrome](https://www.google.com/chrome/) · [Edge](https://www.microsoft.com/edge) · [Firefox](https://www.mozilla.org/firefox/) |

### Opcionais (somente para quem vai mexer no código)

| Ferramenta | Para quê | Download |
|---|---|---|
| **Python 3.9+** | `python build.py`: build completo (regenera os avatares e a cópia standalone) | [python.org/downloads](https://www.python.org/downloads/) |
| **Pillow** | Converter `assets/*.png` na galeria de avatares (`pip install pillow`) | [pypi.org/project/pillow](https://pypi.org/project/pillow/) |
| **Playwright para Python** + Chromium | Testes de interface (`tests/ui_test.py`) | [playwright.dev/python](https://playwright.dev/python/docs/intro) |

O projeto tem **uma única dependência npm**, o `better-sqlite3` (banco SQLite local), instalada com `npm install`.

---

## 📦 Instalação

### 1. Clone o repositório

```sh
git clone https://github.com/felipeAguiarCode/squad-code-network.git
cd squad-code-network
```

### 2. Confira o Node.js e instale as dependências

```sh
node --version   # precisa ser v22 ou superior
npm install      # instala o better-sqlite3 (binário pronto para Windows, macOS e Linux)
```

### 3. Instale o opencode

O opencode é um CLI. A forma mais simples em qualquer sistema é pelo npm:

```sh
npm install -g opencode-ai
```

Outras opções (Homebrew, script de instalação e binários) estão em [opencode.ai/docs](https://opencode.ai/docs).

Depois, **abra um novo terminal** (para o `PATH` ser atualizado) e confira:

```sh
opencode --version   # ex.: 1.18.x
```

### 4. Configure um provedor no opencode

Autentique pelo menos um provedor de modelo (Anthropic, OpenAI, OpenRouter, Google...):

```sh
opencode auth login
```

O SQUAD/CODE usa a mesma configuração do opencode: ele não guarda nem pede credenciais.

---

## ▶️ Como rodar

### Modo real (com opencode)

Na pasta do projeto:

```sh
npm start
```

O terminal mostra:

```text
SQUAD/CODE bridge ativo em http://127.0.0.1:4317
Pasta dos projetos: .../squad-code-network/projects
Banco de dados: .../squad-code-network/data/squad.db
Opencode 1.18.x (C:...opencode.exe)
```

Na primeira vez, sem banco, a linha do banco diz `Banco de dados: nenhum em .../data. Abra http://127.0.0.1:4317 para
criar um.` Se o opencode não estiver no PATH, o terminal avisa logo na subida.

Abra **[http://127.0.0.1:4317](http://127.0.0.1:4317)** no navegador. O canto superior direito mostra o status do
opencode (por exemplo `OPENCODE / V1.18.x / ...`); clique nele para abrir as configurações e use
**Testar conexão** para confirmar que o bridge encontrou o `opencode`.

Para parar, use `Ctrl+C` no terminal. Encerrar o bridge também encerra as execuções em andamento.

> ⚠️ Abra sempre o endereço servido pelo bridge. Abrir o arquivo `index.html` direto cai no modo demo.

### Primeira execução: criar o banco

Num clone novo não existe `data/squad.db`, e o bridge não cria nada sozinho. Ao abrir a página aparece a janela
**Nenhum banco encontrado**, que não pode ser fechada: o app só é usado depois de escolher como começar. A janela mostra
onde o banco será criado e se o opencode foi encontrado (com **Testar de novo** depois de instalar ou configurar).

- **Começar do zero:** digite o nome da primeira operação. Cria os agentes e a squad padrão e uma operação vazia, que
  abre em seguida para você preencher o briefing.
- **Carregar exemplo:** a operação Atlas Commerce, completa, para explorar e rodar o demo.
- **Importar backup:** um `.json` exportado em Configurações > Workspace (de outra máquina, por exemplo).
- **Recuperar a cópia deste navegador:** aparece quando este navegador já tem um workspace salvo (por exemplo, depois
  de apagar a pasta `data`). Se você escolher outra opção, essa cópia vira uma versão salva no banco novo.

Nada é gravado em disco antes da escolha. Com outra aba aberta na mesma janela, a primeira a escolher cria o banco e a
outra recarrega com ele.

### Modo desenvolvimento

```sh
npm run dev                  # ou: npm run dev -- --port 5000
```

Gera o `index.html` a partir de `src/` (sem precisar de Python), inicia o bridge e observa os arquivos:
mudanças em `src/` regeneram o HTML e mudanças no `server.js` reiniciam o bridge. Recarregue a página depois de cada mudança.

### Modo demo (sem opencode)

Dê um duplo clique em `index.html` (ou arraste-o para o navegador). O status mostra `OPENCODE / NÃO CONECTADO`
e toda a operação (plano do comandante, falas, chamadas entre agentes e entregas) é uma simulação local
determinística. Nada é executado e não há custo.

---

## 🧭 Primeiro teste

Escolhendo **Carregar exemplo** na primeira execução, o workspace vem com a operação **Atlas Commerce** (squad completa, documentação preenchida e features
divididas em sprints). Como toda operação, ela começa pela **F00 Setup do projeto** na Sprint 01 (aqui, já concluída):
as outras features só rodam depois que o setup é aprovado.

1. A interface abre no **Painel geral**. Abra a operação **Atlas Commerce**.
2. Clique em **Executar sprint atual** (ou pressione a barra de espaço). O app vai para a tela **Squad**, no escritório
   isométrico, e o **chat da operação** ocupa o lugar da lista de agentes à esquerda. Ali o comandante monta o plano:
   quem trabalha em cada feature, em que ordem e com qual instrução.
3. Revise o plano e clique em **Executar plano**. Nada roda antes da sua aprovação; **Cancelar** não altera nenhuma feature.
4. Acompanhe pelo chat ou pelo escritório: cada agente diz o que vai fazer, mostra arquivos e comandos em chips e passa o
   bastão ao próximo. O chat ocupa o lado esquerdo inteiro, por cima da barra do topo; arraste a borda dele para mudar a largura (duplo
   clique volta ao padrão). Minimize o chat para ver só o escritório, com o que cada um está fazendo e falando sobre a cabeça.
5. As entregas param em **Revisão humana**. Abra a feature e aprove (ou peça uma nova iteração). Só a aprovação
   conclui a feature e libera as dependentes.

No modo real, cada etapa é um processo `opencode run` que trabalha na pasta `projects/op-001-atlas-commerce/` e é
cobrado no seu provedor. Para experimentar sem custo, troque para **Simulação local (demo)** nas configurações
(aba Opencode, campo Modo).

Atalhos úteis: `G` abre o Squad Studio, `A` cria um agente, `F` abre as features, `C` abre o console do opencode.
A lista completa está no [guia](docs/GUIA.md#-controles).

---

## ⚙️ Configuração

### Opções do bridge

| Opção | Padrão | Descrição |
|---|---|---|
| `--port <n>` ou `SQUAD_PORT` | `4317` | Porta do bridge |
| `SQUAD_OPCODE_BIN` | `opencode` | Executável do opencode (nome no `PATH` ou caminho completo) |
| `SQUAD_PROJECTS_DIR` | `./projects` | Raiz das pastas de trabalho dos agentes |
| `SQUAD_DATA_DIR` | `./data` | Pasta do banco SQLite (`squad.db`) |

Exemplos:

```sh
npm start -- --port 5000                          # qualquer sistema
SQUAD_PORT=5000 npm start                         # macOS / Linux / Git Bash
```

```powershell
$env:SQUAD_OPCODE_BIN = "C:\caminho\para\opencode.exe"; npm start   # Windows PowerShell
```

### Configurações dentro do app

No menu de configurações (botão **Configurações** no topo ou clique no status do opencode):

- **Aba Opencode:** modo (real ou demo), executável, modelo global (`provedor/modelo`), variante de raciocínio
  (sobrescreve a do agente), tempo limite (padrão 900 s), execuções simultâneas (padrão 2), ferramentas extras
  permitidas e diretórios adicionais (liberados via `permission.external_directory` do opencode).
- **Aba opencode.json:** lê, valida e grava os arquivos reais de configuração do opencode — global em
  `~/.config/opencode/opencode.json` e do projeto em `projects/<pasta>/opencode.json` — sempre com uma cópia `.bak` antes de gravar.

### Onde os agentes trabalham

Cada operação tem a sua pasta em `projects/<pasta>/` (por exemplo `projects/op-001-atlas-commerce/`), criada na
primeira execução. É nela que os agentes leem e escrevem o código que implementam: toda execução (plano do comandante,
etapas, chamadas entre colegas e chats) roda com essa pasta como diretório de trabalho, e o prompt de cada etapa manda
manter tudo dentro dela. A pasta `projects/` fica fora do git do SQUAD/CODE e não é apagada quando você exclui a
operação no app.

Cada pasta de projeto é um repositório git próprio (o bridge roda `git init` antes da primeira execução, se o Git estiver
instalado), e o git dos agentes não passa da pasta `projects/`. Assim o `git status` e os commits que os agentes fazem
são os do projeto, nunca os do repositório do SQUAD/CODE.

Os **colegas de squad** são definidos, a cada execução, num arquivo de configuração temporário do opencode
(`OPENCODE_CONFIG`), como subagentes que o agente da etapa pode chamar pela ferramenta `task`. O relatório final do
colega volta embutido na resposta da ferramenta; o texto intermediário do colega não é transmitido (é o próprio
opencode que resume). O arquivo temporário é apagado ao fim da execução.

### Dados do workspace

Com o bridge, tudo fica num banco SQLite local, `data/squad.db` ao lado do `server.js` (fora do git), criado na
primeira execução (veja acima). Para usar outra pasta, defina `SQUAD_DATA_DIR`. O banco guarda:

- **Workspace:** agentes, squads, operações, sprints, features, entregas, logs e handoffs, uma tabela por entidade.
  Dá para consultar com qualquer cliente SQLite (`select name, role from agents`, `select title, status from features`).
- **Sala da operação:** as mensagens de cada operação (as 800 mais recentes).
- **Conversas:** co-escrita da feature, chat com agente e Agent Teams.
- **Histórico de execuções:** cada `opencode run` com seus eventos. Fica no Console > **Histórico**, inclusive depois de
  reiniciar o bridge.

O banco é a fonte principal: limpar os dados do navegador, trocar de navegador ou abrir por `localhost:4317` em vez
de `127.0.0.1:4317` não perde nada. O navegador guarda só uma cópia de trabalho do workspace.

**Versões salvas** (Configurações > Workspace): o banco guarda uma versão do workspace antes da primeira alteração de
cada início do bridge, antes de importar ou restaurar e quando outra aba salva por cima (as 30 mais recentes), e
qualquer uma pode ser restaurada. Se o bridge cair, as alterações ficam no navegador (o rodapé mostra
`SALVO SÓ NO NAVEGADOR`) e vão para o banco ao recarregar a página com o bridge ativo.

Quem usava a versão anterior (arquivo `data/workspace.json`): na primeira subida o bridge importa o arquivo e as cópias
de `data/backups/` para o banco e move os arquivos para `data/legacy-json/`.

Aberto como arquivo (`index.html`, modo demo), o workspace fica só no navegador. Use **Exportar workspace** nas
configurações para fazer backup em JSON e **Importar workspace** para restaurar.

---

## 🛠️ Desenvolvimento, build e testes

> `index.html` é gerado pelo build: edite os arquivos em `src/` e rode `npm run dev` ou `python build.py`.

| Comando | O que faz |
|---|---|
| `npm run dev` | Build do `index.html`, bridge e rebuild automático |
| `npm start` | Só o bridge (`node server.js`) |
| `python build.py` | Build completo: regenera `src/avatars.js` (precisa de Pillow) e `index.html`. No macOS/Linux use `python3` |
| `python build.py --copy` | O mesmo, e também grava uma cópia em `../squad-code-network.html` (fora da pasta do projeto) |
| `npm test` | Testes do bridge (`node --test`), com um opencode falso: sem custo de API |
| `node --test --test-name-pattern "<nome>" tests/bridge.test.mjs` | Roda um único teste do bridge |
| `node --check src/app.js` | Verificação rápida de sintaxe depois de editar |
| `node scripts/vendor-three.mjs [versão]` | Regenera `src/vendor/three.min.js` (baixa three + esbuild numa pasta temporária) |

Testes de interface (opcionais):

```sh
python -m pip install playwright
python -m playwright install chromium
python tests/ui_test.py
```

`CHROMIUM_EXECUTABLE` indica outro Chromium e `SQUAD_PREVIEW_DIR` muda a pasta das capturas (padrão `previews/`).

---

## 📁 Estrutura do projeto

```text
squad-code-network/
├── index.html          # app completo, gerado pelo build (não editar)
├── server.js           # bridge local: serve o app e executa opencode run
├── db.js               # banco SQLite (workspace, versões, sala, conversas, execuções)
├── package.json        # scripts npm e a dependência better-sqlite3
├── build.py            # build completo (avatares + index.html)
├── src/                # código-fonte da interface
│   ├── shell.html      # estrutura base
│   ├── styles.css      # estilos
│   ├── app.js          # estado, UI e orquestração
│   ├── city.js         # mapa 3D (cidade hexagonal e escritório)
│   ├── conventions.js  # catálogo de diretrizes dos agentes
│   ├── souls.js        # personalidades dos agentes
│   ├── portraits.js    # retratos embutidos
│   ├── avatars.js      # galeria gerada de assets/*.png
│   └── vendor/         # three.min.js embutido
├── scripts/            # dev runner, geração de avatares e vendor do Three.js
├── assets/             # imagens fonte dos avatares
├── tests/              # testes do bridge (opencode falso) e de interface
├── docs/GUIA.md        # guia completo das funcionalidades
└── projects/           # pastas de trabalho dos agentes (criada ao iniciar, fora do git)
```

---

## 🩺 Solução de problemas

| Sintoma | Causa provável e solução |
|---|---|
| Status `OPENCODE / NÃO CONECTADO` | A página foi aberta como arquivo (`file://`) ou o bridge não está rodando. Rode `npm start` e abra `http://127.0.0.1:4317`. |
| `Executável "opencode" não encontrado no PATH.` | O opencode não está instalado ou o terminal é anterior à instalação. Abra um novo terminal e confira `opencode --version`, ou aponte o caminho completo em `SQUAD_OPCODE_BIN` ou no campo Executável das configurações. |
| `Token do bridge inválido. Recarregue a página servida pelo bridge.` | O bridge reiniciou e gerou um novo token. Recarregue a página (F5). |
| `a porta 4317 já está em uso` | Outro SQUAD/CODE (ou outro programa) já usa a porta. Feche-o ou use `npm start -- --port 4318`. O segundo bridge sai sem tocar no banco. |
| Janela **Nenhum banco encontrado** | Primeira execução nesta pasta (ou `data/squad.db` foi apagado ou movido). Escolha como começar; para voltar a um banco que está em outra pasta, defina `SQUAD_DATA_DIR` e reinicie. |
| `index.html não encontrado` | A interface não foi gerada. Rode `npm run dev` (ou `python build.py`) na pasta do projeto. |
| Execução bloqueada ao clicar em executar | A operação tem campos vazios. Preencha o que o aviso **Execução bloqueada** lista (briefing, visão, escopo, glossário, arquitetura, ADRs...). |
| Modelo não é usado / erro de modelo | No opencode o modelo tem o formato `provedor/modelo` (ex.: `anthropic/claude-sonnet-4-6`). Aliases sem provedor são ignorados. Configure o modelo nas configurações ou no agente. |
| Erro de autenticação nas etapas | Rode `opencode auth login` e escolha o provedor de novo. |
| Mapa 3D não aparece ou fica lento | O navegador está sem WebGL. Ative a aceleração por hardware; sem WebGL o app usa a projeção 2D. |
| Agentes, squads ou operações sumiram | Abra pelo bridge (`npm start`): os dados ficam em `data/squad.db`. Se o rodapé mostrar `SALVO SÓ NO NAVEGADOR`, recarregue a página com o bridge ativo. Versões anteriores ficam em Configurações > Workspace > **Versões salvas**. Pelo `index.html` (demo) os dados ficam só no navegador. |
| `npm warn allow-scripts better-sqlite3 ... (install: node-gyp rebuild)` no `npm install` | Pode ignorar: o `better-sqlite3` já traz binários prontos para Windows, macOS e Linux, e o script de compilação bloqueado não é necessário. Não precisa aprovar. |
| `Dependência ausente (better-sqlite3)` ao iniciar | Rode `npm install` na pasta do projeto. Se o erro for ao carregar o módulo (por exemplo, depois de trocar a versão do Node ou copiar a pasta de outra máquina), apague `node_modules` e rode `npm install` de novo. |

---

## 🔒 Segurança e custos

- O bridge escuta **apenas em `127.0.0.1`**. Toda chamada `/api` exige um token aleatório gerado a cada início, e os
  cabeçalhos `Host`/`Origin` precisam ser locais.
- As opções enviadas ao opencode são validadas por whitelist e o prompt vai por stdin, sem interpolação em shell.
- As permissões dos agentes seguem a configuração do opencode. O modo `--auto` (aprovar tudo que não estiver negado)
  só é usado quando você o ativa; revise as permissões no seu `opencode.json`.
- **Execuções reais são cobradas no seu provedor.** Use o tempo limite e o modo demo
  para controlar o gasto. O console (tecla `C`) mostra o custo acumulado de cada etapa.

---

## 📚 Documentação completa

O [**Guia completo**](docs/GUIA.md) detalha todas as funcionalidades:

- [Como a execução funciona](docs/GUIA.md#-como-a-execução-funciona): comandante, chat da operação, bastão e chamadas entre agentes
- [Configurações do opencode](docs/GUIA.md#️-configurações-do-opencode)
- [Estúdio de agentes](docs/GUIA.md#-estúdio-de-agentes), [Diretrizes](docs/GUIA.md#-diretrizes-do-agente-convenções-e-boas-práticas) e [Squad Studio](docs/GUIA.md#-squads-e-squad-studio)
- [Projetos, features, documentação e exportação](docs/GUIA.md#-projetos-e-features)
- [Mapa da squad: cidade hexagonal e escritório](docs/GUIA.md#️-tela-squad-cidade-hexagonal)
- [Controles e atalhos](docs/GUIA.md#-controles)

Links úteis do opencode: [documentação](https://opencode.ai/docs) ·
[instalação](https://opencode.ai/docs) · [provedores](https://opencode.ai/docs)
