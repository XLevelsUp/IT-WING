import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  User,
  Sparkles,
  Trash2,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export const TVKAIBotPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { error: notifyError } = useNotification();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const PREDEFINED_QUESTIONS = [
    'Which ward has the highest number of issues?',
    'What is the total number of members?',
    'How many grievances are pending?',
    'What is the category-wise issue analysis?',
    'Show the executive summary',
    'Which department has the most pending issues?',
  ];

  const fetchHistory = async () => {
    try {
      const res = await api.get('/chatbot/history');
      if (res.data.success && res.data.data.length > 0) {
        setMessages(res.data.data);
      } else {
        // Welcome message with live analysis intro
        setMessages([
          {
            sender: 'bot',
            text: `Vanakkam ${user?.name || 'Officer'}! I am **TVK AI BOT**, your live district intelligence assistant for Coimbatore.\n\nI have direct authorized access to real-time CRM database records across all 10 constituencies and municipal wards. Please select one of the 6 official inquiries below for live database analysis.`,
            suggestedActions: PREDEFINED_QUESTIONS,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const query = String(textToSend || '').trim();
    if (!query || loading) return;

    const userMsg = {
      sender: 'user',
      text: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.post('/chatbot/message', {
        message: query,
      });

      if (res.data.success) {
        const botMsg = {
          sender: 'bot',
          text: res.data.data.reply,
          suggestedActions: res.data.data.suggestedActions || [],
          timestamp: new Date(res.data.data.timestamp),
        };
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch (err) {
      notifyError('Failed to communicate with TVK AI BOT');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear your conversation history with TVK AI BOT?')) return;
    try {
      await api.delete('/chatbot/history');
      fetchHistory();
    } catch (err) {}
  };

  return (
    <div className="h-[calc(100vh-125px)] flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Bot Chat Header Matching Theme */}
      <div className="p-4 sm:px-6 bg-gradient-to-r from-[#850000] via-[#A00000] to-[#850000] text-white flex items-center justify-between border-b-2 border-[#FFD32A]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FFD32A] text-[#850000] flex items-center justify-center font-extrabold shadow-sm border border-amber-300">
            <Bot className="w-6 h-6 text-[#850000]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-extrabold tracking-tight">TVK AI BOT</h2>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <p className="text-[11px] text-[#FFD32A] font-semibold">
              {t('tvkBot.subtitle', 'Live Coimbatore CRM Database Grounded Assistant')}
            </p>
          </div>
        </div>

        <button
          onClick={handleClearHistory}
          title={t('tvkBot.clearHistory', 'Clear Chat History')}
          className="p-2 rounded-xl text-red-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
        {messages.map((msg, index) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={index}
              className={`flex items-start gap-3 max-w-3xl ${
                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-xs ${
                  isUser
                    ? 'bg-slate-800 text-white'
                    : 'bg-gradient-to-tr from-red-800 to-red-600 text-amber-300'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs whitespace-pre-wrap ${
                  isUser
                    ? 'bg-red-700 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                }`}
              >
                {msg.text}

                {/* Suggested Action Pills if available */}
                {!isUser && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                    {msg.suggestedActions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(action)}
                        className="text-[11px] font-semibold bg-red-50 hover:bg-red-100 text-red-800 px-2.5 py-1 rounded-lg border border-red-200 transition text-left"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}

                <span
                  className={`block text-[10px] mt-1.5 ${
                    isUser ? 'text-red-200 text-right' : 'text-slate-400'
                  }`}
                >
                  {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3 max-w-3xl mr-auto">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-800 to-red-600 text-amber-300 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 rounded-tl-none shadow-xs text-xs flex items-center space-x-2 text-slate-500">
              <RefreshCw className="w-4 h-4 animate-spin text-red-700" />
              <span>{t('tvkBot.thinking', 'Analyzing live Coimbatore database metrics...')}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 6 Predefined Interactive Clickable Questions for Live Database Analysis */}
      <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            {t('tvkBot.selectInquiry', 'Select an Inquiry for Live Database Analysis:')}
          </span>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            {t('tvkBot.clickHint', 'Click any question to query real-time CRM records')}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PREDEFINED_QUESTIONS.map((question, idx) => (
            <button
              key={idx}
              type="button"
              disabled={loading}
              onClick={() => handleSendMessage(question)}
              className="w-full p-2.5 sm:p-3 rounded-2xl bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 text-left transition duration-150 cursor-pointer shadow-2xs group flex items-start justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-xs font-bold text-slate-800 group-hover:text-red-900 leading-snug">
                {question}
              </span>
              <ChevronRight className="w-4 h-4 text-amber-600 group-hover:text-red-700 group-hover:translate-x-0.5 transition-transform shrink-0 mt-0.5" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TVKAIBotPage;
