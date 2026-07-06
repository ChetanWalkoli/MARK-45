import { MASTER_PROMPT } from '../masterPrompt';

export async function* streamGeminiResponse(
  messages: { role: string; content: string }[],
  mode: string,
  modelId: string = 'gemini-flash'
) {
  if (modelId === 'mark-45') {
    try {
      const response = await fetch("http://localhost:8000/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          stream: true
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        yield `Error: [${response.status}] ${errText || 'Failed to fetch from local MARK 45 backend.'}`;
        return;
      }

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                yield parsed.text;
              } else if (parsed.error) {
                yield `Error: ${parsed.error}`;
              }
            } catch (e) {
              // Ignore partial chunk JSON parse errors
            }
          }
        }
      }
      return;
    } catch (error: any) {
      yield `Error: Failed to connect to local MARK 45 backend at http://localhost:8000. Ensure your FastAPI server is running. Error details: ${error.message}`;
      return;
    }
  }

  let modeOverride = "";
  switch (mode) {
    case 'developer':
      modeOverride = "MODE: Developer. Code-first. Full runnable code, folder structure, deps list.";
      break;
    case 'teacher':
      modeOverride = "MODE: Teacher. Step-by-step, analogies, verify understanding.";
      break;
    case 'startup':
      modeOverride = "MODE: Startup. MVP scope, monetization, market fit, PRD outline.";
      break;
    case 'coach':
      modeOverride = "MODE: Coach. Structured roadmaps, accountability framing, milestones.";
      break;
    case 'interview':
      modeOverride = "MODE: Interview. Simulates technical interview Q&A for MERN + AI roles.";
      break;
    case 'hackathon':
      modeOverride = "MODE: Hackathon. High-velocity mode. Prioritize MVP scoping, fastest tech, demo-worthy UI. Always ask 'What's your team size and how many hours do you have?' at the end.";
      break;
  }

  const systemInstruction = `${MASTER_PROMPT}\n\n${modeOverride}\n\n`;

  // OpenAI Model: GPT-4o
  if (modelId === 'gpt-4o') {
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!openaiApiKey) {
      yield "Error: VITE_OPENAI_API_KEY is not set in the environment. Please add it to your frontend/.env file.";
      return;
    }

    try {
      const chatHistory = [
        { role: "system", content: systemInstruction },
        ...messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }))
      ];

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: chatHistory,
          stream: true
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        yield `Error: [${response.status}] ${errJson.error?.message || 'Failed to connect to OpenAI API.'}`;
        return;
      }

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('data: ')) {
            const data = cleanLine.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch (e) {}
          }
        }
      }
      return;
    } catch (error: any) {
      yield `Error: OpenAI API request failed: ${error.message}`;
      return;
    }
  }

  // Anthropic Model: Claude 3.5 Sonnet
  if (modelId === 'claude-3.5') {
    const anthropicApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      yield "Error: VITE_ANTHROPIC_API_KEY is not set in the environment. Please add it to your frontend/.env file.";
      return;
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          system: systemInstruction,
          messages: messages.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
          })),
          stream: true
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        yield `Error: [${response.status}] ${errJson.error?.message || 'Failed to connect to Anthropic API.'}`;
        return;
      }

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('data: ')) {
            const data = cleanLine.slice(6).trim();
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                yield parsed.delta.text;
              }
            } catch (e) {}
          }
        }
      }
      return;
    } catch (error: any) {
      yield `Error: Anthropic API request failed: ${error.message}`;
      return;
    }
  }

  // Default: Gemini 1.5 Flash
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    yield "Error: VITE_GEMINI_API_KEY is not set in the environment. Please add it to your frontend/.env file.";
    return;
  }

  const formattedMessages = messages.map((msg, index) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: index === 0 ? systemInstruction + msg.content : msg.content }]
  }));

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: formattedMessages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 16000,
            topP: 0.95,
            topK: 40,
          }
        })
      }
    );

    if (!response.ok) {
      const err = await response.json();
      yield `Error: [${response.status}] ${err.error?.message || 'Failed to fetch from Gemini API. Please check your API Key!'}`;
      return;
    }

    if (!response.body) throw new Error("No response body");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const textPart = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textPart) {
              yield textPart;
            }
          } catch (e) {
            // ignore JSON parse error for incomplete chunks
          }
        }
      }
    }
  } catch (error: any) {
    yield `Error: ${error.message}`;
  }
}
