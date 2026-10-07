import playwright from 'playwright';
const { chromium } = playwright;
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

// Bounded foreground check owns and closes both the static server and browser.
const output = resolve('evidence');
await mkdir(resolve('test/scratch'), { recursive: true });
await mkdir(resolve(output, 'screenshots'), { recursive: true });
const server = createServer(async (req, res) => {
  try {
    let path = new URL(req.url!, 'http://localhost').pathname;
    if (path.startsWith('/research/')) path = path.slice('/research'.length);
    if (path === '/') path = '/index.html';
    const file = resolve('dist', '.' + path);
    if (!file.startsWith(resolve('dist') + '/')) { res.writeHead(403).end(); return; }
    const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' };
    res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + (server.address() as { port: number }).port;
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const results: { check: string; result: 'PASS' | 'FAIL'; detail?: unknown }[] = [];
const errors: string[] = []; const failures: string[] = []; const consoleErrors: string[] = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => errors.push(e.message));
page.on('requestfailed', r => { if (!r.failure()?.errorText.includes('ABORTED')) failures.push(r.url()); });
const record = (check: string, detail?: unknown) => { results.push({ check, result: 'PASS', detail }); console.log('PASS', check); };
try {
  for (const mount of ['/', '/research/']) {
    for (const hash of ['#/overview', '#/board', '#/project/demo%3Agrove', '#/history/demo%3Agrove']) {
      await page.goto(base + mount + hash);
      await page.waitForSelector('input, .project-status-bar');
      await page.reload();
      await page.waitForSelector('input, .project-status-bar');
      assert.equal(await page.locator('main h1').count(), 1);
      assert.ok(!(await page.locator('body').innerText()).includes('資料驗證未通過'));
    }
    record('reload-safe routes at ' + mount);
  }
  await page.goto(base + '/#/overview'); await page.waitForSelector('.project-card');
  assert.equal(await page.locator('.project-card').count(), 5);
  await page.getByLabel('搜尋已載入專案').fill('GRV');
  assert.equal(await page.locator('.project-card').count(), 2);
  await page.getByLabel('鏈 / 網路', { exact: true }).selectOption('Solana');
  assert.equal(await page.locator('.project-card').count(), 1);
  assert.ok((await page.locator('.project-card').innerText()).includes('Grove Studio'));
  await page.getByLabel('搜尋已載入專案').fill('does-not-exist');
  assert.ok(await page.getByRole('heading', { name: '沒有符合條件的專案' }).isVisible());
  await page.getByRole('button', { name: '清除篩選' }).click();
  assert.equal(await page.locator('.project-card').count(), 5);
  await page.getByLabel('資產類型', { exact: true }).selectOption('NFT');
  assert.equal(await page.locator('.project-card').count(), 2);
  await page.getByLabel('資產類型', { exact: true }).selectOption('ALL');
  await page.getByLabel('搜尋已載入專案').fill('fixture:grove-eth');
  assert.equal(await page.locator('.project-card').count(), 1);
  await page.getByLabel('搜尋已載入專案').fill('');
  record('search, address, chain, type, ticker collision, empty and clear');
  const pointer = await page.locator('[data-project-id="demo:grove"] [data-current-ref]').getAttribute('data-current-ref');
  await page.getByRole('link', { name: '研究看板', exact: true }).click();
  assert.equal(await page.locator('[data-project-id="demo:grove"] [data-current-ref]').getAttribute('data-current-ref'), pointer);
  await page.getByRole('button', { name: '切換閱讀模式' }).click();
  assert.ok(await page.locator('.board-grid.reading').isVisible());
  await page.getByRole('button', { name: '切換看板模式' }).click();
  await page.goto(base + '/#/project/demo%3Agrove'); await page.waitForSelector('.four-questions');
  assert.equal(await page.locator('.project-status-bar [data-current-ref]').getAttribute('data-current-ref'), pointer);
  assert.equal(await page.locator('.claim-card').count(), 4);
  await page.getByText('查看版本身分與內容雜湊', { exact: true }).click();
  assert.ok(await page.getByText('manifestHash', { exact: true }).isVisible());
  record('shared published pointer across overview, board and project; board reading mode; evidence details');
  await page.getByRole('link', { name: '查看修訂歷史', exact: true }).click();
  assert.ok((await page.locator('#comparison').innerText()).includes('1 項主張有變更'));
  await page.getByLabel('比較起點', { exact: true }).selectOption('2');
  await page.getByLabel('比較終點', { exact: true }).selectOption('3');
  assert.ok((await page.locator('#comparison').innerText()).includes('No material change'));
  record('history compares stable claims and supports No material change');
  await page.goto(base + '/#/project/demo%3Acinder'); await page.waitForSelector('.project-status-bar');
  assert.equal(await page.locator('[data-current-ref]').getAttribute('data-current-ref'), 'NONE');
  await page.reload(); await page.waitForSelector('.project-status-bar');
  assert.equal(await page.locator('[data-current-ref]').getAttribute('data-current-ref'), 'NONE');
  await page.goto(base + '/#/history/demo%3Acinder'); await page.waitForSelector('.withdrawal-record');
  assert.ok((await page.locator('.withdrawal-record').innerText()).includes('實體作品权利'.replace('权', '權')));
  record('withdrawal survives browser reload with preserved record');
  await page.goto(base + '/#/overview'); await page.waitForSelector('.project-card');
  await page.getByRole('switch', { name: '啟用示範資料' }).click();
  await page.getByRole('heading', { name: '資料尚未連線' }).waitFor();
  assert.equal(await page.locator('.project-card').count(), 0);
  await page.reload(); await page.getByRole('heading', { name: '資料尚未連線' }).waitFor();
  assert.equal(await page.locator('.project-card').count(), 0);
  const loadedDemo = await page.evaluate(() => performance.getEntriesByType('resource').some(r => r.name.includes('/fixtures-')));
  assert.equal(loadedDemo, false);
  await page.getByRole('button', { name: '探索示範資料' }).click(); await page.waitForSelector('.project-card');
  record('demo-off isolation across reload; no fixture chunk requested');
  assert.ok(await page.getByRole('button', { name: '建立新研究 · NOT_CONNECTED' }).isDisabled());
  const world = await page.locator('.footer-world').getAttribute('href');
  assert.equal(world, 'https://imdember.com/');
  await page.goto(base + '/?returnUrl=https://example.org/evil#/about');
  assert.equal(await page.locator('main a[href="https://imdember.com/"]').count(), 1);
  assert.equal(await page.locator('a[href*="example.org/evil"]').count(), 0);
  record('AI is disabled; fixed world return ignores visitor query');
  await page.goto(base + '/#/overview'); await page.waitForSelector('.project-card');
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').innerText(), '跳至主要內容');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator(':focus').getAttribute('id'), 'main');
  await page.locator('#project-search').focus();
  await page.keyboard.type('GRV'); assert.equal(await page.locator('.project-card').count(), 2);
  await page.keyboard.press('Tab'); assert.equal(await page.locator(':focus').getAttribute('id'), 'asset-filter');
  await page.getByLabel('搜尋已載入專案').fill('');
  await page.getByRole('link', { name: '研究看板', exact: true }).focus();
  const focus = await page.locator(':focus').evaluate(el => ({ width: getComputedStyle(el).outlineWidth, style: getComputedStyle(el).outlineStyle, color: getComputedStyle(el).outlineColor }));
  assert.equal(focus.width, '3px'); assert.equal(focus.style, 'solid');
  await page.screenshot({ path: resolve(output, 'screenshots/keyboard-focus.png'), fullPage: false });
  await page.keyboard.press('Enter');
  assert.equal(await page.locator(':focus').evaluate(el => el.tagName), 'H1');
  record('keyboard skip, search, Tab sequence, navigation and route focus', focus);
  for (const width of [390, 1440, 1920, 320, 896]) {
    await page.setViewportSize({ width, height: width === 390 || width === 320 ? 844 : 1100 });
    for (const hash of ['#/overview', '#/board', '#/project/demo%3Agrove', '#/history/demo%3Agrove']) {
      await page.goto(base + '/research/' + hash); await page.waitForSelector('input, .project-status-bar');
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      assert.ok(dimensions.scroll <= dimensions.client, `${width} ${hash}: ${JSON.stringify(dimensions)}`);
      if ([390, 1440, 1920].includes(width) && hash === '#/overview') await page.screenshot({ path: resolve(output, `screenshots/overview-${width}.png`), fullPage: true });
      if (width === 1440 && hash === '#/project/demo%3Agrove') await page.screenshot({ path: resolve(output, 'screenshots/project-1440.png'), fullPage: true });
    }
    record('responsive route checks with no horizontal overflow: ' + width + ' CSS px');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/#/board'); await page.waitForSelector('.board-grid');
  const cols = await page.locator('.board-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns);
  assert.ok(!cols.includes(' '));
  record('mobile board stacks in one column', cols);
  const transitions = await page.locator('.project-card').first().evaluate(el => getComputedStyle(el).transitionDuration);
  assert.equal(transitions, '0s'); record('reduced motion removes transitions');
  // Compute actual rendered pairs for principal typography and focus tokens, no estimates.
  const contrast = await page.evaluate(String.raw`(() => {
    const luminance = (rgb) => { const c = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return c[0] * .2126 + c[1] * .7152 + c[2] * .0722; };
    const selectors = ['h1', '.page-description', '.notice p', '.notice strong', '.badge.teal', '.card-description', '.card-action', '.pointer', '.environment-label'];
    return selectors.map(selector => {
      const el = document.querySelector(selector); let bg = el;
      while (bg && getComputedStyle(bg).backgroundColor === 'rgba(0, 0, 0, 0)') bg = bg.parentElement;
      const foreground = getComputedStyle(el).color; const background = getComputedStyle(bg ?? document.documentElement).backgroundColor;
      const a = luminance(foreground), b = luminance(background); return { selector, foreground, background, ratio: Number(((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toFixed(2)) };
    });
  })()`);
  assert.ok(contrast.every((c: { ratio: number }) => c.ratio >= 4.5), JSON.stringify(contrast)); record('principal rendered text contrast >= 4.5:1', contrast);
  assert.deepEqual(consoleErrors, []); record('no production-route console errors');
  let apiStatus = 200;
  let apiBody = JSON.stringify({ schemaVersion: '1.0', namespace: 'RESEARCH_DATA', projects: [], nextCursor: null, coverage: { description: 'Local mock only', total: 0, asOf: null } });
  let apiDelay = 0;
  let timeoutMs = 500;
  let apiBase: string | null = base + '/api';
  await page.route('**/config.json', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ schemaVersion: '1.0', mode: 'http', apiBase, timeoutMs }) }));
  await page.route('**/api/v1/catalog?*', async r => {
    if (apiDelay) await new Promise(resolve => setTimeout(resolve, apiDelay));
    try { await r.fulfill({ status: apiStatus, contentType: 'application/json', body: apiBody }); } catch { /* intentionally aborted timeout fixture */ }
  });
  apiDelay = 700; timeoutMs = 1500;
  await page.goto(base + '/research/#/overview');
  await page.getByRole('heading', { name: '正在讀取研究目錄' }).waitFor();
  await page.getByRole('heading', { name: '目前沒有收錄的專案' }).waitFor();
  record('visible loading and empty HTTP states');
  apiDelay = 0;
  for (const state of [
    { status: 404, title: '找不到資料端點 · 404' },
    { status: 429, title: '請求受到限制 · 429' },
    { status: 200, title: '資料驗證未通過' },
  ]) {
    apiStatus = state.status; apiBody = '{invalid';
    await page.reload(); await page.getByRole('heading', { name: state.title, exact: true }).waitFor();
    assert.equal(await page.locator('.project-card').count(), 0);
    record('visible HTTP error: ' + state.title);
  }
  apiBase = null;
  await page.reload(); await page.getByRole('heading', { name: '缺少資料設定' }).waitFor();
  record('visible missing config state');
  apiBase = base + '/api'; apiDelay = 250; timeoutMs = 80;
  await page.reload(); await page.getByRole('heading', { name: '讀取逾時' }).waitFor();
  record('visible HTTP timeout state');
  apiDelay = 0; timeoutMs = 500;
  const safePage = JSON.parse(await readFile('fixtures/catalog.demo.json', 'utf8'));
  safePage.namespace = 'RESEARCH_DATA'; safePage.projects = [safePage.projects[3]];
  safePage.projects[0].project.name = '<img src=x onerror=globalThis.pwned=true> text';
  safePage.coverage = { description: 'Isolated local safety check', total: 1, asOf: null };
  apiBody = JSON.stringify(safePage);
  await page.reload(); await page.waitForSelector('.project-card');
  assert.ok((await page.locator('.card-name').innerText()).includes('<img src=x'));
  assert.equal(await page.locator('.project-card img, .project-card script').count(), 0);
  assert.equal(await page.evaluate('globalThis.pwned'), undefined);
  record('untrusted research rendered as literal text, without elements or execution');
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  record('no page errors or failed requests', { errors, failures });
} catch (e) {
  results.push({ check: 'browser suite', result: 'FAIL', detail: String(e) }); console.error(e); process.exitCode = 1;
  await page.screenshot({ path: resolve('test/scratch/browser-failure.png'), fullPage: true });
} finally {
  await writeFile(resolve(output, 'browser-results.json'), JSON.stringify({ browser: await browser.version(), preview: base + '/research/', publicPreview: null, results, errors, failures, consoleErrors, consoleNote: '404 and 429 logs after the production checks are deliberately injected mock errors.' }, null, 2) + '\n');
  await browser.close(); server.closeAllConnections(); await new Promise<void>(r => server.close(() => r()));
}
