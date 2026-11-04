import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import {
  TUTOR_MODES,
  apiErrorMessage,
  deleteConversation,
  fetchConversationMessages,
  fetchConversations,
  sendMessageFeedback,
  sendTutorMessage,
  type ConversationSummary,
  type LessonHint,
  type TutorMode,
} from '../../services/tutorService';

type ChatMessage = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  aiGenerated?: boolean;
  rating?: 'up' | 'down';
  lessons?: LessonHint[];
};

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

const MODE_LABELS: Record<TutorMode, { am: string; en: string }> = {
  beginner: { am: 'ጀማሪ', en: 'Beginner' },
  intermediate: { am: 'መካከለኛ', en: 'Intermediate' },
  advanced: { am: 'ከፍተኛ', en: 'Advanced' },
  exam_prep: { am: 'ፈተና ዝግጅት', en: 'Exam preparation' },
  practice: { am: 'ልምምድ', en: 'Practice' },
  programming_mentor: { am: 'የፕሮግራሚንግ መካሪ', en: 'Programming mentor' },
};

const welcomeMessage = (): ChatMessage => ({ role: 'assistant', content: WELCOME_AM });

const StudentTutorPage = () => {
  const [uiLang, setUiLang] = useState<'am' | 'en'>('am');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcomeMessage()]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [mode, setMode] = useState<TutorMode>('beginner');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [showChats, setShowChats] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshConversations = useCallback(async () => {
    try {
      setConversations(await fetchConversations());
    } catch {
      /* the chat itself still works without the history list */
    }
  }, []);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (trimmed: string) => {
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = { role: 'user', content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setError(null);
      setLoading(true);

      try {
        const payload = await sendTutorMessage([{ role: 'user', content: trimmed }], {
          conversationId,
          mode,
        });
        setConversationId(payload.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            id: payload.messageId,
            role: 'assistant',
            content: payload.reply,
            aiGenerated: payload.aiGenerated,
            lessons: payload.lessonHints,
          },
        ]);
        void refreshConversations();
      } catch (err) {
        setError(apiErrorMessage(err));
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
    [conversationId, loading, mode, refreshConversations],
  );

  const startNewChat = () => {
    setConversationId(null);
    setMessages([welcomeMessage()]);
    setError(null);
    setShowChats(false);
  };

  const openConversation = async (id: string) => {
    try {
      const { conversation, messages: stored } = await fetchConversationMessages(id);
      setConversationId(id);
      setMode(conversation.mode);
      setMessages([
        welcomeMessage(),
        ...stored.map((m) => ({
          id: m._id,
          role: m.role,
          content: m.content,
          aiGenerated: m.aiGenerated,
          rating: m.feedback?.rating,
          lessons: m.meta?.lessonHints,
        })),
      ]);
      setError(null);
      setShowChats(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const removeConversation = async (id: string) => {
    try {
      await deleteConversation(id);
      if (id === conversationId) startNewChat();
      void refreshConversations();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const rate = async (message: ChatMessage, rating: 'up' | 'down') => {
    if (!message.id) return;
    try {
      await sendMessageFeedback(message.id, rating, rating === 'down' ? 'inaccurate' : undefined);
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, rating } : m)));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const labels =
    uiLang === 'am'
      ? {
          title: 'ሰለሞን · AI አስተማሪ',
          subtitle: 'ፕሮግራሚንግ እና ዲጂታል ክህሎቶች በአማርኛ እንዲረዱዎት',
          placeholder: 'ጥያቄዎን እዚህ ይጻፉ…',
          send: 'ላክ',
          toggle: 'English UI',
          hint: 'መልሶች በአማርኛ ይሰጣሉ። ውይይቶችህ ይቀመጣሉ፤ ማንኛውንም ሰርዝ።',
          starters: 'በእነዚህ ይጀምሩ፦',
          mode: 'የትምህርት ሁነታ',
          chats: 'ውይይቶች',
          newChat: '+ አዲስ ውይይት',
          noChats: 'ገና ውይይት የለም።',
          remove: 'ሰርዝ',
          aiNote: 'በ AI የተፈጠረ · ስህተት ሊኖረው ይችላል — ጠቃሚ መረጃ ደግመው ያረጋግጡ።',
          helpful: 'ጠቃሚ',
          wrong: 'ስህተት ነው',
          thanks: 'አመሰግናለሁ',
          typing: 'ሰለሞን እየጻፈ ነው…',
          related: 'ተዛማጅ ትምህርቶች፦',
        }
      : {
          title: 'Solomon · AI tutor',
          subtitle: 'Programming & digital skills with Ethiopian context',
          placeholder: 'Type your question…',
          send: 'Send',
          toggle: 'አማርኛ UI',
          hint: 'Replies default to Amharic. Your chats are saved and you can delete any of them.',
          starters: 'Try a starter:',
          mode: 'Learning mode',
          chats: 'Chats',
          newChat: '+ New chat',
          noChats: 'No saved chats yet.',
          remove: 'Delete',
          aiNote: 'AI-generated · may contain mistakes — double-check important facts.',
          helpful: 'Helpful',
          wrong: 'Wrong / report',
          thanks: 'Thanks for the feedback',
          typing: 'Solomon is typing…',
          related: 'Related lessons:',
        };

  const starters = uiLang === 'am' ? STARTERS_AM : STARTERS_EN;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-stone-900">{labels.title}</h1>
          <p className="mt-1 text-sm text-stone-500">{labels.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowChats((s) => !s)}
            aria-expanded={showChats}
            className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-50"
          >
            {labels.chats} ({conversations.length})
          </button>
          <button
            type="button"
            onClick={() => setUiLang((l) => (l === 'am' ? 'en' : 'am'))}
            className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-50"
          >
            {labels.toggle}
          </button>
        </div>
      </div>

      {showChats && (
        <Card className="space-y-2 border-stone-100 bg-white/90">
          <Button type="button" size="sm" onClick={startNewChat}>
            {labels.newChat}
          </Button>
          {conversations.length === 0 ? (
            <p className="text-sm text-stone-500">{labels.noChats}</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {conversations.map((c) => (
                <li key={c._id} className="flex items-center justify-between gap-3 py-2">
                  <button
                    type="button"
                    onClick={() => void openConversation(c._id)}
                    className={`min-w-0 flex-1 truncate text-left text-sm ${
                      c._id === conversationId ? 'font-semibold text-primary' : 'text-stone-700'
                    }`}
                  >
                    {c.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeConversation(c._id)}
                    className="shrink-0 text-xs font-semibold text-stone-400 hover:text-danger"
                  >
                    {labels.remove}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card className="!p-0 flex min-h-[420px] flex-col border-white/60 bg-white/90 shadow-card backdrop-blur">
        <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3">
          <label htmlFor="tutor-mode" className="text-xs font-semibold text-stone-500">
            {labels.mode}
          </label>
          <select
            id="tutor-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as TutorMode)}
            disabled={loading}
            className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-sm text-stone-800"
          >
            {TUTOR_MODES.map((m) => (
              <option key={m} value={m}>
                {MODE_LABELS[m][uiLang]}
              </option>
            ))}
          </select>
        </div>

        <div className="max-h-[min(60vh,520px)] space-y-4 overflow-y-auto p-5" aria-live="polite">
          {messages.map((m, i) => (
            <div
              key={m.id ?? `${i}-${m.role}`}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-[85%]">
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === 'user' ? 'bg-primary text-white' : 'bg-stone-100 text-stone-800'
                  }`}
                  lang={m.role === 'assistant' ? 'am' : undefined}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
                {m.role === 'assistant' && m.lessons?.some((l) => l.courseId) && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 px-1 text-xs">
                    <span className="text-stone-400">{labels.related}</span>
                    {m.lessons
                      .filter((l) => l.courseId)
                      .map((l) => (
                        <Link
                          key={l.lessonId}
                          to={`/courses/${l.courseId}/lessons/${l.lessonId}`}
                          className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary hover:bg-primary/20"
                        >
                          {l.title}
                        </Link>
                      ))}
                  </div>
                )}
                {m.role === 'assistant' && m.id && m.aiGenerated && (
                  <div className="mt-1 flex items-center gap-3 px-1 text-xs text-stone-400">
                    {m.rating ? (
                      <span>{labels.thanks}</span>
                    ) : (
                      <>
                        <button type="button" onClick={() => void rate(m, 'up')} className="hover:text-primary">
                          👍 {labels.helpful}
                        </button>
                        <button type="button" onClick={() => void rate(m, 'down')} className="hover:text-danger">
                          👎 {labels.wrong}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-500">{labels.typing}</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-stone-100 p-4">
          <p className="mb-1 text-xs text-stone-400">{labels.hint}</p>
          <p className="mb-2 text-xs text-stone-400">{labels.aiNote}</p>
          {messages.length <= 1 && (
            <>
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
            </>
          )}
          {error && <p className="mb-2 text-sm text-danger">{error}</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={labels.placeholder}
              rows={2}
              maxLength={2000}
              className="min-h-[72px] flex-1 resize-y rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none ring-primary/30 focus:ring-2"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage(input.trim());
                }
              }}
            />
            <Button
              type="button"
              className="shrink-0 self-end sm:self-stretch"
              onClick={() => void sendMessage(input.trim())}
              disabled={loading}
            >
              {labels.send}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StudentTutorPage;
