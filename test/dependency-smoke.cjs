'use strict';

// Dependency compatibility checks. All database, Telegram and HTTP I/O is mocked.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');
const http = require('node:http');
const https = require('node:https');
const root = path.resolve(__dirname, '..');

for (const transport of [http, https]) {
  transport.request = () => {
    throw new Error('Unexpected network access in dependency smoke tests');
  };
}
require('ts-node').register({
  project: path.join(root, 'tsconfig.json'),
  transpileOnly: true,
});

const bcrypt = require('bcrypt');
const ExcelJS = require('exceljs');
const axios = require('axios');
const uuid = require('uuid');
const { Errors } = require('../src/texts');
const commands = new Map();
const callbacks = [];
const bot = {
  command: (name, ...handlers) => commands.set(name, handlers),
  callbackQuery: (pattern, ...handlers) => callbacks.push({ pattern, handlers }),
};
let transactions = [];
const families = new Map();
const sessions = new Map();
const db = {
  transaction: {
    findMany: async () => transactions,
    findFirst: async () => transactions[0] || null,
  },
  family: {
    findUnique: async ({ where }) => families.get(where.familyId),
    create: async ({ data }) => {
      const family = { id: 'fixture-family-id', ...data };
      families.set(data.familyId, family);
      return family;
    },
  },
  session: {
    findUnique: async ({ where }) => sessions.get(where.key),
    upsert: async ({ where, create, update }) => {
      sessions.set(where.key, sessions.has(where.key) ? update : create);
    },
    delete: async ({ where }) => sessions.delete(where.key),
  },
};
const load = Module._load;
Module._load = function (request, parent, isMain) {
  if (parent?.filename.startsWith(path.join(root, 'src') + path.sep)) {
    if (request === '@prisma/client') {
      return { PrismaClient: class { constructor() { return db; } } };
    }
    if (/(^|\/)bot$/.test(request)) return { bot };
    if (/(^|\/)database$/.test(request)) {
      return { __esModule: true, default: db };
    }
  }
  return load.call(this, request, parent, isMain);
};
require('../src/commands/auth');
require('../src/reports/excel');
require('../src/reports/png');
const { prismaSessionStorage } = require('../src/session-storage');

function context(extra = {}) {
  const calls = { replies: [], documents: [], photos: [] };
  return {
    session: { isLoggedIn: true, familyId: 'fixture-family-id', familyName: 'Семья' },
    from: { id: 1, username: 'fixture-user' },
    calls,
    reply: async (...args) => calls.replies.push(args),
    replyWithDocument: async (...args) => calls.documents.push(args),
    replyWithPhoto: async (...args) => calls.photos.push(args),
    answerCallbackQuery: async () => {},
    editMessageText: async () => {},
    ...extra,
  };
}
async function run(handlers, ctx) {
  const dispatch = async (i) => {
    if (handlers[i]) await handlers[i](ctx, () => dispatch(i + 1));
  };
  await dispatch(0);
}
const fixture = (count) => Array.from({ length: count }, (_, i) => ({
  createdAt: new Date('2026-10-01T12:00:00Z'),
  category: 'Продукты',
  type: i % 2 ? 'income' : 'expense',
  amount: i + 0.5,
  description: 'Кириллица, описание ' + i,
  username: 'fixture-user',
}));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3WQAAAAASUVORK5CYII=', 'base64');

test('bcrypt 6 verifies the fixed hash from bcrypt 5.1.1 upstream tests', async () => {
  // https://github.com/kelektiv/node.bcrypt.js/blob/v5.1.1/test/sync.test.js
  const hash = '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM1A8W9iqaG3vv1BD7WC';
  assert.equal(await bcrypt.compare('envy1362987212538', hash), true);
  assert.equal(await bcrypt.compare('wrong-password', hash), false);
  assert.equal(bcrypt.getRounds(hash), 10);
});

test('bcrypt async hash/compare handles Unicode, empty and 72-byte passwords', async () => {
  for (const password of ['', 'Пароль🔐', 'я'.repeat(36)]) {
    const hash = await bcrypt.hash(password, 4);
    assert.equal(await bcrypt.compare(password, hash), true);
    assert.equal(await bcrypt.compare('different-password', hash), false);
  }
});

test('ExcelJS scoped UUID override retains CommonJS v4 API', () => {
  const fromExcel = Module.createRequire(require.resolve('exceljs/package.json'));
  assert.equal(fromExcel('uuid/package.json').version, '11.1.1');
  const id = fromExcel('uuid').v4();
  assert.equal(uuid.validate(id), true);
  assert.equal(uuid.version(id), 4);
});

test('registration, wrong-password rejection, login and logout with mocked database', async () => {
  const ctx = context({ match: 'fixture-family secret-fixture', session: {} });
  await run(commands.get('register'), ctx);
  const family = families.get('fixture-family');
  assert.ok(family.passwordHash.startsWith('$2b$10$'));
  assert.equal(await bcrypt.compare('secret-fixture', family.passwordHash), true);
  ctx.match = 'fixture-family wrong';
  await run(commands.get('login'), ctx);
  assert.notEqual(ctx.session.isLoggedIn, true);
  ctx.match = 'fixture-family secret-fixture';
  await run(commands.get('login'), ctx);
  assert.equal(ctx.session.isLoggedIn, true);
  assert.equal(ctx.session.familyId, family.id);
  await run(commands.get('logout'), ctx);
  assert.equal(ctx.session.isLoggedIn, false);
});

test('session storage round trip uses only the mocked database', async () => {
  const value = { isLoggedIn: true, familyId: 'fixture', familyName: 'Семья' };
  await prismaSessionStorage.write('fixture-session', value);
  assert.deepEqual(await prismaSessionStorage.read('fixture-session'), value);
  await prismaSessionStorage.delete('fixture-session');
  assert.equal(await prismaSessionStorage.read('fixture-session'), undefined);
});

for (const [period, count] of [['week', 0], ['month', 2], ['year', 2], ['all', 500]]) {
  test('real Excel report round trip: ' + period + ', ' + count + ' rows', async () => {
    transactions = fixture(count);
    const ctx = context({
      match: ['', period],
      callbackQuery: { message: { text: 'fixture-report' } },
    });
    const entry = callbacks.find(({ pattern }) => pattern.test('excel_report_' + period));
    await run(entry.handlers, ctx);
    assert.equal(ctx.calls.documents.length, 1);
    const file = ctx.calls.documents[0][0];
    assert.ok(Buffer.isBuffer(file.fileData));
    assert.ok(file.filename.endsWith('.xlsx'));
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(file.fileData);
    const sheet = book.getWorksheet('Транзакции');
    assert.equal(sheet.getCell('A1').value, 'Отчет по семье: Семья');
    if (count) {
      assert.equal(sheet.getCell('B5').value, 'Продукты');
      assert.equal(sheet.getCell('E5').value, 'Кириллица, описание 0');
      const formulas = [];
      sheet.eachRow(row => row.eachCell(cell => {
        if (cell.value?.formula) formulas.push(cell.value.formula);
      }));
      assert.ok(formulas.some(formula => formula.startsWith('SUMIF(')));
    } else {
      assert.equal(sheet.getCell('A5').value, 'Нет данных для отображения');
    }
  });
}

test('ExcelJS extended conditional formatting exercises uuid.v4 after override', async () => {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('UUID compatibility');
  sheet.getCell('A1').value = 1;
  sheet.addConditionalFormatting({
    ref: 'A1',
    rules: [{ type: 'dataBar', minLength: 0, maxLength: 100,
      gradient: true, cfvo: [{ type: 'min' }, { type: 'max' }],
      color: { argb: 'FF6384FF' } }],
  });
  const buffer = await book.xlsx.writeBuffer();
  const restored = new ExcelJS.Workbook();
  await restored.xlsx.load(buffer);
  assert.equal(restored.getWorksheet(1).getCell('A1').value, 1);
});

test('charts handler sends two PNG buffers using mocked Axios and Telegram', async () => {
  transactions = fixture(2);
  let requests = 0;
  const previous = axios.defaults.adapter;
  axios.defaults.adapter = async config => {
    const url = new URL(config.url);
    assert.equal(url.origin, 'https://quickchart.io');
    assert.equal(config.method, 'get');
    assert.equal(config.responseType, 'arraybuffer');
    assert.ok(JSON.parse(url.searchParams.get('c')).data);
    requests++;
    return { config, status: 200, statusText: 'OK', headers: {}, data: png };
  };
  try {
    const ctx = context();
    await run(commands.get('charts'), ctx);
    assert.equal(requests, 2);
    assert.equal(ctx.calls.photos.length, 2);
    assert.deepEqual(ctx.calls.photos[0][0].fileData, png);
  } finally { axios.defaults.adapter = previous; }
});

test('charts handler catches a mocked HTTP failure', async () => {
  const previous = axios.defaults.adapter;
  const previousError = console.error;
  axios.defaults.adapter = async () => { throw new Error('fixture HTTP failure'); };
  console.error = () => {};
  try {
    const ctx = context();
    await run(commands.get('charts'), ctx);
    assert.equal(ctx.calls.photos.length, 0);
    assert.equal(ctx.calls.replies[0][0], 'Ошибка генерации отчета ');
  } finally {
    axios.defaults.adapter = previous;
    console.error = previousError;
  }
});

test('charts authentication gate does not issue an HTTP request', async () => {
  const ctx = context({ session: { isLoggedIn: false } });
  await run(commands.get('charts'), ctx);
  assert.equal(ctx.calls.replies[0][0], Errors.NOT_LOGGED_IN);
  assert.equal(ctx.calls.photos.length, 0);
});

test('Axios Node HTTP adapter returns a binary response through a mock transport', async () => {
  const transport = {
    request(options, callback) {
      assert.equal(options.hostname, 'fixture.invalid');
      assert.equal(options.method, 'GET');
      const request = new EventEmitter();
      request.setTimeout = () => request;
      request.setHeader = () => {};
      request.getHeader = () => undefined;
      request.removeHeader = () => {};
      request.destroy = error => { if (error) request.emit('error', error); };
      request.end = () => queueMicrotask(() => {
        const response = Readable.from([png]);
        response.statusCode = 200;
        response.statusMessage = 'OK';
        response.headers = { 'content-type': 'image/png' };
        response.req = request;
        callback(response);
      });
      return request;
    },
  };
  const response = await axios.get('https://fixture.invalid/chart', {
    adapter: 'http', transport, proxy: false, responseType: 'arraybuffer',
  });
  assert.deepEqual(response.data, png);
});

