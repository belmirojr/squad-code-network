#!/usr/bin/env node
// Stand-in for `opencode` used by bridge tests: mimics `opencode run --format json`.
// Emits step_start / text / tool_use / step_finish events with a `part` object, like opencode v1.18.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
if (args.includes('--version')) { console.log('1.18.35 (Fake Opencode)'); process.exit(0); }

const opt = name => { const i = args.indexOf(name); return i > -1 ? args[i + 1] : null; };
const session = 'ses_fake_session';
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => { input += d; });
process.stdin.on('end', () => {
  const emit = obj => process.stdout.write(JSON.stringify(obj) + '\n');
  const configFile = process.env.OPENCODE_CONFIG || null;
  const config = configFile ? JSON.parse(readFileSync(configFile, 'utf8')) : null;
  const agents = config?.agent ? Object.keys(config.agent) : null;
  // GITCHECK in the prompt: report the repository git finds from the cwd, as the agents' git commands would (null = none).
  let gitTop;
  if (input.includes('GITCHECK')) { try { gitTop = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { gitTop = null; } }
  const debug = {
    cwd: process.cwd(), gitCeiling: process.env.GIT_CEILING_DIRECTORIES || null, gitTop,
    config: configFile, agents, model: opt('--model'), variant: opt('--variant'), agent: opt('--agent'), auto: args.includes('--auto'),
  };
  emit({ type: 'step_start', timestamp: Date.now(), sessionID: session, part: { type: 'step-start', id: 'prt_start', sessionID: session, ocTest: debug } });
  if (input.includes('SLEEP')) { setTimeout(() => {}, 60_000); return; }
  if (input.includes('FAIL')) { emit({ type: 'error', timestamp: Date.now(), sessionID: session, error: { message: 'fake failure' } }); process.stderr.write('fake failure\n'); process.exit(1); }
  // With squad colleagues, call the first one through the task tool (as opencode streams it: the result is inline).
  const colleague = agents && agents[0];
  if (colleague) {
    emit({ type: 'text', timestamp: Date.now(), sessionID: session, part: { type: 'text', text: 'Vou consultar um colega.', id: 'prt_t', sessionID: session } });
    emit({ type: 'tool_use', timestamp: Date.now(), sessionID: session, part: { type: 'tool', tool: 'task', callID: 'call-1', id: 'prt_task', sessionID: session,
      state: { status: 'completed', input: { subagent_type: colleague, description: 'consulta', prompt: 'Pode confirmar o contrato?' },
        output: `<task id="${session}-sub" state="completed">\n<task_result>\nContrato confirmado.\n</task_result>\n</task>`,
        metadata: { sessionId: session + '-sub', parentSessionId: session } } } });
  }
  emit({ type: 'tool_use', timestamp: Date.now(), sessionID: session, part: { type: 'tool', tool: 'read', callID: 't1', id: 'prt_r', sessionID: session,
    state: { status: 'completed', input: { filePath: 'README.md' }, output: '<content>ok</content>', title: 'README.md' } } });
  emit({ type: 'text', timestamp: Date.now(), sessionID: session, part: { type: 'text', text: `ECHO:${input.trim()}`, id: 'prt_t2', sessionID: session } });
  emit({ type: 'step_finish', timestamp: Date.now(), sessionID: session, part: { type: 'step-finish', reason: 'stop', id: 'prt_f', sessionID: session, cost: 0.001, tokens: { total: 10, input: 5, output: 5, reasoning: 0, cache: { write: 0, read: 0 } } } });
});
