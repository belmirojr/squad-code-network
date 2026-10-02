# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SQUAD/CODE is a single-page, dependency-free web app for organizing a squad of software-development
agents (commander, ADR/PRD "reconhecedores", operators) that execute features through headless Claude
Code (`claude -p`). UI text is Portuguese (pt-BR); code identifiers are English. Not a git repo.

## Commands

```sh
npm run dev                 # build index.html from src/, start the bridge, rebuild on src/ changes, restart on server.js changes
npm start                   # node server.js → http://127.0.0.1:4317 (--port N or SQUAD_PORT; SQUAD_CLAUDE_BIN for another claude; SQUAD_PROJECTS_DIR for another projects root)
python build.py             # full build: regenerates src/avatars.js (needs Pillow), writes index.html AND ../squad-code-network.html
npm test                    # bridge tests: node --test tests/bridge.test.mjs (uses tests/fake-claude.mjs, no API cost)
node --test --test-name-pattern "<test name>" tests/bridge.test.mjs   # single bridge test
node --check src/app.js     # quick syntax check after edits
python tests/ui_test.py     # optional UI tests (needs Playwright + Chromium; CHROMIUM_EXECUTABLE, SQUAD_PREVIEW_DIR)
node scripts/vendor-three.mjs [version]   # regenerate src/vendor/three.min.js (only classes in scripts/three-entry.js)
```

`index.html` is a build artifact — never edit it; edit `src/` and rebuild. Opening `index.html` via
`file://` runs in demo mode (deterministic local simulation, no bridge). `npm run dev` does not
regenerate `src/avatars.js` nor the `../squad-code-network.html` copy; `python build.py` does.

## Build model and its pitfalls

`build.py` / `scripts/dev.mjs` inline `src/styles.css` into `src/shell.html` and concatenate, **in this
order**, into one classic `<script>`: `portraits.js`, `avatars.js`, `conventions.js`,
`souls.js`, `vendor/three.min.js`, `city.js`, `app.js`. Consequences:
- Everything shares one global scope; `state`, `ui`, `MapNetwork`, `ICONS`, `ROLES`… are reachable
  from the page (handy for headless-browser checks; `window.SquadCode.getSnapshot()` returns a clone of
  the workspace).
- `app.js` initializes state at load time (`seedWorkspace` / `normalizeWorkspace`), so any helper used
  during initialization must be a **function declaration** (hoisted). A `const` arrow defined later in
  the file throws a TDZ `ReferenceError` and the whole app fails to boot.
- `src/app.js` is written in dense, minified-style long lines. Make edits by exact unique string
  replacement and re-run `node --check`; do not reformat the file.
- Asset pipeline: `scripts/build-avatars.py` turns `assets/*.png` into 320px JPEG data URLs in
  `src/avatars.js` (`avatar-<file-name>` keys merged into `PORTRAITS`). `src/portraits.js` holds the
  embedded role portraits. Template agents get their photo from `TEMPLATE_AVATARS` (codename → `PORTRAITS`
  key), not from a stored copy: `image` stays `''` ("Automático") and `portrait(a)` resolves it, falling back
  to the specialty's default agent (`rolePortrait`). A new asset or template needs an entry there.

## Architecture

**`server.js` (bridge, zero deps).** Serves `index.html` (injecting a per-start random token), binds to
127.0.0.1 only, and every `/api` call needs the token plus local Host/Origin. `/api/runs` spawns
`claude -p --output-format stream-json --verbose --permission-prompts none`, writes the agent's system
prompt to a temp file passed as `--append-system-prompt-file`, sends the step prompt via **stdin**
(never shell-interpolated), and streams events back. Options (permission mode, effort, tools, model,
dirs, budget, `partial` → `--include-partial-messages`) are whitelisted. Limits: body 2 MB, prompt 400k chars, system prompt 100k (silently
sliced). It also reads/writes Claude `settings.json` files (user/project/local) with a `.bak` copy.
Every project runs in its own folder: the `project` option (a plain slug, `FOLDER_RE`, no Windows reserved names) becomes the
cwd `<PROJECTS_DIR>/<folder>` (`./projects` next to `server.js`, created at start; `SQUAD_PROJECTS_DIR` for tests), created on the
first run. Because Claude Code loads CLAUDE.md from every folder above the cwd, those runs also get `--settings <temp file>` with
`claudeMdExcludes` (`APP_MEMORY_EXCLUDES`) so agents never see this app's own CLAUDE.md/AGENTS.md/rules. `cwd` stays as a fallback
(tests, direct API use). The settings.json project/local scopes take `project=` as well.
Squad colleagues: the `agents` option (whitelisted CLI subagent fields: `description`, `prompt`, `tools`, `model`, `effort`) is written
to a temp file passed as `--agents <file>`, and `forwardSubagents:true` adds `--forward-subagent-text`. Runs with agents get
`CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`, so an `Agent` tool call runs in the foreground and its tool_result is the colleague's
report (framed as "[Subagent hand-back] ... The report follows:" with indented lines; `subagentReport` unwraps it).

**`src/app.js` (state, UI, orchestration).**
- One persisted `state` object (localStorage key `squad-code.network.v2`, export/import as JSON).
  `normalizeWorkspace` rebuilds it field by field from a whitelist: **a new persisted field must be
  added there (and to `seedWorkspace`), or it is dropped on reload/import.** Transient UI state lives
  in `ui`.
- `render()` is the central re-render. Full pages (`home`, `projects`, `squads`) render through
  `opsBlock(id, signature, html)`: a block's innerHTML is replaced only when its JSON signature changes,
  so background renders (runner ticks, logs) don't wipe inputs the user is typing in. Keep signatures
  free of values the user is editing.
- Interaction is delegated: one document `click` dispatcher switches on `data-action` (the element's
  `data-id` arrives as `agentId`), and a `submit` map routes by form id (`#agentForm → saveAgent`,
  `#projectForm → saveProject`, `#squadForm`, …).
- Modals: `showModal`/`closeModal` (`ui.modal`, `ui.draft`). The agent studio is a modal with tabs
  (`editorTab`). `confirmAction` itself opens a modal and replaces the current one — don't call it
  from inside the agent studio.
- Views (`ui.view`): `home` (Painel), `projects` (operations: briefing + features, all in-page),
  `network` (Squad map), `handoffs`, `squads` (Squad Studio, reached from Painel/HUD/key `G`).
  Entering the Squad Studio or showing another squad (`ui.sqShown`, reset when the view changes) plays `sqBuild` once: the
  command tree draws itself (trunk with a spark, band lines, labels, buses, stubs, nodes), timed from the real layout through
  CSS custom properties under `.sq-build`, which is dropped at the end so the ambient pulses resume. Re-renders never replay it.
- Chats: the feature editor's co-writing chat (`ui.featureChat`, `runCoWrite`) and the agent chat (`ui.agentChat`,
  modal kind `agent-chat`, opened by `openAgentChat` on a double click on an agent in the `network` view; a single click selects) share one engine
  and the same DOM ids (`#feMsgs`, `#feChatInput`): generic helpers read `chatNow()` and branch on the chat's `kind`.
  The agent chat offers `AGENT_CHAT_MENUS` per `chatFamily` (commander/adr/prd/op), handled by `agentChatAct`; free
  talk is `runAgentChat` (bridge, no tools). Both conversations live in memory for the session (`ui.featureChats`, `ui.agentChats`).
  Every chat turn runs with `CHAT_RUN` over `runOptionsFor` (`tools:[]`, `permissionMode:'dontAsk'`, `partial:true`); never
  `plan` (its planning flow made replies slow and the model wrote fake tool calls). `claude -p` never offers AskUserQuestion, so
  an agent asks with `"ask":{question,options}` in the reply's ```json block (`COWRITE_SYSTEM`/`AGENT_CHAT_SYSTEM`): `chatAsk`
  turns it into `id:'ask'` buttons (`agentChatChoose` sends the pick back as the person's message; typing also answers).
  `chatStream` grows one live bubble from the text deltas (hidden from ```json on) and `chatSettle` fills it at the end.
  Both chat headers show the effective model (`coWriterModel`) and an effort chip (`effortChipHTML`: 5-bar meter; the model's
  default, dashed, when no level is set; none for Haiku), following the same override rules as `runOptionsFor`/`agentEffort`.
- Project documents are the third chat kind, `doc` (`ui.docChat`, modal kind `doc`, memory `ui.docChats`): `PROJECT_DOCS` lists
  visão/escopo/glossário (co-written by the squad's PRD reconhecedor) and arquitetura + ADRs (the ADR one); `docAgent` reads the
  squad selected in `#projectForm`. The agent portrait on each doc row (`data-action="doc-cowrite"`, inside `<summary>`, so the
  click is `preventDefault`ed) opens `openDocEditor`, which starts from the page form's current values. `runCoWrite`,
  `sendFeatureChat`, `chatApply` and `undoCoWrite` serve both co-writing kinds through `chatNow()`/`chatAgent()`
  (`docCoWritePrompt`/`docCoWriteSystem`/`applyDocWrite`; `"adrs"` items with `ref` revise that ADR, without it they are added).
  `saveProjectDoc` writes back into `#projectForm` and calls `saveProject` (a new operation only fills the form).

**Domain model.**
- Positions (`a.hex`, `a.desk`) are unique per squad, not per workspace: `takenHexes`/`takenDesks` only look at `squad()`
  (the active squad), the map gets no other agents, loading only fixes invalid positions, and `render()` runs
  `resolveSlots(team)` so an agent that joins a squad on a used spot moves to the nearest free one.
- Squad = `{name, commanderId, adrId, prdId, operatorIds}`: exactly one commander (role `commander`),
  one ADR (`architect`) and one PRD (`po`) reconhecedor, ≥1 operator (`squadMissing`/`slotFits`).
  A double click on a free hex/desk (`onCreateAt`) opens the studio with `squadId` (`ui.draft.squadId`); `saveAgent`
  puts that new agent into the squad (`squadJoinSlot`/`squadJoin`: operator, the ADR/PRD seat if it is free, a second
  commander is refused) and into an open Squad Studio draft of it. "Novo agente" (key `A`) still creates it outside squads.
- A project/operation references exactly one `squadId` (required in `saveProject`; `deleteSquad` refuses a
  squad in use); `project.agentIds`/`commanderId` are **derived mirrors** kept by `applySquad`/`syncSquad` —
  change membership through the squad, not the project. Projects also carry documentation fields (`vision`,
  `scopeIn`, `scopeOut`, `glossary`, `architecture`, `adrs[]`) and features carry `tasks`.
- Project folder: `project.folder` (persisted, `projectFolderName` = `<code>-<name>` slug, unique; `normalizeWorkspace` derives it
  for older backups) is set once by `saveProject` at creation and never follows a rename; deleting the project keeps the folder on
  disk. `runOptionsFor(a,r,p)` sends it as `project`, so live steps and chats run in `projects/<folder>` (`projectDirLabel` shows
  it). There is no global working directory: the runtime has no `cwd` field.
- Sprints: `project.sprints` (ordered `{id,name,goal}`, ≥1, max 50) and `feature.sprintId`: every feature is in exactly one
  sprint (`sprintOf`, `sprintFeatures`); `normalizeWorkspace` creates "Sprint 01" for backups without sprints and sends orphans
  to the first. The list view renders sprints as accordions, collapsed by default (`ui.sprintOpen`), with a cube SVG
  (`sprintCubeSVG`) rooting a tree of `.sprint-node` rows (trunk and branches are the node's pseudo-elements, the dot takes the
  status color); `setSprintOpen` opens one and plays `.drawing` once (`ui.sprintDraw`: cube, trunk with a spark, branches,
  rows), which re-renders never replay. Dragging a row onto
  another sprint (`moveFeatureToSprint`) keeps route and status, the editor's SPRINT select goes through `saveFeature` (resets
  the route). `currentSprint` = first sprint with a feature not done.
- **Exportar** (operation header) → `exportProject`/`projectExportFiles`: a store-only `.zip` (`zipFiles`) with
  `CLAUDE.md`, `docs/{project,architecture,standards,features/<NNN-slug>}` and `.claude/{agents,commands,settings.json}`.
  `docs/standards` is compiled from the squad's DIRETRIZES (`STANDARD_FILES`); simulated-only progress exports as
  `backlog`. The DIRETRIZES catalog paths (ADR/PRD/C4) follow the same `docs/` layout.
- Features carry `route` (ordered agent ids) built by `routeFor`, which maps scopes to roles with
  `ROLE_FAMILY` (e.g. node/java/dotnet cover the backend step). A finished route sends the feature to
  human review; only approval marks it done and unblocks dependents.
- Agents: `ROLES` defines specialties; Squad Studio presets come from `AGENT_PRESETS` and
  `OP_CATEGORIES` (operators picked by category → sub-specialty, generalist first) and are
  materialized by `createPresetAgent`. Each agent has `model` (catalog `CLAUDE_MODELS`: aliases, pinned IDs, `inherit`;
  any id valid for the bridge survives import) and `effort` (`EFFORTS`, `''` = model default; none for Haiku,
  `modelEffortSupport`). The global runtime model/effort override the agent's (`runOptionsFor` → `agentEffort`); both go
  to the exported `.claude/agents/*.md` frontmatter (`agentMarkdown`) and to the CLAUDE.md command-chain table.
- SOUL: `src/souls.js` (`AGENT_SOULS` per catalog codename + `GENERIC_SOUL`) gives each agent `soul`/`hellos` (greeting variations, one picked at random per chat)
  (`defaultSoul`); it shapes the chat tone and greeting (`soulBlock`, `feGreeting`) and is exported (`soulMarkdown`).
  Tone rules for every agent chat: human, no catchphrases, no dashes (`soulBlock`, `AGENT_CHAT_SYSTEM`, `COWRITE_SYSTEM`), and
  `chatClean` strips dashes from reply bubbles. Changing a catalog soul/greeting list: keep the earlier version's `soulHash` /
  `helloPrint` fingerprint in `SOUL_PREV` / `SOUL_HELLOS_PREV` so unedited agents migrate (`normalizeSoul`, `normalizeHellos`).
- Diretrizes (conventions): catalog in `src/conventions.js` (`CONVENTION_FAMILIES` with ≥4 base
  templates per agent type, `CONVENTION_SUBSETS` grouped by `CONVENTION_GROUPS`); each agent stores
  `conventions = {family, template, base, subsets[]}`; `conventionFamilyOf(agent)` ties the guide to
  the agent's role/specialty.
- Coding style lives in the DIRETRIZES, never in a system prompt: group `style` ("Estilo de código") holds one `style-<lang>`
  subset per language (ts, js, python, go, java, csharp, php, kotlin, swift, dart, sql, css, shell, yaml, hcl).
  `CONV_STYLE_SUGGEST` (conventions.js) maps family → style subsets (shown first in the picker); `codeStyleKeys(a)` refines it
  by specialty, and `defaultConventions` gives them to every catalog/new agent (plus the preset's own `conv.subsets`).
  `docs/standards/coding-style.md` exports the `style` group.
- Catalog prompts (`ROLES[*].prompt`, preset `style`, the `presetPrompt` specialty suffix) are Portuguese and describe the role
  only. `migrateCatalogAgents` (a top-level call after the catalog, since `normalizeWorkspace` runs before `AGENT_PRESETS` exists;
  also on import) moves prompts still equal to an earlier catalog version (`PROMPT_PREV`: `soulHash` → `role:`/`preset:`) to the
  current text, and once per workspace (`settings.catalogVersion` < 2, persisted) adds the stack's style subsets to unedited
  DIRETRIZES (catalog base guide + only the preset's own subsets). Changing a catalog prompt: add its previous fingerprints to
  `PROMPT_PREV`; a new one-time migration bumps `catalogVersion`.

**Execution path.** `startRun` → `launchNext` → `simulationStep` (demo) or `liveStep` →
`executeLiveStep`, which POSTs `{prompt: buildStepPrompt(...), systemPrompt: agentSystemPrompt(a),
options: runOptionsFor(a)}` to the bridge. `agentSystemPrompt` = agent instructions + its conventions
guide; use it (not `a.prompt`) anywhere the agent's instructions leave the app (live runs, command
preview, `.md` export). Each step's output becomes handoff context for the next agent.
Runs are scoped: `startRun({sprintId})` runs a sprint, `startRun()` the `currentSprint` (action `run`, space key, HUD, Painel,
commander chat), `startRun({featureId})` one feature with its full route (`startFeatureRun`, `runner.single`, `kind:'feature'`).
Nothing runs on an incomplete project: `runGate` (`projectGaps`: every saved field of the project form and documentation, a squad,
≥1 ADR and each ADR with title and content) is checked by `startRun` (after the pause/resume toggle), `openSpawn`, `spawnAgent`
and the commander chat `run`. It lists what is missing in a toast and in the `.ops-run-gate` notice, then opens the briefing. The seed
project is complete so the demo still runs.
**Commander, operation room and calls.** Every run is planned by the squad's commander before anything executes. `runner.phase`
goes `planning` → `awaiting` → `running` (`runControl()` gives the run buttons their label: Planejando / Aprovar plano / Pausar /
Retomar; `launchNext`/`scheduleStep` only move in `running`):
- `beginPlan` opens the room and runs `planWithCommander` over the scope's pending features (backlog/ready/blocked). Live: one
  `claude -p` of the commander (`CHAT_RUN`, `COMMANDER_PLAN_SYSTEM`, `commanderPlanPrompt` with `routeFor` suggestions) streams its
  message and ends with ```json `{"plan":[{feature,route:[CODENAMES],briefs:{CODENAME:text}}]}` (a bare object is accepted too);
  `validatePlan` keeps squad members only (never the commander) and falls back to `routeFor` per feature, or wholly with a note.
  Demo: `routeFor` + `defaultBrief`.
- The plan card waits for the person: **Executar plano** (`roomApprove`, also the run button/space key while `awaiting`) writes
  `f.route` + `f.briefs` (persisted, aligned with the route, reset wherever the route changes) and starts; **Cancelar** is `stopRun`,
  which leaves every feature untouched (and cancels `runner.planRunId`).
- The room (`openRoom`, modal kind `room`, memory only in `ui.rooms[projectId]`, max 800 messages) is a group chat:
  `roomPush`/`roomUpdate` (rAF batched)/`roomRemove`, `roomTyping`, crew column (`roomCrewHTML`: com o bastão, chamado, na fila,
  entregou) and `roomChrome()` (called at the end of `render()`). Message kinds: `system`, `say` (`activity[]` chips, `thread`,
  `human`, `error`), `plan`, `call`, `baton`, `review`. `roomStepStart` (agent says its part), baton cards in `advanceRoute`, review
  card + commander summary in `launchNext`. Demo work and calls come from `SIM_WORK`/`SIM_CALL` (`roomSimWork`).
- Live steps use `stepRunOptions(a,p)` = `runOptionsFor` + `agents` from `squadSubagents` (every other squad member keyed by
  `agentSlug`, own prompt + `CALLED_AGENT_SYSTEM`, tools, model, effort; no `Agent`, so no nesting) + `forwardSubagents`, and add
  `Agent` to `tools`/`allowedTools`. `buildStepPrompt` adds the commander's instruction and the colleagues list. `roomEvent` maps
  the stream: text → bubbles, tool_use → chips (`toolActivity`), `Agent` → call card (`roomCalling`), subagent messages
  (`parent_tool_use_id`) → thread, tool_result → the card's answer. Chats never get agents.
- Individual spawn (`spawnAgent`, `kind:'spawn'`) skips the commander but runs in the room too.
"Distribuir features" (`openDistribution`, deterministic `routeFor` plan, `applyPlan`) still exists for planning by hand, and
`launchNext` only picks features of `runner.sprintId`. The export orders features sprint by sprint,
adds `sprint:` to each `spec.md`, a Sprints section to `scope.md` and `/executar-sprint`.

**`src/city.js` (`MapNetwork`).** Three.js scene with two views sharing the same agents: a hexagonal
city (perspective camera) and an isometric office with desks (orthographic). HTML markers/cards are
projected over the canvas (`updatePositions`, which places `[data-node]`, `[data-anchor]` and `[data-pin]` elements);
office agent cards are laid out to avoid overlap. The selected agent's quick-action bubbles (`nodeActionsHTML`,
`.node-actions[data-pin]`) are ignored by the map's pointer handling and are an obstacle for the card layout (`ACT_SPOTS`, same offsets as the CSS).
Move mode (`startMove`/`cancelMove`/`isMoving`, bubble Deslocar): the next click on a free hex/desk calls `onPosition`, with
a preview through `dragHexOf`/`deskOf`, a banner (`.map-move-hint`) and a cursor tip (`.map-move-tip`). The
app talks to it through `MapNetwork.set(...)`, `setMode`, `onPosition`, `onEmptyClick`, `onCreateAt`,
`rotate`, `home`. Without WebGL it falls back to a 2D projection using the same camera math. `setMode` switches
views with a cinematic transmorph (`morph`, one 1.2 s tween `morphRun`, swap at `MORPH_SPLIT`): the camera orbits its target
around its right axis (`pose.flip`, applied in `applyCamera` via `orbit`, so lights/projection/picking stay consistent) while
it swings in theta, so the world tips over and spins until edge-on, and the other view arrives from the far side. The agents'
icons fly between the views as ghost clones (`.map-morph-ghosts`, destinations measured with `homePose`/`measureHome`,
blended into the live `agentPoint` at the end); office cards collapse on the way out (`lastCards`, kept by `layoutCards`)
and pop in on landing (`morph-land`, `--i`). Back in the city the buildings resurge in a wave (`sinkCity`/`riseCity`, a
`rise` multiplier per `byHex` group, independent from `k`) after the map is usable again. `.map-morphing` hides the real
markers with `visibility` and blocks the pointer; `zoom`/`rotate`/`focus`/public `home` return while morphing, a toggle
during it is queued, and `finishMorph` ends it at once (pause behind the Painel, reduced motion, resize). The office is built
and its shaders compiled at idle after boot (`gl.prepareOffice`, plus `ensureMorphLayers`), and the frame loop pauses tweens
across long frames instead of letting them skip.
Planet mode (setting `cityShape` 'flat'|'planet', passed in `MapNetwork.set`): the city scene keeps its flat coordinates and
`bendTree` patches every city material once (`bendMaterial`, `onBeforeCompile`, identity at b = 0) so the vertex shader maps
the flat world onto a sphere (`pl_map`, azimuthal equidistant, blend `planet.b` 0..1 curls it; `pl_bend` turns normals) and
disables frustum culling; objects tagged `userData.noBend` (core sphere, stars, halo, south-pole beacon in `planetFx`) are
skipped. `planetMap`/`planetUnmap` mirror it in JS for projection (far side = `behind`), picking (ray/sphere) and the camera,
which is the flat pose carried rigidly by the surface at the focus (`carryQ`, lights turn with it). `setShape` animates the
curl (`curling` blocks picking and camera input, `finishCurl`); `homePose` branches on the setting. New city materials need
nothing special, but anything placed far from the ground must be subdivided (`hexRing` seg) so chords follow the sphere.
Office life (`lifeTick`, office view only, motion on): a purely visual scheduler moves "actors" (visual positions through
`lifePos` in `agentPoint`) along door/corridor paths (`officePath`) for meetings, visits, calls and breaks, with badges
(`.life-layer`) and arcs (`gl.lifeArcs`). It never touches `a.desk`; `lifeReset` puts everyone back (mode switch, pause,
Handoffs, motion off, `startMove`). `MapNetwork.officeLife.{state,kick}` helps testing.
