# 🗺️ SQUAD/CODE - Development Network

![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=nodedotjs&logoColor=white)
![Claude Code](https://img.shields.io/badge/Claude%20Code-CLI-D97757?logo=anthropic&logoColor=white)
![Dependências](https://img.shields.io/badge/depend%C3%AAncias-zero-0aa)
![Plataformas](https://img.shields.io/badge/Windows%20%7C%20macOS%20%7C%20Linux-suportado-555)

Interface web para montar e comandar um **squad de agentes de desenvolvimento de software**: um comandante,
dois reconhecedores (ADR e PRD) e operadores especialistas (backend, frontend, QA, DevOps...). O comandante
planeja cada sprint, você aprova o plano e os agentes executam as features de verdade com o
**Claude Code em modo headless** (`claude -p`), conversando entre si numa sala de operação.

Tudo roda na sua máquina: um app de página única, sem dependências, servido por um bridge local em Node.js.

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
 Navegador (index.html)  ──HTTP + token──▶  server.js (bridge, 127.0.0.1:4317)  ──stdin──▶  claude -p
   estado, mapa 3D, chats                     valida as opções e transmite            um processo por etapa,
   e orquestração                             os eventos em streaming                 dentro de projects/<pasta>/
```

O app tem três modos de uso:

| Modo | Para quê | Precisa de |
|---|---|---|
| **Real** (`npm start`) | Agentes executam as features com o Claude Code | Node.js + Claude Code autenticado |
| **Desenvolvimento** (`npm run dev`) | Editar o código de `src/` com rebuild automático | Node.js (+ Claude Code para execução real) |
| **Demo** (abrir `index.html`) | Conhecer a interface com uma simulação local, sem custo | Só um navegador |

---

## ✅ Pré-requisitos

### Obrigatórios para a execução real

| Ferramenta | Versão | Para quê | Download |
|---|---|---|---|
| **Node.js** | 18 ou superior (recomendado: LTS mais recente) | Rodar o bridge `server.js` e os scripts npm | [nodejs.org/pt-br/download](https://nodejs.org/pt-br/download) |
| **Claude Code** (CLI) | versão atual | Executar os agentes (`claude -p`) | [Guia de instalação oficial](https://code.claude.com/docs/pt/setup) |
| **Conta Claude** | Pro, Max, Team, Enterprise ou Console (API) | Autenticar o Claude Code. O plano gratuito do claude.ai não inclui o Claude Code | [claude.ai](https://claude.ai) · [console.anthropic.com](https://console.anthropic.com) |
| **Git** | qualquer versão recente | Clonar o repositório | [git-scm.com/downloads](https://git-scm.com/downloads) |
| **Navegador moderno** com WebGL | Chrome, Edge ou Firefox atualizados | Abrir a interface (o mapa 3D usa WebGL, com fallback 2D) | [Chrome](https://www.google.com/chrome/) · [Edge](https://www.microsoft.com/edge) · [Firefox](https://www.mozilla.org/firefox/) |

> **Windows:** o [Git for Windows](https://git-scm.com/downloads/win) é recomendado para o Claude Code usar o Bash.
> Sem ele, o Claude Code usa o PowerShell.

Requisitos do Claude Code, segundo a documentação oficial: macOS 13+, Windows 10 1809+ (ou Server 2019+),
Ubuntu 20.04+, Debian 10+ ou Alpine 3.19+; 4 GB de RAM; conexão com a internet.

### Opcionais (somente para quem vai mexer no código)

| Ferramenta | Para quê | Download |
|---|---|---|
| **Python 3.9+** | `python build.py`: build completo (regenera os avatares e a cópia standalone) | [python.org/downloads](https://www.python.org/downloads/) |
| **Pillow** | Converter `assets/*.png` na galeria de avatares (`pip install pillow`) | [pypi.org/project/pillow](https://pypi.org/project/pillow/) |
| **Playwright para Python** + Chromium | Testes de interface (`tests/ui_test.py`) | [playwright.dev/python](https://playwright.dev/python/docs/intro) |

O projeto **não tem dependências npm**: não é preciso rodar `npm install`.

---

## 📦 Instalação

### 1. Clone o repositório

```sh
git clone https://github.com/felipeAguiarCode/squad-code-network.git
cd squad-code-network
```

### 2. Confira o Node.js

```sh
node --version   # precisa ser v18 ou superior
```

### 3. Instale o Claude Code

Escolha o comando do seu sistema (instalador nativo, recomendado pela Anthropic):

**Windows (PowerShell)**

```powershell
irm https://claude.ai/install.ps1 | iex
```

**Windows (CMD)**

```bat
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
```

**macOS, Linux ou WSL**

```sh
curl -fsSL https://claude.ai/install.sh | bash
```

<details>
<summary>Outras formas de instalar (Homebrew, WinGet, npm)</summary>

```sh
brew install --cask claude-code              # macOS (Homebrew)
winget install Anthropic.ClaudeCode          # Windows (WinGet)
npm install -g @anthropic-ai/claude-code     # npm (requer Node.js 22+; não use sudo)
```

Instalações via Homebrew e WinGet não se atualizam sozinhas (`brew upgrade claude-code` / `winget upgrade Anthropic.ClaudeCode`).
Mais opções em [code.claude.com/docs/pt/setup](https://code.claude.com/docs/pt/setup).

</details>

Depois, **abra um novo terminal** (para o `PATH` ser atualizado) e confira:

```sh
claude --version   # ex.: 2.1.x (Claude Code)
claude doctor      # diagnóstico da instalação (opcional)
```

### 4. Autentique o Claude Code

Rode `claude` uma vez e siga o login no navegador. Depois saia com `/exit`.

```sh
claude
```

Se a variável `ANTHROPIC_API_KEY` estiver definida, o Claude Code pede para aprovar a chave em vez de abrir o navegador.
O SQUAD/CODE usa essa mesma autenticação: ele não guarda nem pede credenciais.

---

## ▶️ Como rodar

### Modo real (com Claude Code)

Na pasta do projeto:

```sh
npm start
```

O terminal mostra:

```text
SQUAD/CODE bridge ativo em http://127.0.0.1:4317
Claude Code: claude / pasta dos projetos: .../squad-code-network/projects
```

Abra **[http://127.0.0.1:4317](http://127.0.0.1:4317)** no navegador. O canto superior direito mostra o status do
Claude Code (por exemplo `CLAUDE CODE / V2.1.x / ACCEPTEDITS`); clique nele para abrir as configurações e use
**Testar conexão** para confirmar que o bridge encontrou o `claude`.

Para parar, use `Ctrl+C` no terminal. Encerrar o bridge também encerra as execuções em andamento.

> ⚠️ Abra sempre o endereço servido pelo bridge. Abrir o arquivo `index.html` direto cai no modo demo.

### Modo desenvolvimento

```sh
npm run dev                  # ou: npm run dev -- --port 5000
```

Gera o `index.html` a partir de `src/` (sem precisar de Python), inicia o bridge e observa os arquivos:
mudanças em `src/` regeneram o HTML e mudanças no `server.js` reiniciam o bridge. Recarregue a página depois de cada mudança.

### Modo demo (sem Claude Code)

Dê um duplo clique em `index.html` (ou arraste-o para o navegador). O status mostra `CLAUDE CODE / NÃO CONECTADO`
e toda a operação (plano do comandante, falas, chamadas entre agentes e entregas) é uma simulação local
determinística. Nada é executado e não há custo.

---

## 🧭 Primeiro teste

O workspace já vem com a operação de exemplo **Atlas Commerce** (squad completa, documentação preenchida e features
divididas em sprints).

1. A interface abre no **Painel geral**. Abra a operação **Atlas Commerce**.
2. Clique em **Executar sprint atual** (ou pressione a barra de espaço). A **Sala de operação** abre e o comandante
   monta o plano: quem trabalha em cada feature, em que ordem e com qual instrução.
3. Revise o plano e clique em **Executar plano**. Nada roda antes da sua aprovação; **Cancelar** não altera nenhuma feature.
4. Acompanhe os agentes na sala: cada um diz o que vai fazer, mostra arquivos e comandos em chips e passa o bastão ao próximo.
5. As entregas param em **Revisão humana**. Abra a feature e aprove (ou peça uma nova iteração). Só a aprovação
   conclui a feature e libera as dependentes.

No modo real, cada etapa é um processo `claude -p` que trabalha na pasta `projects/op-001-atlas-commerce/` e é
cobrado na sua conta. Para experimentar sem custo, troque para **Simulação local (demo)** nas configurações
(aba Claude Code, campo Modo).

Atalhos úteis: `G` abre o Squad Studio, `A` cria um agente, `F` abre as features, `C` abre o console do Claude Code.
A lista completa está no [guia](docs/GUIA.md#-controles).

---

## ⚙️ Configuração

### Opções do bridge

| Opção | Padrão | Descrição |
|---|---|---|
| `--port <n>` ou `SQUAD_PORT` | `4317` | Porta do bridge |
| `SQUAD_CLAUDE_BIN` | `claude` | Executável do Claude Code (nome no `PATH` ou caminho completo) |
| `SQUAD_PROJECTS_DIR` | `./projects` | Raiz das pastas de trabalho dos agentes |

Exemplos:

```sh
npm start -- --port 5000                          # qualquer sistema
SQUAD_PORT=5000 npm start                         # macOS / Linux / Git Bash
```

```powershell
$env:SQUAD_CLAUDE_BIN = "C:\caminho\para\claude.exe"; npm start   # Windows PowerShell
```

### Configurações dentro do app

No menu de configurações (botão **Configurações** no topo ou clique no status do Claude Code):

- **Aba Claude Code:** modo (real ou demo), executável, modo de permissão (padrão `acceptEdits`), modelo e esforço
  globais, orçamento máximo por etapa (`--max-budget-usd`), tempo limite (padrão 900 s), execuções simultâneas
  (padrão 2), regras extras de `allowedTools` e `--add-dir`.
- **Aba settings.json:** lê, valida e grava os `settings.json` reais do Claude Code (usuário, projeto ou local),
  sempre com uma cópia `.bak` antes de gravar.

### Onde os agentes trabalham

Cada operação tem a sua pasta em `projects/<pasta>/` (por exemplo `projects/op-001-atlas-commerce/`), criada na
primeira execução. É nela que os agentes leem e escrevem o código que implementam. A pasta `projects/` fica fora do
git e não é apagada quando você exclui a operação no app.

### Dados do workspace

Agentes, squads, operações e features ficam no `localStorage` do navegador (chave `squad-code.network.v2`).
Use **Exportar workspace** nas configurações para fazer backup em JSON e **Importar workspace** para restaurar.
Limpar os dados do navegador apaga o workspace.

---

## 🛠️ Desenvolvimento, build e testes

> `index.html` é gerado pelo build: edite os arquivos em `src/` e rode `npm run dev` ou `python build.py`.

| Comando | O que faz |
|---|---|
| `npm run dev` | Build do `index.html`, bridge e rebuild automático |
| `npm start` | Só o bridge (`node server.js`) |
| `python build.py` | Build completo: regenera `src/avatars.js` (precisa de Pillow), `index.html` e a cópia `../squad-code-network.html` |
| `npm test` | Testes do bridge (`node --test`), com um Claude falso: sem custo de API |
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
├── server.js           # bridge local: serve o app e executa claude -p
├── package.json        # scripts npm (sem dependências)
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
├── tests/              # testes do bridge (Claude falso) e de interface
├── docs/GUIA.md        # guia completo das funcionalidades
└── projects/           # pastas de trabalho dos agentes (criada ao iniciar, fora do git)
```

---

## 🩺 Solução de problemas

| Sintoma | Causa provável e solução |
|---|---|
| Status `CLAUDE CODE / NÃO CONECTADO` | A página foi aberta como arquivo (`file://`) ou o bridge não está rodando. Rode `npm start` e abra `http://127.0.0.1:4317`. |
| `Executável "claude" não encontrado no PATH.` | O Claude Code não está instalado ou o terminal é anterior à instalação. Abra um novo terminal e confira `claude --version`, ou aponte o caminho completo em `SQUAD_CLAUDE_BIN` ou no campo Executável das configurações. |
| `Token do bridge inválido. Recarregue a página servida pelo bridge.` | O bridge reiniciou e gerou um novo token. Recarregue a página (F5). |
| `listen EADDRINUSE ... 4317` | A porta já está em uso (outro bridge aberto?). Feche-o ou use `npm start -- --port 5000`. |
| Execução bloqueada ao clicar em executar | A operação tem campos vazios. Preencha o que o aviso **Execução bloqueada** lista (briefing, visão, escopo, glossário, arquitetura, ADRs...). |
| Permissões negadas no console | Em modo headless ninguém aprova pedidos de permissão. Ajuste o modo de permissão ou as regras de `allowedTools` nas configurações. |
| Erro de autenticação nas etapas | Rode `claude` no terminal e faça login de novo. Confira se o plano inclui o Claude Code. |
| Mapa 3D não aparece ou fica lento | O navegador está sem WebGL. Ative a aceleração por hardware; sem WebGL o app usa a projeção 2D. |
| Agentes, squads ou operações sumiram | O workspace vive no `localStorage` do navegador e da origem usados. Use o mesmo endereço (`127.0.0.1:4317`) e mantenha backups com **Exportar workspace**. |

---

## 🔒 Segurança e custos

- O bridge escuta **apenas em `127.0.0.1`**. Toda chamada `/api` exige um token aleatório gerado a cada início, e os
  cabeçalhos `Host`/`Origin` precisam ser locais.
- As opções enviadas ao Claude Code são validadas por whitelist e o prompt vai por stdin, sem interpolação em shell.
- O modo de permissão `bypassPermissions` desliga todas as verificações do Claude Code: use só em ambientes isolados.
- **Execuções reais são cobradas na sua conta Claude.** Use o orçamento máximo por etapa, o tempo limite e o modo demo
  para controlar o gasto. O console (tecla `C`) mostra o custo de cada etapa.

---

## 📚 Documentação completa

O [**Guia completo**](docs/GUIA.md) detalha todas as funcionalidades:

- [Como a execução funciona](docs/GUIA.md#-como-a-execução-funciona): comandante, sala de operação, bastão e chamadas entre agentes
- [Configurações do Claude Code](docs/GUIA.md#️-configurações-do-claude-code)
- [Estúdio de agentes](docs/GUIA.md#-estúdio-de-agentes), [Diretrizes](docs/GUIA.md#-diretrizes-do-agente-convenções-e-boas-práticas) e [Squad Studio](docs/GUIA.md#-squads-e-squad-studio)
- [Projetos, features, documentação e exportação para o Claude Code](docs/GUIA.md#-projetos-e-features)
- [Mapa da squad: cidade hexagonal e escritório](docs/GUIA.md#️-tela-squad-cidade-hexagonal)
- [Controles e atalhos](docs/GUIA.md#-controles)

Links úteis do Claude Code: [instalação](https://code.claude.com/docs/pt/setup) ·
[início rápido](https://code.claude.com/docs/pt/quickstart) ·
[solução de problemas da instalação](https://code.claude.com/docs/en/troubleshoot-install)
