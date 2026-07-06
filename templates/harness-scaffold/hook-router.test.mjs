// hook-router 骨架的可信集。改 router 前先在這裡加 Red（公理 5：harness 自己吃 TDD）。
// 紀律：每個「不再觸發」的修正配一個「該觸發仍觸發」的正向對照（pitfalls #10）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { processEvent, newState, config } from './hook-router.mjs';

const edit = (file) => ({
  hook_event_name: 'PostToolUse',
  tool_name: 'Edit',
  tool_input: { file_path: file },
});
const bash = (event, command) => ({
  hook_event_name: event,
  tool_name: 'Bash',
  tool_input: { command },
});

test('編輯 code 檔武裝對應模組的 pending', () => {
  const { state } = processEvent(edit('server/router/user.go'), newState());
  assert.deepEqual(Object.keys(state.pending), ['server']);
});

test('編輯非 code 檔不武裝', () => {
  const { state } = processEvent(edit('docs/notes.txt'), newState());
  assert.deepEqual(state.pending, {});
});

test('全量可信集命令清除 pending', () => {
  let { state } = processEvent(edit('server/router/user.go'), newState());
  ({ state } = processEvent(bash('PostToolUse', 'cd server && ./scripts/test-offline.sh'), state));
  assert.deepEqual(state.pending, {});
});

test('窄跑（go test -run）不清 pending —— 窄跑不算收環', () => {
  let { state } = processEvent(edit('server/router/user.go'), newState());
  ({ state } = processEvent(bash('PostToolUse', 'go test ./router -run TestUser'), state));
  assert.deepEqual(Object.keys(state.pending), ['server']);
});

test('有 pending 時 git commit 被 deny', () => {
  const { state } = processEvent(edit('server/a.go'), newState());
  const { response } = processEvent(bash('PreToolUse', 'git commit -m "wip"'), state, {});
  assert.equal(response.hookSpecificOutput.permissionDecision, 'deny');
});

test('正向對照：無 pending 時 git commit 放行', () => {
  const { response } = processEvent(bash('PreToolUse', 'git commit -m "ok"'), newState(), {});
  assert.deepEqual(response, {});
});

test('提及 ≠ 執行：命令文本引用 git commit 字樣不觸發 deny', () => {
  const { state } = processEvent(edit('server/a.go'), newState());
  const { response } = processEvent(
    bash('PreToolUse', 'grep -rn "git commit" docs/'),
    state,
    {},
  );
  assert.deepEqual(response, {});
});

test('正向對照：env 前綴（非逃生變數）的 commit 仍被 deny —— 防 env 前綴繞過', () => {
  const { state } = processEvent(edit('server/a.go'), newState());
  const { response } = processEvent(
    bash('PreToolUse', 'GIT_AUTHOR_NAME=bot git commit -m "wip"'),
    state,
    {},
  );
  assert.equal(response.hookSpecificOutput.permissionDecision, 'deny');
});

test('顯式逃生放行 + 不清 pending（按次不按批）', () => {
  const { state } = processEvent(edit('server/a.go'), newState());
  const { response, state: after } = processEvent(
    bash('PreToolUse', `${config.escapeEnvVar}="prod 搶修" git commit -m "hotfix"`),
    state,
    {},
  );
  assert.deepEqual(response, {});
  assert.deepEqual(Object.keys(after.pending), ['server']);
});

test('Stop 有 pending 攔一次，第二次放行（防死鎖）', () => {
  let { state } = processEvent(edit('server/a.go'), newState());
  const first = processEvent({ hook_event_name: 'Stop' }, state);
  assert.equal(first.response.decision, 'block');
  const second = processEvent({ hook_event_name: 'Stop' }, first.state);
  assert.deepEqual(second.response, {});
});

test('stop_hook_active 重入直通', () => {
  const { state } = processEvent(edit('server/a.go'), newState());
  const { response } = processEvent({ hook_event_name: 'Stop', stop_hook_active: true }, state);
  assert.deepEqual(response, {});
});

test('新一波編輯重置 Stop 攔截額度', () => {
  let { state } = processEvent(edit('server/a.go'), newState());
  ({ state } = processEvent({ hook_event_name: 'Stop' }, state)); // 攔一次
  ({ state } = processEvent(edit('mobile/src/b.vue'), state)); // 新編輯波
  const { response } = processEvent({ hook_event_name: 'Stop' }, state);
  assert.equal(response.decision, 'block');
});

test('SessionStart 重置 state', () => {
  const { state } = processEvent(edit('server/a.go'), newState());
  const reset = processEvent({ hook_event_name: 'SessionStart' }, state);
  assert.deepEqual(reset.state, newState());
});
