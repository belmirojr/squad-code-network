// Bridge integration tests: `node --test tests/`. Uses tests/fake-claude.mjs, so no API calls are made.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync, readdirSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4400 + Math.floor(Math.random() * 400);
const BASE = `http://127.0.0.1:${PORT}`;
const home = mkdtempSync(path.join(tmpdir(), 'squad-home-'));
const workdir = mkdtempSync(path.join(tmpdir(), 'squad-work-'));
// The server's own temp folder (squad-code-*) goes inside this one, so tests can reach it and nothing leaks into %TEMP%.
const tempRoot = mkdtempSync(path.join(tmpdir(), 'squad-tmp-'));
// Per-project folders go here instead of ./projects in the repo.
const projectsRoot = mkdtempSync(path.join(tmpdir(), 'squad-projects-'));
let server, token;

before(async () => {
  server = spawn(process.execPath, [path.join(ROOT, 'server.js'), '--port', String(PORT)], {
    cwd: workdir,
    env: { ...process.env, TEMP: tempRoot, TMP: tempRoot, TMPDIR: tempRoot, SQUAD_HOME: home, SQUAD_PROJECTS_DIR: projectsRoot, SQUAD_CLAUDE_BIN: path.join(ROOT, 'tests', 'fake-claude.mjs'), SQUAD_PRINT_TOKEN: '1' },
  });
  token = await new Promise((resolve, reject) => {
    let out = '';
    server.stdout.on('data', d => { out += d; const m = out.match(/TOKEN=(\w+)/); if (m) resolve(m[1]); });
    server.on('exit', code => reject(new Error('server exited ' + code)));
    setTimeout(() => reject(new Error('server start timeout')), 10000);
  });
});
after(async () => {
  if (server && server.exitCode === null) { const exited = new Promise(r => server.once('exit', r)); server.kill(); await exited; }
  // Windows may keep the dirs busy for a moment after the process exits.
  for (const dir of [home, workdir, tempRoot, projectsRoot]) rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

const api = (p, init = {}) => fetch(BASE + p, { ...init, headers: { 'content-type': 'application/json', 'x-squad-token': token, ...(init.headers || {}) } });

async function collect(runId) {
  const res = await fetch(`${BASE}/api/runs/${runId}/events?token=${token}`);
  const text = await res.text();
  return text.split('\n').filter(l => l.startsWith('data: ')).map(l => JSON.parse(l.slice(6)));
}

test('serves index with injected token', async () => {
  const html = await (await fetch(BASE + '/')).text();
  assert.match(html, new RegExp(`name="squad-bridge-token" content="${token}"`));
});

test('rejects missing token and foreign origin', async () => {
  assert.equal((await fetch(BASE + '/api/health')).status, 401);
  assert.equal((await api('/api/health', { headers: { origin: 'http://evil.example' } })).status, 403);
});

test('health reports fake claude version', async () => {
  const body = await (await api('/api/health')).json();
  assert.equal(body.ok, true);
  assert.match(body.claudeVersion, /9\.9\.9/);
  assert.equal(body.projectsDir, realpathSync.native(projectsRoot));
});

test('project runs get their own folder under the projects root, without the app CLAUDE.md', async () => {
  const folder = 'op-001-atlas-commerce', dir = path.join(projectsRoot, folder);
  assert.equal(existsSync(dir), false);
  const res = await api('/api/runs', { method: 'POST', body: JSON.stringify({ prompt: 'build it', options: { project: folder, cwd: workdir } }) });
  assert.equal(res.status, 201, await res.clone().text());
  const { runId, args, cwd } = await res.json();
  assert.ok(existsSync(dir));
  assert.equal(cwd, realpathSync.native(dir));
  assert.equal(args[args.indexOf('--settings') + 1], '<settings-file>');
  const events = await collect(runId);
  const init = events.find(e => e.type === 'system' && e.subtype === 'init');
  assert.equal(init.cwd, realpathSync.native(dir));
  assert.ok(init.settings.claudeMdExcludes.includes(realpathSync.native(path.join(ROOT, 'CLAUDE.md')).replace(/\\/g, '/')));
  assert.equal(events.at(-1).status, 'done');
  // Runs without a project keep the plain cwd and no extra settings.
  const plain = await (await api('/api/runs', { method: 'POST', body: JSON.stringify({ prompt: 'x', options: { cwd: workdir } }) })).json();
  assert.ok(!plain.args.includes('--settings'));
  await collect(plain.runId);
});

test('squad colleagues go to claude as an --agents file, with forwarded subagent text on request', async () => {
  const agents = { argus: { description: 'ARGUS, arquiteto. Chame para decisões de arquitetura.', prompt: 'Você é o ARGUS.', tools: ['Read', 'Grep'], model: 'haiku', effort: 'low', color: 'ignored' }, echo: { description: 'ECHO, QA.' } };
  const res = await api('/api/runs', { method: 'POST', body: JSON.stringify({ prompt: 'implement', options: { cwd: workdir, agents, forwardSubagents: true, tools: ['Read', 'Agent'] } }) });
  assert.equal(res.status, 201, await res.clone().text());
  const { runId, args } = await res.json();
  assert.equal(args[args.indexOf('--agents') + 1], '<agents-file>');
  assert.ok(args.includes('--forward-subagent-text'));
  const events = await collect(runId);
  const init = events.find(e => e.type === 'system' && e.subtype === 'init');
  assert.equal(init.foregroundAgents, true, 'colleague calls must run in the foreground');
  assert.deepEqual(init.agents, { argus: { description: agents.argus.description, prompt: 'Você é o ARGUS.', tools: ['Read', 'Grep'], model: 'haiku', effort: 'low' }, echo: { description: 'ECHO, QA.', prompt: '' } });
  const call = events.find(e => e.type === 'assistant' && e.message.content.some(b => b.type === 'tool_use' && b.name === 'Agent'));
  assert.equal(call.message.content.find(b => b.name === 'Agent').input.subagent_type, 'argus');
  assert.ok(events.some(e => e.type === 'assistant' && e.parent_tool_use_id === 'call-1'));
  assert.ok(events.some(e => e.type === 'user' && e.message.content.some(b => b.type === 'tool_result' && b.tool_use_id === 'call-1')));
  assert.equal(events.at(-1).status, 'done');
  // The temp file is removed when the run ends (asynchronously, right after the stream closes).
  const tmp = path.join(tempRoot, readdirSync(tempRoot).find(d => d.startsWith('squad-code-')));
  const left = () => readdirSync(tmp).filter(f => f.endsWith('.agents.json'));
  for (let i = 0; i < 20 && left().length; i++) await new Promise(r => setTimeout(r, 50));
  assert.deepEqual(left(), []);
  // forwardSubagents only with true.
  const plain = await (await api('/api/runs', { method: 'POST', body: JSON.stringify({ prompt: 'x', options: { cwd: workdir, agents: { argus: agents.argus }, forwardSubagents: 'yes' } }) })).json();
  assert.ok(plain.args.includes('--agents') && !plain.args.includes('--forward-subagent-text'));
  const plainEvents = await collect(plain.runId);
  assert.ok(!plainEvents.some(e => e.parent_tool_use_id));
});

test('rejects invalid squad agent definitions', async () => {
  const many = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`a${i}`, { description: 'x' }]));
  for (const agents of [[], 'argus', { 'Bad Key': { description: 'x' } }, { argus: 'x' }, { argus: {} }, { argus: { description: 'x', tools: ['Bash; rm'] } }, { argus: { description: 'x', model: 'a b' } }, { argus: { description: 'x', effort: 'turbo' } }, many]) {
    const res = await api('/api/runs', { method: 'POST', body: JSON.stringify({ prompt: 'x', options: { cwd: workdir, agents } }) });
    assert.equal(res.status, 400, JSON.stringify(agents).slice(0, 80));
  }
});

test('rejects project folder names that are not plain slugs', async () => {
  for (const project of ['../escape', 'a/b', 'a\\b', 'CON', 'con', 'Op-001', '-x', 'a.b', 'x'.repeat(81)]) {
    const res = await api('/api/runs', { method: 'POST', body: JSON.stringify({ prompt: 'x', options: { project } }) });
    assert.equal(res.status, 400, project);
  }
  assert.ok(!existsSync(path.join(path.dirname(projectsRoot), 'escape')));
  assert.deepEqual(readdirSync(projectsRoot).filter(d => d !== 'op-001-atlas-commerce'), []);
});

test('run streams events and final result with system prompt and flags', async () => {
  const res = await api('/api/runs', { method: 'POST', body: JSON.stringify({ prompt: 'hello agent', systemPrompt: 'be brief', options: { cwd: workdir, model: 'haiku', permissionMode: 'acceptEdits', allowedTools: ['Read', 'Bash(git *)'] } }) });
  assert.equal(res.status, 201);
  const { runId, args } = await res.json();
  assert.ok(args.includes('--permission-mode') && args.includes('acceptEdits'));
  const events = await collect(runId);
  const init = events.find(e => e.type === 'system' && e.subtype === 'init');
  assert.equal(init.model, 'haiku');
  assert.equal(init.foregroundAgents, false);
  assert.ok(events.some(e => e.type === 'assistant'));
  const exit = events.at(-1);
  assert.equal(exit.type, 'exit');
  assert.equal(exit.status, 'done');
  assert.equal(exit.result, 'ECHO:hello agent|SYS:be brief');
  assert.equal(exit.costUsd, 0.001);
});

test('partial streams text deltas only when asked (chat runs)', async () => {
  const run = async options => { const res = await api('/api/runs', { method: 'POST', body: JSON.stringify({ prompt: 'chat', options: { cwd: workdir, ...options } }) }); assert.equal(res.status, 201); const { runId, args } = await res.json(); return { args, events: await collect(runId) }; };
  const live = await run({ partial: true, tools: [], permissionMode: 'dontAsk' });
  assert.ok(live.args.includes('--include-partial-messages'));
  const deltas = live.events.filter(e => e.type === 'stream_event' && e.event?.delta?.type === 'text_delta').map(e => e.event.delta.text);
  assert.equal(deltas.join(''), 'working');
  assert.equal(live.events.at(-1).status, 'done');
  const plain = await run({ partial: 'yes' });
  assert.ok(!plain.args.includes('--include-partial-messages'));
  assert.ok(!plain.events.some(e => e.type === 'stream_event'));
});

test('recreates its temp folder when it disappears', async () => {
  // OS temp cleanup can remove the (usually empty) folder while the bridge keeps running.
  const dirs = readdirSync(tempRoot).filter(d => d.startsWith('squad-code-'));
  assert.equal(dirs.length, 1);
  rmSync(path.join(tempRoot, dirs[0]), { recursive: true, force: true });
  const res = await api('/api/runs', { method: 'POST', body: JSON.stringify({ prompt: 'still there?', systemPrompt: 'soul of the agent', options: { cwd: workdir } }) });
  assert.equal(res.status, 201, await res.clone().text());
  const exit = (await collect((await res.json()).runId)).at(-1);
  assert.equal(exit.status, 'done');
  assert.equal(exit.result, 'ECHO:still there?|SYS:soul of the agent');
});

test('failed run reports error', async () => {
  const { runId } = await (await api('/api/runs', { method: 'POST', body: JSON.stringify({ prompt: 'FAIL please', options: { cwd: workdir } }) })).json();
  const exit = (await collect(runId)).at(-1);
  assert.equal(exit.status, 'error');
  assert.equal(exit.isError, true);
});

test('cancel kills a running process', async () => {
  const { runId } = await (await api('/api/runs', { method: 'POST', body: JSON.stringify({ prompt: 'SLEEP', options: { cwd: workdir } }) })).json();
  const pending = collect(runId);
  await new Promise(r => setTimeout(r, 400));
  await api(`/api/runs/${runId}/cancel`, { method: 'POST' });
  const exit = (await pending).at(-1);
  assert.equal(exit.status, 'cancelled');
});

test('rejects invalid options', async () => {
  const res = await api('/api/runs', { method: 'POST', body: JSON.stringify({ prompt: 'x', options: { permissionMode: 'yolo' } }) });
  assert.equal(res.status, 400);
  const res2 = await api('/api/runs', { method: 'POST', body: JSON.stringify({ prompt: 'x', options: { allowedTools: ['Bash; rm -rf /'] } }) });
  assert.equal(res2.status, 400);
});

test('settings.json read/write with backup (user and project scope)', async () => {
  const empty = await (await api('/api/claude/settings?scope=user')).json();
  assert.equal(empty.exists, false);
  let res = await api('/api/claude/settings?scope=user', { method: 'PUT', body: JSON.stringify({ text: '{"model":"sonnet"}' }) });
  assert.equal((await res.json()).backup, null);
  res = await api('/api/claude/settings?scope=user', { method: 'PUT', body: JSON.stringify({ text: '{"model":"opus"}' }) });
  const saved = await res.json();
  assert.ok(saved.backup && existsSync(saved.backup));
  assert.deepEqual(JSON.parse(readFileSync(path.join(home, '.claude', 'settings.json'), 'utf8')), { model: 'opus' });
  assert.deepEqual(JSON.parse(readFileSync(saved.backup, 'utf8')), { model: 'sonnet' });

  res = await api(`/api/claude/settings?scope=project&cwd=${encodeURIComponent(workdir)}`, { method: 'PUT', body: JSON.stringify({ text: '{"permissions":{"allow":["Read"]}}' }) });
  assert.equal(res.status, 200);
  assert.ok(existsSync(path.join(workdir, '.claude', 'settings.json')));

  // A project folder that has no run yet: reading does not create it, saving does.
  const fresh = await (await api('/api/claude/settings?scope=local&project=op-002-loja')).json();
  assert.equal(fresh.exists, false);
  assert.equal(existsSync(path.join(projectsRoot, 'op-002-loja')), false);
  res = await api('/api/claude/settings?scope=project&project=op-002-loja', { method: 'PUT', body: JSON.stringify({ text: '{"model":"haiku"}' }) });
  assert.equal(res.status, 200);
  assert.deepEqual(JSON.parse(readFileSync(path.join(projectsRoot, 'op-002-loja', '.claude', 'settings.json'), 'utf8')), { model: 'haiku' });
  assert.equal((await api('/api/claude/settings?scope=project&project=..%2Fx')).status, 400);

  res = await api('/api/claude/settings?scope=user', { method: 'PUT', body: JSON.stringify({ text: '[1,2]' }) });
  assert.equal(res.status, 400);
  res = await api('/api/claude/settings?scope=user', { method: 'PUT', body: JSON.stringify({ text: '{bad' }) });
  assert.equal(res.status, 400);
});
