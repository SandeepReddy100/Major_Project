import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Send, Sparkles, GraduationCap, Filter, Info, AlertTriangle } from 'lucide-react';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';
import { postAssistantMessage } from '../../api/analyticsApi';

const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

const SUGGESTIONS = [
  "How many students are at high risk in III/SU1?",
  "Which students have declining attendance in III/SU1?",
  "Show students below 75% attendance in III/SU1",
  "Give me a summary of III/SU1 attendance."
];

function resolveApiError(err) {
  if (!err.response) return "Unable to process your request. Please try again.";
  const { status, data } = err.response;
  if (status === 403) return data?.error || "You do not have access to this semester/batch.";
  if (status === 429) return "The assistant is receiving too many requests right now. Please try again shortly.";
  if (status >= 500) return "Unable to process your request. Please try again.";
  return data?.error || "Unable to process your request. Please try again.";
}

const MarkdownAnswer = ({ text }) => (
    <div className="assistant-markdown text-sm leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
);

const ChatBubble = ({ message }) => {
    const isUser = message.role === 'user';

    if (message.role === 'error') {
        return (
            <div className="flex items-start gap-3 max-w-3xl">
                <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={16} className="text-red-400" />
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-red-200">
                    {message.text}
                </div>
            </div>
        );
    }

    return (
        <div className={`flex items-start gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${isUser ? 'bg-blue-500/20 border-blue-500/30' : 'bg-white/10 border-white/20'}`}>
                {isUser ? <User size={16} className="text-blue-300" /> : <Bot size={16} className="text-emerald-300" />}
            </div>
            <div className={`rounded-2xl px-4 py-3 text-sm ${isUser ? 'bg-blue-500/15 border border-blue-500/30 text-white rounded-tr-sm' : 'bg-white/5 border border-white/10 text-gray-100 rounded-tl-sm'}`}>
                {isUser ? (
                    <p>{message.text}</p>
                ) : (
                    <>
                        <MarkdownAnswer text={message.text} />
                        {(message.context?.sem || message.context?.batch) && (
                            <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1">
                                <Info size={11} /> Based on {message.context.sem}/{message.context.batch} attendance analytics
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const AIAssistantPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [animate, setAnimate] = useState(false);

    const [semname, setSemname] = useState('');
    const [batches, setBatches] = useState([]);
    const [batch, setBatch] = useState('');
    const [isFetchingBatches, setIsFetchingBatches] = useState(false);

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);

    const scrollRef = useRef(null);

    useEffect(() => {
        if (!user) { navigate('/'); return; }
        const timer = setTimeout(() => setAnimate(true), 100);
        return () => clearTimeout(timer);
    }, [user, navigate]);

    useEffect(() => {
        if (!semname) { setBatches([]); setBatch(''); return; }
        setBatch('');
        setIsFetchingBatches(true);
        api.get(`/api/get-sem-info/${semname}`)
            .then((res) => setBatches(res.data?.data?.batches || []))
            .catch(() => setBatches([]))
            .finally(() => setIsFetchingBatches(false));
    }, [semname]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isSending]);

    const sendMessage = useCallback(async (text) => {
        const trimmed = text.trim();
        if (!trimmed || isSending) return;

        setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
        setInput('');
        setIsSending(true);

        try {
            const res = await postAssistantMessage({ message: trimmed, semname: semname || undefined, batch: batch || undefined });
            const { answer, context } = res.data.data;
            setMessages((prev) => [...prev, { role: 'assistant', text: answer, context }]);
        } catch (err) {
            setMessages((prev) => [...prev, { role: 'error', text: resolveApiError(err) }]);
        } finally {
            setIsSending(false);
        }
    }, [semname, batch, isSending]);

    const handleSubmit = (e) => {
        e.preventDefault();
        sendMessage(input);
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] text-white font-sans flex flex-col">
            <div className="px-4 sm:px-6 lg:px-8 relative z-10">
                <Header animate={animate} />
                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent my-4"></div>
            </div>

            <main className="flex-1 flex flex-col px-2 sm:px-6 lg:px-8 pb-6 max-w-5xl mx-auto w-full">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                        <Sparkles className="w-8 h-8 text-emerald-400" /> AI Faculty Assistant
                    </h1>
                    <p className="text-sm text-gray-400 mt-2 max-w-2xl">
                        Ask about attendance, risk, and attendance trends. Answers are generated only from your
                        authorized application data — the assistant cannot access records outside your scope,
                        run database queries, or take any action.
                    </p>
                </div>

                {/* Optional context selector — helps the assistant when a question doesn't name a batch */}
                <div className={`bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 mb-4 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="relative">
                            <label className="text-[11px] font-bold text-gray-400 uppercase mb-1 ml-1 block">Context Semester (optional)</label>
                            <div className="relative">
                                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 z-10" />
                                <select
                                    value={semname}
                                    onChange={(e) => setSemname(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-[#0F172A] border border-blue-500/30 rounded-xl text-white appearance-none outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer text-sm transition-all"
                                >
                                    <option value="">None</option>
                                    {SEMESTERS.map((sem) => <option key={sem} value={sem}>Semester {sem}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="relative">
                            <label className="text-[11px] font-bold text-gray-400 uppercase mb-1 ml-1 block">Context Batch (optional)</label>
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 z-10" />
                                <select
                                    value={batch}
                                    onChange={(e) => setBatch(e.target.value)}
                                    disabled={!semname || isFetchingBatches || batches.length === 0}
                                    className="w-full pl-10 pr-4 py-2 bg-[#0F172A] border border-blue-500/30 rounded-xl text-white appearance-none outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <option value="">None</option>
                                    {batches.map((b) => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-2 ml-1">
                        You can also just name a semester/batch directly in your question, e.g. "III/SU1" — it will override this.
                    </p>
                </div>

                {/* Chat log */}
                <div
                    ref={scrollRef}
                    role="log"
                    aria-live="polite"
                    aria-label="Assistant conversation"
                    className="flex-1 min-h-[40vh] max-h-[55vh] overflow-y-auto custom-scrollbar bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 space-y-4 mb-4"
                >
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-10">
                            <Bot size={40} className="mb-3 opacity-50" />
                            <p className="mb-4">Ask a question about attendance, risk, or trends.</p>
                            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                                {SUGGESTIONS.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => sendMessage(s)}
                                        className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((m, i) => <ChatBubble key={i} message={m} />)
                    )}

                    {isSending && (
                        <div className="flex items-center gap-3 max-w-3xl">
                            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                                <Bot size={16} className="text-emerald-300" />
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-300 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                Analyzing attendance data…
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <label htmlFor="assistant-input" className="sr-only">Ask about attendance, students, or trends</label>
                    <input
                        id="assistant-input"
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about attendance, students, or trends…"
                        disabled={isSending}
                        maxLength={500}
                        className="flex-1 px-4 py-3 bg-[#0F172A] border border-blue-500/30 rounded-xl text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={isSending || !input.trim()}
                        aria-label="Send message"
                        className="px-5 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold hover:bg-emerald-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Send size={16} />
                        <span className="hidden sm:inline">Send</span>
                    </button>
                </form>
            </main>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(255, 255, 255, 0.2); }
                .assistant-markdown p { margin-bottom: 0.5rem; }
                .assistant-markdown p:last-child { margin-bottom: 0; }
                .assistant-markdown strong { color: #fff; font-weight: 700; }
                .assistant-markdown ul, .assistant-markdown ol { padding-left: 1.25rem; margin-bottom: 0.5rem; }
                .assistant-markdown li { margin-bottom: 0.25rem; }
                .assistant-markdown table { width: 100%; border-collapse: collapse; margin-bottom: 0.5rem; font-size: 0.8rem; }
                .assistant-markdown th, .assistant-markdown td { padding: 4px 8px; border: 1px solid rgba(255,255,255,0.12); text-align: left; }
                .assistant-markdown th { background: rgba(255,255,255,0.06); color: #d1d5db; }
                .assistant-markdown code { background: rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 4px; font-size: 0.8em; }
            `}</style>
        </div>
    );
};

export default AIAssistantPage;
