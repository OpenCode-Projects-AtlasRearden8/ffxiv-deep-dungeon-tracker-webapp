"use strict";

/* Test harness for the Deep Dungeon Tracker.
 * - Extracts the pure-logic script block from index.html and runs unit tests
 *   against it (floor logic + best-run math).
 * - Extracts every <script> block, syntax-checks it, then runs the page's
 *   initialization code inside a minimal DOM stub to smoke-test it.
 * Run with: node tests/test.js
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert").strict;

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    failed++;
    failures.push({ name, err });
  }
}

/* ---------- load index.html and its scripts ---------- */

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

const scripts = [];
{
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) scripts.push(m[1]);
}
assert(scripts.length === 2, "index.html should contain exactly 2 script blocks (found " + scripts.length + ")");
const hasMarkers =
  /PURE-LOGIC-START/.test(scripts[0]) && /PURE-LOGIC-END/.test(scripts[0]) &&
  !/PURE-LOGIC-START/.test(scripts[1]);
assert(hasMarkers, "pure-logic markers must live only in the first script block");

/* ---------- DOM/storage stubs for the smoke test ---------- */

function stubEl(tag) {
  const el = {
    tagName: (tag || "div").toUpperCase(),
    value: "",
    checked: false,
    disabled: false,
    innerHTML: "",
    textContent: "",
    attrs: {},
    addEventListener() {},
    removeEventListener() {},
    getAttribute(name) { return el.attrs[name] === undefined ? null : el.attrs[name]; },
    setAttribute(name, v) { el.attrs[name] = String(v); },
    removeAttribute(name) { delete el.attrs[name]; },
    hasAttribute(name) { return Object.prototype.hasOwnProperty.call(el.attrs, name); },
    closest() { return el; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    dataset: {},
    style: {},
    appendChild() { return null; },
    removeChild() { return null; },
    replaceChildren() {},
    focus() {},
    blur() {},
    click() {},
    toggleAttribute() {}
  };
  return el;
}

function makeContext() {
  const memo = Object.create(null);
  const listeners = { click: [], change: [], input: [] };
  const doc = {
    getElementById(id) {
      if (!memo[id]) memo[id] = stubEl("div");
      return memo[id];
    },
    createElement(tag) { return stubEl(tag); },
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    body: stubEl("body"),
    documentElement: stubEl("html")
  };
  const store = Object.create(null);
  const ctx = {
    console,
    document: doc,
    localStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem(k, v) { store[k] = String(v); },
      removeItem(k) { delete store[k]; }
    },
    Date,
    JSON,
    Math,
    Object,
    Array,
    Number,
    String,
    RegExp,
    Error,
    parseInt,
    parseFloat,
    isNaN,
    module: { exports: {} }
  };
  ctx.window = {
    confirm: undefined,
    addEventListener() {},
    dispatchEvent() {},
    getComputedStyle() { return stubEl("computed"); }
  };
  ctx.globalThis = ctx;
  ctx.fire = function (type, event) {
    (listeners[type] || []).forEach(function (fn) { fn(event); });
  };
  ctx.__memo = memo;
  return ctx;
}

/* ---------- execute page scripts inside the stub ---------- */

const sandbox = makeContext();
vm.createContext(sandbox);
scripts.forEach(function (code) {
  new vm.Script(code, { filename: "index.html (inline script)" }).runInContext(sandbox);
});
assert(Object.keys(sandbox.module.exports).length > 0, "pure-logic module.exports should be populated");
fireClickAndChangeSmoke(sandbox);

function fireClickAndChangeSmoke(ctx) {
  function clickOn(attrs, props) {
    const el = stubEl("button");
    Object.keys(attrs).forEach(function (k) { el.attrs[k] = attrs[k]; });
    (props || {}).value !== undefined && (el.value = props.value);
    ctx.fire("click", { target: el, preventDefault() {} });
  }
  clickOn({ "data-tab": "bests" });
  clickOn({ "data-tab": "reference" });
  clickOn({ "data-ref": "hoh" });
  clickOn({ "data-ref": "eo" });
  clickOn({ "data-tab": "checklists" });
  clickOn({ "data-check": "hoh" });
  clickOn({ "data-check": "eo" });
  ctx.__memo["new-dungeon"].attrs = {}; ctx.__memo["new-dungeon"].value = "hoh";
  ctx.__memo["new-start"].value = "21";
  clickOn({ id: "btn-start-run" });
  const po = {};
  po.value = "test";
  clickOn({ "data-action": "check-add", "data-check": "eo" }, po);
  clickOn({ "data-action": "check-delete", "data-idx": "0", "data-check": "eo" });
  clickOn({ "data-action": "reset-checklist", "data-check": "eo" });
  clickOn({ "data-action": "start-run" });
  const ghost = stubEl("button");
  ghost.attrs["data-action"] = "log-floor";
  ghost.attrs["data-run"] = "missing";
  ctx.fire("click", { target: ghost, preventDefault() {} });
  const note = stubEl("input");
  note.attrs["data-action"] = "note";
  note.attrs["data-run"] = "missing";
  note.attrs["data-floor"] = "2";
  note.value = "some note";
  ctx.fire("input", { target: note });
  const tgl = stubEl("input");
  tgl.attrs["data-action"] = "check-toggle";
  tgl.attrs["data-check"] = "potd";
  tgl.attrs["data-idx"] = "0";
  tgl.checked = true;
  ctx.fire("change", { target: tgl });
  ctx.fire("change", { target: { id: "new-dungeon" } });
}

/* ---------- unit tests on the pure logic ---------- */

const L = sandbox.module.exports;

test("DUNGEONS: three dungeons with sane config", function () {
  assert.deepEqual(Object.keys(L.DUNGEONS).sort(), ["eo", "hoh", "potd"]);
  for (const id of Object.keys(L.DUNGEONS)) {
    const d = L.DUNGEONS[id];
    assert(d.maxFloor >= 100, id + " maxFloor");
    assert(d.maxFloor % d.floorsPerSet === 0, id + " maxFloor divisible by floorset size");
    assert(d.startFloors.includes(1), id + " start floors include 1");
    assert(Array.isArray(d.pomanders) && d.pomanders.length >= 14, id + " pomanders present");
    for (const p of d.pomanders) {
      assert(typeof p.name === "string" && p.name.length > 0, id + " pomander name");
      assert(typeof p.effect === "string" && p.effect.length > 5, id + " pomander effect: " + p.name);
    }
    assert(Array.isArray(d.floorEffects) && d.floorEffects.length >= 10, id + " floorEffects present");
    assert(Array.isArray(d.traps) && d.traps.length >= 3, id + " traps present");
  }
});

test("Floor logic: milestoneFloors matches deep-dungeon checkpoint floors", function () {
  assert.equal(JSON.stringify(L.milestoneFloors("potd")), JSON.stringify([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200]));
  assert.equal(JSON.stringify(L.milestoneFloors("hoh")), JSON.stringify([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]));
  assert.equal(JSON.stringify(L.milestoneFloors("eo")), JSON.stringify([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]));
});

test("Floor logic: floorSetOf and isSetEnd", function () {
  assert.equal(L.floorSetOf(1), 1);
  assert.equal(L.floorSetOf(10), 1);
  assert.equal(L.floorSetOf(11), 2);
  assert.equal(L.floorSetOf(51), 6);
  assert.equal(L.floorSetOf(100), 10);
  assert.equal(L.floorSetOf(200), 20);
  assert.ok(L.isSetEnd(40) && L.isSetEnd(200));
  assert.ok(!L.isSetEnd(39) && !L.isSetEnd(51));
});

test("Floor logic: createRun validates dungeon and start floor", function () {
  assert.throws(function () { L.createRun("nope", 1); }, /Unknown dungeon/);
  assert.throws(function () { L.createRun("hoh", 11); }, /Invalid start floor/);
  assert.throws(function () { L.createRun("potd", 2); }, /Invalid start floor/);
  L.createRun("potd", 1);
  L.createRun("potd", 51);
  L.createRun("potd", 101);
  L.createRun("hoh", 1);
  L.createRun("hoh", 21);
  L.createRun("eo", 1);
  L.createRun("eo", 21);
});

test("Floor logic: nextFloorToLog walks one floor up from entry", function () {
  const r = L.createRun("potd", 1, { now: "2026-01-01T00:00:00.000Z", id: "r1" });
  assert.equal(L.nextFloorToLog(r), 2);
  r.floors[2] = { at: "2026-01-01T00:01:00.000Z", deaths: 0, note: "" };
  assert.equal(L.nextFloorToLog(r), 3);
  r.floors[3] = { at: "2026-01-01T00:02:00.000Z", deaths: 0, note: "" };
  r.endedAt = "2026-01-01T00:03:00.000Z";
  assert.equal(L.nextFloorToLog(r), null);
});

test("Floor logic: nextFloorToLog stops at maxFloor", function () {
  const r = L.createRun("hoh", 1, { now: "2026-01-01T00:00:00.000Z", id: "r2" });
  for (let f = 2; f <= L.DUNGEONS.hoh.maxFloor; f++) {
    r.floors[f] = { at: r.startedAt, deaths: 0, note: "" };
  }
  assert.equal(L.nextFloorToLog(r), null);
});

test("Floor logic: logFloor is pure (copy semantics) and stamps time", function () {
  const r = L.createRun("potd", 51, { now: "2026-01-01T00:00:00.000Z", id: "r3" });
  const r2 = L.logFloor(r, { at: "2026-01-01T00:10:00.000Z" });
  assert.equal(Object.keys(r.floors).length, 0, "original untouched");
  assert.ok(r2.floors[52], "logged floor 52");
  assert.equal(L.elapsedMs(r.startedAt, r2.floors[52].at), 600000);
  assert.throws(function () { L.logFloor(r2, { floor: 51 }); }, /out of range/);
  assert.throws(function () { L.logFloor(r2, { floor: 501 }); }, /out of range/);
  const r3 = L.logFloor(r2, { floor: 53 });
  assert.ok(r3.floors[53]);
  const r4 = L.logFloor(r2, {});
  assert.ok(r4.floors[53], "default logging uses the next unlogged floor");
  r2.endedAt = r2.startedAt;
  assert.throws(function () { L.logFloor(r2, {}); }, /already ended/);
});

test("Floor logic: logDeath increments KOs on a copied run", function () {
  let r = L.createRun("eo", 21, { now: "2026-01-01T00:00:00.000Z", id: "r4" });
  r = L.logFloor(r, { at: r.startedAt });
  r = L.logDeath(r, 22);
  r = L.logDeath(r, 22);
  assert.equal(r.floors[22].deaths, 2);
  assert.equal(r.floors[22].deaths, 2);
  assert.equal(L.floorsAscending(r)[0], 22);
  assert.deepEqual(L.floorsAscending(r), [22]);
  assert.throws(function () { L.logDeath(r, 23); }, /No log entry/);
});

test("Floor logic: runStats sums depth, KOs, duration", function () {
  let r = L.createRun("hoh", 1, { now: "2026-01-01T00:00:00.000Z", id: "r5" });
  r = L.logFloor(r, { floor: 2, at: "2026-01-01T00:02:00.000Z" });
  r = L.logFloor(r, { floor: 3, at: "2026-01-01T00:05:00.000Z" });
  r = L.logDeath(r, 3);
  const s = L.runStats(r);
  assert.equal(s.deepestFloor, 3);
  assert.equal(s.kos, 1);
  assert.equal(s.durationMs, 300000);
  assert.equal(s.floorCount, 2);
});

test("Best-run math: fastest-to-checkpoint picks the truly fastest run", function () {
  const start = "2026-01-01T00:00:00.000Z";
  // fast-but-shallow runner: 15 min to floor 10, dies there
  const a = L.createRun("potd", 1, { now: start, id: "fast-shallow" });
  a.floors[10] = { at: new Date(new Date(start).getTime() + 15 * 60000).toISOString(), deaths: 1, note: "wiped" };
  // slow-but-deep runner: 20 min to floor 10, then 30 to floor 20
  const b = L.createRun("potd", 1, { now: start, id: "slow-deep" });
  b.floors[10] = { at: new Date(new Date(start).getTime() + 20 * 60000).toISOString(), deaths: 0, note: "" };
  b.floors[20] = { at: new Date(new Date(start).getTime() + 30 * 60000).toISOString(), deaths: 0, note: "" };
  const bests = L.computeBests([a, b]);
  const at10 = bests.potd.milestones.find(function (m) { return m.floor === 10; });
  const at20 = bests.potd.milestones.find(function (m) { return m.floor === 20; });
  assert.equal(at10.best.ms, 15 * 60000);
  assert.equal(at10.best.runId, "fast-shallow");
  assert.equal(at20.best.ms, 30 * 60000);
  assert.equal(at20.best.runId, "slow-deep");
  assert.equal(bests.potd.deepest.floor, 20);
  assert.equal(bests.potd.deepest.runId, "slow-deep");
});

test("Best-run math: entry floor of a mid-floorset run is not a milestone", function () {
  const start = "2026-01-01T00:00:00.000Z";
  const r = L.createRun("potd", 51, { now: start, id: "mid" });
  r.floors[52] = { at: new Date(new Date(start).getTime() + 60000).toISOString(), deaths: 0, note: "" };
  const bests = L.computeBests([r]);
  assert.equal(bests.potd.deepest.floor, 52);          // depth still counts
  const m52 = bests.potd.milestones.find(function (m) { return m.floor === 50; });
  assert.equal(m52.best, null);                        // floor 50 never reached
  bests.potd.milestones.filter(function (m) { return m.best; }).forEach(function (m) {
    assert.notEqual(m.floor, 51);                      // entry floor is not a record
  });
});

test("Best-run math: equal times keep the first recorded (stable), later runs do not regress", function () {
  const start = "2026-01-01T00:00:00.000Z";
  const r1 = L.createRun("hoh", 1, { now: start, id: "first" });
  r1.floors[10] = { at: new Date(new Date(start).getTime() + 600000).toISOString(), deaths: 0, note: "" };
  const r2 = L.createRun("hoh", 1, { now: start, id: "second" });
  r2.floors[10] = { at: new Date(new Date(start).getTime() + 600000).toISOString(), deaths: 0, note: "" };
  const bests = L.computeBests([r1, r2]);
  assert.equal(bests.hoh.milestones[0].best.runId, "first");
});

test("Best-run math: ties across dungeons do not cross-pollinate", function () {
  let r = L.createRun("eo", 1, { now: "2026-01-01T00:00:00.000Z", id: "eo-only" });
  r = L.logFloor(r, { floor: 10, at: r.startedAt });
  const bests = L.computeBests([r]);
  assert.equal(bests.eo.milestones[0].best.ms, 0);
  assert.equal(bests.eo.milestones[0].best.runId, "eo-only");
  assert.equal(bests.hoh.milestones[0].best, null);
  assert.equal(bests.potd.milestones[0].best, null);
});

test("Best-run math: empty input produces empty slate, not a crash", function () {
  const bests = L.computeBests([]);
  Object.keys(bests).forEach(function (id) {
    assert.equal(bests[id].deepest, null);
    bests[id].milestones.forEach(function (m) { assert.equal(m.best, null); });
  });
});

test("formatDuration renders sane human times", function () {
  assert.equal(L.formatDuration(0), "0s");
  assert.equal(L.formatDuration(-5), "0s");
  assert.equal(L.formatDuration(65000), "1m 5s");
  assert.equal(L.formatDuration(3600000), "1h");
  assert.equal(L.formatDuration(3810000), "1h 3m 30s");
  assert.equal(L.formatDuration(7323999), "2h 2m 3s");
});

test("escapeHtml neutralizes markup and quotes", function () {
  assert.equal(L.escapeHtml('<img src=x onerror="alert(1)">'), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  assert.equal(L.escapeHtml("Died to it ' quoting &  <script>"), "Died to it &#39; quoting &amp;  &lt;script&gt;");
});

test("UI: actual Start Run button creates, renders and persists each dungeon", function () {
  for (const dungeon of ["potd", "hoh", "eo"]) {
    const ctx = makeContext();
    vm.createContext(ctx);
    scripts.forEach(code => new vm.Script(code).runInContext(ctx));
    ctx.__memo["new-dungeon"].value = dungeon;
    ctx.__memo["new-start"].value = "1";
    const tag = html.match(/<button\b[^>]*id="btn-start-run"[^>]*>/)[0];
    const button = stubEl("button");
    for (const match of tag.matchAll(/([\w-]+)="([^"]*)"/g)) button.attrs[match[1]] = match[2];
    button.closest = function (selector) {
      if (selector === ".tab-btn") return null;
      const attr = /^\[([^\]]+)\]$/.exec(selector);
      return attr && this.hasAttribute(attr[1]) ? this : null;
    };
    ctx.fire("click", {target: button});
    const runs = JSON.parse(ctx.localStorage.getItem("dd_runs_v1") || "[]");
    assert.equal(runs.length, 1, dungeon + ": actual button must create a run");
    assert.equal(runs[0].dungeon, dungeon);
    assert.equal(runs[0].startFloor, 1);
    assert(!ctx.__memo["active-runs"].innerHTML.includes("No runs in progress"));
    assert(ctx.__memo["active-runs"].innerHTML.includes(runs[0].id));
  }
});

/* ---------- report ---------- */

console.log("");
console.log("Deep Dungeon Tracker test suite");
console.log("  scripts extracted: " + scripts.length + " (smoke-tested in a DOM stub)");
console.log("  results: " + passed + " passed, " + failed + " failed");
if (failed) {
  failures.forEach(function (f) {
    console.log("  FAIL: " + f.name);
    console.log("        " + (f.err && f.err.message ? f.err.message : f.err));
  });
  process.exit(1);
}
console.log("  all tests passed");
