import { GoogleGenerativeAI } from '@google/generative-ai';

const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();

export async function generateStructuredAnswer({
  systemInstruction,
  history = [],
  contextPacket,
  message,
  generationConfig,
  modelId
}) {
  if (provider === 'ollama') {
    return ollamaStructuredAnswer({ systemInstruction, history, contextPacket, message });
  }

  return geminiStructuredAnswer({
    systemInstruction,
    history,
    contextPacket,
    message,
    generationConfig,
    modelId: modelId || process.env.GEMINI_MODEL_ID || 'gemini-2.5-flash'
  });
}

async function geminiStructuredAnswer({ systemInstruction, history, contextPacket, message, generationConfig, modelId }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not set while provider=gemini');
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: modelId, systemInstruction });
  const chat = model.startChat({ history, generationConfig });
  const result = await chat.sendMessage([
    {
      text: [
        'Use ONLY the provided context snippets.',
        'If context is insufficient, clearly say what is missing.',
        contextPacket
      ].join('\n\n')
    },
    { text: `Question: ${message}\nAnswer in plain English with short bullets when helpful.` }
  ]);
  const response = await result.response;
  return response.text();
}

async function ollamaStructuredAnswer({ systemInstruction, history, contextPacket, message }) {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  const model = process.env.OLLAMA_CHAT_MODEL || 'llama3.1:8b';

  const messages = [
    { role: 'system', content: `${systemInstruction}\n\nReturn only JSON.` },
    ...history.map((h) => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts?.[0]?.text || '' })),
    {
      role: 'user',
      content: [
        'Return valid JSON with keys: answer (string), references (array), confidence (low|medium|high), suggestedQuestions (array), nextActions (array).',
        'Use only this context:',
        contextPacket,
        `Question: ${message}`
      ].join('\n\n')
    }
  ];

  const resp = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      format: 'json',
      options: { temperature: 0.2 }
    })
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Ollama chat failed: ${resp.status} ${t}`);
  }

  const data = await resp.json();
  return data?.message?.content || '{}';
}
