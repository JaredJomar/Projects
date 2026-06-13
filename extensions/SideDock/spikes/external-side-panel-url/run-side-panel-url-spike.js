const childProcess = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const browserArg = process.argv.find((arg) => arg.startsWith("--browser="));
const browser = browserArg ? browserArg.slice("--browser=".length) : "chrome";
const root = __dirname;
const extensionPath = root;
const remotePort = 12000 + Math.floor(Math.random() * 20000);
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), `side-panel-${browser}-`));

function browserCandidates(name) {
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const localAppData = process.env.LOCALAPPDATA || "";

  if (name === "edge") {
    return [
      process.env.EDGE_PATH,
      path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(localAppData, "Microsoft", "Edge", "Application", "msedge.exe")
    ].filter(Boolean);
  }

  return [
    process.env.CHROME_PATH,
    path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe")
  ].filter(Boolean);
}

function findBrowserExecutable(name) {
  const found = browserCandidates(name).find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`Could not find ${name} executable. Set ${name === "edge" ? "EDGE_PATH" : "CHROME_PATH"}.`);
  }
  return found;
}

function requestJson(route, method = "GET") {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port: remotePort, path: route, method }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`${method} ${route} failed with ${res.statusCode}: ${body}`));
          return;
        }
        try {
          resolve(body ? JSON.parse(body) : null);
        } catch (error) {
          reject(new Error(`Could not parse JSON from ${route}: ${error.message}; body=${body}`));
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForVersion() {
  const deadline = Date.now() + 20000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      return await requestJson("/json/version");
    } catch (error) {
      lastError = error;
      await delay(250);
    }
  }
  throw lastError || new Error("Timed out waiting for DevTools version endpoint.");
}

async function waitForServiceWorkerTarget() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const targets = await requestJson("/json/list");
    const worker = targets.find((target) => target.type === "service_worker" && target.url.endsWith("/service_worker.js"));
    if (worker) {
      return worker;
    }
    await delay(500);
  }
  throw new Error("Timed out waiting for extension service worker target.");
}

function websocketFrame(payload) {
  const data = Buffer.from(payload);
  const length = data.length;
  let header;
  if (length < 126) {
    header = Buffer.from([0x81, 0x80 | length]);
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(length, 2);
  } else {
    throw new Error("Payload too large for this simple WebSocket client.");
  }
  const mask = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const masked = Buffer.alloc(data.length);
  for (let index = 0; index < data.length; index += 1) {
    masked[index] = data[index] ^ mask[index % 4];
  }
  return Buffer.concat([header, mask, masked]);
}

function parseFrames(buffer) {
  const messages = [];
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const first = buffer[offset];
    const second = buffer[offset + 1];
    let length = second & 0x7f;
    let headerLength = 2;
    if (length === 126) {
      if (offset + 4 > buffer.length) break;
      length = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (length === 127) {
      throw new Error("Large WebSocket frames are not supported by this spike runner.");
    }
    const frameEnd = offset + headerLength + length;
    if (frameEnd > buffer.length) break;
    if ((first & 0x0f) === 1) {
      messages.push(buffer.slice(offset + headerLength, frameEnd).toString("utf8"));
    }
    offset = frameEnd;
  }
  return { messages, rest: buffer.slice(offset) };
}

function createCdpClient(webSocketDebuggerUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(webSocketDebuggerUrl);
    const key = Buffer.from("side-panel-feasibility").toString("base64");
    const socket = require("node:net").connect(Number(url.port), url.hostname);
    const callbacks = new Map();
    let nextId = 1;
    let buffer = Buffer.alloc(0);

    socket.once("error", reject);
    socket.once("connect", () => {
      socket.write([
        `GET ${url.pathname}${url.search} HTTP/1.1`,
        `Host: ${url.host}`,
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Key: ${key}`,
        "Sec-WebSocket-Version: 13",
        "",
        ""
      ].join("\r\n"));
    });

    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const text = buffer.toString("utf8");
      if (text.startsWith("HTTP/1.1 101") || text.startsWith("HTTP/1.0 101")) {
        const split = text.indexOf("\r\n\r\n");
        if (split !== -1) {
          buffer = buffer.slice(split + 4);
          socket.removeAllListeners("error");
          socket.on("error", (error) => {
            for (const callback of callbacks.values()) callback.reject(error);
            callbacks.clear();
          });
          socket.on("data", (data) => {
            buffer = Buffer.concat([buffer, data]);
            const parsed = parseFrames(buffer);
            buffer = parsed.rest;
            for (const message of parsed.messages) {
              const parsedMessage = JSON.parse(message);
              if (parsedMessage.id && callbacks.has(parsedMessage.id)) {
                const callback = callbacks.get(parsedMessage.id);
                callbacks.delete(parsedMessage.id);
                if (parsedMessage.error) callback.reject(new Error(JSON.stringify(parsedMessage.error)));
                else callback.resolve(parsedMessage.result);
              }
            }
          });
          resolve({
            send(method, params = {}) {
              const id = nextId;
              nextId += 1;
              socket.write(websocketFrame(JSON.stringify({ id, method, params })));
              return new Promise((resolveSend, rejectSend) => {
                callbacks.set(id, { resolve: resolveSend, reject: rejectSend });
              });
            },
            close() {
              socket.end();
            }
          });
        }
      } else if (text.startsWith("HTTP/1.1") || text.startsWith("HTTP/1.0")) {
        reject(new Error(`WebSocket upgrade failed: ${text.slice(0, 200)}`));
      }
    });
  });
}

async function evaluateInWorker(worker, expression) {
  const client = await createCdpClient(worker.webSocketDebuggerUrl);
  try {
    return await client.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
  } finally {
    client.close();
  }
}

function workerProbeInvocationExpression(functionName, source) {
  return `(() => {
    const fn = globalThis.${functionName} || self.${functionName} || (typeof ${functionName} === "function" ? ${functionName} : null);
    if (typeof fn !== "function") {
      throw new Error("${functionName} is not available in the service worker context");
    }
    return fn(${JSON.stringify(source)});
  })()`;
}

function directSetOptionsProbeExpression(source) {
  return `(() => {
    const DIRECT_SIDE_PANEL_URL = "https://example.com";

    function sidePanelSetOptions(options) {
      return new Promise((resolve) => {
        try {
          chrome.sidePanel.setOptions(options, () => {
            const lastError = chrome.runtime.lastError?.message || null;
            resolve({ ok: !lastError, lastError });
          });
        } catch (error) {
          resolve({ ok: false, lastError: error.name + ": " + error.message });
        }
      });
    }

    return (async () => {
      const result = await sidePanelSetOptions({
        path: DIRECT_SIDE_PANEL_URL,
        enabled: true
      });

      return {
        setOptionsResult: result.ok ? "success" : "failure",
        lastError: result.lastError,
        directModeDecision: result.ok ? "DIRECT" : "FALLBACK",
        source: ${JSON.stringify(source)}
      };
    })();
  })()`;
}

function directPanelOpenProbeExpression(source) {
  return `(() => {
    function sidePanelOpen(options) {
      return new Promise((resolve) => {
        try {
          chrome.sidePanel.open(options, () => {
            const lastError = chrome.runtime.lastError?.message || null;
            resolve({ ok: !lastError, lastError });
          });
        } catch (error) {
          resolve({ ok: false, lastError: error.name + ": " + error.message });
        }
      });
    }

    return (async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const windowId = tabs[0]?.windowId;
      const result = await sidePanelOpen(windowId ? { windowId } : {});

      return {
        panelOpenAttempted: true,
        panelOpenResult: result.ok ? "success" : "failure",
        panelOpenLastError: result.lastError,
        source: ${JSON.stringify(source)}
      };
    })();
  })()`;
}

function workerProbeFallbackMessage(functionName) {
  return `${functionName} is not available in the service worker context`;
}

async function evaluateWorkerProbe(worker, functionName, source, fallbackExpression, label) {
  const preferred = await evaluateInWorker(worker, workerProbeInvocationExpression(functionName, source));
  if (!preferred.exceptionDetails) {
    return evaluatedValue(preferred, label);
  }

  const description = preferred.exceptionDetails.exception?.description || preferred.exceptionDetails.text || "";
  if (!description.includes(workerProbeFallbackMessage(functionName))) {
    throw new Error(`${label} failed: ${JSON.stringify(preferred.exceptionDetails)}`);
  }

  const fallback = await evaluateInWorker(worker, fallbackExpression);
  return evaluatedValue(fallback, label);
}

function evaluatedValue(evaluation, label) {
  if (evaluation.exceptionDetails) {
    throw new Error(`${label} failed: ${JSON.stringify(evaluation.exceptionDetails)}`);
  }

  if (!evaluation.result || typeof evaluation.result.value === "undefined") {
    throw new Error(`${label} did not return a plain value.`);
  }

  return evaluation.result.value;
}

async function main() {
  const executable = findBrowserExecutable(browser);
  const args = [
    `--remote-debugging-port=${remotePort}`,
    "--remote-debugging-address=127.0.0.1",
    "--remote-allow-origins=*",
    `--user-data-dir=${userDataDir}`,
    `--load-extension=${extensionPath}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-extensions-content-verification",
    "about:blank"
  ];

  const child = childProcess.spawn(executable, args, { stdio: ["ignore", "ignore", "pipe"], detached: false });
  let childStderr = "";
  child.stderr.on("data", (chunk) => { childStderr += chunk.toString(); });
  let output;
  try {
    const version = await waitForVersion();
    const worker = await waitForServiceWorkerTarget();
    const setOptionsResult = await evaluateWorkerProbe(worker, "runSetOptionsSpike", "cdp", directSetOptionsProbeExpression("cdp"), "runSetOptionsSpike");
    const panelOpenResult = await evaluateWorkerProbe(worker, "runPanelOpenSpike", "cdp", directPanelOpenProbeExpression("cdp"), "runPanelOpenSpike");
    output = {
      executable,
      remoteDebuggingPort: remotePort,
      extensionPath,
      userDataDir,
      serviceWorkerUrl: worker.url,
      ...setOptionsResult,
      ...panelOpenResult,
      browser,
      version: version.Browser,
      setOptionsResult: setOptionsResult.setOptionsResult,
      lastError: setOptionsResult.lastError,
      panelOpenAttempted: panelOpenResult.panelOpenAttempted,
      directModeDecision: setOptionsResult.directModeDecision
    };
    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    error.message = `${error.message}${child.exitCode !== null ? `; browserExitCode=${child.exitCode}` : ""}${childStderr ? `; browserStderr=${childStderr.slice(0, 1000)}` : ""}`;
    throw error;
  } finally {
    if (child && !child.killed) {
      child.kill();
      await Promise.race([
        new Promise((resolve) => child.once("exit", resolve)),
        delay(3000)
      ]);
    }
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (error) {
      console.error(JSON.stringify({ browser, cleanupWarning: error.message }, null, 2));
    }
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ browser, error: error.message, stack: error.stack }, null, 2));
  process.exitCode = 1;
});

