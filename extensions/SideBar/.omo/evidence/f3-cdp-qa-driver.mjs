import { spawn } from "node:child_process";
import crypto from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const browserName = process.argv[2];
const exePath = process.argv[3];
const extensionDir = process.argv[4];
const port = Number(process.argv[5]);

if (!browserName || !exePath || !extensionDir || !port) {
  console.error("Usage: node .omo/evidence/f3-cdp-qa-driver.mjs <browserName> <exePath> <extensionDir> <port>");
  process.exit(2);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} -> ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function fetchJsonWithMethod(url, method) {
  const response = await fetch(url, { method });
  if (!response.ok) {
    throw new Error(`${method} ${url} -> ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function waitForJson(url, timeoutMs = 15000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      return await fetchJson(url);
    } catch (error) {
      lastError = error;
      await delay(250);
    }
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const events = [];

  ws.addEventListener("message", (message) => {
    const data = JSON.parse(message.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) {
        reject(new Error(`${data.error.message}${data.error.data ? `: ${data.error.data}` : ""}`));
      } else {
        resolve(data.result ?? {});
      }
      return;
    }
    events.push(data);
  });

  const opened = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  async function send(method, params = {}) {
    await opened;
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  }

  return { ws, send, events };
}

async function connectPage(port, targetId) {
  const target = await fetchJson(`http://127.0.0.1:${port}/json/list`).then((targets) => targets.find((item) => item.id === targetId));
  if (!target?.webSocketDebuggerUrl) {
    throw new Error(`Target ${targetId} has no websocket debugger URL`);
  }
  const cdp = connect(target.webSocketDebuggerUrl);
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  return cdp;
}

async function evaluate(cdp, expression, awaitPromise = true) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
    userGesture: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime.evaluate exception");
  }
  return result.result?.value;
}

async function createTarget(port, url) {
  return fetchJsonWithMethod(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, "PUT");
}

function extensionIdForPath(candidatePath) {
  const bytes = crypto.createHash("sha256").update(candidatePath).digest().subarray(0, 16);
  return [...bytes]
    .map((byte) => `${String.fromCharCode(97 + (byte >> 4))}${String.fromCharCode(97 + (byte & 15))}`)
    .join("");
}

function candidateExtensionIds(extensionDir) {
  const normalized = path.resolve(extensionDir);
  return [...new Set([
    extensionIdForPath(normalized),
    extensionIdForPath(normalized.toLowerCase()),
    extensionIdForPath(normalized.replaceAll("\\\\", "/")),
    extensionIdForPath(normalized.toLowerCase().replaceAll("\\\\", "/"))
  ])];
}

async function waitForExtensionId(port) {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
    const extensionTarget = targets.find((target) => /chrome-extension:\/\/[^/]+\/src\/background\.js/.test(target.url));
    if (extensionTarget) {
      return extensionTarget.url.match(/chrome-extension:\/\/([^/]+)/)?.[1];
    }
    await delay(250);
  }
  throw new Error("Timed out waiting for SideBar service worker target");
}

async function discoverExtensionId(port, extensionDir) {
  try {
    return { id: await waitForExtensionId(port), source: "service-worker-target" };
  } catch (serviceWorkerError) {
    const tried = [];
    for (const id of candidateExtensionIds(extensionDir)) {
      tried.push(id);
      try {
        const target = await createTarget(port, `chrome-extension://${id}/src/panel.html`);
        await delay(750);
        const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
        const matched = targets.find((item) => item.id === target.id);
        if ((matched?.title === "Rail" || matched?.title === "SideBar") && matched?.url?.startsWith(`chrome-extension://${id}/`)) {
          return { id, source: "path-derived-panel-open", tried, validationTarget: matched };
        }
      } catch (error) {
        tried.push(`${id}: ${error.message}`);
      }
    }
    throw new Error(`Unable to discover SideBar extension ID. Service worker error: ${serviceWorkerError.message}. Tried: ${tried.join(", ")}`);
  }
}

async function panelSnapshot(cdp) {
  return evaluate(cdp, `(() => {
    const sites = [...document.querySelectorAll('#site-list .site-list__item')].map((item) => ({
      id: item.getAttribute('data-site-id'),
      title: item.querySelector('.site-list__rail-button')?.title ?? '',
      buttons: [...item.querySelectorAll('button')].map((button) => button.textContent || button.getAttribute('aria-label')),
      draggable: item.draggable
    }));
    const selectedDetails = document.querySelector('#selected-site-details');
    return {
      href: location.href,
      title: document.title,
      drawerHidden: document.querySelector('#panel-drawer')?.hidden ?? null,
      statusText: document.querySelector('#panel-status')?.textContent ?? '',
      statusTone: document.querySelector('#panel-status')?.dataset?.tone ?? '',
      emptyHidden: document.querySelector('#empty-state')?.hidden ?? null,
      addCurrentButton: document.querySelector('#add-current-site')?.textContent ?? '',
      selectedTitle: selectedDetails?.querySelector('.site-list__title')?.textContent ?? '',
      selectedUrl: selectedDetails?.querySelector('.site-list__url')?.textContent ?? '',
      selectedButtons: [...(selectedDetails?.querySelectorAll('button') ?? [])].map((button) => button.textContent),
      sites
    };
  })()`);
}

async function fallbackSnapshot(cdp) {
  return evaluate(cdp, `(() => ({
    href: location.href,
    listHidden: document.querySelector('#list-panel')?.hidden ?? null,
    fallbackHidden: document.querySelector('#fallback-panel')?.hidden ?? null,
    warning: document.querySelector('#fallback-warning')?.textContent ?? '',
    message: document.querySelector('#fallback-message')?.textContent ?? '',
    messageTone: document.querySelector('#fallback-message')?.dataset?.tone ?? '',
    frameSrc: document.querySelector('#fallback-frame')?.src ?? '',
    openTabDisabled: document.querySelector('#fallback-open-tab')?.disabled ?? null
  }))()`);
}

async function storageSnapshot(cdp) {
  return evaluate(cdp, `new Promise((resolve) => chrome.storage.local.get(null, resolve))`);
}

async function activateExampleTabFromPanel(panel) {
  return evaluate(panel, `new Promise((resolve, reject) => {
    chrome.tabs.query({ url: 'https://example.com/*' }, (tabs) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }

      const tab = tabs?.[0];
      if (!tab?.id) {
        reject(new Error('No https://example.com tab is available.'));
        return;
      }

      chrome.tabs.update(tab.id, { active: true }, () => {
        const updateError = chrome.runtime.lastError;
        if (updateError) {
          reject(new Error(updateError.message));
          return;
        }

        resolve({ tabId: tab.id, url: tab.url, title: tab.title });
      });
    });
  })`);
}

async function main() {
  const profileDir = await mkdtemp(path.join(tmpdir(), `sidebar-f3-${browserName}-`));
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    `--disable-extensions-except=${extensionDir}`,
    `--load-extension=${extensionDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-features=Translate,OptimizationGuideModelDownloading,OptimizationHintsFetching",
    "about:blank"
  ];

  const child = spawn(exePath, args, { stdio: ["ignore", "pipe", "pipe"] });
  const stderr = [];
  const stdout = [];
  child.stderr.on("data", (chunk) => stderr.push(chunk.toString()));
  child.stdout.on("data", (chunk) => stdout.push(chunk.toString()));

  const evidence = {
    browserName,
    exePath,
    extensionDir,
    port,
    profileDir,
    launchCommand: `& "${exePath}" ${args.map((arg) => arg.includes(" ") ? `"${arg}"` : arg).join(" ")}`,
    startedPid: child.pid,
    steps: []
  };

  try {
    evidence.version = await waitForJson(`http://127.0.0.1:${port}/json/version`);
    const activeSiteTarget = await createTarget(port, "https://example.com");
    const activeSite = await connectPage(port, activeSiteTarget.id);
    await activeSite.send("Page.bringToFront");
    await delay(1000);
    evidence.extensionDiscovery = await discoverExtensionId(port, extensionDir);
    evidence.extensionId = evidence.extensionDiscovery.id;
    const panelUrl = `chrome-extension://${evidence.extensionId}/src/panel.html`;
    const panelTarget = await createTarget(port, panelUrl);
    const panel = await connectPage(port, panelTarget.id);
    await delay(1000);

    evidence.steps.push({ name: "initial editable list", panel: await panelSnapshot(panel), storage: await storageSnapshot(panel) });

    const firstActiveTab = await activateExampleTabFromPanel(panel);
    await evaluate(panel, `document.querySelector('#add-current-site').click()`);
    await delay(500);
    evidence.steps.push({ name: "add active https://example.com tab with rail plus", activeTab: firstActiveTab, panel: await panelSnapshot(panel), storage: await storageSnapshot(panel) });

    await evaluate(panel, `document.querySelector('#selected-site-details .site-list__button--danger').click()`);
    await delay(500);
    evidence.steps.push({ name: "remove https://example.com", panel: await panelSnapshot(panel), storage: await storageSnapshot(panel) });

    const secondActiveTab = await activateExampleTabFromPanel(panel);
    await evaluate(panel, `document.querySelector('#add-current-site').click()`);
    await delay(500);
    evidence.steps.push({ name: "add active https://example.com tab again", activeTab: secondActiveTab, panel: await panelSnapshot(panel), storage: await storageSnapshot(panel) });

    await evaluate(panel, `document.querySelector('#selected-site-details .site-list__button:not(.site-list__button--danger)').click()`);
    await delay(1500);
    evidence.steps.push({
      name: "open saved site through selected navigation mode",
      panel: await panelSnapshot(panel),
      targets: await fetchJson(`http://127.0.0.1:${port}/json/list`)
    });

    evidence.steps.push({
      name: "extension action return attempt",
      result: "BLOCKED: CDP exposes extension pages/targets but no stable command to click the browser toolbar extension action. The service worker registered chrome.action.onClicked; this run could not invoke the browser action without visual/OS-coordinate interaction. As a non-equivalent diagnostic only, the extension reset-panel runtime message was tested below.",
    });

    const resetResult = await evaluate(panel, `new Promise((resolve) => chrome.runtime.sendMessage({ type: 'reset-panel' }, resolve))`);
    await delay(500);
    evidence.steps.push({ name: "diagnostic reset-panel message (not extension action)", resetResult, panel: await panelSnapshot(panel) });

    const fallbackUrl = `chrome-extension://${evidence.extensionId}/src/panel.html?fallbackUrl=${encodeURIComponent('https://example.com')}`;
    const fallbackTarget = await createTarget(port, fallbackUrl);
    const fallback = await connectPage(port, fallbackTarget.id);
    await delay(1000);
    evidence.steps.push({ name: "fallback panel opened directly for open-in-tab control", fallback: await fallbackSnapshot(fallback) });

    await evaluate(fallback, `document.querySelector('#fallback-open-tab').click()`);
    await delay(1000);
    evidence.steps.push({
      name: "trigger open-in-tab fallback",
      fallback: await fallbackSnapshot(fallback),
      targets: await fetchJson(`http://127.0.0.1:${port}/json/list`)
    });
  } catch (error) {
    evidence.failure = {
      message: error.message,
      stack: error.stack
    };

    try {
      evidence.failureTargets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
    } catch (targetError) {
      evidence.failureTargetsError = targetError.message;
    }
  } finally {
    child.kill();
    await delay(1000);
    evidence.browserStdout = stdout.join("").slice(-4000);
    evidence.browserStderr = stderr.join("").slice(-8000);
    try {
      await rm(profileDir, { recursive: true, force: true });
      evidence.profileCleanup = "removed";
    } catch (error) {
      evidence.profileCleanup = `cleanup failed: ${error.message}`;
    }
  }

  console.log(JSON.stringify(evidence, null, 2));

  if (evidence.failure) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
