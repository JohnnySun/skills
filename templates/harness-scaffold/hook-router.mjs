#!/usr/bin/env node
// Harness hook router 骨架（平台無關核心 + 可插拔佈線）。
// 實現 harness-builder 環1 的最小閉環：edit→arm、verify→clear、
// Stop block-once、commit deny + 顯式逃生 + 事件記帳。
//
// 佈線方式見同目錄 wiring/；事件名與輸入輸出格式的平台差異見
// harness-builder skill 的 references/platform-hooks.md。
//
// 設計要點（改動前先讀 harness-builder references/pitfalls.md）：
// - Stop gate 只攔一次（防死鎖）；commit 才是硬 gate。
// - 逃生（VERIFY_SKIP="原因"）按次生效、自動落事件帳本、不清 pending。
// - 「提及 ≠ 執行」：commit 偵測錨定在命令位置，不做全文關鍵字比對。

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ── 工程配置（按目標工程改這一段）────────────────────────────────
export const config = {
  // 哪些副檔名算 code（編輯後武裝驗證要求）。
  // 注意：如果可信集也守 .md 等文檔不變量，把它們加進來（pitfalls #6）。
  codeFilePattern: /\.(go|rs|py|ts|tsx|js|mjs|vue|svelte|css|scss|html|sql)$/i,
  // 檔案路徑 → 模組名。預設取第一層目錄；monorepo 按需改。
  moduleOf(filePath) {
    const rel = filePath.replace(/^\.\//, '');
    const seg = rel.split('/')[0];
    return seg && seg !== rel ? seg : '.';
  },
  // 哪些命令算「收環驗證」。只認全量可信集——窄跑（-run/-t 單測）不算。
  // match 到 modules:null 表示清掉所有 pending。
  verifyCommands: [
    // go test 後同一命令段內出現 -run = 窄跑，不算收環
    { pattern: /(?:^|&&|;)\s*go test(?![^&;|]*-run)/, modules: null },
    { pattern: /\.\/scripts\/test-[\w.-]*\.sh/, modules: null },
    { pattern: /npm (?:run )?(?:test|build|validate)\b/, modules: null },
    { pattern: /node --test\b/, modules: null },
  ],
  escapeEnvVar: 'VERIFY_SKIP',
  eventLedger: path.join(os.homedir(), '.harness', 'gate-events.jsonl'),
  stateDir: path.join(os.tmpdir(), 'harness-hook'),
};

// ── 事件帳本 ─────────────────────────────────────────────────────
export function logEvent(event, detail, ledgerPath = config.eventLedger) {
  try {
    fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
    fs.appendFileSync(
      ledgerPath,
      JSON.stringify({ ts: new Date().toISOString(), event, ...detail }) + '\n',
    );
  } catch {
    /* 帳本寫入失敗不阻斷主流程 */
  }
}

// ── 核心邏輯（純函數，方便測試）──────────────────────────────────
export function newState() {
  return { pending: {}, stopBlockedOnce: false };
}

function detectGitCommit(command) {
  // 錨定執行位置：行首或 && / ; / | 之後的 git commit 才算（提及 ≠ 執行）。
  // 允許 VAR=value 環境變數前綴——否則任何 env 前綴都能繞過 deny。
  return /(?:^|&&|;|\|)\s*(?:[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|\S*)\s+)*git\s+(?:-C\s+\S+\s+)?commit\b/.test(command);
}

function extractEditedFiles(payload) {
  const input = payload.tool_input || {};
  const files = [];
  if (input.file_path) files.push(input.file_path);
  if (Array.isArray(input.edits)) for (const e of input.edits) if (e.file_path) files.push(e.file_path);
  return files;
}

export function processEvent(payload, state, env = process.env) {
  const event = payload.hook_event_name;

  if (event === 'SessionStart') {
    return { state: newState(), response: {} };
  }

  if (event === 'PostToolUse') {
    const tool = payload.tool_name || '';
    if (/^(Write|Edit|MultiEdit|NotebookEdit|apply_patch)$/.test(tool)) {
      for (const f of extractEditedFiles(payload)) {
        if (config.codeFilePattern.test(f)) {
          state.pending[config.moduleOf(f)] = true;
          state.stopBlockedOnce = false; // 新的編輯波允許 Stop gate 再攔一次
        }
      }
    }
    if (tool === 'Bash') {
      const cmd = (payload.tool_input && payload.tool_input.command) || '';
      for (const vc of config.verifyCommands) {
        if (vc.pattern.test(cmd)) {
          if (vc.modules === null) state.pending = {};
          else for (const m of vc.modules) delete state.pending[m];
        }
      }
    }
    return { state, response: {} };
  }

  if (event === 'PreToolUse' && payload.tool_name === 'Bash') {
    const cmd = (payload.tool_input && payload.tool_input.command) || '';
    if (detectGitCommit(cmd) && Object.keys(state.pending).length > 0) {
      const escape = new RegExp(`${config.escapeEnvVar}=`).test(cmd) || env[config.escapeEnvVar];
      const mods = Object.keys(state.pending).join(', ');
      if (escape) {
        // 逃生：放行 + 自動記帳；pending 不清（逃生按次不按批）。
        logEvent('verify-skip', { modules: mods, command: cmd.slice(0, 200) });
        return { state, response: {} };
      }
      logEvent('commit-deny', { modules: mods });
      return {
        state,
        response: {
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason:
              `模組 [${mods}] 有未通過全量可信集的改動。先跑對應可信集，` +
              `或顯式逃生：${config.escapeEnvVar}="<原因>" git commit …（會自動記帳）。`,
          },
        },
      };
    }
    return { state, response: {} };
  }

  if (event === 'Stop' || event === 'SubagentStop') {
    if (payload.stop_hook_active) return { state, response: {} }; // 防死鎖：重入直通
    const mods = Object.keys(state.pending);
    if (mods.length > 0 && !state.stopBlockedOnce) {
      state.stopBlockedOnce = true; // 同一波編輯只攔一次
      logEvent('stop-block', { modules: mods.join(', ') });
      return {
        state,
        response: {
          decision: 'block',
          reason:
            `以下模組改了 code 但還沒跑全量可信集：${mods.join(', ')}。` +
            `請跑對應驗證命令後再結束；確不適用請說明原因與替代驗證方式。`,
        },
      };
    }
    return { state, response: {} };
  }

  return { state, response: {} };
}

// ── IO 外殼 ──────────────────────────────────────────────────────
function statePath(sessionId) {
  return path.join(config.stateDir, `${sessionId || `ppid-${process.ppid}`}.json`);
}

export function loadState(sessionId) {
  try {
    return JSON.parse(fs.readFileSync(statePath(sessionId), 'utf8'));
  } catch {
    return newState();
  }
}

export function saveState(sessionId, state) {
  try {
    fs.mkdirSync(config.stateDir, { recursive: true });
    fs.writeFileSync(statePath(sessionId), JSON.stringify(state));
  } catch {
    /* state 壞掉不阻斷 CLI */
  }
}

async function main() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  let payload;
  try {
    payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    process.exit(0); // 壞 payload 不阻斷
  }
  const state = loadState(payload.session_id);
  const { state: next, response } = processEvent(payload, state);
  saveState(payload.session_id, next);
  if (response && Object.keys(response).length > 0) {
    process.stdout.write(JSON.stringify(response));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
