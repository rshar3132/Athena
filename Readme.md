# Athena — Hybrid RAG Research Assistant
 
A full-stack AI research assistant that uses **BM25 + FAISS Hybrid RAG** to answer questions about your uploaded research papers with precise source citations.

### Hybrid Search
Each query runs **two retrievers in parallel** and combines their scores:
 
```
hybrid_score = α × cosine_sim(FAISS) + (1-α) × BM25_score
```
 
- **α = 0.5** by default (equal weight)
- FAISS uses `sentence-transformers/all-MiniLM-L6-v2` embeddings (local, no API key)
- BM25 uses Okapi BM25 tokenized on lowercased chunk text
- Both scores are normalised to [0, 1] before combining

### Source Citation Format
The LLM is instructed to cite sources as:
```
[PaperName: Section Heading: brief quote]
```
 
## Setup
 
### 1. Backend
 
```bash
cd Server
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Make .env and add your GROQ_API_KEY from https://console.groq.com
uvicorn main:app --reload --port 8000
```

### 2. Frontend
 
```bash
cd Client
npm install
npm run dev
```
 
## API Endpoints
``` 
Method      Endpoint                    Description 

GET         `/health`                   Health check
GET         `/documents`                List indexed documents
POST        `/documents/upload`         Upload & index a PDF
DELETE      `/documents/{name}`         Remove a document
POST        `/chat`                     Ask a question

```

### Chat Request
```json
{ "question": "Compare the attention mechanisms in these papers.", "top_k": 8 }
```
 
### Chat Response
```json
{
  "answer": "...[PaperA: Methodology: 'self-attention allows...']...",
  "sources": [
    {
      "paper_name": "Attention Is All You Need",
      "heading": "3.2 Attention",
      "text": "self-attention allows the model to...",
      "score": 0.8342
    }
  ]
}
```
 
## Features
- **Hybrid BM25 + FAISS** retrieval with configurable α blending
- **Section-aware PDF parsing** using font-size heuristics to detect headings
- **Persistent index** — documents survive server restarts (stored in `Server/data/`)
- **Multi-document** support — ask questions across all uploaded papers simultaneously
- **Comparison queries** — "Compare paper A vs paper B on topic X"
- **Document management** — upload, list, delete documents via UI or API
- **Source citations** — every answer includes ranked source cards with relevance scores
