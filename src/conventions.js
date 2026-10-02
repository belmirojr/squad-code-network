'use strict';
/* Conventions & best-practices catalog for agents (AVANÇADO tab of the agent studio).
   CONVENTION_FAMILIES: agent type -> 3 ready-made base templates (Markdown). `hint` matches the agent's
   specialty/icon to pick the default template; `suggest` lists subsets shown first in the picker.
   CONVENTION_SUBSETS: extra rule packs appended as separate, editable blocks. Data only. */
const md = (...lines) => lines.join('\n');

const CONV_COMMON = {
  jsFormat: md(
    '## Formatação',
    '- Indentação de **2 espaços**, sem tabs; ponto e vírgula sempre; aspas simples em JS/TS.',
    '- Linhas com até 100 colunas; vírgula final (trailing comma) em listas multilinha.',
    '- Um export principal por arquivo; imports ordenados: nativos → pacotes → aliases internos → relativos, separados por linha em branco.',
    '- Nada de código comentado ou `console.log` esquecido; use o logger do projeto.'),
  delivery: md(
    '## Entregas',
    '- Mudanças pequenas e revisáveis; um assunto por commit.',
    '- Relate arquivos alterados, como validou e riscos conhecidos.',
    '- Não invente resultados de execução: se não rodou, diga que não rodou.'),
  tests: md(
    '## Testes',
    '- Todo comportamento novo ou corrigido vem com teste.',
    '- Nome do teste descreve o comportamento: `should <resultado> when <condição>`.',
    '- Padrão AAA (Arrange, Act, Assert); um motivo de falha por teste; sem dependência de ordem.')
};

const CONV_ADR_COMMON = md(
  '## Regras gerais de ADR',
  '- Local: `docs/architecture/adr/ADR-NNN-titulo-em-kebab-case.md`, com numeração sequencial de 3 dígitos que nunca é reutilizada.',
  '- Índice na tabela **Decisões** de `docs/architecture/overview.md`, com número, título, status e data de cada ADR, atualizado no mesmo commit.',
  '- Status: `Proposto` → `Aceito` ou `Rejeitado`; depois `Depreciado` ou `Substituído por ADR-NNN`. Registre a data de cada mudança.',
  '- ADR aceito é imutável: para mudar a decisão, crie um novo ADR que o substitui e atualize o status do antigo.',
  '- Escreva um ADR para decisões difíceis de reverter ou que afetam mais de um componente: estilo de arquitetura, banco de dados, contratos de API e eventos, autenticação, infraestrutura, dependências estruturais e padrões transversais (logs, erros, observabilidade).',
  '- Uma decisão por ADR; título curto no formato de decisão ("Usar PostgreSQL como banco principal"), não de problema.',
  '- Vincule o ADR ao PRD, às features e aos tickets relacionados, e cite os ADRs que ele complementa ou substitui.',
  '- Texto em português, objetivo e verificável; termos técnicos, nomes de tecnologia e identificadores em inglês.',
  '- O ADR é revisado antes da implementação: nenhuma feature que depende dele começa com status `Proposto`.',
  '- Diagramas em Mermaid dentro do próprio arquivo, nunca como imagem solta.');

const CONVENTION_FAMILIES = {
  commander: {
    label: 'Comandante', suggest: ['commits', 'review-checklist', 'ptbr'], templates: [
      { key: 'cmd-classic', name: 'Delegação por especialidade', summary: 'Plano claro, uma feature por especialista, dependências respeitadas.', content: md(
        '# Convenções do Comandante — Delegação por especialidade',
        '## Planejamento',
        '- Leia briefing e features antes de delegar; liste premissas e dúvidas explícitas.',
        '- Quebre cada feature em entregas verificáveis com critérios de aceitação objetivos.',
        '- Respeite dependências: nenhuma feature começa antes das que ela depende estarem aprovadas.',
        '## Delegação',
        '- Atribua cada etapa ao operador cuja subespecialidade corresponde à tecnologia da feature.',
        '- Mensagem de handoff no formato: **Objetivo · Contexto · Entregáveis · Critérios · Riscos**.',
        '- Nunca delegue sem os documentos de reconhecimento (ADR e PRD) quando existirem.',
        '## Controle',
        '- Registre bloqueios assim que surgirem, com o responsável e o próximo passo.',
        '- Nenhuma feature é marcada como concluída sem aprovação humana.') },
      { key: 'cmd-parallel', name: 'Execução paralela', summary: 'Maximiza frentes simultâneas com sincronização frequente.', hint: /abelha|rainha|hive|parallel/i, content: md(
        '# Convenções do Comandante — Execução paralela (colmeia)',
        '## Planejamento',
        '- Identifique o que pode rodar em paralelo sem conflito de arquivos ou contratos.',
        '- Congele contratos (API, schemas, eventos) antes de abrir frentes paralelas.',
        '## Delegação',
        '- No máximo uma frente por operador; cada frente com escopo e diretórios bem delimitados.',
        '- Defina pontos de sincronização (merge) e quem integra.',
        '- Handoff: **Frente · Contrato congelado · Entregáveis · Ponto de sincronização**.',
        '## Controle',
        '- Consolide o status de todas as frentes a cada etapa concluída.',
        '- Conflito de contrato para tudo: reabra o ADR antes de continuar.') },
      { key: 'cmd-incremental', name: 'Entregas incrementais', summary: 'Fatias verticais pequenas, validação cedo e ajuste de rota.', hint: /profeta|nomad|increment/i, content: md(
        '# Convenções do Comandante — Entregas incrementais',
        '## Planejamento',
        '- Priorize a menor fatia vertical que entregue valor ponta a ponta.',
        '- Cada incremento termina utilizável e testado; nada de "90% pronto".',
        '## Delegação',
        '- Ordem padrão: PRD → ADR → backend → frontend → QA, uma fatia por vez.',
        '- Corte escopo agressivamente; registre o que ficou para o próximo incremento.',
        '## Controle',
        '- Após cada incremento, revise premissas e ajuste o plano antes de seguir.',
        '- Métrica de avanço = features aprovadas, não etapas executadas.') }
    ]
  },
  adr: {
    label: 'Reconhecedor ADR (arquitetura)', suggest: ['c4-diagrams', 'hexagonal', 'clean-arch', 'api-rest', 'observability'], templates: [
      { key: 'adr-nygard', name: 'Nygard (clássico)', summary: 'O formato original: Status, Contexto, Decisão e Consequências em até duas páginas.', content: md(
        '# Diretrizes de ADR — Nygard (clássico)',
        'Formato padrão para registrar decisões de arquitetura de forma curta e direta.',
        '## Modelo',
        '```markdown',
        '# ADR-NNN: Título da decisão',
        '',
        'Data: AAAA-MM-DD',
        '',
        '## Status',
        'Proposto | Aceito | Rejeitado | Depreciado | Substituído por [ADR-NNN](ADR-NNN-titulo.md)',
        '',
        '## Contexto',
        'Forças em jogo: requisitos, restrições técnicas, de negócio e do time.',
        '',
        '## Decisão',
        'Usaremos <opção> para <objetivo>.',
        '',
        '## Consequências',
        '- Positivas: …',
        '- Negativas: …',
        '- A acompanhar: …',
        '```',
        '## Como escrever',
        '- No máximo duas páginas; se precisar de mais, a decisão provavelmente deve ser dividida.',
        '- **Contexto** descreve as forças de forma neutra, sem antecipar a decisão.',
        '- **Decisão** em voz ativa e primeira pessoa do plural ("Usaremos…", "Não adotaremos…").',
        '- **Consequências** listam ganhos **e** custos, incluindo impacto em operação, time e custo.',
        CONV_ADR_COMMON) },
      { key: 'adr-madr', name: 'MADR 4 (completo)', summary: 'Fatores de decisão, opções consideradas, prós e contras e confirmação.', content: md(
        '# Diretrizes de ADR — MADR 4 (completo)',
        'Use para decisões com mais de uma alternativa viável ou que afetam vários times.',
        '## Modelo',
        '```markdown',
        '---',
        'status: proposto   # proposto | aceito | rejeitado | depreciado | substituído por ADR-NNN',
        'date: AAAA-MM-DD',
        'decision-makers: [responsáveis pela decisão]',
        'consulted: [especialistas consultados]',
        'informed: [quem precisa ser avisado]',
        '---',
        '',
        '# Título curto no formato de decisão',
        '',
        '## Contexto e problema',
        'Duas ou três frases descrevendo o problema; pode terminar em uma pergunta.',
        '',
        '## Fatores de decisão',
        '* Fator 1 (ex.: latência p95 < 200 ms)',
        '* Fator 2 (ex.: custo mensal < US$ 500)',
        '',
        '## Opções consideradas',
        '* Opção A',
        '* Opção B',
        '* Opção C',
        '',
        '## Resultado da decisão',
        'Opção escolhida: "Opção A", porque <justificativa ligada aos fatores>.',
        '',
        '### Consequências',
        '* Bom, porque …',
        '* Ruim, porque …',
        '',
        '### Confirmação',
        'Como a conformidade será verificada (revisão, teste de arquitetura, métrica).',
        '',
        '## Prós e contras das opções',
        '',
        '### Opção A',
        '* Bom, porque …',
        '* Neutro, porque …',
        '* Ruim, porque …',
        '',
        '### Opção B',
        '* …',
        '',
        '## Mais informações',
        'Links, pendências e quando esta decisão deve ser revisitada.',
        '```',
        '## Como escrever',
        '- Pelo menos duas opções reais, incluindo "manter como está" quando fizer sentido.',
        '- Fatores de decisão mensuráveis e usados na comparação de todas as opções.',
        '- **Confirmação** é obrigatória: diga como alguém vai verificar que a decisão está sendo seguida.',
        '- Prós e contras com o mesmo nível de detalhe para cada opção; não esconda os contras da escolhida.',
        CONV_ADR_COMMON) },
      { key: 'adr-madr-min', name: 'MADR mínimo', summary: 'Só o essencial: problema, opções consideradas e resultado.', content: md(
        '# Diretrizes de ADR — MADR mínimo',
        'Use para decisões pequenas e médias, de impacto local e fácil reversão.',
        '## Modelo',
        '```markdown',
        '# ADR-NNN: Título curto no formato de decisão',
        '',
        'Status: Proposto · Data: AAAA-MM-DD',
        '',
        '## Contexto e problema',
        'O que precisa ser decidido e por quê agora.',
        '',
        '## Opções consideradas',
        '* Opção A',
        '* Opção B',
        '',
        '## Resultado da decisão',
        'Opção escolhida: "Opção A", porque <justificativa em uma ou duas frases>.',
        '```',
        '## Como escrever',
        '- Cabe em meia página; se a discussão crescer, migre para o MADR completo.',
        '- Liste as opções mesmo que a escolha pareça óbvia: o registro do que foi descartado é o valor do ADR.',
        '- Decisões que afetam mais de um time ou contratos públicos usam o MADR completo.',
        CONV_ADR_COMMON) },
      { key: 'adr-ystatement', name: 'Y-Statement', summary: 'A decisão inteira em uma frase estruturada: contexto, preocupação, escolha e custo.', content: md(
        '# Diretrizes de ADR — Y-Statement',
        'Formato de uma frase (Olaf Zimmermann), ideal para registros de decisão enxutos e revisões rápidas.',
        '## Modelo',
        '```markdown',
        '# ADR-NNN: Título da decisão',
        '',
        'Status: Aceito · Data: AAAA-MM-DD',
        '',
        'No contexto de <caso de uso ou componente>,',
        'diante de <preocupação ou requisito não funcional>,',
        'decidimos por <opção escolhida>',
        'e descartamos <alternativas>,',
        'para alcançar <qualidades e benefícios>,',
        'aceitando <desvantagens e custos>,',
        'porque <justificativa adicional (opcional)>.',
        '```',
        '## Como escrever',
        '- Todas as cláusulas são obrigatórias, exceto o "porque"; cada uma com fatos concretos, não adjetivos.',
        '- "Descartamos" nomeia as alternativas reais avaliadas.',
        '- "Aceitando" deixa explícito o custo da escolha; sem custo declarado, a decisão está incompleta.',
        '- Se a frase passar de sete linhas, use MADR.',
        CONV_ADR_COMMON) },
      { key: 'adr-tyree', name: 'Tyree & Akerman', summary: 'Formato detalhado: premissas, restrições, posições, argumento e rastreabilidade.', content: md(
        '# Diretrizes de ADR — Tyree & Akerman',
        'Formato completo para decisões estruturais com muitas premissas e restrições (sistemas regulados, integrações críticas).',
        '## Modelo',
        '```markdown',
        '# ADR-NNN: Título da decisão',
        '',
        '## Questão',
        'A questão de arquitetura que está sendo resolvida.',
        '',
        '## Decisão',
        'A posição escolhida, em uma frase.',
        '',
        '## Status',
        'Proposto | Aceito | Rejeitado | Depreciado | Substituído por ADR-NNN',
        '',
        '## Grupo',
        'Categoria para indexação: integração, dados, segurança, apresentação, infraestrutura…',
        '',
        '## Premissas',
        '- …',
        '',
        '## Restrições',
        '- …',
        '',
        '## Posições',
        '- Posição A: …',
        '- Posição B: …',
        '',
        '## Argumento',
        'Por que a posição escolhida vence as outras diante das premissas e restrições.',
        '',
        '## Implicações',
        '- …',
        '',
        '## Decisões relacionadas',
        '## Requisitos relacionados',
        '## Artefatos relacionados',
        '## Princípios relacionados',
        '## Notas',
        '```',
        '## Como escrever',
        '- Premissas e restrições explícitas e verificáveis; o argumento deve citá-las.',
        '- **Posições** descreve cada alternativa com o mesmo nível de detalhe.',
        '- As seções "relacionados" apontam para ADRs, requisitos do PRD, diagramas e princípios por link.',
        '- Use o campo **Grupo** de forma consistente para permitir filtrar o índice.',
        CONV_ADR_COMMON) },
      { key: 'adr-merson', name: 'Merson (com justificativa)', summary: 'Nygard com uma seção de justificativa e trade-offs explícitos.', content: md(
        '# Diretrizes de ADR — Merson (com justificativa)',
        'Variação do Nygard (Paulo Merson) que separa o porquê da decisão em uma seção própria.',
        '## Modelo',
        '```markdown',
        '# ADR-NNN: Título da decisão',
        '',
        'Data: AAAA-MM-DD',
        '',
        '## Status',
        'Proposto | Aceito | Rejeitado | Depreciado | Substituído por ADR-NNN',
        '',
        '## Contexto',
        'Forças, requisitos e restrições.',
        '',
        '## Decisão',
        'Usaremos <opção>.',
        '',
        '## Justificativa',
        '- Por que esta opção e não as alternativas <A> e <B>.',
        '- Trade-offs aceitos.',
        '- Evidências: POCs, benchmarks, referências.',
        '',
        '## Consequências',
        '- Positivas: …',
        '- Negativas: …',
        '```',
        '## Como escrever',
        '- **Justificativa** cita evidências concretas (números de benchmark, resultado de POC, links).',
        '- Todo trade-off aceito aparece na justificativa e é refletido nas consequências negativas.',
        '- Mencione as alternativas descartadas pelo nome, com o motivo do descarte.',
        CONV_ADR_COMMON) },
      { key: 'adr-business', name: 'Caso de negócio', summary: 'Critérios com peso, candidatos, matriz de decisão, custos e recomendação.', content: md(
        '# Diretrizes de ADR — Caso de negócio',
        'Use quando a decisão envolve compra, contratação de serviço ou custo relevante (ex.: escolha de fornecedor, plataforma de nuvem).',
        '## Modelo',
        '```markdown',
        '# ADR-NNN: Título da decisão',
        '',
        'Status: Proposto · Data: AAAA-MM-DD · Responsável: <nome>',
        '',
        '## Contexto e objetivo de negócio',
        'Problema, objetivo e prazo.',
        '',
        '## Critérios de avaliação',
        '- Custo total em 12 meses (peso 3)',
        '- Aderência técnica (peso 3)',
        '- Esforço de adoção (peso 2)',
        '- Risco de lock-in (peso 1)',
        '',
        '## Candidatos',
        '- Opção A: …',
        '- Opção B: …',
        '',
        '## Pesquisa e evidências',
        'POCs, conversas com fornecedores, referências de mercado.',
        '',
        '## Matriz de decisão',
        '- Opção A: custo 4 × 3 + aderência 5 × 3 + esforço 3 × 2 + lock-in 2 × 1 = 35',
        '- Opção B: …',
        '',
        '## Custos e esforço',
        'Custo inicial, recorrente e horas de implementação.',
        '',
        '## Riscos e mitigação',
        '- …',
        '',
        '## Recomendação',
        'Opção recomendada e condições.',
        '',
        '## Decisão e aprovação',
        'Quem aprovou e quando.',
        '```',
        '## Como escrever',
        '- Critérios e pesos definidos **antes** de pontuar os candidatos.',
        '- Notas de 1 a 5 com justificativa curta; a matriz mostra a conta, não só o total.',
        '- Custos em valores e moedas explícitos, com fonte e data da cotação.',
        CONV_ADR_COMMON) }
    ]
  },
  prd: {
    label: 'Reconhecedor PRD (produto)', suggest: ['ptbr', 'a11y'], templates: [
      { key: 'prd-full', name: 'PRD completo', summary: 'Problema, objetivos, escopo, requisitos e métricas.', content: md(
        '# Convenções de PRD — documento completo',
        '- Arquivo `docs/features/<NNN-feature>/spec.md`, com os critérios em `acceptance-criteria.md` e a quebra do trabalho em `tasks.md` da mesma pasta.',
        '- Seções: **Problema · Objetivos · Fora de escopo · Personas · Requisitos funcionais · Requisitos não funcionais · Métricas de sucesso · Riscos · Perguntas abertas**.',
        '- Requisitos numerados `RF-01`, `RNF-01`; cada um testável e sem ambiguidade.',
        '- Critérios de aceitação por requisito, em lista verificável.',
        '- Métricas com linha de base e meta (ex.: conversão de 2% → 3%).') },
      { key: 'prd-stories', name: 'Histórias + Gherkin', summary: 'Histórias de usuário com critérios em Given/When/Then.', content: md(
        '# Convenções de PRD — histórias de usuário e Gherkin',
        '- História: **Como** <persona>, **quero** <ação>, **para** <benefício>.',
        '- Critérios em Gherkin (em português): `Dado` / `Quando` / `Então` / `E`.',
        '- Um cenário por comportamento; cenários de erro e borda obrigatórios.',
        '- Histórias pequenas (INVEST); se passar de 3 dias, quebre.',
        '- IDs `US-<área>-NN` para rastrear até features e testes.') },
      { key: 'prd-lean', name: 'PRD enxuto', summary: 'One-pager: problema, aposta, escopo mínimo e critérios.', content: md(
        '# Convenções de PRD — enxuto (one-pager)',
        '- Máximo de uma página: **Problema · Aposta · Escopo mínimo · Não faremos · Critérios de pronto**.',
        '- Escreva para quem vai implementar amanhã: exemplos concretos, sem jargão.',
        '- Critérios de pronto em checklist; cada item verificável por QA.',
        '- Dúvidas vão para "Perguntas abertas" com dono e prazo.') }
    ]
  },
  pm: {
    label: 'Gestão de projeto', suggest: ['commits', 'ptbr'], templates: [
      { key: 'pm-scrum', name: 'Scrum', summary: 'Sprints, backlog priorizado e cerimônias.', content: md(
        '# Convenções de gestão — Scrum',
        '- Sprints de 2 semanas com meta de sprint escrita em uma frase.',
        '- Itens do backlog com critérios de aceitação e estimativa relativa (pontos).',
        '- Definição de pronto: código revisado, testado, documentado e aprovado pelo PO.',
        '- Riscos e impedimentos registrados com dono e data.') },
      { key: 'pm-kanban', name: 'Kanban', summary: 'Fluxo contínuo, WIP limitado e métricas de fluxo.', content: md(
        '# Convenções de gestão — Kanban',
        '- Colunas: A fazer · Pronto para iniciar · Em execução · Revisão · Concluído.',
        '- Limite de WIP por coluna; puxe trabalho, não empurre.',
        '- Acompanhe lead time e throughput; itens bloqueados sinalizados com motivo.') },
      { key: 'pm-shapeup', name: 'Shape Up', summary: 'Ciclos de 6 semanas, apostas e escopo fixo.', content: md(
        '# Convenções de gestão — Shape Up',
        '- Pitches com problema, apetite (tempo), solução esboçada e rabbit holes.',
        '- Ciclos de 6 semanas + 2 de cooldown; escopo varia, prazo não.',
        '- Hill chart para mostrar incertezas resolvidas vs. execução.') }
    ]
  },
  backend: {
    label: 'Backend (geral)', suggest: ['api-rest', 'errors', 'logs', 'unit-tests', 'migrations'], templates: [
      { key: 'be-layers', name: 'API REST em camadas', summary: 'Controller → Service → Repository, DTOs e validação.', content: md(
        '# Convenções Backend — API REST em camadas',
        '## Estrutura',
        '- Camadas: `controllers/` → `services/` → `repositories/`; controller não acessa banco.',
        '- Arquivos em `kebab-case`; classes em `PascalCase` com sufixo do papel: `OrderController`, `OrderService`, `OrderRepository`, `CreateOrderDto`.',
        '## Nomenclatura',
        '- Variáveis e funções em `camelCase`; constantes em `UPPER_SNAKE_CASE`.',
        '- Funções começam com verbo: `get`, `list`, `create`, `update`, `delete`, `validate`; booleanos com `is/has/can`.',
        '## API',
        '- Rotas no plural e versionadas: `/api/v1/orders/:id`; JSON em `camelCase`.',
        '- Valide toda entrada na borda; erros no formato `{ error: { code, message, details } }`.',
        CONV_COMMON.tests) },
      { key: 'be-clean', name: 'Clean Architecture', summary: 'Casos de uso, entidades e dependências para dentro.', content: md(
        '# Convenções Backend — Clean Architecture',
        '- Pastas: `domain/`, `application/use-cases/`, `infrastructure/`, `interfaces/http/`.',
        '- Um caso de uso por arquivo: `CreateOrderUseCase` com método único `execute(input)`.',
        '- Entidades sem dependência de framework; regras de negócio só no domínio.',
        '- Injeção de dependência pelo construtor; nada de `new` de infraestrutura dentro do domínio.',
        '- Nomes: `<Entidade>Repository` (interface), `<Tecnologia><Entidade>Repository` (implementação).',
        CONV_COMMON.tests) },
      { key: 'be-micro', name: 'Microsserviços', summary: 'Serviços pequenos, contratos versionados e resiliência.', content: md(
        '# Convenções Backend — Microsserviços',
        '- Um serviço por contexto delimitado; nome `<contexto>-service`.',
        '- Comunicação síncrona só com timeout e retry com backoff; assíncrona via eventos `<Entidade><Verbo no passado>` (ex.: `OrderCreated`).',
        '- Contratos (OpenAPI/AsyncAPI) versionados; mudança incompatível = nova versão.',
        '- Idempotência em consumidores; correlation id propagado em logs e headers.',
        '- Health checks `/health/live` e `/health/ready` obrigatórios.') }
    ]
  },
  node: {
    label: 'Backend Node.js', suggest: ['unit-tests', 'errors', 'logs', 'api-rest', 'jsdoc'], templates: [
      { key: 'node-js', name: 'JavaScript (ESM)', summary: 'ES modules, JSDoc para tipos e funções puras.', content: md(
        '# Convenções Node.js — JavaScript (ESM)',
        '## Módulos',
        '- `"type": "module"`; `import`/`export` nomeados; extensão `.js` explícita nos imports relativos.',
        '- Arquivos em `kebab-case.js`; um módulo por responsabilidade.',
        '## Nomenclatura',
        '- `camelCase` para variáveis e funções; `PascalCase` para classes; `UPPER_SNAKE_CASE` para constantes de módulo.',
        '- Prefixos: `get/find/list` (leitura), `create/update/remove` (escrita), `is/has/should` (booleanos), `handle/on` (eventos).',
        '- Funções assíncronas não levam sufixo; retornam sempre `Promise` e usam `async/await` (nada de callbacks).',
        '## Tipos',
        '- Tipos documentados com JSDoc (`@param`, `@returns`, `@typedef`) em toda função exportada.',
        '## Padrões',
        '- Prefira funções puras e composição a classes; classes só para estado ou injeção.',
        '- Configuração via variáveis de ambiente validadas na inicialização.',
        CONV_COMMON.jsFormat,
        CONV_COMMON.tests) },
      { key: 'node-ts', name: 'TypeScript estrito', summary: 'strict mode, tipos explícitos nas bordas e zero any.', hint: /typescript|\bts\b/i, content: md(
        '# Convenções Node.js — TypeScript estrito',
        '## Compilador',
        '- `tsconfig` com `strict: true`, `noUncheckedIndexedAccess`, `noImplicitOverride`.',
        '- Proibido `any`; use `unknown` + narrowing. `as` só com comentário justificando.',
        '## Nomenclatura',
        '- Tipos e interfaces em `PascalCase` sem prefixo `I` (`User`, não `IUser`); tipos de entrada/saída com sufixo `Input`, `Output`, `Dto`.',
        '- Enums evitados; use union de literais (`type Status = \'active\' | \'blocked\'`).',
        '- `camelCase` para funções/variáveis; `UPPER_SNAKE_CASE` para constantes; arquivos `kebab-case.ts`.',
        '- Prefixos de função: `get/list/find/create/update/remove`, `is/has/can`, `to/from` para conversões, `assert` para validações que lançam.',
        '## Padrões',
        '- Tipos explícitos em toda função exportada; inferência liberada no corpo.',
        '- Validação de entrada com schema (Zod) e tipo derivado do schema (`z.infer`).',
        '- Erros de domínio como classes que estendem `AppError` com `code` estável.',
        CONV_COMMON.jsFormat,
        CONV_COMMON.tests) },
      { key: 'node-nest', name: 'TypeScript + NestJS', summary: 'Módulos Nest, DTOs com class-validator e DI.', hint: /nest/i, content: md(
        '# Convenções Node.js — TypeScript + NestJS',
        '## Estrutura',
        '- Um módulo por domínio: `orders/orders.module.ts`, `orders.controller.ts`, `orders.service.ts`, `dto/create-order.dto.ts`, `entities/order.entity.ts`.',
        '- Controllers finos: só roteamento, validação (pipes) e mapeamento de resposta.',
        '## Nomenclatura',
        '- Classes com sufixo do papel: `OrdersController`, `OrdersService`, `CreateOrderDto`, `OrderEntity`, `JwtAuthGuard`.',
        '- Métodos de service no padrão `findAll`, `findOne`, `create`, `update`, `remove`.',
        '## Padrões',
        '- DTOs com `class-validator`/`class-transformer`; `ValidationPipe` global com `whitelist: true`.',
        '- Dependências só por injeção no construtor (`private readonly`).',
        '- Exceções HTTP do Nest (`NotFoundException`...) apenas na camada de controller/service.',
        CONV_COMMON.jsFormat,
        CONV_COMMON.tests) }
    ]
  },
  java: {
    label: 'Backend Java', suggest: ['unit-tests', 'errors', 'logs', 'api-rest'], templates: [
      { key: 'java-spring', name: 'Spring Boot em camadas', summary: 'Controller/Service/Repository, records e Bean Validation.', content: md(
        '# Convenções Java — Spring Boot em camadas',
        '- Pacotes por feature: `com.empresa.app.order` com `OrderController`, `OrderService`, `OrderRepository`, `dto/`.',
        '- Classes `PascalCase`; métodos e variáveis `camelCase`; constantes `static final UPPER_SNAKE_CASE`.',
        '- DTOs como `record` imutáveis (`CreateOrderRequest`, `OrderResponse`); nunca exponha entidades JPA.',
        '- Injeção por construtor (sem `@Autowired` em campo); classes `final` quando possível.',
        '- Validação com Bean Validation (`@Valid`, `@NotBlank`); erros tratados em `@RestControllerAdvice`.',
        '- Indentação de 4 espaços; chaves no estilo K&R; linhas até 120 colunas.',
        '- Testes com JUnit 5 + AssertJ; nomes `shouldXWhenY`.') },
      { key: 'java-hex', name: 'Hexagonal / DDD', summary: 'Domínio rico, portas e adaptadores Spring.', content: md(
        '# Convenções Java — Hexagonal / DDD',
        '- Módulos: `domain` (sem Spring), `application` (casos de uso), `infrastructure` (adaptadores).',
        '- Agregados com invariantes no construtor/fábrica; value objects como `record` com validação.',
        '- Portas: `LoadOrderPort`, `SaveOrderPort`; adaptadores: `OrderJpaAdapter`, `OrderRestController`.',
        '- Eventos de domínio no passado: `OrderPlaced`, publicados após o commit.',
        '- Testes de domínio sem Spring; testes de adaptador com Testcontainers.') },
      { key: 'java-modern', name: 'Java 21 moderno', summary: 'records, sealed, pattern matching e virtual threads.', content: md(
        '# Convenções Java — Java 21 moderno',
        '- Prefira `record`, `sealed interface` e `switch` com pattern matching a hierarquias abertas.',
        '- `var` apenas quando o tipo é óbvio no lado direito.',
        '- `Optional` só como retorno; nunca em campos ou parâmetros.',
        '- Streams para transformações simples; laço explícito quando ficar mais legível.',
        '- Concorrência com virtual threads e `StructuredTaskScope` quando disponível.') }
    ]
  },
  dotnet: {
    label: 'Backend C# / .NET', suggest: ['unit-tests', 'errors', 'logs', 'api-rest'], templates: [
      { key: 'net-minimal', name: 'ASP.NET Core Minimal API', summary: 'Endpoints enxutos, records e validação.', content: md(
        '# Convenções .NET — Minimal API',
        '- Endpoints agrupados por feature em extensões `MapOrdersEndpoints(this IEndpointRouteBuilder app)`.',
        '- `PascalCase` para tipos, métodos e propriedades; `camelCase` para parâmetros e locais; campos privados `_camelCase`.',
        '- Métodos assíncronos com sufixo `Async` e `CancellationToken` como último parâmetro.',
        '- DTOs como `record` (`CreateOrderRequest`, `OrderResponse`); validação com FluentValidation.',
        '- Nullable reference types habilitado; sem `!` sem justificativa.',
        '- Indentação de 4 espaços; chaves em linha própria (Allman); `file-scoped namespaces`.',
        '- Testes com xUnit + FluentAssertions: `Method_Scenario_ExpectedResult`.') },
      { key: 'net-clean', name: 'Clean Architecture .NET', summary: 'Domain/Application/Infrastructure/Api em projetos separados.', content: md(
        '# Convenções .NET — Clean Architecture',
        '- Projetos: `App.Domain`, `App.Application`, `App.Infrastructure`, `App.Api`; referências só para dentro.',
        '- Interfaces com prefixo `I` (`IOrderRepository`), implementações sem prefixo.',
        '- Casos de uso como handlers: `CreateOrderHandler` com `HandleAsync`.',
        '- EF Core apenas na Infrastructure; configurações via `IEntityTypeConfiguration<T>`.',
        '- Options pattern para configuração (`IOptions<PaymentOptions>`).') },
      { key: 'net-cqrs', name: 'CQRS + MediatR', summary: 'Commands/Queries separados, pipeline behaviors.', content: md(
        '# Convenções .NET — CQRS + MediatR',
        '- Commands `CreateOrderCommand` e queries `GetOrderByIdQuery` como `record`; um handler por arquivo.',
        '- Queries nunca alteram estado; commands retornam no máximo o id criado.',
        '- Validação e logging em `IPipelineBehavior`.',
        '- Pastas por feature: `Features/Orders/Create/`.') }
    ]
  },
  python: {
    label: 'Backend Python', suggest: ['unit-tests', 'errors', 'logs', 'api-rest'], templates: [
      { key: 'py-fastapi', name: 'FastAPI + typing', summary: 'Pydantic, type hints e routers por domínio.', content: md(
        '# Convenções Python — FastAPI',
        '- PEP 8: `snake_case` para funções, variáveis e módulos; `PascalCase` para classes; `UPPER_SNAKE_CASE` para constantes.',
        '- Type hints em todas as assinaturas; `mypy --strict` sem erros.',
        '- Routers por domínio em `app/routers/orders.py`; schemas Pydantic `OrderCreate`, `OrderRead`.',
        '- Dependências via `Depends`; nada de estado global mutável.',
        '- Formatação com Ruff/Black (88 colunas), imports ordenados (isort/Ruff).',
        '- Funções privadas com prefixo `_`; booleanos `is_`/`has_`.',
        '- Testes com pytest e `httpx.AsyncClient`; fixtures em `conftest.py`.') },
      { key: 'py-django', name: 'Django', summary: 'Apps pequenas, models gordos e views finas.', hint: /django/i, content: md(
        '# Convenções Python — Django',
        '- Um app por contexto; models no singular (`Order`), apps no plural (`orders`).',
        '- Regras de negócio em models/services, views finas; querysets customizados para filtros reutilizáveis.',
        '- Migrations revisadas e nomeadas (`0003_add_status_to_order`).',
        '- Settings por ambiente e segredos só via variáveis de ambiente.',
        '- Testes com pytest-django e factories (factory_boy).') },
      { key: 'py-modern', name: 'Python moderno (libs e scripts)', summary: 'dataclasses, pathlib, typing e CLI limpa.', content: md(
        '# Convenções Python — moderno',
        '- `dataclasses`/`attrs` para estruturas; `pathlib` para caminhos; f-strings.',
        '- Um ponto de entrada `main()` protegido por `if __name__ == "__main__":`.',
        '- Exceções específicas; nunca `except:` vazio.',
        '- Logging com `logging.getLogger(__name__)`, sem `print` em código de biblioteca.') }
    ]
  },
  go: {
    label: 'Backend Go', suggest: ['unit-tests', 'errors', 'logs', 'observability'], templates: [
      { key: 'go-idiomatic', name: 'Go idiomático', summary: 'Effective Go, erros explícitos e pacotes pequenos.', content: md(
        '# Convenções Go — idiomático',
        '- `gofmt`/`goimports` sempre; `golangci-lint` sem avisos.',
        '- Nomes curtos e claros; exportados em `PascalCase`, internos em `camelCase`; siglas em caixa uniforme (`userID`, `HTTPServer`).',
        '- Pacotes com nome curto no singular, sem `util`/`common`.',
        '- Erros retornados e embrulhados com contexto: `fmt.Errorf("load order %s: %w", id, err)`.',
        '- `context.Context` como primeiro parâmetro em operações de I/O.',
        '- Interfaces pequenas definidas no consumidor; aceite interfaces, retorne structs.',
        '- Testes table-driven em `_test.go`.') },
      { key: 'go-hex', name: 'Go hexagonal', summary: 'internal/, domínio isolado e adaptadores.', content: md(
        '# Convenções Go — hexagonal',
        '- Layout: `cmd/<app>/main.go`, `internal/domain`, `internal/app`, `internal/adapters/{http,postgres}`.',
        '- Domínio sem dependências externas; portas como interfaces em `internal/app`.',
        '- Construtores `NewOrderService(repo OrderRepository) *OrderService`.') },
      { key: 'go-micro', name: 'Go microsserviços (gRPC)', summary: 'protobuf, gRPC e observabilidade.', content: md(
        '# Convenções Go — microsserviços',
        '- Contratos em protobuf versionados (`order.v1`); `buf lint` obrigatório.',
        '- Timeouts em todo cliente; retries só em operações idempotentes.',
        '- Métricas, traces (OpenTelemetry) e logs estruturados com `slog`.') }
    ]
  },
  php: {
    label: 'Backend PHP', suggest: ['unit-tests', 'errors', 'api-rest', 'migrations'], templates: [
      { key: 'php-laravel', name: 'Laravel', summary: 'Convenções Laravel, Form Requests e Eloquent.', content: md(
        '# Convenções PHP — Laravel',
        '- PSR-12; classes `PascalCase`, métodos e variáveis `camelCase`, tabelas `snake_case` no plural.',
        '- Controllers resource finos; validação em `FormRequest` (`StoreOrderRequest`).',
        '- Regras de negócio em services/actions (`CreateOrderAction`), não em controllers.',
        '- Respostas com API Resources (`OrderResource`).',
        '- Testes com Pest/PHPUnit e factories.') },
      { key: 'php-symfony', name: 'Symfony', summary: 'Bundles, services autowired e Doctrine.', content: md(
        '# Convenções PHP — Symfony',
        '- Services autowired com injeção por construtor e propriedades `readonly`.',
        '- Entidades Doctrine com atributos; repositórios `OrderRepository`.',
        '- DTOs + Validator para entrada; serializer para saída.') },
      { key: 'php-psr', name: 'PHP moderno (PSR)', summary: 'PHP 8.3, tipos estritos e PSR.', content: md(
        '# Convenções PHP — moderno',
        '- `declare(strict_types=1);` em todo arquivo; tipos em parâmetros, retornos e propriedades.',
        '- PSR-4 autoload, PSR-12 estilo; enums nativos e `readonly` classes.',
        '- PHPStan nível máximo sem erros.') }
    ]
  },
  supabase: {
    label: 'Supabase (Postgres + BaaS)', suggest: ['migrations', 'sql-naming', 'secrets', 'lgpd', 'integration-tests'], templates: [
      { key: 'sb-essential', name: 'Supabase essencial', summary: 'Postgres como fonte da verdade, RLS em toda tabela e tipos gerados.', content: md(
        '# Convenções Supabase — essencial',
        'Supabase é Postgres com Auth, Storage, Realtime e Edge Functions em volta: o banco é a fonte da verdade e a segurança mora nele.',
        '## Estrutura do projeto',
        '- `supabase/config.toml`, `supabase/migrations/` (SQL versionado), `supabase/seed.sql` (dados de desenvolvimento) e `supabase/functions/` (Edge Functions) sempre no repositório.',
        '- Desenvolvimento local com `supabase start`; nada é testado direto no projeto de produção.',
        '- Um projeto por ambiente (dev, staging, prod) ou branching do Supabase; URL e chaves por variável de ambiente.',
        '## Modelagem',
        '- Tabelas em `snake_case` no plural (`orders`, `order_items`); colunas em `snake_case`; FKs `<entidade>_id`.',
        '- Chave primária `id uuid primary key default gen_random_uuid()` (ou `bigint generated always as identity` em tabelas internas).',
        '- `created_at timestamptz not null default now()` e `updated_at` mantido por trigger.',
        '- Toda FK com índice e `on delete` explícito (`cascade` só quando o filho não faz sentido sem o pai).',
        '- Dados do usuário em `public.profiles` ligada a `auth.users(id)`; nunca exponha o schema `auth`.',
        '## Segurança',
        '- **RLS habilitado em toda tabela** dos schemas expostos (`public`), inclusive nas criadas por migração: `alter table public.orders enable row level security;`.',
        '- A chave `anon`/publishable pode ir para o cliente **porque** o RLS protege os dados; a `service_role`/secret só em servidor, Edge Function ou CI.',
        '- Autorização nunca depende do cliente: filtro no front é conveniência, a regra está na policy.',
        '## Tipos e cliente',
        '- Tipos gerados com `supabase gen types typescript --local > src/types/database.ts`, regenerados a cada migração.',
        '- Cliente tipado `createClient<Database>(url, key)`; sempre trate `{ data, error }`.',
        CONV_COMMON.tests) },
      { key: 'sb-rls', name: 'Segurança e RLS', summary: 'Negar por padrão, policies por operação, claims seguras e testes com pgTAP.', hint: /\brls\b|seguran|security/i, content: md(
        '# Convenções Supabase — segurança e RLS',
        '## Princípios',
        '- Negar por padrão: tabela com RLS e sem policy não retorna nada; crie só as policies necessárias.',
        '- Uma policy por operação (`select`, `insert`, `update`, `delete`) e por papel (`to authenticated`, `to anon`), com nome descritivo: `"orders: owner can select"`.',
        '- `update` sempre com `using` **e** `with check`, para o usuário não mover a linha para outro dono.',
        '## Performance das policies',
        '- Use `(select auth.uid())` em vez de `auth.uid()` direto, para o Postgres avaliar uma vez por consulta.',
        '- Índice nas colunas usadas nas policies (`user_id`, `org_id`); prefira `org_id in (select ...)` a joins dentro da policy.',
        '## Autorização',
        '- Papéis e permissões em tabela própria (`memberships`) ou em custom claims via Auth Hook, lidos com `auth.jwt()`.',
        '- Nunca use `user_metadata`/`raw_user_meta_data` para autorização: o próprio usuário pode alterá-lo. Use `app_metadata`.',
        '## Funções e views',
        '- Funções `security definer` só em schema privado (`private`), com `set search_path = \'\'` e nomes totalmente qualificados.',
        '- Revogue `execute` de `anon` e `authenticated` nas funções internas.',
        '- Views com `with (security_invoker = true)` para respeitar o RLS de quem consulta.',
        '## Storage',
        '- Buckets privados por padrão; policies em `storage.objects` pelo `bucket_id` e pela pasta do usuário: `(storage.foldername(name))[1] = (select auth.uid())::text`.',
        '- Arquivos privados entregues por URL assinada com expiração curta.',
        '## Verificação',
        '- Testes de policy com pgTAP em `supabase/tests/` (`supabase test db`), cobrindo dono, outro usuário e anônimo.',
        '- Security Advisor e `supabase db lint` sem alertas antes de entregar.',
        CONV_COMMON.delivery) },
      { key: 'sb-db', name: 'Banco e migrações', summary: 'Migrações só pelo CLI, RPC atômicas, performance e pooler.', hint: /migra|postgres|sql/i, content: md(
        '# Convenções Supabase — banco e migrações',
        '## Migrações',
        '- Toda mudança de schema é uma migração: `supabase migration new add_status_to_orders`, com o SQL revisado no PR.',
        '- Nunca altere produção pelo dashboard; se algo foi feito lá, capture com `supabase db diff` e versione.',
        '- `supabase db reset` local recria o banco do zero com as migrações e o `seed.sql`.',
        '- Aplicação em staging e produção só pelo CI (`supabase db push`), nunca da máquina de alguém.',
        '- Mudanças destrutivas em duas etapas (expand/contract): adicionar, migrar os dados e só depois remover.',
        '## SQL',
        '- Nomes sempre qualificados com schema (`public.orders`); estilo de palavras-chave consistente no projeto.',
        '- Operações que precisam ser atômicas em funções RPC (`create function public.place_order(...)`), chamadas com `supabase.rpc()`; funções de leitura como `stable`.',
        '- Enums só para listas estáveis; listas que mudam viram tabela de referência ou `check`.',
        '- Trigger reutilizável `set_updated_at()` para as colunas `updated_at`.',
        '- Extensões (`pg_cron`, `pgvector`, `pg_net`) declaradas em migração, no schema `extensions`.',
        '## Performance e operação',
        '- `explain analyze` em toda consulta nova; `pg_stat_statements` e Index Advisor para achar gargalos.',
        '- Conexões de serverless pelo pooler (Supavisor, modo transaction, porta 6543); conexão direta só para migrações e jobs longos.',
        '- Backups e PITR habilitados em produção, com a restauração testada.',
        CONV_COMMON.delivery) },
      { key: 'sb-edge', name: 'Edge Functions (Deno)', summary: 'Funções por pasta, JWT verificado, RLS como o usuário e segredos no vault.', hint: /edge|deno|function/i, content: md(
        '# Convenções Supabase — Edge Functions (Deno)',
        '## Estrutura',
        '- Uma função por pasta: `supabase/functions/<nome-em-kebab-case>/index.ts`; código compartilhado em `supabase/functions/_shared/` (`cors.ts`, `supabase-client.ts`).',
        '- Handler com `Deno.serve(async (req) => { ... })`; dependências via `deno.json` (imports `npm:`/`jsr:`) com versões fixas.',
        '## Segurança',
        '- Verificação de JWT ligada (padrão); desligue (`--no-verify-jwt`) só em webhooks, que então validam a assinatura do provedor.',
        '- Crie o cliente com o header `Authorization` da requisição para o RLS valer como o usuário; `service_role` só em tarefas administrativas explícitas.',
        '- Segredos com `supabase secrets set` e lidos com `Deno.env.get()`; nunca no código ou no repositório.',
        '- Trate `OPTIONS` (CORS) com os headers compartilhados; origens permitidas explícitas em produção.',
        '## Comportamento',
        '- Valide o corpo da requisição com schema (Zod) e responda erros em JSON com o status HTTP correto.',
        '- Webhooks idempotentes (id do evento registrado) e timeout em toda chamada externa.',
        '- Trabalho pesado ou longo vai para fila ou agendamento (`pgmq`, `pg_cron`), não para a requisição.',
        '- Logs estruturados em JSON, sem dados pessoais.',
        '- Teste local com `supabase functions serve` e testes com `deno test`.',
        CONV_COMMON.delivery) },
      { key: 'sb-client', name: 'App cliente (supabase-js + SSR)', summary: 'Cliente tipado, sessão em cookies, consultas enxutas e Realtime limpo.', hint: /next|react|vue|svelte|client|ssr|flutter/i, content: md(
        '# Convenções Supabase — app cliente (supabase-js + SSR)',
        '## Cliente',
        '- Um cliente por contexto: `lib/supabase/client.ts` (browser) e `lib/supabase/server.ts` (servidor), tipados com `Database`.',
        '- Em SSR (Next.js, SvelteKit, Remix) use `@supabase/ssr` com a sessão em cookies.',
        '- No servidor, confie em `supabase.auth.getUser()` (valida o token no Auth); `getSession()` só para ler a sessão no cliente.',
        '## Consultas',
        '- Sempre trate `{ data, error }`: erro vira mensagem amigável e log, nunca é ignorado.',
        '- Selecione só as colunas necessárias (`.select(\'id, status, total\')`) e pagine com `.range(from, to)`.',
        '- Relações pelo PostgREST (`.select(\'*, order_items(*)\')`) em vez de várias chamadas em sequência.',
        '- Escritas que precisam ser atômicas vão para RPC, não para várias chamadas do cliente.',
        '## Realtime e Storage',
        '- Assine canais só na tela que precisa e remova com `supabase.removeChannel(channel)` ao desmontar.',
        '- Realtime respeita o RLS: publique só as tabelas necessárias.',
        '- Uploads no caminho `<user_id>/<arquivo>`; arquivos privados por URL assinada.',
        '## Auth',
        '- Login pelo SDK (`signInWithOtp`, OAuth, senha), com URLs de redirect permitidas por ambiente.',
        '- `onAuthStateChange` assinado uma vez na raiz do app e cancelado ao desmontar.',
        CONV_COMMON.tests) }
    ]
  },
  firebase: {
    label: 'Firebase (BaaS)', suggest: ['secrets', 'lgpd', 'integration-tests', 'observability', 'errors'], templates: [
      { key: 'fb-essential', name: 'Firebase essencial', summary: 'Projeto por ambiente, Emulator Suite, rules versionadas e App Check.', content: md(
        '# Convenções Firebase — essencial',
        'Firebase é backend como serviço: o cliente fala direto com o Firestore e o Storage, então as Security Rules são o seu backend.',
        '## Projeto e ambientes',
        '- Um projeto Firebase por ambiente (dev, staging, prod), com aliases em `.firebaserc` (`firebase use staging`).',
        '- `firebase.json`, `firestore.rules`, `firestore.indexes.json` e `storage.rules` versionados e publicados só pelo CLI/CI (`firebase deploy --only firestore:rules`).',
        '- Desenvolvimento e testes na Emulator Suite (`firebase emulators:start`); nunca contra produção.',
        '- Configuração do app por variável de ambiente; a chave de API web é pública, mas restrita por domínio e protegida por App Check.',
        '## SDK',
        '- SDK modular (v9+): `import { getFirestore, doc, getDoc } from \'firebase/firestore\'`; nada de `compat`.',
        '- `initializeApp` uma única vez em `lib/firebase.ts`, que exporta os serviços.',
        '## Dados',
        '- Coleções em minúsculas no plural (`orders`), campos em `camelCase`, IDs automáticos ou determinísticos quando há unicidade natural (`users/{uid}`).',
        '- Datas com `serverTimestamp()` (`createdAt`, `updatedAt`); nunca o relógio do dispositivo para regra de negócio.',
        '- Dados do usuário em `users/{uid}`, com o `uid` do Auth como ID do documento.',
        '## Segurança',
        '- Security Rules negam por padrão; toda coleção nova chega com rules e testes no mesmo PR.',
        '- App Check habilitado e aplicado em Firestore, Storage e Functions.',
        '- Papéis por custom claims definidas pelo Admin SDK, nunca por um campo que o próprio usuário edita.',
        CONV_COMMON.tests) },
      { key: 'fb-rules', name: 'Security Rules rigorosas', summary: 'Negar por padrão, validar cada escrita e testar no emulador.', hint: /rules|seguran|security/i, content: md(
        '# Convenções Firebase — Security Rules rigorosas',
        '## Estrutura',
        '- `rules_version = \'2\';` e nenhuma regra curinga que libera tudo: comece negando e libere coleção por coleção.',
        '- Funções auxiliares no topo: `isSignedIn()`, `isOwner(uid)`, `hasRole(role)` (lê `request.auth.token`), `isValidOrder(data)`.',
        '- `allow` por operação (`get`, `list`, `create`, `update`, `delete`) em vez de `read`/`write` genéricos.',
        '## Validação de escrita',
        '- Esquema validado nas rules: `request.resource.data.keys().hasOnly([...])`, `hasAll` para obrigatórios, tipos (`is string`, `is timestamp`) e tamanhos (`size() <= 200`).',
        '- Campos imutáveis protegidos (`request.resource.data.ownerId == resource.data.ownerId`) e `createdAt == request.time` na criação.',
        '- `update` limita o que muda com `request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])`.',
        '## Leitura',
        '- Rules não são filtros: uma query `list` só passa se ela mesma restringir os dados (ex.: `where(\'ownerId\', \'==\', uid)`).',
        '- Poucos `get()`/`exists()` por regra (há limite por requisição e cada um cobra uma leitura); prefira custom claims ou dados desnormalizados.',
        '## Storage',
        '- `storage.rules` por pasta do usuário (`/users/{uid}/...`), com limite de tamanho (`request.resource.size < 5 * 1024 * 1024`) e `request.resource.contentType.matches(\'image/.*\')`.',
        '## Testes',
        '- Testes com `@firebase/rules-unit-testing` no emulador cobrindo dono, outro usuário, anônimo e payload inválido; rodam no CI antes do deploy.',
        CONV_COMMON.delivery) },
      { key: 'fb-model', name: 'Modelagem Firestore', summary: 'Modelar pelas consultas, desnormalizar com critério e paginar sempre.', hint: /firestore|model/i, content: md(
        '# Convenções Firebase — modelagem Firestore',
        '## Princípios',
        '- Modele pelas consultas das telas: cada leitura importante é uma query simples, sem joins.',
        '- Desnormalize de propósito (ex.: `customerName` dentro do pedido) e documente quem mantém a cópia atualizada.',
        '- Documento abaixo de 1 MiB; nada de arrays ou mapas que crescem sem limite: use subcoleções (`orders/{id}/items`).',
        '- Evite IDs sequenciais ou timestamps como ID (hotspot de escrita); use IDs automáticos.',
        '## Consultas',
        '- Toda query com `limit()` e paginação por cursor (`startAfter(lastDoc)`); nunca carregue a coleção inteira.',
        '- Índices compostos declarados em `firestore.indexes.json` e versionados; remova os que não são usados.',
        '- Contagens e somas com agregações (`count()`, `sum()`); contadores com muita escrita viram contadores distribuídos.',
        '## Escritas',
        '- Escritas relacionadas em `writeBatch` (até 500 operações) ou `runTransaction` quando dependem de uma leitura.',
        '- Tipagem com `withConverter<Order>()` em cada coleção, com os tipos em `src/types`.',
        '- Dados antigos removidos por políticas de TTL; apagar um documento não apaga as subcoleções dele.',
        '- Listeners em tempo real só onde a tela precisa; o resto com leitura única (`getDoc`/`getDocs`).',
        CONV_COMMON.delivery) },
      { key: 'fb-functions', name: 'Cloud Functions (2ª geração)', summary: 'API v2 em TypeScript, gatilhos idempotentes e segredos no Secret Manager.', hint: /function|serverless/i, content: md(
        '# Convenções Firebase — Cloud Functions (2ª geração)',
        '## Estrutura',
        '- TypeScript em `functions/src`, uma função por arquivo e exports reunidos em `index.ts`; nomes em `camelCase` com verbo (`onOrderCreated`, `createCheckout`).',
        '- API v2 de `firebase-functions/v2` (`onCall`, `onRequest`, `onDocumentCreated`, `onSchedule`), com região explícita (`setGlobalOptions({ region: \'southamerica-east1\' })`).',
        '- Admin SDK inicializado uma vez (`initializeApp()`), fora dos handlers.',
        '## Segurança',
        '- `onCall` verifica `request.auth` e aplica App Check (`enforceAppCheck: true`); payload validado com schema (Zod).',
        '- Segredos com `defineSecret(\'STRIPE_KEY\')` (Secret Manager) e parâmetros com `defineString`; nada de `.env` com segredo no repositório.',
        '- Erros para o cliente com `HttpsError` e o código adequado; detalhes internos só no log.',
        '## Gatilhos',
        '- Gatilhos idempotentes: use `event.id` para não processar o mesmo evento duas vezes (a entrega é "pelo menos uma vez").',
        '- Nunca escreva no documento que dispara a função sem uma condição de parada (loop infinito e custo).',
        '- Trabalho longo em filas (Cloud Tasks) com retry; timeout e memória definidos por função.',
        '## Operação',
        '- Logs estruturados com o `logger` de `firebase-functions`, sem dados pessoais.',
        '- `minInstances` só onde o cold start prejudica a experiência (é custo fixo).',
        '- Testes com o emulador e `firebase-functions-test`; deploy só pelo CI (`firebase deploy --only functions`).',
        CONV_COMMON.tests) },
      { key: 'fb-client', name: 'App cliente + Auth', summary: 'SDK modular no app, Auth centralizado, listeners limpos e Hosting.', hint: /next|react|vue|angular|flutter|client|hosting/i, content: md(
        '# Convenções Firebase — app cliente + Auth',
        '## SDK no app',
        '- Imports modulares e específicos para manter o bundle pequeno; serviços vindos de `lib/firebase.ts`.',
        '- Em desenvolvimento, conecte aos emuladores (`connectFirestoreEmulator`, `connectAuthEmulator`) por variável de ambiente.',
        '- Cache offline com `initializeFirestore(app, { localCache: persistentLocalCache() })` quando o app precisa funcionar sem rede.',
        '## Auth',
        '- Um único `onAuthStateChanged` na raiz do app, com o usuário exposto por contexto/store e cancelado ao desmontar.',
        '- Papéis lidos das custom claims (`getIdTokenResult()`) só para montar a interface; a permissão real está nas rules.',
        '- Depois de mudar claims no servidor, force a renovação do token (`getIdToken(true)`).',
        '## Dados em tela',
        '- Todo `onSnapshot` guarda o `unsubscribe` e o chama ao sair da tela.',
        '- Erros tratados pelo código (`permission-denied`, `unavailable`, `auth/invalid-credential`) com mensagens em português.',
        '- Estados de carregamento, vazio e erro em toda lista vinda do Firestore.',
        '## Hosting',
        '- `firebase.json` com headers de segurança e cache (assets com hash `immutable`, `index.html` sem cache) e rewrites de SPA.',
        '- Preview channels (`firebase hosting:channel:deploy`) para revisar cada PR.',
        CONV_COMMON.tests) }
    ]
  },
  frontend: {
    label: 'Frontend (geral)', suggest: ['a11y', 'web-perf', 'i18n', 'unit-tests'], templates: [
      { key: 'fe-components', name: 'Componentes + BEM', summary: 'Componentes pequenos, CSS BEM e estados completos.', content: md(
        '# Convenções Frontend — componentes',
        '## Nomenclatura',
        '- Componentes em `PascalCase` (`OrderCard`); arquivos na mesma grafia do componente.',
        '- Variáveis/funções em `camelCase`; handlers com prefixo `handle` (`handleSubmit`) e props de evento com `on` (`onSubmit`).',
        '- Booleanos com `is/has/should` (`isLoading`, `hasError`); constantes `UPPER_SNAKE_CASE`.',
        '- CSS em BEM: `.order-card`, `.order-card__title`, `.order-card--highlighted`.',
        '## Padrões',
        '- Todo componente de dados cobre estados: carregando, vazio, erro e sucesso.',
        '- Componentes de apresentação sem chamada de API; dados entram por props.',
        '- HTML semântico primeiro; ARIA só quando o HTML não resolve.',
        CONV_COMMON.jsFormat) },
      { key: 'fe-ds', name: 'Design system first', summary: 'Tokens, componentes do DS e zero valores mágicos.', content: md(
        '# Convenções Frontend — design system first',
        '- Use somente componentes e tokens do design system; nada de cores, espaçamentos ou fontes soltas.',
        '- Tokens semânticos (`--color-surface`, `--space-3`), nunca valores brutos.',
        '- Componente novo só depois de verificar o catálogo; documente no Storybook.',
        '- Variantes por props (`variant`, `size`), não por classes ad hoc.') },
      { key: 'fe-perf', name: 'Performance first', summary: 'Orçamento de bundle, lazy loading e Core Web Vitals.', content: md(
        '# Convenções Frontend — performance first',
        '- Orçamento: JS inicial ≤ 170 KB gzip; imagens responsivas (`srcset`) e modernas (AVIF/WebP).',
        '- Code splitting por rota; componentes pesados com lazy loading.',
        '- Metas: LCP < 2,5 s, INP < 200 ms, CLS < 0,1; meça antes e depois.',
        '- Evite re-renderizações: memorize apenas com medição que justifique.') }
    ]
  },
  vanilla: {
    label: 'Frontend HTML + CSS + JS', suggest: ['a11y', 'web-perf', 'jsdoc'], templates: [
      { key: 'van-esm', name: 'ES modules + BEM', summary: 'Módulos nativos, BEM e JS sem framework.', content: md(
        '# Convenções Frontend vanilla — ES modules + BEM',
        '## HTML',
        '- HTML5 semântico (`header`, `main`, `nav`, `section`, `button`); atributos em minúsculas e aspas duplas.',
        '- `id` só para âncoras e rótulos; estilo e JS por classes/`data-*` (`data-action="save"`).',
        '## CSS',
        '- BEM: `.card`, `.card__title`, `.card--active`; estados com `.is-open`, `.is-loading`.',
        '- Variáveis CSS em `:root` (`--color-primary`); mobile first com `min-width`.',
        '- Indentação de 2 espaços; uma declaração por linha; propriedades agrupadas (layout → caixa → tipografia → visual).',
        '## JavaScript',
        '- `<script type="module">`; módulos em `kebab-case.js`; sem variáveis globais.',
        '- `const` por padrão, `let` quando reatribuir; nunca `var`.',
        '- Funções: `camelCase` com verbo (`renderList`, `toggleMenu`); handlers `handleClick`; seletores em constantes (`const SELECTORS = {...}`).',
        '- Delegação de eventos no contêiner; manipule o DOM em lote (fragmentos).',
        CONV_COMMON.jsFormat) },
      { key: 'van-wc', name: 'Web Components', summary: 'Custom elements, Shadow DOM e eventos customizados.', hint: /web ?component/i, content: md(
        '# Convenções Frontend vanilla — Web Components',
        '- Custom elements com prefixo do projeto e hífen: `<app-order-card>`; classe `AppOrderCard`.',
        '- Atributos refletidos em `kebab-case`, propriedades em `camelCase`.',
        '- Shadow DOM para encapsular estilo; partes expostas com `::part()`.',
        '- Comunicação por `CustomEvent` com nome `app-order-selected` e `bubbles: true, composed: true`.') },
      { key: 'van-progressive', name: 'Progressive enhancement', summary: 'Funciona sem JS; JS apenas melhora.', content: md(
        '# Convenções Frontend vanilla — progressive enhancement',
        '- A página funciona com HTML e CSS; JS adiciona comportamento, nunca é requisito.',
        '- Formulários com `action`/`method` reais; interceptação opcional via JS.',
        '- Feature detection (`if (\'IntersectionObserver\' in window)`), nunca user agent.') }
    ]
  },
  react: {
    label: 'Frontend React', suggest: ['a11y', 'unit-tests', 'web-perf', 'i18n'], templates: [
      { key: 'react-hooks', name: 'Hooks + TypeScript', summary: 'Componentes funcionais tipados e hooks customizados.', content: md(
        '# Convenções React — hooks + TypeScript',
        '## Nomenclatura',
        '- Componentes `PascalCase` em arquivos `OrderCard.tsx`; um componente exportado por arquivo.',
        '- Hooks com prefixo `use` (`useOrders`) em `hooks/useOrders.ts`.',
        '- Props tipadas como `type OrderCardProps = {...}`; handlers `handleX`, props de evento `onX`.',
        '- Booleanos `is/has/should`; constantes `UPPER_SNAKE_CASE` fora do componente.',
        '## Padrões',
        '- Somente componentes funcionais; estado local mínimo; derive em vez de duplicar.',
        '- Efeitos só para sincronizar com sistemas externos; dados remotos com TanStack Query.',
        '- Keys estáveis (ids), nunca índice do array quando a lista muda.',
        '- Estilos com CSS Modules (`OrderCard.module.css`) ou o padrão do projeto.',
        CONV_COMMON.jsFormat,
        CONV_COMMON.tests) },
      { key: 'react-fsd', name: 'Feature-sliced design', summary: 'Camadas app/pages/widgets/features/entities/shared.', content: md(
        '# Convenções React — Feature-sliced design',
        '- Camadas: `app/`, `pages/`, `widgets/`, `features/`, `entities/`, `shared/`; importe só de camadas abaixo.',
        '- Cada slice expõe API pública por `index.ts`; nada de import profundo.',
        '- Segmentos por slice: `ui/`, `model/`, `api/`, `lib/`.',
        '- Nomes de features no formato verbo-substantivo: `features/add-to-cart`.') },
      { key: 'react-atomic', name: 'Atomic design', summary: 'atoms, molecules, organisms, templates e pages.', content: md(
        '# Convenções React — Atomic design',
        '- Pastas `atoms/`, `molecules/`, `organisms/`, `templates/`, `pages/`.',
        '- Átomos sem estado de negócio; organismos podem ter estado de UI; dados só em pages.',
        '- Cada componente com story e teste de acessibilidade básico.') }
    ]
  },
  angular: {
    label: 'Frontend Angular', suggest: ['a11y', 'unit-tests', 'i18n'], templates: [
      { key: 'ng-signals', name: 'Standalone + Signals', summary: 'Componentes standalone, signals e OnPush.', content: md(
        '# Convenções Angular — standalone + signals',
        '- Style guide oficial: arquivos `order-card.component.ts`, `orders.service.ts`, `auth.guard.ts`.',
        '- Classes com sufixo do tipo: `OrderCardComponent`, `OrdersService`; seletores com prefixo `app-`.',
        '- Componentes standalone com `ChangeDetectionStrategy.OnPush`.',
        '- Estado com `signal`, `computed` e `effect`; `input()`/`output()` em vez de decorators.',
        '- Injeção com `inject()`; serviços `providedIn: \'root\'` quando globais.',
        '- Formulários reativos tipados; sem lógica no template além de exibição.') },
      { key: 'ng-ngrx', name: 'NgRx (estado global)', summary: 'Store, actions, reducers, effects e selectors.', content: md(
        '# Convenções Angular — NgRx',
        '- Actions com `createActionGroup({ source: \'Orders\', events: {...} })`.',
        '- Reducers puros; efeitos para I/O; selectors memorizados com prefixo `select`.',
        '- Feature state por domínio; nada de estado derivado guardado na store.') },
      { key: 'ng-modules', name: 'Módulos clássicos', summary: 'NgModules por feature com lazy loading.', content: md(
        '# Convenções Angular — módulos clássicos',
        '- `CoreModule` (singletons), `SharedModule` (componentes reutilizáveis), módulos de feature lazy.',
        '- RxJS: sufixo `$` em observables; `async` pipe em vez de `subscribe` manual.') }
    ]
  },
  vue: {
    label: 'Frontend Vue', suggest: ['a11y', 'unit-tests', 'i18n'], templates: [
      { key: 'vue-composition', name: 'Composition API + TS', summary: '<script setup lang="ts">, composables e Pinia.', content: md(
        '# Convenções Vue — Composition API + TypeScript',
        '- SFC com `<script setup lang="ts">`; componentes `PascalCase` com nome multi-palavra (`OrderCard.vue`).',
        '- Composables com prefixo `use` em `composables/useOrders.ts`.',
        '- Props com `defineProps<Props>()` e eventos com `defineEmits`; eventos em `kebab-case`.',
        '- Estado global com Pinia: stores `useOrdersStore`.',
        '- Ordem do SFC: `<script>`, `<template>`, `<style scoped>`.') },
      { key: 'vue-nuxt', name: 'Nuxt', summary: 'Convenções de pastas Nuxt e server routes.', hint: /nuxt/i, content: md(
        '# Convenções Vue — Nuxt',
        '- Pastas Nuxt: `pages/`, `components/`, `composables/`, `server/api/`; auto-imports sem caminhos manuais.',
        '- Dados com `useFetch`/`useAsyncData` e chaves estáveis.',
        '- Runtime config para variáveis de ambiente.') },
      { key: 'vue-options', name: 'Options API', summary: 'Ordem de opções padronizada.', content: md(
        '# Convenções Vue — Options API',
        '- Ordem: `name`, `components`, `props`, `emits`, `data`, `computed`, `watch`, ciclo de vida, `methods`.',
        '- Props sempre com tipo e default.') }
    ]
  },
  next: {
    label: 'Frontend Next.js', suggest: ['a11y', 'web-perf', 'unit-tests'], templates: [
      { key: 'next-app', name: 'App Router', summary: 'Server Components por padrão e route handlers.', content: md(
        '# Convenções Next.js — App Router',
        '- Server Components por padrão; `\'use client\'` só em folhas interativas.',
        '- Rotas em `app/` com `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`; segmentos em `kebab-case`.',
        '- Busca de dados no servidor com cache/revalidate explícitos.',
        '- Metadata via `generateMetadata`; imagens com `next/image`.') },
      { key: 'next-pages', name: 'Pages Router', summary: 'getServerSideProps/getStaticProps e API routes.', content: md(
        '# Convenções Next.js — Pages Router',
        '- Páginas em `pages/`; dados via `getStaticProps` (preferido) ou `getServerSideProps`.',
        '- API routes finas em `pages/api/` delegando para services.') },
      { key: 'next-fullstack', name: 'Full-stack (Server Actions)', summary: 'Server Actions com validação e revalidação.', content: md(
        '# Convenções Next.js — full-stack',
        '- Server Actions em arquivos `actions.ts` com `\'use server\'` e validação Zod.',
        '- Após mutação, `revalidatePath`/`revalidateTag`; nunca exponha segredos ao client.') }
    ]
  },
  dba: {
    label: 'Banco de dados', suggest: ['migrations', 'security-owasp', 'observability'], templates: [
      { key: 'db-postgres', name: 'PostgreSQL', summary: 'snake_case, constraints explícitas e índices justificados.', content: md(
        '# Convenções de banco — PostgreSQL',
        '- Tabelas no plural em `snake_case` (`order_items`); colunas `snake_case`; PK `id` (`uuid` ou `bigint identity`).',
        '- FKs `<tabela_singular>_id` com constraint nomeada `fk_<tabela>_<coluna>`; índices `idx_<tabela>_<colunas>`.',
        '- `created_at`/`updated_at` `timestamptz` em toda tabela; dinheiro em `numeric(12,2)`.',
        '- Constraints (`NOT NULL`, `CHECK`, `UNIQUE`) no banco, não só na aplicação.',
        '- Índice novo só com `EXPLAIN ANALYZE` que o justifique; `CREATE INDEX CONCURRENTLY` em produção.',
        '- SQL em maiúsculas para palavras-chave, uma cláusula por linha.') },
      { key: 'db-mysql', name: 'MySQL / MariaDB', summary: 'InnoDB, utf8mb4 e chaves consistentes.', hint: /mysql|maria/i, content: md(
        '# Convenções de banco — MySQL / MariaDB',
        '- InnoDB e `utf8mb4` em todas as tabelas; nomes `snake_case` no plural.',
        '- PK `BIGINT UNSIGNED AUTO_INCREMENT`; FKs indexadas.',
        '- Evite `SELECT *`; paginação por chave (keyset) em tabelas grandes.') },
      { key: 'db-nosql', name: 'NoSQL (MongoDB / Redis)', summary: 'Modelagem por acesso, TTL e chaves nomeadas.', hint: /mongo|redis|nosql/i, content: md(
        '# Convenções de banco — NoSQL',
        '## MongoDB',
        '- Coleções no plural `camelCase`; campos `camelCase`; modele pelo padrão de acesso (embed vs reference).',
        '- Índices para toda consulta frequente; schema validation na coleção.',
        '## Redis',
        '- Chaves no formato `<app>:<entidade>:<id>:<campo>`; TTL obrigatório em cache.',
        '- Nada de `KEYS *` em produção; use `SCAN`.') }
    ]
  },
  devops: {
    label: 'DevOps / Cloud', suggest: ['observability', 'security-owasp', 'commits', 'git-flow'], templates: [
      { key: 'ops-k8s', name: 'Containers & Kubernetes', summary: 'Imagens mínimas, manifests declarativos e probes.', hint: /docker|kubernetes|k8s/i, content: md(
        '# Convenções DevOps — containers e Kubernetes',
        '- Dockerfile multi-stage, imagem base mínima fixada por versão, usuário não root.',
        '- Tags imutáveis (sha ou semver), nunca `latest` em produção.',
        '- Manifests com `requests/limits`, `livenessProbe` e `readinessProbe`.',
        '- Labels padrão `app.kubernetes.io/*`; namespaces por ambiente.',
        '- Segredos via Secret/External Secrets, nunca no repositório.') },
      { key: 'ops-iac', name: 'Infra como código (Terraform)', summary: 'Módulos, state remoto e plan revisado.', hint: /terraform|iac|aws|azure|cloud/i, content: md(
        '# Convenções DevOps — Terraform',
        '- Recursos e variáveis em `snake_case`; módulos por componente em `modules/<nome>`.',
        '- State remoto com lock; workspaces ou diretórios por ambiente.',
        '- `terraform fmt` e `validate` no CI; `plan` anexado ao PR antes do `apply`.',
        '- Tags obrigatórias: `project`, `env`, `owner`; menor privilégio em IAM.') },
      { key: 'ops-cicd', name: 'CI/CD (GitHub Actions)', summary: 'Pipelines rápidos, cache e deploy por ambiente.', hint: /ci\/cd|pipeline|actions|git/i, content: md(
        '# Convenções DevOps — CI/CD',
        '- Workflows em `.github/workflows/<acao>.yml`; jobs pequenos e nomeados.',
        '- Ordem: lint → testes → build → scan de segurança → deploy.',
        '- Actions fixadas por SHA; segredos só em environments protegidos.',
        '- Deploy de produção com aprovação manual e rollback documentado.') }
    ]
  },
  qa: {
    label: 'QA / Testes', suggest: ['unit-tests', 'a11y', 'review-checklist'], templates: [
      { key: 'qa-pyramid', name: 'Pirâmide de testes', summary: 'Muitos unitários, alguns de integração, poucos E2E.', hint: /unit|integra/i, content: md(
        '# Convenções QA — pirâmide de testes',
        '- Proporção alvo: 70% unitários, 20% integração, 10% E2E.',
        '- Testes determinísticos: sem dependência de horário, rede ou ordem; use fakes e relógio controlado.',
        '- Nome: `should <resultado> when <condição>`; padrão AAA.',
        '- Cobertura não é meta; todo bug corrigido ganha teste de regressão.',
        '- Relate cada falha com passos, esperado, obtido e evidência.') },
      { key: 'qa-bdd', name: 'BDD / Gherkin', summary: 'Cenários executáveis a partir dos critérios do PRD.', content: md(
        '# Convenções QA — BDD',
        '- Um arquivo `.feature` por história; cenários em português (`Funcionalidade`, `Cenário`, `Dado`, `Quando`, `Então`).',
        '- Steps reutilizáveis e declarativos (o quê, não como).',
        '- Tags `@smoke`, `@regressao`, `@bloqueante`.') },
      { key: 'qa-e2e', name: 'E2E (Playwright)', summary: 'Seletores por papel, page objects e dados isolados.', hint: /e2e|playwright|cypress/i, content: md(
        '# Convenções QA — E2E com Playwright',
        '- Seletores por papel e rótulo (`getByRole`, `getByLabel`), nunca por classe CSS.',
        '- Page objects `OrdersPage` com métodos de intenção (`createOrder`).',
        '- Cada teste cria e limpa seus dados; nada de dependência entre testes.',
        '- Traces e screenshots em falha; testes `@smoke` rodam em todo PR.') }
    ]
  },
  mobile: {
    label: 'Mobile', suggest: ['a11y', 'unit-tests', 'i18n'], templates: [
      { key: 'mob-flutter', name: 'Flutter / Dart', summary: 'Effective Dart, widgets pequenos e estado previsível.', hint: /flutter|dart/i, content: md(
        '# Convenções Mobile — Flutter',
        '- Effective Dart: `lowerCamelCase` para membros, `UpperCamelCase` para tipos, arquivos `snake_case.dart`.',
        '- Widgets pequenos e `const` sempre que possível; lógica fora da árvore de widgets.',
        '- Estado com Riverpod/BLoC conforme o projeto; um estado imutável por tela.',
        '- `dart format` e `flutter analyze` sem avisos.') },
      { key: 'mob-rn', name: 'React Native', summary: 'Componentes tipados, navegação e estilos por StyleSheet.', hint: /react native|\brn\b/i, content: md(
        '# Convenções Mobile — React Native',
        '- Componentes funcionais em TypeScript; telas com sufixo `Screen` (`OrdersScreen`).',
        '- Estilos com `StyleSheet.create` no fim do arquivo; sem valores mágicos (tema).',
        '- Navegação tipada (React Navigation) com parâmetros declarados.',
        '- Teste em iOS e Android; trate safe areas e teclado.') },
      { key: 'mob-native', name: 'Nativo (Swift / Kotlin)', summary: 'SwiftUI e Jetpack Compose com arquitetura MVVM.', hint: /swift|ios|kotlin|android/i, content: md(
        '# Convenções Mobile — nativo',
        '- iOS: Swift API Design Guidelines, SwiftUI + MVVM, `camelCase` para membros, tipos `UpperCamelCase`.',
        '- Android: Kotlin coding conventions, Jetpack Compose + ViewModel, coroutines com `viewModelScope`.',
        '- Camada de dados com repositórios; nada de chamadas de rede em views.') }
    ]
  },
  security: {
    label: 'Segurança', suggest: ['security-owasp', 'logs', 'review-checklist'], templates: [
      { key: 'sec-owasp', name: 'OWASP Top 10', summary: 'Revisão guiada pelo OWASP Top 10 e ASVS.', hint: /appsec|review|owasp/i, content: md(
        '# Convenções de segurança — OWASP',
        '- Revise cada mudança contra o OWASP Top 10 e registre o item avaliado.',
        '- Entrada sempre validada; consultas parametrizadas; saída escapada no contexto certo.',
        '- Segredos nunca em código ou logs; rotação documentada.',
        '- Dependências com vulnerabilidade conhecida bloqueiam o merge.',
        '- Achados classificados por severidade (Crítica/Alta/Média/Baixa) com recomendação.') },
      { key: 'sec-ssdlc', name: 'Secure SDLC', summary: 'Ameaças modeladas, SAST/DAST e gates no CI.', hint: /pentest/i, content: md(
        '# Convenções de segurança — Secure SDLC',
        '- Modelagem de ameaças (STRIDE) para toda feature que toca dados sensíveis.',
        '- SAST e varredura de dependências no CI; DAST em homologação.',
        '- Pentest só em escopo autorizado e documentado.') },
      { key: 'sec-iam', name: 'IAM / Zero trust', summary: 'Menor privilégio, MFA e tokens de curta duração.', hint: /iam|auth/i, content: md(
        '# Convenções de segurança — IAM / zero trust',
        '- Menor privilégio por padrão; permissões revisadas a cada mudança.',
        '- OAuth 2.1/OIDC; tokens de acesso curtos, refresh com rotação.',
        '- Senhas com Argon2id; MFA para contas administrativas.') }
    ]
  },
  data: {
    label: 'Dados', suggest: ['migrations', 'observability', 'unit-tests'], templates: [
      { key: 'data-elt', name: 'ELT / dbt', summary: 'Camadas staging/intermediate/marts e testes de dados.', hint: /etl|elt|pipeline/i, content: md(
        '# Convenções de dados — ELT / dbt',
        '- Camadas: `staging` (`stg_`), `intermediate` (`int_`), `marts` (`fct_`, `dim_`).',
        '- Modelos e colunas em `snake_case`; chaves `<entidade>_id`.',
        '- Testes `unique`/`not_null`/`relationships` em toda chave; documentação de colunas.',
        '- Pipelines idempotentes e reprocessáveis.') },
      { key: 'data-stream', name: 'Streaming (Kafka)', summary: 'Tópicos nomeados, schemas versionados e idempotência.', hint: /kafka|stream/i, content: md(
        '# Convenções de dados — streaming',
        '- Tópicos `<dominio>.<entidade>.<evento>.v<N>`; schemas no registry (Avro/Protobuf).',
        '- Consumidores idempotentes com commit após processamento; DLQ para falhas.',
        '- Chave de partição definida pelo agregado.') },
      { key: 'data-analytics', name: 'Analytics / BI', summary: 'Métricas definidas uma vez e dashboards rastreáveis.', hint: /analytics|bi\b/i, content: md(
        '# Convenções de dados — analytics',
        '- Métricas com definição única (camada semântica); nomes `<metrica>_<granularidade>`.',
        '- Todo dashboard indica fonte, atualização e dono.') }
    ]
  },
  design: {
    label: 'Design', suggest: ['a11y', 'i18n'], templates: [
      { key: 'ds-tokens', name: 'Design tokens', summary: 'Tokens semânticos e componentes documentados.', hint: /design system|token/i, content: md(
        '# Convenções de design — tokens',
        '- Tokens em três níveis: primitivos → semânticos → componente.',
        '- Nomes `<categoria>/<papel>/<estado>` (ex.: `color/surface/hover`).',
        '- Componentes com variantes documentadas e specs de espaçamento.') },
      { key: 'ds-a11y', name: 'Acessibilidade first', summary: 'Contraste, foco visível e fluxos por teclado.', content: md(
        '# Convenções de design — acessibilidade first',
        '- Contraste mínimo 4,5:1 (texto) e 3:1 (componentes).',
        '- Estados de foco visíveis e ordem de tabulação desenhada.',
        '- Alvos de toque ≥ 44×44 px.') },
      { key: 'ds-mobile', name: 'Mobile first', summary: 'Layouts a partir de 360 px e breakpoints claros.', hint: /figma|ui/i, content: md(
        '# Convenções de design — mobile first',
        '- Frames a partir de 360 px; breakpoints 360/768/1280.',
        '- Handoff no Figma com auto layout, nomes de camadas e tokens aplicados.') }
    ]
  },
  docs: {
    label: 'Documentação', suggest: ['ptbr', 'jsdoc'], templates: [
      { key: 'docs-diataxis', name: 'Diátaxis', summary: 'Tutoriais, guias, referência e explicação.', hint: /tutorial|onboarding/i, content: md(
        '# Convenções de documentação — Diátaxis',
        '- Separe tutoriais, guias práticos, referência e explicações em pastas distintas.',
        '- Títulos no imperativo para guias ("Configure o ambiente").',
        '- Exemplos copiáveis e testados; comandos em blocos de código.') },
      { key: 'docs-api', name: 'Docs de API (OpenAPI)', summary: 'Referência gerada do contrato com exemplos.', hint: /api/i, content: md(
        '# Convenções de documentação — API',
        '- Referência gerada do OpenAPI; todo endpoint com exemplo de requisição, resposta e erros.',
        '- Descrições em português claro; campos com tipo, formato e obrigatoriedade.') },
      { key: 'docs-readme', name: 'README padrão', summary: 'Visão geral, requisitos, instalação e uso.', content: md(
        '# Convenções de documentação — README',
        '- Seções: **Visão geral · Requisitos · Instalação · Uso · Configuração · Testes · Contribuição**.',
        '- Changelog no formato Keep a Changelog; versões em SemVer.') }
    ]
  },
  general: {
    label: 'Geral', suggest: ['commits', 'unit-tests', 'review-checklist', 'errors'], templates: [
      { key: 'gen-clean', name: 'Clean Code', summary: 'Nomes expressivos, funções pequenas e sem duplicação.', content: md(
        '# Convenções gerais — Clean Code',
        '- Nomes revelam intenção; nada de abreviações obscuras.',
        '- Funções pequenas com um único propósito e no máximo 3 parâmetros.',
        '- Sem duplicação (DRY), mas sem abstração prematura.',
        '- Siga o estilo existente do repositório acima de qualquer preferência pessoal.',
        CONV_COMMON.delivery) },
      { key: 'gen-pragmatic', name: 'Pragmático', summary: 'Simplicidade, entrega rápida e dívidas registradas.', content: md(
        '# Convenções gerais — pragmático',
        '- A solução mais simples que atende aos critérios de aceitação.',
        '- Dívida técnica aceita só com registro (TODO com dono e motivo).',
        CONV_COMMON.delivery) },
      { key: 'gen-strict', name: 'Estrito / revisão', summary: 'Checklists, lint sem avisos e revisão obrigatória.', content: md(
        '# Convenções gerais — estrito',
        '- Lint e formatador sem avisos; testes passando antes de qualquer entrega.',
        '- Toda mudança acompanha descrição, evidência de teste e plano de rollback.',
        CONV_COMMON.delivery) }
    ]
  }
};

const CONVENTION_SUBSETS = [
  { key: 'commits', name: 'Commits convencionais', content: md(
    '- Mensagens no formato `tipo(escopo): descrição` — tipos `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`.',
    '- Descrição no imperativo, minúscula, sem ponto final, até 72 caracteres.',
    '- Mudança incompatível: `!` após o tipo e rodapé `BREAKING CHANGE:`.') },
  { key: 'unit-tests', name: 'Testes unitários (Vitest / Jest)', content: md(
    '- Arquivos `*.test.ts` ao lado do código testado.',
    '- `describe` com o nome da unidade; `it(\'should ... when ...\')`.',
    '- Mocks só nas bordas (rede, relógio, banco); sem mock do que está sendo testado.',
    '- Um comportamento por teste; cobertura mínima de caminhos felizes e de erro.') },
  { key: 'clean-arch', name: 'Clean Architecture', content: md(
    '- Dependências sempre apontam para o domínio; domínio não conhece framework nem banco.',
    '- Casos de uso com entrada e saída explícitas; um caso de uso por arquivo.',
    '- Adaptadores implementam interfaces definidas pelo núcleo.') },
  { key: 'solid', name: 'SOLID', content: md(
    '- Uma responsabilidade por classe/módulo; extensão por composição.',
    '- Dependa de abstrações nas fronteiras; interfaces pequenas e específicas.') },
  { key: 'errors', name: 'Tratamento de erros', content: md(
    '- Erros de domínio com `code` estável e mensagem clara; nunca engula exceções.',
    '- Converta erros na borda (HTTP, fila) para o formato público; detalhes internos só no log.',
    '- Mensagens para o usuário em português, acionáveis.') },
  { key: 'logs', name: 'Logs estruturados', content: md(
    '- Logs em JSON com `level`, `message`, `timestamp`, `correlationId` e contexto.',
    '- Níveis: `error` (ação necessária), `warn` (degradação), `info` (eventos de negócio), `debug` (diagnóstico).',
    '- Nunca registre segredos, tokens ou dados pessoais.') },
  { key: 'security-owasp', name: 'Segurança (OWASP)', content: md(
    '- Valide e normalize toda entrada; consultas parametrizadas; saída escapada.',
    '- Autorização checada no servidor em toda operação.',
    '- Sem segredos no código; dependências atualizadas e verificadas.') },
  { key: 'a11y', name: 'Acessibilidade (WCAG 2.2 AA)', content: md(
    '- HTML semântico; todo controle com nome acessível; imagens com `alt` significativo.',
    '- Navegação completa por teclado com foco visível; sem armadilhas de foco.',
    '- Contraste AA; não dependa só de cor para transmitir informação.',
    '- Anuncie mudanças dinâmicas com `aria-live` quando necessário.') },
  { key: 'web-perf', name: 'Performance web', content: md(
    '- Metas: LCP < 2,5 s, INP < 200 ms, CLS < 0,1.',
    '- Imagens com dimensões definidas e lazy loading abaixo da dobra.',
    '- Divida o bundle por rota; carregue scripts de terceiros com `defer`.') },
  { key: 'i18n', name: 'Internacionalização (i18n)', content: md(
    '- Nenhum texto de interface fixo no código; chaves no formato `area.componente.texto`.',
    '- Datas, números e moedas formatados com `Intl` conforme a localidade.') },
  { key: 'jsdoc', name: 'Documentação no código (JSDoc / TSDoc)', content: md(
    '- Toda função exportada documentada com propósito, parâmetros, retorno e erros lançados.',
    '- Comentários explicam o porquê, não o quê.') },
  { key: 'git-flow', name: 'Branches e PRs', content: md(
    '- Branches `feature/<id>-descricao`, `fix/<id>-descricao`, `chore/<descricao>`.',
    '- PR pequeno (idealmente < 400 linhas) com descrição, como testar e screenshots quando houver UI.') },
  { key: 'review-checklist', name: 'Checklist de revisão', content: md(
    '- [ ] Critérios de aceitação atendidos',
    '- [ ] Testes novos/ajustados e passando',
    '- [ ] Sem segredos, logs de debug ou código morto',
    '- [ ] Nomes e estrutura seguem este guia',
    '- [ ] Riscos e pendências registrados na entrega') },
  { key: 'feature-flags', name: 'Feature flags', content: md(
    '- Funcionalidade incompleta entra desligada atrás de flag `ff_<area>_<nome>`.',
    '- Toda flag tem dono e data de remoção.') },
  { key: 'observability', name: 'Observabilidade', content: md(
    '- Métricas RED (rate, errors, duration) por endpoint; traces com OpenTelemetry.',
    '- Alertas baseados em SLO, não em sintomas isolados.') },
  { key: 'api-rest', name: 'Padrão de API REST', content: md(
    '- Recursos no plural, verbos HTTP corretos e status adequados (201 criação, 204 sem corpo, 409 conflito, 422 validação).',
    '- Paginação `?page=&pageSize=` ou por cursor; filtros por query string.',
    '- Versão no caminho (`/v1`); datas em ISO 8601 UTC.') },
  { key: 'migrations', name: 'Migrações seguras', content: md(
    '- Migrações pequenas, reversíveis e compatíveis com a versão anterior do código (expand → migrate → contract).',
    '- Nunca renomeie ou remova coluna em uso na mesma entrega.',
    '- Backfill em lotes; índices criados sem bloquear a tabela.') },
  { key: 'ptbr', name: 'Idioma das entregas (PT-BR)', content: md(
    '- Comunicação, documentação e mensagens para o usuário em português do Brasil.',
    '- Identificadores de código, commits e nomes técnicos em inglês.') }
];

/* ---------- Extra base templates: every agent type offers 4–5 options (shown in the DIRETRIZES dropdown). ---------- */
const CONV_EXTRA_TEMPLATES = {
  commander: [
    { key: 'cmd-critical', name: 'Missão crítica', summary: 'Conservador: validação dupla, rollback e zero surpresas em produção.', content: md(
      '# Convenções do Comandante — Missão crítica',
      '- Toda feature passa por ADR, PRD e revisão de segurança antes da execução.',
      '- Mudanças em produção só com plano de rollback e janela definida.',
      '- Dois revisores (QA + especialista) para cada entrega; nada de aprovação automática.',
      '- Riscos classificados (alto/médio/baixo) e reavaliados a cada etapa.',
      '- Em dúvida, pare e pergunte: nenhuma suposição sobre dados de clientes.') }
  ],
  prd: [
    { key: 'prd-jtbd', name: 'Jobs to be done', summary: 'Parte do trabalho que o usuário quer realizar e do resultado esperado.', content: md(
      '# Convenções de PRD — Jobs to be done',
      '- Job no formato: **Quando** <situação>, **eu quero** <motivação>, **para** <resultado esperado>.',
      '- Liste forças: dores atuais, atração da nova solução, hábitos e ansiedades.',
      '- Critérios de sucesso medidos pelo resultado do job, não pela feature entregue.',
      '- Cada requisito aponta para o job que atende.') }
  ],
  pm: [
    { key: 'pm-scrumban', name: 'Scrumban', summary: 'Cadência de planejamento do Scrum com fluxo contínuo do Kanban.', content: md(
      '# Convenções de gestão — Scrumban',
      '- Planejamento sob demanda quando a coluna "Pronto para iniciar" cai abaixo do limite.',
      '- WIP limitado por coluna; revisão e retrospectiva quinzenais.',
      '- Prioridade explícita no topo do backlog; itens urgentes com faixa expressa limitada a 1.') }
  ],
  backend: [
    { key: 'be-serverless', name: 'Serverless', summary: 'Funções pequenas, sem estado, com infraestrutura gerenciada.', content: md(
      '# Convenções Backend — serverless',
      '- Uma função por caso de uso: `<recurso>-<acao>` (ex.: `orders-create`); handlers finos que chamam o domínio.',
      '- Sem estado em memória entre invocações; configuração por variáveis de ambiente.',
      '- Cold start sob controle: dependências mínimas e inicialização fora do handler.',
      '- Timeouts e memória explícitos por função; idempotência em gatilhos de fila.') },
    { key: 'be-events', name: 'Event-driven', summary: 'Eventos de domínio, consumidores idempotentes e outbox.', content: md(
      '# Convenções Backend — orientado a eventos',
      '- Eventos no passado: `<Entidade><Fato>` (`PaymentApproved`), com `eventId`, `occurredAt` e versão do schema.',
      '- Publicação via padrão outbox, na mesma transação da mudança de estado.',
      '- Consumidores idempotentes (dedupe por `eventId`) e com DLQ.',
      '- Contratos de eventos documentados (AsyncAPI) e versionados.') }
  ],
  node: [
    { key: 'node-express', name: 'Express (JavaScript)', summary: 'Rotas, middlewares e controllers em Express com JS moderno.', hint: /express/i, content: md(
      '# Convenções Node.js — Express',
      '- Estrutura: `routes/` → `controllers/` → `services/` → `repositories/`; `app.js` só monta middlewares e rotas.',
      '- Routers por recurso (`orders.router.js`) exportando `Router()`; nada de lógica de negócio na rota.',
      '- Middlewares nomeados pelo papel: `authenticate`, `validateBody(schema)`, `errorHandler` (sempre o último).',
      '- `async` handlers embrulhados para repassar erros ao `errorHandler`.',
      '- Nomenclatura `camelCase`, arquivos `kebab-case.js`, constantes `UPPER_SNAKE_CASE`.',
      CONV_COMMON.jsFormat) },
    { key: 'node-fastify', name: 'Fastify + TypeScript', summary: 'Plugins, schemas JSON e tipagem com TypeBox.', hint: /fastify/i, content: md(
      '# Convenções Node.js — Fastify + TypeScript',
      '- Cada domínio é um plugin (`fastify-plugin`) registrado com prefixo: `/v1/orders`.',
      '- Schemas de rota com TypeBox; tipos derivados do schema, validação e serialização pelo Fastify.',
      '- Decorators só para dependências compartilhadas (`fastify.db`), declarados em `types/fastify.d.ts`.',
      '- Logger nativo (pino) com `request.log`; nada de `console`.',
      CONV_COMMON.jsFormat) }
  ],
  java: [
    { key: 'java-quarkus', name: 'Quarkus / Micronaut', summary: 'Cloud-native, injeção em tempo de build e imagens nativas.', hint: /quarkus|micronaut/i, content: md(
      '# Convenções Java — Quarkus / Micronaut',
      '- Recursos REST finos (`OrderResource`) delegando para serviços `@ApplicationScoped`.',
      '- Configuração tipada (`@ConfigMapping`); perfis `dev`, `test`, `prod`.',
      '- Evite reflexão para manter compatibilidade com imagem nativa.',
      '- Testes com `@QuarkusTest` e Dev Services para dependências.') }
  ],
  dotnet: [
    { key: 'net-mvc', name: 'ASP.NET Core com Controllers', summary: 'Controllers, services e DTOs com atributos de rota.', content: md(
      '# Convenções .NET — Controllers',
      '- `[ApiController]` + `[Route("api/v1/[controller]")]`; controllers finos com sufixo `Controller`.',
      '- Retornos `ActionResult<T>` com status explícitos (`CreatedAtAction`, `NotFound`).',
      '- Services por interface (`IOrderService`) registrados no DI com o tempo de vida correto.',
      '- ProblemDetails para erros; validação com DataAnnotations ou FluentValidation.') }
  ],
  python: [
    { key: 'py-flask', name: 'Flask', summary: 'Blueprints, application factory e extensões.', hint: /flask/i, content: md(
      '# Convenções Python — Flask',
      '- Application factory `create_app()`; blueprints por domínio em `app/<dominio>/routes.py`.',
      '- Validação com marshmallow/Pydantic; respostas JSON padronizadas.',
      '- Configuração por classe (`DevConfig`, `ProdConfig`) e variáveis de ambiente.') },
    { key: 'py-data', name: 'Python para dados', summary: 'pandas/polars, notebooks limpos e pipelines testáveis.', hint: /pandas|dados|data/i, content: md(
      '# Convenções Python — dados',
      '- Lógica em módulos `.py` testáveis; notebooks só para exploração, sem lógica de produção.',
      '- DataFrames com colunas `snake_case` e tipos explícitos; nada de encadeamento ilegível.',
      '- Funções puras de transformação `transform_<etapa>(df) -> df`.') }
  ],
  go: [
    { key: 'go-cli', name: 'Go CLI e ferramentas', summary: 'Cobra, flags claras e saída previsível.', hint: /cli/i, content: md(
      '# Convenções Go — CLI',
      '- Comandos com Cobra: `cmd/<nome>.go`, verbos curtos (`list`, `apply`).',
      '- Saída humana por padrão e `--output json` para máquinas; erros em stderr com código de saída não zero.',
      '- Nada de `os.Exit` fora do `main`.') }
  ],
  php: [
    { key: 'php-legacy', name: 'PHP legado (refatoração gradual)', summary: 'Estrangulamento gradual, testes de caracterização e PSR aos poucos.', content: md(
      '# Convenções PHP — legado',
      '- Antes de alterar, escreva teste de caracterização do comportamento atual.',
      '- Código novo segue PSR-12 e tipos estritos; código antigo só é tocado quando necessário.',
      '- Extraia classes com namespace e autoload (Composer) aos poucos (strangler pattern).') }
  ],
  frontend: [
    { key: 'fe-tailwind', name: 'Utility-first (Tailwind)', summary: 'Classes utilitárias, tema centralizado e componentes extraídos.', hint: /tailwind/i, content: md(
      '# Convenções Frontend — utility-first',
      '- Tailwind com tema em `tailwind.config` (cores, espaçamentos, fontes); nada de valores arbitrários soltos.',
      '- Ordem de classes pelo plugin oficial (prettier-plugin-tailwindcss).',
      '- Padrão repetido 3 vezes vira componente; `@apply` só em casos pontuais.') }
  ],
  vanilla: [
    { key: 'van-tailwind', name: 'HTML + Tailwind + JS', summary: 'Markup semântico com utilitários e JS modular.', hint: /tailwind/i, content: md(
      '# Convenções Frontend vanilla — HTML + Tailwind',
      '- HTML semântico com utilitários Tailwind; componentes repetidos em partials/templates.',
      '- JS em módulos ES com `data-*` como gancho, nunca classes utilitárias.',
      '- Tema no `tailwind.config`; sem cores fora da paleta.') }
  ],
  react: [
    { key: 'react-redux', name: 'React + Redux Toolkit', summary: 'Slices, RTK Query e selectors tipados.', hint: /redux/i, content: md(
      '# Convenções React — Redux Toolkit',
      '- Um slice por domínio em `features/<dominio>/<dominio>Slice.ts`; actions no formato `dominio/acao`.',
      '- Dados remotos com RTK Query (`ordersApi`); nada de thunk manual para CRUD.',
      '- Hooks tipados `useAppDispatch`/`useAppSelector`; selectors com prefixo `select`.',
      '- Estado da store só com dados serializáveis.') },
    { key: 'react-tailwind', name: 'React + Tailwind', summary: 'Componentes com utilitários, variantes via cva e tema central.', hint: /tailwind/i, content: md(
      '# Convenções React — Tailwind',
      '- Variantes com `class-variance-authority` (`buttonVariants`) e `cn()` para mesclar classes.',
      '- Nada de estilos inline; tokens no tema do Tailwind.',
      '- Componentes base em `components/ui/`, compostos em `components/`.') }
  ],
  angular: [
    { key: 'ng-material', name: 'Angular Material', summary: 'Componentes Material, tema customizado e CDK.', hint: /material/i, content: md(
      '# Convenções Angular — Angular Material',
      '- Use componentes do Material/CDK antes de criar novos; tema definido em um único arquivo SCSS.',
      '- Densidade e tipografia pelo tema, nunca por overrides locais.',
      '- Diálogos e snackbars via serviços dedicados (`DialogService`).') }
  ],
  vue: [
    { key: 'vue-tailwind', name: 'Vue + Tailwind', summary: 'SFC com utilitários e componentes base.', hint: /tailwind/i, content: md(
      '# Convenções Vue — Tailwind',
      '- Utilitários no template; variantes centralizadas em composables ou objetos de classes.',
      '- Componentes base com prefixo `Base` (`BaseButton.vue`).') }
  ],
  next: [
    { key: 'next-shadcn', name: 'Next.js + Tailwind + shadcn/ui', summary: 'App Router com componentes shadcn e tema em CSS variables.', hint: /shadcn|tailwind/i, content: md(
      '# Convenções Next.js — Tailwind + shadcn/ui',
      '- Componentes shadcn em `components/ui/` sem editar a API pública; customização via variantes.',
      '- Tema em CSS variables (`--primary`, `--background`) com suporte a dark mode.',
      '- Server Components por padrão; formulários com react-hook-form + Zod.') }
  ],
  dba: [
    { key: 'db-sqlserver', name: 'SQL Server', summary: 'Schemas por domínio, PascalCase e procedures versionadas.', hint: /sql ?server|mssql/i, content: md(
      '# Convenções de banco — SQL Server',
      '- Schemas por domínio (`sales.Orders`); tabelas e colunas em `PascalCase`.',
      '- PK `Id` `INT IDENTITY` ou `UNIQUEIDENTIFIER` com `NEWSEQUENTIALID()`.',
      '- Procedures com prefixo `usp_` versionadas no repositório; nada de SQL dinâmico sem parâmetros.') },
    { key: 'db-modeling', name: 'Modelagem de dados', summary: 'Normalização, invariantes no banco e documentação do modelo.', content: md(
      '# Convenções de banco — modelagem',
      '- Normalize até a 3FN; desnormalize só com medição que justifique.',
      '- Diagrama ER atualizado a cada migração (Mermaid `erDiagram`).',
      '- Soft delete apenas quando exigido, com `deleted_at` e índices parciais.') }
  ],
  devops: [
    { key: 'ops-serverless', name: 'Serverless (AWS Lambda)', summary: 'Funções empacotadas, IAM mínimo e observabilidade por função.', hint: /lambda|serverless/i, content: md(
      '# Convenções DevOps — serverless',
      '- Infra da função no mesmo repositório (SAM/Serverless/CDK); um stack por serviço.',
      '- Papel IAM por função com o mínimo de permissões.',
      '- Logs estruturados, traces (X-Ray/OTel) e alarmes de erro e duração por função.') },
    { key: 'ops-sre', name: 'SRE / observabilidade', summary: 'SLOs, error budget, alertas acionáveis e runbooks.', hint: /sre|observab/i, content: md(
      '# Convenções DevOps — SRE',
      '- Todo serviço com SLI/SLO definidos e error budget acompanhado.',
      '- Alertas acionáveis com link para runbook; nada de alerta sem dono.',
      '- Postmortems sem culpados em até 5 dias após incidente.') }
  ],
  qa: [
    { key: 'qa-api', name: 'Testes de API / contrato', summary: 'Contratos consumidor-provedor e validação de schema.', hint: /api|contrato|contract/i, content: md(
      '# Convenções QA — API e contrato',
      '- Cada endpoint com testes de sucesso, validação (422), autorização (401/403) e não encontrado (404).',
      '- Respostas validadas contra o schema OpenAPI.',
      '- Contratos consumidor-provedor (Pact) para integrações entre serviços.') },
    { key: 'qa-perf', name: 'Performance e carga', summary: 'Metas de latência, cenários realistas e comparação com a linha de base.', hint: /perform|carga|load/i, content: md(
      '# Convenções QA — performance',
      '- Cenários com k6/Gatling baseados em tráfego real; aquecimento antes da medição.',
      '- Metas p95/p99 definidas antes do teste; resultado comparado com a linha de base.',
      '- Relate gargalo, evidência (gráfico/métrica) e recomendação.') }
  ],
  mobile: [
    { key: 'mob-expo', name: 'Expo (React Native)', summary: 'Expo Router, EAS e bibliotecas compatíveis.', hint: /expo/i, content: md(
      '# Convenções Mobile — Expo',
      '- Navegação com Expo Router (`app/`), telas em arquivos por rota.',
      '- Builds e updates via EAS; variáveis por ambiente em `app.config.ts`.',
      '- Prefira bibliotecas do SDK Expo antes de módulos nativos.') }
  ],
  security: [
    { key: 'sec-lgpd', name: 'LGPD / privacidade', summary: 'Minimização de dados, bases legais e direitos do titular.', hint: /lgpd|privac/i, content: md(
      '# Convenções de segurança — LGPD',
      '- Colete só o necessário; cada dado pessoal com finalidade e base legal documentadas.',
      '- Dados sensíveis criptografados em repouso e mascarados em logs.',
      '- Fluxos para acesso, correção e exclusão a pedido do titular.') }
  ],
  data: [
    { key: 'data-quality', name: 'Qualidade de dados', summary: 'Contratos de dados, validações e alertas de anomalia.', hint: /qualidade|quality/i, content: md(
      '# Convenções de dados — qualidade',
      '- Contratos de dados entre produtores e consumidores (schema, frequência, dono).',
      '- Validações automáticas (Great Expectations/dbt tests) em toda carga.',
      '- Anomalias de volume e frescor geram alerta para o dono do dataset.') }
  ],
  design: [
    { key: 'ds-ux-writing', name: 'UX writing', summary: 'Textos claros, tom consistente e microcopy acionável.', hint: /writing|texto|copy/i, content: md(
      '# Convenções de design — UX writing',
      '- Frases curtas, voz ativa e tratamento por "você".',
      '- Botões com verbo de ação ("Salvar pedido"), nunca "OK" genérico.',
      '- Mensagens de erro dizem o que houve e como resolver.') }
  ],
  docs: [
    { key: 'docs-release', name: 'Changelog e release notes', summary: 'Keep a Changelog, SemVer e notas voltadas ao usuário.', hint: /release|changelog/i, content: md(
      '# Convenções de documentação — releases',
      '- `CHANGELOG.md` no formato Keep a Changelog: Added, Changed, Deprecated, Removed, Fixed, Security.',
      '- Versões em SemVer; release notes em linguagem de usuário, com impacto e ação necessária.') }
  ],
  general: [
    { key: 'gen-tdd', name: 'TDD', summary: 'Teste primeiro, ciclo vermelho → verde → refatora.', hint: /tdd/i, content: md(
      '# Convenções gerais — TDD',
      '- Escreva o teste que falha antes do código de produção.',
      '- Implemente o mínimo para passar; refatore com os testes verdes.',
      '- Commits pequenos a cada ciclo concluído.',
      CONV_COMMON.delivery) }
  ]
};
for (const [family, list] of Object.entries(CONV_EXTRA_TEMPLATES)) CONVENTION_FAMILIES[family].templates.push(...list);

/* ---------- Subset groups (with icons) and search metadata ---------- */
const CONVENTION_GROUPS = [
  { key: 'style', label: 'Estilo de código', icon: 'code' },
  { key: 'quality', label: 'Qualidade de código', icon: 'check' },
  { key: 'architecture', label: 'Arquitetura', icon: 'layers' },
  { key: 'tests', label: 'Testes', icon: 'flask' },
  { key: 'delivery', label: 'Git & entrega', icon: 'branch' },
  { key: 'security', label: 'Segurança', icon: 'shield' },
  { key: 'frontend', label: 'Frontend & UX', icon: 'screen' },
  { key: 'backend', label: 'Backend & APIs', icon: 'server' },
  { key: 'data', label: 'Dados', icon: 'database' },
  { key: 'ops', label: 'Operação', icon: 'chart' },
  { key: 'comms', label: 'Comunicação', icon: 'chat' }
];
const CONV_SUBSET_META = {
  'commits': { group: 'delivery', icon: 'git', tags: 'git commit mensagem conventional', desc: 'Formato tipo(escopo): descrição para todas as mensagens.' },
  'unit-tests': { group: 'tests', icon: 'flask', tags: 'teste unitario vitest jest mock', desc: 'Onde ficam, como nomear e o que mockar.' },
  'clean-arch': { group: 'architecture', icon: 'layers', tags: 'arquitetura camadas dominio casos de uso', desc: 'Dependências apontando para o domínio.' },
  'solid': { group: 'architecture', icon: 'puzzle', tags: 'principios oop design orientacao a objetos', desc: 'Responsabilidade única e abstrações nas fronteiras.' },
  'errors': { group: 'quality', icon: 'bug', tags: 'erro excecao exception tratamento', desc: 'Códigos estáveis e conversão de erros na borda.' },
  'logs': { group: 'ops', icon: 'terminal', tags: 'log logging json monitoramento', desc: 'Logs em JSON, níveis e o que nunca registrar.' },
  'security-owasp': { group: 'security', icon: 'shield', tags: 'owasp vulnerabilidade injecao xss seguranca', desc: 'Validação de entrada, autorização e saída escapada.' },
  'a11y': { group: 'frontend', icon: 'eye', tags: 'acessibilidade wcag aria leitor de tela teclado', desc: 'WCAG 2.2 AA: semântica, teclado e contraste.' },
  'web-perf': { group: 'frontend', icon: 'lightning', tags: 'performance web vitals lcp bundle velocidade', desc: 'Metas de Core Web Vitals e peso de página.' },
  'i18n': { group: 'frontend', icon: 'globe', tags: 'traducao idioma localizacao intl internacionalizacao', desc: 'Textos por chave e formatação por localidade.' },
  'jsdoc': { group: 'comms', icon: 'braces', tags: 'documentacao jsdoc tsdoc comentario codigo', desc: 'Documentação de funções exportadas.' },
  'git-flow': { group: 'delivery', icon: 'branch', tags: 'git branch pull request pr revisao', desc: 'Nomes de branches e tamanho de PR.' },
  'review-checklist': { group: 'quality', icon: 'check', tags: 'revisao checklist code review qualidade', desc: 'Checklist antes de entregar.' },
  'feature-flags': { group: 'delivery', icon: 'flag', tags: 'flag release toggle lancamento', desc: 'Funcionalidade incompleta atrás de flag com dono.' },
  'observability': { group: 'ops', icon: 'chart', tags: 'metricas traces slo opentelemetry monitoramento', desc: 'Métricas RED, traces e alertas por SLO.' },
  'api-rest': { group: 'backend', icon: 'server', tags: 'api rest http endpoint status', desc: 'Recursos, status HTTP, paginação e versão.' },
  'migrations': { group: 'data', icon: 'database', tags: 'migracao banco schema sql ddl', desc: 'Migrações reversíveis no padrão expand/contract.' },
  'ptbr': { group: 'comms', icon: 'chat', tags: 'idioma portugues linguagem comunicacao', desc: 'Português nas entregas, inglês no código.' }
};
CONVENTION_SUBSETS.forEach(s => Object.assign(s, CONV_SUBSET_META[s.key] || { group: 'quality', icon: 'check', tags: '', desc: '' }));
CONVENTION_SUBSETS.push(
  { key: 'tdd', name: 'TDD', group: 'tests', icon: 'target', tags: 'teste primeiro tdd red green refactor', desc: 'Teste que falha antes do código.', content: md(
    '- Escreva o teste que falha antes do código de produção.',
    '- Faça passar com o mínimo; refatore com os testes verdes.') },
  { key: 'integration-tests', name: 'Testes de integração', group: 'tests', icon: 'link', tags: 'teste integracao banco api testcontainers', desc: 'Integrações reais com dependências isoladas.', content: md(
    '- Teste integrações com dependências reais em contêiner (Testcontainers) ou fakes oficiais.',
    '- Cada teste prepara e limpa seus dados; nada de estado compartilhado.') },
  { key: 'contract-tests', name: 'Testes de contrato', group: 'tests', icon: 'braces', tags: 'teste contrato pact openapi consumidor provedor', desc: 'Consumidor e provedor presos ao mesmo contrato.', content: md(
    '- Toda integração entre serviços coberta por contrato (Pact ou schema OpenAPI).',
    '- Quebra de contrato falha o pipeline do provedor.') },
  { key: 'e2e-tests', name: 'Testes E2E', group: 'tests', icon: 'rocket', tags: 'teste e2e ponta a ponta playwright cypress', desc: 'Fluxos críticos cobertos ponta a ponta.', content: md(
    '- Fluxos críticos (login, compra, cadastro) com teste E2E.',
    '- Seletores por papel/rótulo; nada de esperas fixas (`sleep`).') },
  { key: 'semver', name: 'Versionamento semântico', group: 'delivery', icon: 'package', tags: 'versao semver release pacote', desc: 'MAJOR.MINOR.PATCH conforme o impacto.', content: md(
    '- MAJOR para quebra de compatibilidade, MINOR para funcionalidade nova, PATCH para correção.',
    '- Tags `vX.Y.Z` geradas a partir dos commits convencionais.') },
  { key: 'changelog', name: 'Changelog e release notes', group: 'delivery', icon: 'book', tags: 'changelog release notes versao historico', desc: 'Toda entrega registrada no changelog.', content: md(
    '- Atualize o `CHANGELOG.md` (Keep a Changelog) em toda entrega visível ao usuário.',
    '- Notas de release descrevem impacto e ação necessária.') },
  { key: 'secrets', name: 'Segredos e credenciais', group: 'security', icon: 'key', tags: 'segredo senha token credencial env vault', desc: 'Segredos só em cofre ou variáveis de ambiente.', content: md(
    '- Nenhum segredo no código, testes ou logs; use cofre/variáveis de ambiente.',
    '- `.env` fora do versionamento, com `.env.example` documentado.',
    '- Segredo vazado é revogado imediatamente.') },
  { key: 'lgpd', name: 'LGPD / dados pessoais', group: 'security', icon: 'lock', tags: 'lgpd privacidade dados pessoais gdpr', desc: 'Minimização e proteção de dados pessoais.', content: md(
    '- Colete só dados pessoais necessários, com finalidade registrada.',
    '- Dados pessoais mascarados em logs e ambientes de teste.') },
  { key: 'deps', name: 'Dependências seguras', group: 'security', icon: 'search', tags: 'dependencia pacote npm vulnerabilidade audit', desc: 'Pacotes auditados e fixados.', content: md(
    '- Lockfile versionado; dependências novas justificadas na entrega.',
    '- `audit` sem vulnerabilidades altas/críticas antes do merge.') },
  { key: 'responsive', name: 'Responsivo / mobile first', group: 'frontend', icon: 'phone', tags: 'responsivo mobile breakpoint layout css', desc: 'Layouts a partir do celular.', content: md(
    '- Estilos partem do mobile (360 px) e crescem com `min-width`.',
    '- Nada de largura fixa em contêineres; teste em 360, 768 e 1280 px.') },
  { key: 'seo', name: 'SEO', group: 'frontend', icon: 'search', tags: 'seo meta tags indexacao google sitemap', desc: 'Metadados, semântica e indexação.', content: md(
    '- `title` e `meta description` únicos por página; um `h1` por página.',
    '- URLs legíveis, `canonical`, sitemap e dados estruturados quando fizer sentido.') },
  { key: 'graphql', name: 'GraphQL', group: 'backend', icon: 'graphql', tags: 'graphql schema query mutation resolver', desc: 'Schema-first, nomes consistentes e paginação.', content: md(
    '- Tipos em `PascalCase`, campos em `camelCase`, mutations no formato `verboSubstantivo` (`createOrder`).',
    '- Paginação por cursor (Connection); erros de negócio no payload da mutation.',
    '- DataLoader para evitar N+1.') },
  { key: 'cache', name: 'Cache', group: 'backend', icon: 'redis', tags: 'cache redis ttl invalidacao performance', desc: 'Chaves nomeadas, TTL e invalidação explícita.', content: md(
    '- Chaves `<app>:<entidade>:<id>` com TTL sempre definido.',
    '- Invalidação explícita na escrita; nunca cache de dados sensíveis sem criptografia.') },
  { key: 'queues', name: 'Filas e mensageria', group: 'backend', icon: 'kafka', tags: 'fila mensageria kafka rabbitmq sqs evento', desc: 'Consumidores idempotentes com DLQ.', content: md(
    '- Mensagens com id, tipo e versão; consumidores idempotentes.',
    '- Retentativas com backoff e DLQ monitorada.') },
  { key: 'resilience', name: 'Resiliência', group: 'ops', icon: 'cog', tags: 'resiliencia timeout retry circuit breaker falha', desc: 'Timeouts, retries e circuit breaker.', content: md(
    '- Toda chamada externa com timeout; retry só em operações idempotentes, com backoff e jitter.',
    '- Circuit breaker em dependências instáveis; degrade com elegância.') },
  { key: 'containers', name: 'Containers', group: 'ops', icon: 'docker', tags: 'docker container imagem kubernetes deploy', desc: 'Imagens pequenas, seguras e reproduzíveis.', content: md(
    '- Dockerfile multi-stage, usuário não root e versão de base fixada.',
    '- Um processo por contêiner; configuração por variáveis de ambiente.') },
  { key: 'data-quality', name: 'Qualidade de dados', group: 'data', icon: 'target', tags: 'dados qualidade validacao contrato dataset', desc: 'Validação automática em toda carga.', content: md(
    '- Validações de nulos, unicidade e faixa em toda carga de dados.',
    '- Falha de qualidade interrompe a publicação do dataset.') },
  { key: 'sql-naming', name: 'Nomenclatura SQL', group: 'data', icon: 'database', tags: 'sql nomenclatura tabela coluna indice banco', desc: 'Tabelas, colunas, chaves e índices padronizados.', content: md(
    '- Tabelas no plural e colunas em `snake_case`; FKs `<entidade>_id`.',
    '- Índices `idx_<tabela>_<colunas>`, constraints `fk_`, `uq_`, `ck_`.') },
  { key: 'refactor', name: 'Refatoração segura', group: 'quality', icon: 'wrench', tags: 'refatoracao refactor legado divida tecnica', desc: 'Passos pequenos cobertos por testes.', content: md(
    '- Refatore em passos pequenos, com testes verdes antes e depois.',
    '- Nunca misture refatoração e mudança de comportamento no mesmo commit.') },
  { key: 'delivery-report', name: 'Relatório de entrega', group: 'comms', icon: 'file', tags: 'entrega relatorio resumo comunicacao handoff', desc: 'Formato padrão do resumo de cada etapa.', content: md(
    '- Termine toda etapa com: **O que foi feito · Arquivos · Como validar · Riscos · Próximo passo**.',
    '- Seja específico: cite caminhos, comandos e resultados reais.') }
);
CONVENTION_SUBSETS.push(
  { key: 'hexagonal', name: 'Arquitetura hexagonal', group: 'architecture', icon: 'flow', tags: 'arquitetura hexagonal portas adaptadores ports adapters dominio', desc: 'Domínio isolado, portas e adaptadores.', content: md(
    '- `domain/` (entidades, value objects, regras) não importa nada de infraestrutura.',
    '- `application/` (casos de uso) depende apenas de portas (interfaces) do domínio.',
    '- `adapters/` (HTTP, banco, filas, serviços externos) implementam as portas.',
    '- Portas: `<Recurso>Repository`, `<Recurso>Gateway`, `<Acao>UseCase`; adaptadores: `<Tecnologia><Recurso>Repository` (ex.: `PostgresOrderRepository`).',
    '- Cada nova dependência externa exige um ADR com o contrato da porta.') },
  { key: 'c4-diagrams', name: 'Diagramas C4', group: 'architecture', icon: 'board', tags: 'c4 diagrama contexto conteiner componente mermaid arquitetura', desc: 'Contexto, contêineres e componentes versionados.', content: md(
    '- Diagramas em Mermaid/PlantUML versionados em `docs/architecture/diagrams/`.',
    '- Níveis: **Contexto** (sistema e atores) → **Contêineres** (apps, bancos, filas) → **Componentes**; código só quando necessário.',
    '- Cada elemento com nome, tecnologia e responsabilidade em uma frase.',
    '- Toda mudança estrutural atualiza o diagrama e referencia o ADR correspondente.') }
);

/* BaaS rule packs for agents that consume Supabase or Firebase (e.g. a Next.js or Flutter operator). */
CONVENTION_SUBSETS.push(
  { key: 'supabase-app', name: 'Supabase no app', group: 'backend', icon: 'supabase', tags: 'supabase supabase-js cliente auth ssr realtime storage postgrest baas', desc: 'Cliente tipado, SSR com cookies e consultas enxutas.', content: md(
    '- Cliente tipado `createClient<Database>` único por contexto; em SSR, `@supabase/ssr` com a sessão em cookies.',
    '- No servidor, `auth.getUser()` para confiar na sessão; sempre trate `{ data, error }`.',
    '- `.select()` só com as colunas necessárias e `.range()` para paginar.',
    '- Canais Realtime removidos ao desmontar; arquivos privados por URL assinada.',
    '- Nunca use a chave `service_role` no app: ela ignora o RLS.') },
  { key: 'supabase-rls', name: 'RLS do Supabase', group: 'security', icon: 'lock', tags: 'supabase rls row level security policy postgres auth baas', desc: 'RLS em toda tabela exposta e policies testadas.', content: md(
    '- `enable row level security` em toda tabela de `public`: sem policy, nada é acessível.',
    '- Uma policy por operação e papel; `update` com `using` e `with check`.',
    '- `(select auth.uid())` nas policies e índice nas colunas que elas usam.',
    '- Autorização por `app_metadata`/custom claims, nunca por `user_metadata`.',
    '- Policies testadas com pgTAP (`supabase test db`).') },
  { key: 'firebase-app', name: 'Firebase no app', group: 'backend', icon: 'firebase', tags: 'firebase firestore sdk modular cliente auth emulador baas', desc: 'SDK modular, listeners cancelados e emuladores em dev.', content: md(
    '- SDK modular (v9+) inicializado uma vez em `lib/firebase.ts`.',
    '- Emuladores em desenvolvimento; nunca teste contra produção.',
    '- Todo `onSnapshot` com `unsubscribe` ao desmontar; queries sempre com `limit()`.',
    '- Papéis por custom claims; no cliente, só para montar a interface.',
    '- Erros tratados pelo código (`permission-denied`, `auth/...`).') },
  { key: 'firebase-rules', name: 'Security Rules do Firebase', group: 'security', icon: 'lock', tags: 'firebase security rules firestore storage regras seguranca baas', desc: 'Negar por padrão, validar escritas e testar no emulador.', content: md(
    '- Negar por padrão e liberar por operação (`get`, `list`, `create`, `update`, `delete`).',
    '- Validar o esquema nas escritas (`keys().hasOnly`, tipos e tamanhos) e proteger campos imutáveis.',
    '- Rules não filtram: a query do cliente precisa restringir os dados.',
    '- Poucos `get()`/`exists()` por regra; prefira custom claims.',
    '- Testes com `@firebase/rules-unit-testing` no emulador, no CI antes do deploy.') }
);

/* ---------- Coding style, one subset per language (group "Estilo de código"). The coding style of an agent lives here, in its
   DIRETRIZES, never in its system prompt; catalog agents start with the subsets of their stack (codeStyleKeys in app.js). ---------- */
CONVENTION_SUBSETS.push(
  { key: 'style-ts', name: 'Estilo de código: TypeScript', group: 'style', icon: 'typescript', tags: 'estilo codigo typescript ts nomenclatura formatacao funcional prettier eslint', desc: 'TypeScript estrito e funcional, nomes e formatação.', content: md(
    '- Identificadores em inglês: `camelCase` para variáveis e funções, `PascalCase` para tipos, interfaces e classes, `UPPER_SNAKE_CASE` para constantes de módulo; arquivos em `kebab-case.ts`.',
    '- `strict: true` no tsconfig e nada de `any` (use `unknown` com narrowing); tipos explícitos em toda função exportada.',
    '- Estilo funcional: funções pequenas e puras, composição em vez de herança e dados imutáveis (`const`, `readonly`, spread em vez de mutação).',
    '- Union de literais em vez de `enum`; `type` para formas de dados, `interface` para contratos que podem ser estendidos.',
    '- `async/await` com erros tratados; nenhuma `Promise` sem `await` ou `.catch`.',
    '- Formatação: 2 espaços, ponto e vírgula, aspas simples, vírgula final e até 100 colunas, com Prettier e ESLint como fonte da verdade.',
    '- Imports nomeados e ordenados: nativos, pacotes, aliases internos e relativos, separados por linha em branco.') },
  { key: 'style-js', name: 'Estilo de código: JavaScript', group: 'style', icon: 'js', tags: 'estilo codigo javascript js esm nomenclatura formatacao prettier eslint', desc: 'ES modules, const por padrão, nomes e formatação.', content: md(
    '- Identificadores em inglês: `camelCase` para variáveis e funções, `PascalCase` para classes, `UPPER_SNAKE_CASE` para constantes; arquivos em `kebab-case.js`.',
    '- ES modules (`import`/`export` nomeados); `const` por padrão, `let` só quando reatribui e nunca `var`.',
    '- Igualdade estrita (`===`), optional chaining (`?.`) e nullish coalescing (`??`) no lugar de checagens manuais.',
    '- Funções pequenas e puras; tipos das funções exportadas documentados com JSDoc.',
    '- `async/await` sem callbacks aninhados, com os erros tratados.',
    '- Formatação: 2 espaços, ponto e vírgula, aspas simples, vírgula final e até 100 colunas, com Prettier e ESLint.') },
  { key: 'style-python', name: 'Estilo de código: Python', group: 'style', icon: 'python', tags: 'estilo codigo python pep8 ruff black type hints nomenclatura', desc: 'PEP 8, type hints, ruff e docstrings.', content: md(
    '- PEP 8: `snake_case` para funções, variáveis e módulos, `PascalCase` para classes, `UPPER_SNAKE_CASE` para constantes; identificadores em inglês.',
    '- Type hints em toda função pública, com `mypy` ou `pyright` sem erros.',
    '- Formatação e lint com `ruff format` (ou `black`) e `ruff`; linhas até 88 colunas; imports ordenados (stdlib, terceiros, locais).',
    '- f-strings para interpolação, `pathlib` para caminhos e context managers (`with`) para recursos.',
    '- Exceções específicas, nunca `except:` vazio, com mensagens claras.',
    '- Docstrings (Google ou NumPy) nas funções públicas; funções curtas e sem efeito colateral escondido.') },
  { key: 'style-go', name: 'Estilo de código: Go', group: 'style', icon: 'go', tags: 'estilo codigo go golang gofmt nomenclatura erros', desc: 'gofmt, nomes MixedCaps e erros como valores.', content: md(
    '- `gofmt` e `goimports` sempre; `go vet` e `staticcheck` sem avisos.',
    '- `MixedCaps` para exportados e `mixedCaps` para internos, sem underscores; siglas em caixa uniforme (`ID`, `HTTP`, `URL`).',
    '- Pacotes com nome curto, em minúsculas e de uma palavra; nada de `util` ou `common`.',
    '- Erros como valores: `error` como último retorno, contexto com `fmt.Errorf("...: %w", err)` e tratamento imediato; `panic` só para o que é irrecuperável.',
    '- Interfaces pequenas, definidas por quem consome: aceite interfaces e retorne structs.',
    '- `context.Context` como primeiro parâmetro em toda operação de I/O; comentário de documentação em todo identificador exportado, começando pelo nome dele.') },
  { key: 'style-java', name: 'Estilo de código: Java', group: 'style', icon: 'java', tags: 'estilo codigo java nomenclatura formatacao records optional', desc: 'Nomes, imutabilidade, Optional e exceções.', content: md(
    '- `camelCase` para métodos e variáveis, `PascalCase` para classes, `UPPER_SNAKE_CASE` para constantes e pacotes em minúsculas; identificadores em inglês.',
    '- Formatação com google-java-format ou o formatador já configurado no projeto (Spotless, Checkstyle).',
    '- Imutabilidade por padrão: campos `final` e `record` para DTOs e objetos de valor.',
    '- `Optional` só como retorno, nunca como campo ou parâmetro; coleções vazias em vez de `null`.',
    '- Exceções específicas para regras de negócio; nunca engula exceções.',
    '- Injeção pelo construtor, sem `@Autowired` em campo; streams para transformações simples e laço comum quando ficar mais legível.') },
  { key: 'style-csharp', name: 'Estilo de código: C#', group: 'style', icon: 'csharp', tags: 'estilo codigo c# csharp dotnet nomenclatura async editorconfig', desc: 'Nomes .NET, nullable, async e dotnet format.', content: md(
    '- `PascalCase` para tipos, métodos, propriedades e constantes, `camelCase` para parâmetros e variáveis locais, `_camelCase` para campos privados e prefixo `I` em interfaces.',
    '- `dotnet format` e o `.editorconfig` como fonte da verdade; nullable reference types habilitado e sem avisos.',
    '- `async/await` de ponta a ponta, com sufixo `Async` e `CancellationToken` nas operações de I/O; nunca `.Result` ou `.Wait()`.',
    '- `var` quando o tipo é óbvio; `record` para DTOs imutáveis; namespaces com escopo de arquivo.',
    '- Injeção de dependência pelo construtor; consultas LINQ curtas e legíveis.',
    '- Exceções específicas; nunca `catch (Exception)` sem registrar ou relançar.') },
  { key: 'style-php', name: 'Estilo de código: PHP', group: 'style', icon: 'php', tags: 'estilo codigo php psr-12 strict types phpstan nomenclatura', desc: 'PSR-12, strict_types e tipos em tudo.', content: md(
    '- PSR-12 com php-cs-fixer ou Pint, e `declare(strict_types=1);` em todo arquivo.',
    '- `camelCase` para métodos e variáveis, `PascalCase` para classes, `UPPER_SNAKE_CASE` para constantes; namespaces e autoload PSR-4.',
    '- Tipos em parâmetros, retornos e propriedades, com PHPStan ou Psalm sem erros no nível do projeto.',
    '- Classes `final` por padrão e propriedades `readonly` quando possível; injeção pelo construtor (constructor promotion).',
    '- Exceções específicas; nunca use `@` para suprimir erros.') },
  { key: 'style-kotlin', name: 'Estilo de código: Kotlin', group: 'style', icon: 'kotlin', tags: 'estilo codigo kotlin android ktlint null safety coroutines', desc: 'Kotlin conventions, val e null safety.', content: md(
    '- Kotlin coding conventions com ktlint e detekt sem avisos.',
    '- `camelCase` para funções e propriedades, `PascalCase` para classes, `UPPER_SNAKE_CASE` para `const val`.',
    '- `val` por padrão, coleções imutáveis e `data class` para modelos.',
    '- Null safety explícita: nada de `!!`; use `?.`, `?:` e `requireNotNull` com mensagem.',
    '- Coroutines estruturadas (`suspend`, `viewModelScope`), nunca `GlobalScope`.',
    '- Funções de extensão e expressões de escopo com moderação, priorizando a leitura.') },
  { key: 'style-swift', name: 'Estilo de código: Swift', group: 'style', icon: 'swift', tags: 'estilo codigo swift ios swiftui swiftlint optionals', desc: 'API Design Guidelines, let e optionals seguros.', content: md(
    '- Swift API Design Guidelines, com SwiftLint e SwiftFormat sem avisos.',
    '- `lowerCamelCase` para funções e propriedades, `UpperCamelCase` para tipos e protocolos; nomes que se leem como frase no ponto de uso.',
    '- `let` por padrão; `struct` e `enum` antes de `class`; `final` em classes que não são herdadas.',
    '- Optionals tratados com `guard let` e `if let`; nada de force unwrap (`!`) fora dos testes.',
    '- `async/await` e `@MainActor` para código de interface; erros com `throws` ou `Result`.') },
  { key: 'style-dart', name: 'Estilo de código: Dart', group: 'style', icon: 'flutter', tags: 'estilo codigo dart flutter effective dart analyze widgets', desc: 'Effective Dart, const e widgets pequenos.', content: md(
    '- Effective Dart, com `dart format` e `flutter analyze` sem avisos (lints do projeto).',
    '- `lowerCamelCase` para variáveis e funções, `UpperCamelCase` para tipos e `snake_case` para arquivos e pacotes.',
    '- `final` e `const` por padrão, com widgets `const` sempre que possível.',
    '- Null safety sem `!` desnecessário; trate `null` na borda.',
    '- Widgets pequenos e compostos, com a lógica fora da árvore de widgets (no gerenciador de estado do projeto).') },
  { key: 'style-sql', name: 'Estilo de código: SQL', group: 'style', icon: 'database', tags: 'estilo codigo sql nomenclatura snake case consultas sqlfluff', desc: 'snake_case, cláusulas por linha e consultas parametrizadas.', content: md(
    '- Tabelas no plural e colunas em `snake_case`; FKs `<entidade>_id`.',
    '- Índices `idx_<tabela>_<colunas>`, constraints `fk_`, `uq_`, `ck_`.',
    '- Palavras-chave em MAIÚSCULAS e identificadores em inglês; datas `created_at`/`updated_at` em UTC e booleanos com `is_`/`has_`.',
    '- Uma cláusula por linha, indentada; colunas explícitas, nunca `SELECT *` em código de aplicação.',
    '- `JOIN` explícito com `ON` e aliases curtos e significativos.',
    '- Consultas sempre parametrizadas, nunca montadas por concatenação; sqlfluff (ou o lint do projeto) sem avisos.') },
  { key: 'style-css', name: 'Estilo de código: CSS', group: 'style', icon: 'css', tags: 'estilo codigo css scss bem tokens stylelint responsivo', desc: 'BEM, tokens, mobile first e baixa especificidade.', content: md(
    '- Classes em `kebab-case` com BEM (`bloco__elemento--modificador`) ou o padrão do projeto; nunca estilize por id.',
    '- Cores, espaçamentos e tipografia vêm de design tokens em custom properties (`--color-primary`), nunca de valores soltos.',
    '- Mobile first com `min-width`; unidades relativas (`rem`, `%`) para tipografia e espaçamento.',
    '- Especificidade baixa: no máximo dois níveis de seletor e sem `!important`, exceto em utilitários.',
    '- Stylelint e Prettier sem avisos; propriedades agrupadas por tipo (layout, caixa, tipografia, visual).',
    '- Animações respeitam `prefers-reduced-motion`.') },
  { key: 'style-shell', name: 'Estilo de código: Shell', group: 'style', icon: 'terminal', tags: 'estilo codigo shell bash script shellcheck shfmt', desc: 'set -euo pipefail, aspas e ShellCheck.', content: md(
    '- Bash com `#!/usr/bin/env bash` e `set -euo pipefail`; ShellCheck sem avisos e shfmt para formatar.',
    '- Variáveis sempre entre aspas (`"$var"`), `snake_case` para as locais e `UPPER_SNAKE_CASE` para as exportadas.',
    '- Funções pequenas com `local`; `$(...)` em vez de crases.',
    '- Entradas e caminhos validados; nunca `rm -rf` com uma variável que pode estar vazia.',
    '- Scripts idempotentes, com `--help` e código de saída diferente de zero em caso de falha.') },
  { key: 'style-yaml', name: 'Estilo de código: YAML', group: 'style', icon: 'code', tags: 'estilo codigo yaml kubernetes github actions helm yamllint', desc: '2 espaços, aspas em valores ambíguos e yamllint.', content: md(
    '- 2 espaços e nada de tabs; chaves no padrão da ferramenta (Kubernetes, GitHub Actions, Helm); yamllint sem avisos.',
    '- Valores ambíguos entre aspas (`"on"`, `"yes"`, versões como `"3.10"`).',
    '- Reaproveitamento pelos recursos da ferramenta (templates do Helm, reusable workflows) antes de âncoras do YAML.',
    '- Segredos só por referência (secrets e variáveis), nunca em texto.',
    '- Comentários explicam o porquê das configurações que não são óbvias.') },
  { key: 'style-hcl', name: 'Estilo de código: Terraform (HCL)', group: 'style', icon: 'terraform', tags: 'estilo codigo terraform hcl iac tflint modulos', desc: 'terraform fmt, snake_case e variáveis tipadas.', content: md(
    '- `terraform fmt` e `tflint` sem avisos; `terraform validate` antes de entregar.',
    '- Recursos, variáveis e outputs em `snake_case`, com nomes que não repetem o tipo (`aws_s3_bucket.logs`, não `logs_bucket`).',
    '- Arquivos `main.tf`, `variables.tf`, `outputs.tf` e `versions.tf`, com as versões dos providers fixadas.',
    '- Toda variável com `type` e `description`; valores sensíveis com `sensitive = true`.',
    '- Módulos pequenos e reutilizáveis, sem valores fixos de ambiente no código.') }
);
// Coding-style subsets each family suggests first (and gives its catalog agents by default, refined by specialty in codeStyleKeys).
const CONV_STYLE_SUGGEST = {
  backend: ['style-ts'], node: ['style-ts'], java: ['style-java'], dotnet: ['style-csharp'], python: ['style-python'], go: ['style-go'], php: ['style-php'],
  supabase: ['style-ts', 'style-sql'], firebase: ['style-ts'],
  frontend: ['style-ts', 'style-css'], vanilla: ['style-js', 'style-css'], react: ['style-ts', 'style-css'], angular: ['style-ts', 'style-css'], vue: ['style-ts', 'style-css'], next: ['style-ts', 'style-css'],
  dba: ['style-sql'], devops: ['style-shell', 'style-yaml', 'style-hcl'], qa: ['style-ts'], mobile: ['style-dart', 'style-kotlin', 'style-swift', 'style-ts'], data: ['style-sql', 'style-python']
};
for (const [family, keys] of Object.entries(CONV_STYLE_SUGGEST)) { const fam = CONVENTION_FAMILIES[family]; if (fam) fam.suggest = [...keys, ...(fam.suggest || []).filter(k => !keys.includes(k))]; }
