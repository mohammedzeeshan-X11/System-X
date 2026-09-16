import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  User,
  Send,
  Loader2,
  Sparkles,
  Trash2,
  Copy,
  Check,
  Award,
  HelpCircle,
  FileCheck2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { OfficialProfile } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  source?: string;
}

interface AssessmentChatbotProps {
  documentTitle: string;
  documentText: string;
  pdfBase64: string | null;
  profile: OfficialProfile;
  numPages?: number;
  initialPrompt?: string;
  onSwitchToQuiz?: () => void;
}

export const AssessmentChatbot: React.FC<AssessmentChatbotProps> = ({
  documentTitle,
  documentText,
  pdfBase64,
  profile,
  numPages = 1,
  initialPrompt,
  onSwitchToQuiz,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-msg',
      role: 'assistant',
      content: `Welcome, ${profile.name} (${profile.designation || 'Statistical Officer'}). I am your National Statistical Systems Training Academy (NSSTA) Technical Assessor.\n\nI have loaded **"${documentTitle}"** into the session context. You can ask me to conduct an interactive oral assessment on this document, break down complex estimation formulas or sampling designs, or identify mandatory data quality gates and audit checks.\n\nSelect a recommended examination prompt below or type your inquiry to begin.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'NSSTA Examiner',
    },
  ]);

  const [inputMessage, setInputMessage] = useState(initialPrompt || '');
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialPrompt) {
      setInputMessage(initialPrompt);
    }
  }, [initialPrompt]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Suggested quick prompts
  const suggestedPrompts = [
    'Quiz me interactively on this document',
    'Explain the core statistical methodology and formulas',
    'What are the mandatory data quality gates and compliance checks?',
    'Audit potential non-sampling errors and scrutiny points',
    'How does this document relate to my assignment competencies?',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || inputMessage).trim();
    if (!messageContent || isSending) return;

    setErrorNotice(null);
    setInputMessage('');

    const userMessageId = `user-${Date.now()}`;
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: messageContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);

    try {
      const response = await fetch('/api/assessment/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          conversationHistory: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          documentName: documentTitle,
          documentText: documentText || '',
          pdfBase64: pdfBase64 || null,
          profile: {
            name: profile.name,
            designation: profile.designation,
            serviceCadre: profile.serviceCadre,
            assignmentTitle: profile.assignmentTitle,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const replyContent = data.reply || 'No response returned from technical examiner.';

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: data.source || 'NSSTA Technical Examiner',
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Chat assessment error:', err);
      setErrorNotice(err.message || 'Failed to communicate with Assessment Chatbot. Please retry.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyText = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        content: `Session refreshed for **"${documentTitle}"**. What statutory methodology or oral quiz question would you like to review?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'NSSTA Examiner',
      },
    ]);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xs shadow-xs overflow-hidden flex flex-col h-[700px]">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xs bg-black text-white flex items-center justify-center shrink-0 shadow-xs">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-serif text-sm font-bold text-slate-900">
                NSSTA Technical Assessor &amp; Document AI Chatbot
              </h3>
              <span className="px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-sans flex items-center gap-1.5 mt-0.5">
              <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate max-w-md font-medium text-slate-900">
                {documentTitle}
              </span>
              {pdfBase64 && (
                <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-xs text-[9px] font-mono">
                  PDF Attached
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {onSwitchToQuiz && (
            <button
              type="button"
              onClick={onSwitchToQuiz}
              className="px-3 py-1.5 bg-black hover:bg-slate-800 text-white rounded-xs text-[11px] font-mono font-medium flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
              title="Launch full statutory MCQ assessment quiz"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-white" />
              <span>Take MCQ Assessment</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleClearChat}
            className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-xs border border-slate-200 transition-colors cursor-pointer"
            title="Reset Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-xs flex items-center justify-center shrink-0 text-xs shadow-xs ${
                  isUser
                    ? 'bg-slate-800 text-white'
                    : 'bg-black text-white'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Card */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-xs p-3.5 text-xs shadow-xs space-y-1.5 ${
                  isUser
                    ? 'bg-black text-white'
                    : 'bg-white border border-slate-200 text-slate-800'
                }`}
              >
                {/* Meta Bar */}
                <div
                  className={`flex items-center justify-between text-[10px] font-mono ${
                    isUser ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  <span className="font-semibold">
                    {isUser ? profile.name : msg.source || 'NSSTA Technical Examiner'}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span>{msg.timestamp}</span>
                    {!isUser && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.id, msg.content)}
                        className="text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="leading-relaxed font-sans whitespace-pre-wrap select-text">
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing / Analyzing state */}
        {isSending && (
          <div className="flex items-start space-x-3">
            <div className="w-7 h-7 rounded-xs bg-black text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-xs p-3.5 text-xs text-slate-600 flex items-center space-x-2.5 shadow-xs font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-black" />
              <span>NSSTA Examiner is analyzing document &amp; formulating response...</span>
            </div>
          </div>
        )}

        {/* Error notification */}
        {errorNotice && (
          <div className="p-3 bg-rose-50 border border-rose-300 text-rose-900 rounded-xs text-xs flex items-center space-x-2 font-mono">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts Shelf */}
      <div className="p-2.5 bg-slate-100/70 border-t border-slate-200 shrink-0 overflow-x-auto flex items-center space-x-2">
        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap pl-1">
          Quick Prompts:
        </span>
        {suggestedPrompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isSending}
            onClick={() => handleSendMessage(prompt)}
            className="px-2.5 py-1 bg-white hover:bg-slate-200 disabled:opacity-50 border border-slate-300 rounded-xs text-[11px] font-sans text-slate-700 whitespace-nowrap transition-colors cursor-pointer shadow-xs shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-slate-200 bg-white shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isSending}
            placeholder="Ask a technical question about the uploaded document, or type 'Quiz me' for an oral question..."
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xs text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-black font-sans"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isSending}
            className="px-4 py-2.5 bg-black hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xs text-xs font-medium font-mono uppercase tracking-wider flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </form>
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1.5 px-1">
          <span>NSSTA Technical Examiner • Powered by MoSPI SkillIntel</span>
          <span>Shift + Enter or click Send</span>
        </div>
      </div>
    </div>
  );
};
