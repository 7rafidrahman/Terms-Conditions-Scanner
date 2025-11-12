
import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { GoogleGenAI, Chat } from "@google/genai";

interface ChatAssistantProps {
  documentContext: string;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ documentContext }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (documentContext) {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const newChat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: `You are a helpful assistant. The user has just scanned a Terms and Conditions document. The full text of the document is provided below. Answer the user's questions based ONLY on this text. If the answer is not in the text, say "I cannot find that information in the document."\n\n---\n\nDOCUMENT TEXT: ${documentContext}`,
        },
      });
      setChat(newChat);
      setMessages([]);
    }
  }, [documentContext]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !chat) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
        let fullResponseText = '';
        setMessages(prev => [...prev, { role: 'model', text: '...' }]);
        
        const responseStream = await chat.sendMessageStream({ message: input });

        for await (const chunk of responseStream) {
            fullResponseText += chunk.text;
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { role: 'model', text: fullResponseText + '...' };
                return newMessages;
            });
        }
        
        setMessages(prev => {
             const newMessages = [...prev];
             newMessages[newMessages.length - 1] = { role: 'model', text: fullResponseText };
             return newMessages;
        });

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, something went wrong.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-8 bg-slate-800 rounded-lg p-4 shadow-xl">
      <h3 className="text-xl font-bold mb-4 text-sky-300">Ask a Question</h3>
      <div className="h-64 overflow-y-auto pr-2 space-y-4 mb-4 bg-slate-900/50 p-3 rounded-md">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the document..."
          className="flex-1 bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none"
          disabled={isLoading}
        />
        <button type="submit" className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed" disabled={isLoading}>
          {isLoading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ChatAssistant;
