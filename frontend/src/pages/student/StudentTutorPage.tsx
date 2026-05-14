import { useCallback, useEffect, useRef, useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { sendTutorMessage, type TutorMessage } from '../../services/tutorService';

const WELCOME_AM =
  'ሰላም! እኔ ሰለሞን ነኝ። ስለ ፓይተን፣ ድር፣ ወይም የ AI መሰረቶች ጥያቄ ማለት ትችላለህ። በጥያቄ እንድመራህ እወዳለሁ ነገር ግን የስራ ቤት ምላሽ አልሰጥም። ዛሬ ምን እንማር?';

const STARTERS_AM = [
  'Python ላይ for loop በትንሹ እንዴት ይሰራል?',
  'HTML ላይ div እና span ልዩነት ምንድን ነው?',
  'የድር ገጽ መዋቅር (structure) ምን ይመስላል?',
];

const STARTERS_EN = [
  'How does a for loop work in Python?',
  'What is the difference between div and span in HTML?',
  'What does a simple web page structure look like?',
];

const StudentTutorPage = () => {
  const [uiLang, setUiLang] = useState<'am' | 'en'>('am');
  const [messages, setMessages] = useState<TutorMessage[]>(() => [
    { role: 'assistant', content: WELCOME_AM },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (trimmed: string) => {
      if (!trimmed || loading) return;

      const userMsg = { role: 'user' as const, content: trimmed };
      const history = [...messages, userMsg];
      setMessages(history);
      setInput('');
      setError(null);
      setLoading(true);

      try {
        const payload = await sendTutorMessage([...messages, userMsg]);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: payload.reply,
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Request failed');
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              'አሁን መልስ ማመንጨት ላይ ችግር አለ። እባክህ እንደገና ሞክር ወይም ጥያቄህን በቀላሉ አቀርብ።',
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages],
  );

  const labels =
    uiLang === 'am'
      ? {
          title: 'ሰለሞን · AI አስተማሪ',
          subtitle: 'ፕሮግራሚንግ እና ዲጂታል ክህሎቶች በአማርኛ እንዲረዱዎት',
          placeholder: 'ጥያቄዎን እዚህ ይጻፉ…',
          send: 'ላክ',
          toggle: 'English UI',
          hint: 'የይለፍ መልዕክቶች በአማርኛ ይመልሳሉ። የመስመር ላይ መልዕክት አንድ ታሪክ ብቻ ነው።',
          starters: 'በእነዚህ ይጀምሩ፦',
        }
      : {
          title: 'Solomon · AI tutor',
          subtitle: 'Programming & digital skills with Ethiopian context',
          placeholder: 'Type your question…',
          send: 'Send',
          toggle: 'አማርኛ UI',
          hint: 'Replies default to Amharic for students. UI labels can stay English.',
          starters: 'Try a starter:',
        };

  const starters = uiLang === 'am' ? STARTERS_AM : STARTERS_EN;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-stone-900">{labels.title}</h1>
          <p className="mt-1 text-sm text-stone-500">{labels.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setUiLang((l) => (l === 'am' ? 'en' : 'am'))}
          className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-50"
        >
          {labels.toggle}
        </button>
      </div>

      <Card className="!p-0 flex min-h-[420px] flex-col border-white/60 bg-white/90 shadow-card backdrop-blur">
        <div className="max-h-[min(60vh,520px)] space-y-4 overflow-y-auto p-5">
          {messages.map((m, i) => (
            <div
              key={`${i}-${m.role}`}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-stone-100 text-stone-800'
                }`}
                lang={m.role === 'assistant' ? 'am' : undefined}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-500">
                {uiLang === 'am' ? 'ሰለሞን እየጻፈ ነው…' : 'Solomon is typing…'}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-stone-100 p-4">
          <p className="mb-2 text-xs text-stone-400">{labels.hint}</p>
          <p className="mb-2 text-xs font-semibold text-stone-500">{labels.starters}</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {starters.map((q) => (
              <button
                key={q}
                type="button"
                disabled={loading}
                onClick={() => void sendMessage(q)}
                className="max-w-full rounded-full border border-stone-200 bg-stone-50/90 px-3 py-1.5 text-left text-xs font-medium text-stone-700 transition-colors hover:border-primary/30 hover:bg-primary/5 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
          {error && <p className="mb-2 text-sm text-danger">{error}</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={labels.placeholder}
              rows={2}
              className="min-h-[72px] flex-1 resize-y rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none ring-primary/30 focus:ring-2"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage(input.trim());
                }
              }}
            />
            <Button type="button" className="shrink-0 self-end sm:self-stretch" onClick={() => void sendMessage(input.trim())} disabled={loading}>
              {labels.send}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StudentTutorPage;
