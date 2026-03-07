import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import axios from 'axios';

const badgeStyle = {
  high: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
  medium: 'bg-amber-100 text-amber-700 border border-amber-300',
  low: 'bg-rose-100 text-rose-700 border border-rose-300'
};

const AIChatBot = ({ documentContext, onClauseReference, externalPrompt }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "Hi! I'm your legal document assistant. Ask anything about this document and I will answer using retrieved evidence.",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([
    'What are the main risks in this document?',
    'Can you explain the termination clause?',
    'What are my obligations under this agreement?',
    'Are there any hidden fees or penalties?'
  ]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (typeof externalPrompt === 'string' && externalPrompt.trim()) {
      setInputMessage(externalPrompt.trim());
      inputRef.current?.focus();
    }
  }, [externalPrompt]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    const historyForServer = messages.filter((m, idx) => !(idx === 0 && m.type === 'bot'));
    try {
      const response = await axios.post('/api/chat', {
        message: inputMessage,
        documentContext,
        ragDocId: documentContext?.ragDocId,
        conversationHistory: historyForServer
      });

      const botMessage = {
        id: messages.length + 2,
        type: 'bot',
        content: response.data.answer,
        references: response.data.references,
        confidence: response.data.confidence,
        nextActions: response.data.nextActions,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, botMessage]);

      if (response.data.suggestedQuestions) {
        setSuggestedQuestions(response.data.suggestedQuestions);
      }
    } catch {
      const errorMessage = {
        id: messages.length + 2,
        type: 'bot',
        content: 'I encountered an error while processing your question. Please try again.',
        isError: true,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestedQuestion = (question) => {
    setInputMessage(question);
    inputRef.current?.focus();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleFeedback = (messageId, feedback) => {
    axios.post('/api/chat/feedback', {
      messageId,
      feedback,
      documentContext: documentContext?.id
    });

    setMessages((prev) => prev.map((msg) =>
      msg.id === messageId ? { ...msg, feedback } : msg
    ));
  };

  return (
    <div className="bg-white rounded-lg shadow-lg flex flex-col h-[600px]">
      <div className="bg-primary-600 text-white p-4 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">AI Legal Assistant</h3>
            <p className="text-sm text-primary-100">RAG-grounded answers from your uploaded document</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
              <div className="flex items-start gap-2">
                {message.type === 'bot' && (
                  <div className="bg-primary-100 p-2 rounded-full">
                    <Bot className="w-4 h-4 text-primary-600" />
                  </div>
                )}

                <div>
                  <div
                    className={`rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-primary-600 text-white'
                        : message.isError
                        ? 'bg-danger-50 text-danger-800 border border-danger-200'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>

                    {!!message.confidence && (
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${badgeStyle[message.confidence] || badgeStyle.low}`}>
                          Confidence: {message.confidence}
                        </span>
                      </div>
                    )}

                    {message.references && message.references.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <p className="text-xs font-medium mb-1">References:</p>
                        {message.references.slice(0, 4).map((ref, index) => (
                          <button
                            key={index}
                            onClick={() => ref.clauseId && onClauseReference?.(ref.clauseId)}
                            className="text-xs text-primary-700 hover:underline block text-left"
                          >
                            - {ref.section}: {ref.title}
                          </button>
                        ))}
                      </div>
                    )}

                    {message.nextActions?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <p className="text-xs font-medium mb-1">Suggested next actions:</p>
                        <ul className="text-xs space-y-1">
                          {message.nextActions.slice(0, 3).map((action, idx) => (
                            <li key={idx}>- {action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {message.type === 'bot' && !message.isError && (
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => copyToClipboard(message.content)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                        title="Copy response"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleFeedback(message.id, 'positive')}
                        className={`p-1 ${
                          message.feedback === 'positive'
                            ? 'text-success-600'
                            : 'text-slate-400 hover:text-success-600'
                        }`}
                        title="Helpful response"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleFeedback(message.id, 'negative')}
                        className={`p-1 ${
                          message.feedback === 'negative'
                            ? 'text-danger-600'
                            : 'text-slate-400 hover:text-danger-600'
                        }`}
                        title="Not helpful"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {message.type === 'user' && (
                  <div className="bg-slate-200 p-2 rounded-full">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-lg p-3 flex items-center gap-2">
              <Loader className="w-4 h-4 animate-spin text-primary-600" />
              <span className="text-slate-600">Retrieving relevant clauses and answering...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {suggestedQuestions.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-slate-500 mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.slice(0, 3).map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedQuestion(question)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-full transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your document..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-primary-600 text-white p-2 rounded-lg hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatBot;

