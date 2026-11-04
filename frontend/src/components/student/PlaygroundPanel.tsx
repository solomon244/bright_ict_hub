import { useEffect, useRef, useState } from 'react';
import Button from '../common/Button';
import CodeEditor from './CodeEditor';
import { buildPreviewDoc } from '../../utils/sandboxRunner';

const STORAGE_KEY = 'eth-playground-v1';

const DEFAULTS = {
  html: '<h1 id="title">ሰላም ዓለም!</h1>\n<button id="btn">Click me</button>',
  css: 'body { font-family: sans-serif; padding: 1rem; }\nh1 { color: #0f766e; }',
  js: "document.getElementById('btn').addEventListener('click', () => {\n  document.getElementById('title').textContent = 'Hello, Ethiopia!';\n  console.log('Button clicked');\n});",
};

type Tab = 'html' | 'css' | 'js';
type LogLine = { level: string; text: string };

const load = (): typeof DEFAULTS => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<typeof DEFAULTS>;
      return { html: parsed.html ?? DEFAULTS.html, css: parsed.css ?? DEFAULTS.css, js: parsed.js ?? DEFAULTS.js };
    }
  } catch {
    /* storage unavailable: use defaults */
  }
  return DEFAULTS;
};

/** Free HTML/CSS/JS playground. Preview runs in a sandboxed iframe with no access to this app. */
const PlaygroundPanel = () => {
  const [code, setCode] = useState(load);
  const [tab, setTab] = useState<Tab>('html');
  const [doc, setDoc] = useState('');
  const [logs, setLogs] = useState<LogLine[]>([]);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      const d = e.data as { type?: string; level?: unknown; text?: unknown };
      if (d?.type === 'console') {
        setLogs((prev) => [...prev.slice(-99), { level: String(d.level).slice(0, 10), text: String(d.text).slice(0, 500) }]);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const run = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(code));
    } catch {
      /* ignore */
    }
    setLogs([]);
    setDoc(buildPreviewDoc(code.html, code.css, code.js));
  };

  const reset = () => {
    setCode(DEFAULTS);
    setDoc('');
    setLogs([]);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'html', label: 'HTML' },
    { id: 'css', label: 'CSS' },
    { id: 'js', label: 'JavaScript' },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <div role="tablist" className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                tab === t.id ? 'bg-primary text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <CodeEditor label={`${tab} code`} value={code[tab]} onChange={(v) => setCode((c) => ({ ...c, [tab]: v }))} rows={14} />
        <div className="flex gap-2">
          <Button type="button" onClick={run}>▶ Run</Button>
          <Button type="button" variant="secondary" onClick={reset}>Reset</Button>
        </div>
        <p className="text-xs text-stone-500">
          Your code runs only in a locked-down box in your browser. It is saved on this device, not on our servers.
        </p>
      </div>

      <div className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          {doc ? (
            <iframe
              ref={frameRef}
              title="Playground preview"
              sandbox="allow-scripts allow-modals"
              srcDoc={doc}
              className="h-64 w-full"
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-stone-400">Press Run to see your page</div>
          )}
        </div>
        <div className="max-h-40 overflow-y-auto rounded-xl bg-stone-950 p-3 font-mono text-xs text-stone-200" aria-live="polite">
          {logs.length === 0 ? (
            <span className="text-stone-500">Console output appears here</span>
          ) : (
            logs.map((l, i) => (
              <div key={i} className={l.level === 'error' ? 'text-red-400' : l.level === 'warn' ? 'text-amber-300' : ''}>
                {l.text}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaygroundPanel;
