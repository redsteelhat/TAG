import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import net from 'node:net';
import { join } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';

const DEFAULT_BASE_URL = 'http://localhost:3000';
const DEFAULT_REPORT_PATH = join('tmp', 'responsive-report.json');
const CHROME_PORT = Number(process.env.RESPONSIVE_TEST_PORT ?? 9333);

const routes = [
  '/',
  '/income',
  '/landing',
  '/expenses',
  '/fuel',
  '/packages',
  '/fixed-costs',
  '/maintenance',
  '/reports',
  '/exports',
  '/reminders',
  '/onboarding',
  '/depreciation',
  '/vehicles',
  '/login',
  '/register',
  '/admin'
];

const viewports = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'laptop', width: 1280, height: 800, mobile: false },
  { name: 'tablet', width: 768, height: 1024, mobile: true },
  { name: 'mobile', width: 390, height: 844, mobile: true },
  { name: 'narrow-mobile', width: 360, height: 740, mobile: true }
];

async function main() {
  const baseUrl = process.env.RESPONSIVE_BASE_URL ?? DEFAULT_BASE_URL;
  const reportPath = process.env.RESPONSIVE_REPORT_PATH ?? DEFAULT_REPORT_PATH;
  const chromePath = resolveChromePath();
  const userDataDir = join(
    process.cwd(),
    'tmp',
    `responsive-chrome-${Date.now()}`
  );

  await mkdir('tmp', { recursive: true });

  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${CHROME_PORT}`,
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-crash-reporter',
    '--no-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  chrome.stderr.setEncoding('utf8');

  try {
    await waitForChrome();
    const tabInfo = await createTab('about:blank');
    const cdp = await CdpClient.connect(tabInfo.webSocketDebuggerUrl);

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    const results = [];

    for (const viewport of viewports) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        deviceScaleFactor: viewport.mobile ? 2 : 1,
        height: viewport.height,
        mobile: viewport.mobile,
        width: viewport.width
      });

      for (const route of routes) {
        const url = new URL(route, baseUrl).toString();

        await cdp.send('Page.navigate', { url });
        await waitForReadyState(cdp);
        await wait(250);

        const audit = await evaluateResponsiveAudit(cdp);
        results.push({
          route,
          url,
          viewport: viewport.name,
          width: viewport.width,
          height: viewport.height,
          ...audit
        });
      }
    }

    const failures = results.filter(
      (result) =>
        result.horizontalOverflow ||
        result.offscreenElements.length > 0 ||
        result.clippedText.length > 0
    );

    const report = {
      baseUrl,
      checkedAt: new Date().toISOString(),
      failures,
      results,
      summary: {
        failed: failures.length,
        passed: results.length - failures.length,
        routes: routes.length,
        total: results.length,
        viewports: viewports.length
      }
    };

    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

    printSummary(report, reportPath);

    if (failures.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    chrome.kill();
    await wait(500);

    try {
      await rm(userDataDir, { force: true, recursive: true });
    } catch {
      // Windows can keep Crashpad files locked briefly after headless Chrome exits.
    }
  }
}

function resolveChromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge'
  ].filter(Boolean);

  const chromePath = candidates.find((candidate) => existsSync(candidate));

  if (!chromePath) {
    throw new Error(
      'Chrome veya Edge bulunamadi. CHROME_PATH env degiskeni ile tarayici yolunu belirt.'
    );
  }

  return chromePath;
}

async function waitForChrome() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 10000) {
    try {
      const response = await fetch(
        `http://127.0.0.1:${CHROME_PORT}/json/version`
      );

      if (response.ok) {
        return;
      }
    } catch {
      await wait(150);
    }
  }

  throw new Error('Headless Chrome baslatilamadi.');
}

async function createTab(url) {
  const response = await fetch(
    `http://127.0.0.1:${CHROME_PORT}/json/new?${encodeURIComponent(url)}`,
    { method: 'PUT' }
  );

  if (!response.ok) {
    throw new Error(`Chrome tab acilamadi: ${response.status}`);
  }

  return response.json();
}

async function waitForReadyState(cdp) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 10000) {
    const result = await cdp.send('Runtime.evaluate', {
      expression: 'document.readyState',
      returnByValue: true
    });

    if (result.result?.value === 'complete') {
      return;
    }

    await wait(100);
  }

  throw new Error('Sayfa yuklenmesi zaman asimina ugradi.');
}

async function evaluateResponsiveAudit(cdp) {
  const result = await cdp.send('Runtime.evaluate', {
    expression: `(${auditPage.toString()})()`,
    returnByValue: true
  });

  if (result.exceptionDetails) {
    throw new Error('Responsive audit JS calistirilamadi.');
  }

  return result.result.value;
}

function auditPage() {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const documentWidth = Math.max(
    document.documentElement.scrollWidth,
    document.body?.scrollWidth ?? 0
  );
  const allowedOverflowSelector = [
    '.data-table',
    '.fuel-trend-chart',
    '.trip-table',
    '.sidebar',
    'pre',
    'code'
  ].join(',');

  const visibleElements = Array.from(
    document.body.querySelectorAll('*')
  ).filter((element) => {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity) !== 0 &&
      rect.width > 1 &&
      rect.height > 1
    );
  });

  const offscreenElements = visibleElements
    .filter((element) => !element.closest(allowedOverflowSelector))
    .map((element) => {
      const rect = element.getBoundingClientRect();

      return {
        selector: selectorFor(element),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
        width: Math.round(rect.width)
      };
    })
    .filter(
      (item) =>
        item.left < -1 ||
        item.right > viewportWidth + 1 ||
        item.width > viewportWidth + 1
    )
    .slice(0, 12);

  const clippedText = visibleElements
    .filter((element) =>
      [
        'A',
        'BUTTON',
        'H1',
        'H2',
        'P',
        'SPAN',
        'STRONG',
        'SMALL',
        'LABEL'
      ].includes(element.tagName)
    )
    .filter((element) => !element.closest(allowedOverflowSelector))
    .filter((element) => {
      const style = window.getComputedStyle(element);
      const overflowVisible =
        style.overflowX === 'visible' && style.overflowY === 'visible';

      if (style.textOverflow === 'ellipsis') {
        return false;
      }

      if (overflowVisible && !['A', 'BUTTON'].includes(element.tagName)) {
        return false;
      }

      return (
        element.scrollWidth > element.clientWidth + 2 ||
        element.scrollHeight > element.clientHeight + 2
      );
    })
    .map((element) => ({
      selector: selectorFor(element),
      text: (element.textContent ?? '')
        .trim()
        .replace(/\\s+/g, ' ')
        .slice(0, 90)
    }))
    .filter((item) => item.text.length > 0)
    .slice(0, 12);

  return {
    bodyTextLength: document.body.innerText.trim().length,
    documentWidth,
    horizontalOverflow: documentWidth > viewportWidth + 1,
    offscreenElements,
    clippedText,
    title: document.title,
    viewportHeight,
    viewportWidth
  };

  function selectorFor(element) {
    const id = element.id ? `#${element.id}` : '';
    const className =
      typeof element.className === 'string' && element.className.trim()
        ? `.${element.className.trim().split(/\\s+/).slice(0, 3).join('.')}`
        : '';

    return `${element.tagName.toLowerCase()}${id}${className}`;
  }
}

function printSummary(report, reportPath) {
  console.log(
    `Responsive test: ${report.summary.passed}/${report.summary.total} passed`
  );
  console.log(`Report: ${reportPath}`);

  if (report.failures.length === 0) {
    return;
  }

  console.log('Failures:');

  for (const failure of report.failures.slice(0, 20)) {
    const reasons = [];

    if (failure.horizontalOverflow) {
      reasons.push(`horizontal overflow ${failure.documentWidth}px`);
    }

    if (failure.offscreenElements.length > 0) {
      reasons.push(`${failure.offscreenElements.length} offscreen elements`);
    }

    if (failure.clippedText.length > 0) {
      reasons.push(`${failure.clippedText.length} clipped text nodes`);
    }

    console.log(
      `- ${failure.viewport} ${failure.width}x${failure.height} ${failure.route}: ${reasons.join(', ')}`
    );
  }
}

class CdpClient {
  constructor(ws) {
    this.nextId = 1;
    this.pending = new Map();
    this.ws = ws;
    this.ws.onMessage = (message) => this.handleMessage(message);
    this.ws.onClose = () =>
      this.rejectPending(new Error('Chrome DevTools baglantisi kapandi.'));
  }

  static async connect(url) {
    return new CdpClient(await RawWebSocket.connect(url));
  }

  send(method, params = {}) {
    const id = this.nextId++;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!this.pending.has(id)) {
          return;
        }

        this.pending.delete(id);
        reject(new Error(`CDP komutu zaman asimina ugradi: ${method}`));
      }, 5000);

      this.pending.set(id, { reject, resolve, timeout });
      this.ws.sendText(JSON.stringify({ id, method, params }));
    });
  }

  handleMessage(data) {
    const message = JSON.parse(data);

    if (!message.id || !this.pending.has(message.id)) {
      return;
    }

    const pending = this.pending.get(message.id);
    this.pending.delete(message.id);
    clearTimeout(pending.timeout);

    if (message.error) {
      pending.reject(new Error(message.error.message));
      return;
    }

    pending.resolve(message.result);
  }

  rejectPending(error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }

    this.pending.clear();
  }
}

class RawWebSocket {
  constructor(socket) {
    this.buffer = Buffer.alloc(0);
    this.onMessage = null;
    this.socket = socket;
    this.socket.on('data', (chunk) => this.handleData(chunk));
    this.socket.on('close', () => {
      this.onClose?.();
    });
    this.socket.on('error', () => {
      // Chrome can reset the DevTools socket while the process is being closed.
    });
  }

  static connect(urlValue) {
    const url = new URL(urlValue);
    const port = Number(url.port || 80);
    const host = url.hostname;
    const path = `${url.pathname}${url.search}`;
    const key = randomBytes(16).toString('base64');

    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host, port });
      let handshakeBuffer = Buffer.alloc(0);

      socket.once('error', reject);
      socket.once('connect', () => {
        socket.write(
          [
            `GET ${path} HTTP/1.1`,
            `Host: ${host}:${port}`,
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Key: ${key}`,
            'Sec-WebSocket-Version: 13',
            '',
            ''
          ].join('\r\n')
        );
      });

      const onHandshakeData = (chunk) => {
        handshakeBuffer = Buffer.concat([handshakeBuffer, chunk]);
        const headerEnd = handshakeBuffer.indexOf('\r\n\r\n');

        if (headerEnd === -1) {
          return;
        }

        const header = handshakeBuffer.slice(0, headerEnd).toString('utf8');

        if (!header.includes(' 101 ')) {
          reject(
            new Error('Chrome DevTools WebSocket el sikismasi basarisiz.')
          );
          socket.destroy();
          return;
        }

        socket.off('data', onHandshakeData);
        socket.off('error', reject);

        const ws = new RawWebSocket(socket);
        const remaining = handshakeBuffer.slice(headerEnd + 4);

        if (remaining.length > 0) {
          ws.handleData(remaining);
        }

        resolve(ws);
      };

      socket.on('data', onHandshakeData);
    });
  }

  sendText(text) {
    const payload = Buffer.from(text, 'utf8');
    const mask = randomBytes(4);
    const header = [];

    header.push(0x81);

    if (payload.length < 126) {
      header.push(0x80 | payload.length);
    } else if (payload.length < 65536) {
      header.push(
        0x80 | 126,
        (payload.length >> 8) & 0xff,
        payload.length & 0xff
      );
    } else {
      const lengthBuffer = Buffer.alloc(8);
      lengthBuffer.writeBigUInt64BE(BigInt(payload.length));
      header.push(0x80 | 127, ...lengthBuffer);
    }

    const maskedPayload = Buffer.alloc(payload.length);

    for (let index = 0; index < payload.length; index += 1) {
      maskedPayload[index] = payload[index] ^ mask[index % 4];
    }

    this.socket.write(
      Buffer.concat([Buffer.from(header), mask, maskedPayload])
    );
  }

  handleData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length >= 2) {
      const firstByte = this.buffer[0];
      const secondByte = this.buffer[1];
      const opcode = firstByte & 0x0f;
      let offset = 2;
      let length = secondByte & 0x7f;

      if (length === 126) {
        if (this.buffer.length < offset + 2) {
          return;
        }

        length = this.buffer.readUInt16BE(offset);
        offset += 2;
      } else if (length === 127) {
        if (this.buffer.length < offset + 8) {
          return;
        }

        length = Number(this.buffer.readBigUInt64BE(offset));
        offset += 8;
      }

      const masked = Boolean(secondByte & 0x80);
      const maskOffset = masked ? 4 : 0;
      const frameEnd = offset + maskOffset + length;

      if (this.buffer.length < frameEnd) {
        return;
      }

      let payload = this.buffer.slice(offset + maskOffset, frameEnd);

      if (masked) {
        const mask = this.buffer.slice(offset, offset + 4);
        payload = Buffer.from(
          payload.map((byte, index) => byte ^ mask[index % 4])
        );
      }

      this.buffer = this.buffer.slice(frameEnd);

      if (opcode === 0x1 && this.onMessage) {
        this.onMessage(payload.toString('utf8'));
      }

      if (opcode === 0x8) {
        this.socket.end();
        return;
      }
    }
  }
}

await main();
