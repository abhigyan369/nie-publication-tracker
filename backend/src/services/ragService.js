import OpenAI from 'openai';
import retrievalService from './retrievalService.js';
import logger from '../utils/logger.util.js';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';
const FALLBACK_RESPONSE = 'I could not find relevant information in the NIE Publication Tracker database.';
const MAX_CONTEXT_CHARS = 24000;
const MAX_COMPLETION_TOKENS = 1024;

function estimateTokens(text = '') {
  return Math.ceil(String(text).length / 4);
}

function serializeError(error) {
  return {
    name: error.name,
    message: error.message,
    status: error.status || error.response?.status,
    type: error.error?.type || error.response?.data?.error?.type,
    code: error.code || error.error?.code || error.response?.data?.error?.code,
    stack: error.stack,
    providerBody: error.response?.data,
    cause: error.cause
      ? {
          name: error.cause.name,
          message: error.cause.message,
          code: error.cause.code,
          stack: error.cause.stack,
        }
      : undefined,
  };
}

function buildSystemPrompt(retrievedContextStr) {
  return `You are an AI assistant for NIE Publication Tracker.

Rules:
* Answer only from provided context.
* Never invent information.
* If context is missing, say:
  "${FALLBACK_RESPONSE}"

Context:
${retrievedContextStr}`;
}

class RagService {
  constructor() {
    this.client = null;
    this.apiKey = null;
    this.model = null;
  }

  getModel() {
    return process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  }

  getClient() {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not set in your environment variables. Please add it to your .env file to use the RAG Chatbot.');
    }

    if (!this.client || this.apiKey !== apiKey) {
      this.client = new OpenAI({
        apiKey,
        baseURL: GROQ_BASE_URL,
      });
      this.apiKey = apiKey;
      logger.info('Groq client initialized', {
        baseURL: GROQ_BASE_URL,
        model: this.getModel(),
      });
    }

    return this.client;
  }

  buildGroqPayload(systemPrompt, userQuestion) {
    if (!systemPrompt?.trim()) {
      throw new Error('Generated system prompt is empty.');
    }

    if (!userQuestion?.trim()) {
      throw new Error('User question is empty.');
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuestion },
    ];

    for (const [index, message] of messages.entries()) {
      if (!message.role || typeof message.content !== 'string' || !message.content.trim()) {
        throw new Error(`Invalid Groq messages[${index}] payload.`);
      }
    }

    return {
      model: this.getModel(),
      messages,
      temperature: 0.1,
      max_tokens: MAX_COMPLETION_TOKENS,
    };
  }

  async testGroq() {
    const client = this.getClient();
    const payload = {
      model: this.getModel(),
      messages: [{ role: 'user', content: 'Hello' }],
      temperature: 0,
      max_tokens: 64,
    };

    logger.info('Groq test request payload', {
      model: payload.model,
      max_tokens: payload.max_tokens,
      messages: payload.messages,
    });

    const response = await client.chat.completions.create(payload);
    logger.info('Groq test raw response', {
      id: response.id,
      model: response.model,
      usage: response.usage,
      choicesLength: response.choices?.length ?? 0,
      firstChoice: response.choices?.[0],
    });

    return response;
  }

  /**
   * Generates an AI response based strictly on the retrieved database context.
   * @param {string} userQuestion - The natural language query from the user.
   * @returns {Promise<Object>} An object containing the answer and the context used.
   */
  async generateResponse(userQuestion) {
    let stage = 'initialization';
    let debugPayload = null;

    try {
      const client = this.getClient();
      const model = this.getModel();

      // 1. Retrieve the most relevant context from the vector database
      stage = 'retrieval';
      const contexts = await retrievalService.retrieveContext(userQuestion, 5);
      const safeContexts = Array.isArray(contexts) ? contexts.filter(Boolean) : [];
      
      const retrievedContextStr = safeContexts.length > 0
        ? safeContexts.join('\n\n---\n\n').slice(0, MAX_CONTEXT_CHARS)
        : 'No relevant information found.';

      stage = 'prompt_build';
      const systemPrompt = buildSystemPrompt(retrievedContextStr);
      const promptTokens = estimateTokens(systemPrompt) + estimateTokens(userQuestion);
      const hasFallbackOnlyContext = safeContexts.length === 0;

      stage = 'groq_payload_build';
      const payload = this.buildGroqPayload(systemPrompt, userQuestion);
      debugPayload = {
        model,
        temperature: payload.temperature,
        max_tokens: payload.max_tokens,
        messageCount: payload.messages.length,
        messages: payload.messages.map((message) => ({
          role: message.role,
          contentLength: message.content.length,
          estimatedTokens: estimateTokens(message.content),
          preview: message.content.slice(0, 500),
        })),
        promptTokens,
        retrievedContextCount: safeContexts.length,
        hasFallbackOnlyContext,
      };

      logger.info('RAG prompt and Groq request prepared', debugPayload);

      // 3. Call Groq through its OpenAI-compatible chat completions API
      stage = 'groq_request';
      const completion = await client.chat.completions.create(payload);

      logger.info('Groq raw response summary', {
        id: completion.id,
        model: completion.model,
        usage: completion.usage,
        choicesLength: completion.choices?.length ?? 0,
        firstChoiceFinishReason: completion.choices?.[0]?.finish_reason,
        firstChoiceMessage: {
          role: completion.choices?.[0]?.message?.role,
          contentLength: completion.choices?.[0]?.message?.content?.length ?? 0,
          preview: completion.choices?.[0]?.message?.content?.slice(0, 500),
        },
      });

      stage = 'groq_response_parse';
      const answer = completion.choices?.[0]?.message?.content;
      if (!answer) {
        const responseParseError = new Error('Groq returned an empty chat completion at choices[0].message.content.');
        responseParseError.rawResponse = completion;
        throw responseParseError;
      }

      // 4. Return the generated answer alongside the context (useful for citations)
      return {
        answer,
        retrievedContexts: safeContexts
      };

    } catch (error) {
      const serializedError = serializeError(error);

      logger.error('RAG generation failed', {
        stage,
        error: serializedError,
        model: this.getModel(),
        baseURL: GROQ_BASE_URL,
        failingPayload: debugPayload,
      });

      const ragError = new Error(`RAG generation failed during ${stage}: ${error.message}`);
      ragError.statusCode = 500;
      ragError.stage = stage;
      ragError.details = {
        error: serializedError,
        model: this.getModel(),
        baseURL: GROQ_BASE_URL,
        failingPayload: debugPayload,
      };
      throw ragError;
    }
  }
}

export default new RagService();
