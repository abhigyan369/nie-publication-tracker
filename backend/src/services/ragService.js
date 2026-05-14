import OpenAI from 'openai';
import retrievalService from './retrievalService.js';

class RagService {
  constructor() {
    // Initialize OpenAI client only if API key is provided
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI() : null;
  }

  /**
   * Generates an AI response based strictly on the retrieved database context.
   * @param {string} userQuestion - The natural language query from the user.
   * @returns {Promise<Object>} An object containing the answer and the context used.
   */
  async generateResponse(userQuestion) {
    if (!this.openai) {
      throw new Error("OPENAI_API_KEY is not set in your environment variables. Please add it to your .env file to use the RAG Chatbot.");
    }

    try {
      // 1. Retrieve the most relevant context from the vector database
      const contexts = await retrievalService.retrieveContext(userQuestion, 5);
      
      const retrievedContextStr = contexts.length > 0 
        ? contexts.join('\n\n---\n\n') 
        : 'No relevant information found.';

      // 2. Prepare the System Prompt exactly as specified in the PRD
      const systemPrompt = `You are an AI assistant for NIE Publication Tracker.

Rules:
* Answer only from provided context.
* Never invent information.
* If context is missing, say:
  "I could not find relevant information in the NIE Publication Tracker database."

Context:
${retrievedContextStr}`;

      // 3. Call the LLM with strict instructions
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Cost-effective and fast model suitable for RAG
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuestion }
        ],
        temperature: 0.1, // Low temperature ensures factual, deterministic responses
      });

      // 4. Return the generated answer alongside the context (useful for citations)
      return {
        answer: completion.choices[0].message.content,
        retrievedContexts: contexts
      };

    } catch (error) {
      console.error('LLM Generation Error:', error);
      throw new Error('Failed to generate response from the AI.');
    }
  }
}

export default new RagService();
