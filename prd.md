# NIE Publication Tracker – AI RAG Chatbot Integration Plan

## Goal

Integrate an AI-powered RAG (Retrieval-Augmented Generation) chatbot inside the NIE Publication Tracker application that can answer user questions strictly within the context of publication data, faculty information, analytics, uploaded research documents, and database content.

The chatbot must:

* Answer only from available application data
* Avoid hallucinating external information
* Support natural language queries
* Retrieve relevant context before generating answers
* Work dynamically as new publications are added
* Integrate with the existing PostgreSQL backend
* Support future AI analytics features

---

# Master Prompt (Feed to AI coding tools like Cursor, Claude Code, Gemini, Stitch, Copilot)

You are a senior full-stack AI engineer.

I already have an existing project named:

"NIE Publication Tracker – AI Integrated Research Publication Management and Analytics Platform"

Current stack:

* Frontend: React
* Backend: Node.js + Express
* Database: PostgreSQL

I want to integrate a RAG chatbot directly into the existing application.

Requirements:

1. Create an AI chatbot page/component inside the app.

2. Chatbot should answer strictly within the context of:

* Faculty details
* Publication records
* Citation counts
* Research areas
* Departments
* Publication analytics
* Uploaded publication PDFs
* Database content

3. The chatbot must not answer unrelated questions.

4. If information does not exist in the database, return:

"I could not find relevant information in the NIE Publication Tracker database."

5. Implement Retrieval Augmented Generation architecture:

User Question
→ Generate embedding
→ Search PostgreSQL vector database
→ Retrieve top relevant results
→ Send retrieved context to LLM
→ Generate final response

6. Use PostgreSQL pgvector extension.

7. Create:

* Embedding service
* Retrieval service
* Chat service
* Prompt templates
* API routes

8. Convert database records into natural language before embedding.

Example:

Faculty: John Doe
Department: CSE
Publication: AI in Education
Citations: 120
Research Area: Machine Learning

9. Build backend APIs:

POST /api/chat
POST /api/embeddings/sync
GET /api/chat/history

10. Add loading animation, chat UI, timestamps, and message history.

11. Make the system scalable.

12. Keep code modular and production-ready.

---

# Phase 1: Database Preparation

Objective:
Prepare PostgreSQL for vector search.

Tasks:

* Install pgvector
* Create vector extension
* Create embeddings table

Example schema:

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE embeddings (
id SERIAL PRIMARY KEY,
source_id INTEGER,
source_type VARCHAR(50),
content TEXT,
embedding VECTOR(384),
created_at TIMESTAMP DEFAULT NOW()
);

Expected Outcome:
Database can store embeddings.

---

# Phase 2: Data Transformation Layer

Objective:
Convert structured database rows into readable context.

Tasks:

Create service:

services/documentFormatter.js

Example:

Faculty: Dr. Smith
Department: Computer Science
Publication Title: AI in Healthcare
Year: 2025
Citation Count: 120
Research Area: Machine Learning

Expected Outcome:
Database records become meaningful context.

---

# Phase 3: Embedding Generation

Objective:
Generate vector embeddings.

Tasks:

Install:

npm install @xenova/transformers

OR

Use OpenAI embeddings.

Create:

services/embeddingService.js

Functions:

generateEmbedding(text)
storeEmbedding()
syncEmbeddings()

Expected Outcome:
All publications automatically get embeddings.

---

# Phase 4: Retrieval Layer

Objective:
Retrieve relevant context.

Tasks:

Create:

services/retrievalService.js

Flow:

Question
→ embedding
→ similarity search
→ top 5 results

SQL:

SELECT content
FROM embeddings
ORDER BY embedding <=> $1
LIMIT 5;

Expected Outcome:
Relevant content returned.

---

# Phase 5: RAG Service

Objective:
Combine retrieved context and AI.

Create:

services/ragService.js

Prompt:

You are an AI assistant for NIE Publication Tracker.

Rules:

* Answer only from provided context.
* Never invent information.
* If context is missing, say:
  "I could not find relevant information in the NIE Publication Tracker database."

Context:
{retrieved_context}

Question:
{user_question}

Expected Outcome:
Context-aware responses.

---

# Phase 6: Backend API Integration

Create:

routes/chatRoutes.js

Endpoints:

POST /api/chat
POST /api/embeddings/sync
GET /api/chat/history

Expected Outcome:
Frontend can communicate with AI.

---

# Phase 7: Frontend Integration

Objective:
Create AI chatbot page.

Tasks:

Build:

components/
ChatWindow.jsx
MessageBubble.jsx
ChatInput.jsx

Features:

* Chat history
* Typing indicator
* Auto scroll
* Loading animation
* Suggested questions
* Dark theme support

Suggested prompts:

"Show most cited publications"
"Which faculty has maximum publications?"
"Research trends in AI"
"Show publication statistics"

---

# Phase 8: Automatic Sync System

Objective:
Update embeddings when new publications are added.

Tasks:

When:

* publication created
* publication updated
* publication deleted

Automatically:

regenerate embeddings

Expected Outcome:
Chatbot stays updated.

---

# Phase 9: Future AI Analytics Features

Future additions:

* Research trend prediction
* Citation forecasting
* Faculty recommendation engine
* Publication summarization
* PDF question answering
* AI dashboard insights
* Graph-based analytics

---

# Final Architecture

React Frontend
↓
Express Backend
↓
RAG Service
↓
Embedding Service
↓
PostgreSQL + pgvector
↓
LLM
