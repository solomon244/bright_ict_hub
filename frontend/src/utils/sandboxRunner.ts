/**
 * Runs student code ONLY inside the student's own browser, in a sandboxed iframe:
 *  - `sandbox="allow-scripts"` without `allow-same-origin` gives the frame a unique opaque origin, so
 *    student code cannot read this app's localStorage/cookies/DOM or call our API as the user;
 *  - inside the frame the tests run in a Web Worker that is terminated after a timeout, so an
 *    accidental infinite loop cannot freeze the page.
 * The server never executes student code.
 */

export interface ChallengeTest {
  args: unknown[];
  expected: unknown;
}
export interface TestResult {
  passed: boolean;
  actual?: string;
  error?: string;
}
export interface TestReport {
  compileError?: string;
  timeout?: boolean;
  results: TestResult[];
}

const FUNCTION_NAME = /^[A-Za-z_$][A-Za-z0-9_$]{0,39}$/;

// Plain-JS source (kept as a string so it can be used both in the worker and as an inline fallback).
const RUN_TESTS_SRC = String.raw`
function runTests(d) {
  function safe(v) { try { var s = JSON.stringify(v); return s === undefined ? String(v) : s.slice(0, 200); } catch (e) { return String(v).slice(0, 200); } }
  var fn;
  try {
    fn = (new Function(d.code + '\n;return typeof ' + d.fn + ' === "function" ? ' + d.fn + ' : undefined;'))();
  } catch (err) { return { compileError: String((err && err.message) || err), results: [] }; }
  if (typeof fn !== 'function') {
    return { compileError: 'Function "' + d.fn + '" was not found. Keep the function name from the starter code.', results: [] };
  }
  var results = [];
  for (var i = 0; i < d.tests.length; i++) {
    var t = d.tests[i];
    try {
      var actual = fn.apply(null, JSON.parse(JSON.stringify(t.args)));
      var a = actual === undefined ? 'null' : JSON.stringify(actual);
      results.push({ passed: a === JSON.stringify(t.expected), actual: safe(actual) });
    } catch (err) { results.push({ passed: false, error: String((err && err.message) || err) }); }
  }
  return { results: results };
}
`;

const WORKER_SRC = `${RUN_TESTS_SRC}\nself.onmessage=function(e){self.postMessage(runTests(e.data));};`;

const HARNESS_LOGIC = String.raw`
function reply(id, payload) { payload.type = 'result'; payload.id = id; parent.postMessage(payload, '*'); }
addEventListener('message', function (e) {
  var d = e.data;
  if (!d || d.type !== 'run') return;
  var worker = null, url = null, finished = false, timer = null;
  function finish(p) {
    if (finished) return; finished = true; clearTimeout(timer);
    if (worker) worker.terminate();
    if (url) URL.revokeObjectURL(url);
    reply(d.id, p);
  }
  timer = setTimeout(function () { finish({ timeout: true, results: [] }); }, d.timeoutMs);
  try {
    url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
    worker = new Worker(url);
    worker.onmessage = function (m) { finish(m.data); };
    // If the browser refuses the worker, fall back to running inside this sandboxed frame.
    worker.onerror = function () { finish(runTests(d)); };
    worker.postMessage({ code: d.code, fn: d.fn, tests: d.tests });
  } catch (err) {
    finish(runTests(d));
  }
});
parent.postMessage({ type: 'ready' }, '*');
`;

const HARNESS_HTML =
  '<!doctype html><html><body><script>' +
  RUN_TESTS_SRC +
  '\nvar WORKER_SRC=' +
  JSON.stringify(WORKER_SRC).replace(/</g, '\\u003c') +
  ';' +
  HARNESS_LOGIC +
  '<\/script></body></html>';

const clean = (r: unknown): TestResult[] =>
  Array.isArray(r)
    ? r.slice(0, 50).map((x) => ({
        passed: Boolean((x as TestResult)?.passed),
        actual: typeof (x as TestResult)?.actual === 'string' ? (x as TestResult).actual!.slice(0, 200) : undefined,
        error: typeof (x as TestResult)?.error === 'string' ? (x as TestResult).error!.slice(0, 200) : undefined,
      }))
    : [];

export function runChallengeInSandbox(opts: {
  code: string;
  functionName: string;
  tests: ChallengeTest[];
  timeoutMs?: number;
}): Promise<TestReport> {
  const { code, functionName, tests, timeoutMs = 3000 } = opts;
  if (!FUNCTION_NAME.test(functionName)) {
    return Promise.resolve({ compileError: 'Invalid function name', results: [] });
  }

  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.title = 'Code sandbox';
    iframe.style.display = 'none';
    iframe.srcdoc = HARNESS_HTML;

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let done = false;
    let overall: number | undefined;

    const finish = (report: TestReport) => {
      if (done) return;
      done = true;
      window.removeEventListener('message', onMessage);
      window.clearTimeout(overall);
      iframe.remove();
      resolve(report);
    };

    function onMessage(e: MessageEvent) {
      if (e.source !== iframe.contentWindow) return; // ignore everything not from our sandbox
      const d = e.data as { type?: string; id?: string; compileError?: unknown; timeout?: unknown; results?: unknown };
      if (!d) return;
      if (d.type === 'ready') {
        iframe.contentWindow?.postMessage({ type: 'run', id, code, fn: functionName, tests, timeoutMs }, '*');
      } else if (d.type === 'result' && d.id === id) {
        finish({
          compileError: typeof d.compileError === 'string' ? d.compileError.slice(0, 300) : undefined,
          timeout: d.timeout === true,
          results: clean(d.results),
        });
      }
    }

    window.addEventListener('message', onMessage);
    overall = window.setTimeout(() => finish({ timeout: true, results: [] }), timeoutMs + 3000);
    document.body.appendChild(iframe);
  });
}

/** Builds the srcdoc for the free playground preview (HTML + CSS + JS, with console capture). */
export function buildPreviewDoc(html: string, css: string, js: string): string {
  const bridge =
    '<script>(function(){function s(l,a){try{parent.postMessage({type:"console",level:l,text:Array.prototype.map.call(a,function(x){try{return typeof x==="object"?JSON.stringify(x):String(x)}catch(e){return String(x)}}).join(" ")},"*")}catch(e){}}' +
    '["log","info","warn","error"].forEach(function(l){var o=console[l];console[l]=function(){s(l,arguments);o.apply(console,arguments)}});' +
    'window.addEventListener("error",function(e){s("error",[e.message])})})();<\/script>';
  return (
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
    css.replace(/<\/style/gi, '<\\/style') +
    '</style></head><body>' +
    html +
    bridge +
    '<script>' +
    js.replace(/<\/script/gi, '<\\/script') +
    '<\/script></body></html>'
  );
}
