import { useState, useCallback, useEffect } from 'react';
import { streamGeminiResponse } from '../services/gemini';
import { AIMode } from '../App';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useChat(activeMode: AIMode) {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('mark_45_chat_history');
      return saved ? (JSON.parse(saved) as Message[]) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('mark_45_chat_history', JSON.stringify(messages));
  }, [messages]);

  const sendMessage = useCallback(
    async (content: string) => {
      const userMsgId = `${Date.now()}`;
      const assistantMsgId = `${Date.now() + 1}`;

      const newUserMsg: Message = {
        id: userMsgId,
        role: 'user',
        content,
        timestamp: new Date(),
      };

      // Add user message + empty assistant placeholder in one update
      setMessages((prev) => [
        ...prev,
        newUserMsg,
        { id: assistantMsgId, role: 'assistant', content: '', timestamp: new Date() },
      ]);
      setIsLoading(true);

      // Build history including the new user message
      const chatHistory = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content },
      ];

      const appendToken = (token: string) =>
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: msg.content + token }
              : msg
          )
        );

      const setError = (text: string) =>
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: text } : msg
          )
        );

      try {
        const directStream = streamGeminiResponse(chatHistory, activeMode);
        for await (const textChunk of directStream) {
          appendToken(textChunk);
        }
      } catch (err) {
        console.error('Chat stream failed:', err);
        setError('⚠️ MARK 45 encountered an error. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [messages, activeMode]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    localStorage.removeItem('mark_45_chat_history');
  }, []);

  return { messages, isLoading, sendMessage, clearMessages };
}
