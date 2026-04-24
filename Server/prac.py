import os
import re
import json
import pickle
import numpy as np
from typing import List, Dict, Tuple, Optional
from pathlib import Path
from dotenv import load_dotenv

import fitz  # PyMuPDF
from rank_bm25 import BM25Okapi
import faiss
from sentence_transformers import SentenceTransformer

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

load_dotenv()
# ── paths ──────────────────────────────────────────────────────────────────────
DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)
INDEX_PATH = DATA_DIR / "faiss.index"
META_PATH  = DATA_DIR / "metadata.json"
BM25_PATH  = DATA_DIR / "bm25.pkl"
DOCS_PATH  = DATA_DIR / "documents.json"


# ── embedding model (local, no API key needed) ─────────────────────────────────
EMBED_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
_embed_model: Optional[SentenceTransformer] = None

def get_embed_model() -> SentenceTransformer:
    global _embed_model
    if _embed_model is None:
        _embed_model = SentenceTransformer(EMBED_MODEL_NAME)
    return _embed_model


def embed_texts(texts: List[str]) -> np.ndarray:
    model = get_embed_model()
    return model.encode(texts, normalize_embeddings=True, show_progress_bar=False)


# ── PDF parsing ────────────────────────────────────────────────────────────────

def extract_sections(pdf_path: str) -> List[Dict]:
    """
    Extract text with heading detection from a PDF.
    Returns list of {heading, text} dicts.
    """
    doc = fitz.open(pdf_path)
    raw_blocks = []

    for page in doc:
        blocks = page.get_text("dict")["blocks"]
        for block in blocks:
            if block["type"] != 0:
                continue
            for line in block["lines"]:
                for span in line["spans"]:
                    raw_blocks.append({
                        "text": span["text"].strip(),
                        "size": span["size"],
                        "flags": span["flags"],
                        "bbox": span["bbox"],
                    })

    # Identify heading font sizes (top 15% by size)
    sizes = [b["size"] for b in raw_blocks if b["text"]]
    if not sizes:
        return [{"heading": "Document", "text": ""}]

    threshold = np.percentile(sizes, 85)

    sections: List[Dict] = []
    current_heading = "Introduction"
    current_text: List[str] = []

    for block in raw_blocks:
        text = block["text"]
        if not text:
            continue
        is_heading = block["size"] >= threshold and len(text) < 120
        if is_heading:
            if current_text:
                sections.append({"heading": current_heading, "text": " ".join(current_text)})
            current_heading = text
            current_text = []
        else:
            current_text.append(text)

    if current_text:
        sections.append({"heading": current_heading, "text": " ".join(current_text)})

    return sections if sections else [{"heading": "Document", "text": ""}]


def parse_pdf(pdf_path: str, paper_name: str) -> List[Dict]:
    """
    Parse PDF into chunks with source metadata.
    Each chunk: {paper_name, heading, text, chunk_id}
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=600, chunk_overlap=100, separators=["\n\n", "\n", ". ", " "]
    )

    sections = extract_sections(pdf_path)
    chunks: List[Dict] = []

    for section in sections:
        if not section["text"].strip():
            continue
        sub_chunks = splitter.split_text(section["text"])
        for i, chunk_text in enumerate(sub_chunks):
            chunk_text = chunk_text.strip()
            if len(chunk_text) < 30:
                continue
            chunks.append({
                "paper_name": paper_name,
                "heading": section["heading"],
                "text": chunk_text,
                "chunk_id": f"{paper_name}::{section['heading']}::{i}",
            })

    return chunks


# ── Index management ──────────────────────────────────────────────────────────

class HybridIndex:
    def __init__(self):
        self.chunks: List[Dict] = []          # all chunks across all docs
        self.faiss_index: Optional[faiss.IndexFlatIP] = None
        self.bm25: Optional[BM25Okapi] = None
        self.documents: Dict[str, Dict] = {}  # paper_name -> {name, path, page_count}
        self._load()

    # ── persistence ────────────────────────────────────────────────────────────

    def _load(self):
        if META_PATH.exists():
            with open(META_PATH) as f:
                self.chunks = json.load(f)
        if DOCS_PATH.exists():
            with open(DOCS_PATH) as f:
                self.documents = json.load(f)
        if INDEX_PATH.exists() and self.chunks:
            self.faiss_index = faiss.read_index(str(INDEX_PATH))
        if BM25_PATH.exists() and self.chunks:
            with open(BM25_PATH, "rb") as f:
                self.bm25 = pickle.load(f)

    def _save(self):
        with open(META_PATH, "w") as f:
            json.dump(self.chunks, f)
        with open(DOCS_PATH, "w") as f:
            json.dump(self.documents, f)
        if self.faiss_index is not None:
            faiss.write_index(self.faiss_index, str(INDEX_PATH))
        if self.bm25 is not None:
            with open(BM25_PATH, "wb") as f:
                pickle.dump(self.bm25, f)

    # ── indexing ───────────────────────────────────────────────────────────────

    def add_document(self, pdf_path: str, paper_name: str):
        if paper_name in self.documents:
            raise ValueError(f"Document '{paper_name}' already exists.")

        new_chunks = parse_pdf(pdf_path, paper_name)
        if not new_chunks:
            raise ValueError("No extractable text found in PDF.")

        doc = fitz.open(pdf_path)
        self.documents[paper_name] = {
            "name": paper_name,
            "path": str(pdf_path),
            "page_count": doc.page_count,
            "chunk_count": len(new_chunks),
        }
        doc.close()

        self.chunks.extend(new_chunks)
        self._rebuild_indexes()
        self._save()
        return len(new_chunks)

    def remove_document(self, paper_name: str):
        if paper_name not in self.documents:
            raise ValueError(f"Document '{paper_name}' not found.")
        self.chunks = [c for c in self.chunks if c["paper_name"] != paper_name]
        del self.documents[paper_name]
        if self.chunks:
            self._rebuild_indexes()
        else:
            self.faiss_index = None
            self.bm25 = None
        self._save()

    def _rebuild_indexes(self):
        texts = [c["text"] for c in self.chunks]

        # FAISS
        embeddings: np.ndarray = embed_texts(texts)
        embeddings = embeddings.astype(np.float32)
        dim: int = int(embeddings.shape[1])
        index = faiss.IndexFlatIP(dim)
        index.add(embeddings)
        self.faiss_index = index

        # BM25
        tokenized = [t.lower().split() for t in texts]
        self.bm25 = BM25Okapi(tokenized)

    # ── retrieval ──────────────────────────────────────────────────────────────

    def search(self, query: str, top_k: int = 8, alpha: float = 0.5) -> List[Dict]:
        """
        Hybrid search: alpha * dense_score + (1-alpha) * sparse_score
        Returns top_k chunks with scores.
        """
        if not self.chunks:
            return []

        n = len(self.chunks)
        top_k = min(top_k, n)

        # Dense (FAISS cosine similarity)
        q_emb = embed_texts([query]).astype(np.float32)
        dense_scores, dense_ids = self.faiss_index.search(q_emb, n)
        dense_scores = dense_scores[0]
        dense_ids = dense_ids[0]

        # Normalise dense to [0,1]
        d_min, d_max = dense_scores.min(), dense_scores.max()
        if d_max > d_min:
            dense_norm = (dense_scores - d_min) / (d_max - d_min)
        else:
            dense_norm = np.ones_like(dense_scores)

        dense_map = {int(idx): float(score) for idx, score in zip(dense_ids, dense_norm)}

        # Sparse (BM25)
        tokens = query.lower().split()
        bm25_scores = self.bm25.get_scores(tokens)
        b_min, b_max = bm25_scores.min(), bm25_scores.max()
        if b_max > b_min:
            bm25_norm = (bm25_scores - b_min) / (b_max - b_min)
        else:
            bm25_norm = np.zeros_like(bm25_scores)

        # Combine
        combined = {}
        for i in range(n):
            ds = dense_map.get(i, 0.0)
            bs = float(bm25_norm[i])
            combined[i] = alpha * ds + (1 - alpha) * bs

        sorted_ids = sorted(combined, key=lambda x: combined[x], reverse=True)[:top_k]
        results = []
        for idx in sorted_ids:
            chunk = dict(self.chunks[idx])
            chunk["score"] = combined[idx]
            results.append(chunk)

        return results


# ── LLM + RAG chain ────────────────────────────────────────────────────────────

RAG_PROMPT = PromptTemplate.from_template(
    """You are a precise academic research assistant. Answer the user's question using ONLY the provided document excerpts.

RULES:
1. Base your answer strictly on the provided sources. Do not use external knowledge.
2. Cite sources inline using the exact format: [PaperName: Heading: brief quote]
3. For comparisons, explicitly contrast findings from different papers.
4. If the answer is not in the sources, say "The provided documents do not contain enough information to answer this question."
5. Be thorough but concise.

SOURCES:
{context}

QUESTION: {question}

ANSWER:"""
)


def format_context(chunks: List[Dict]) -> str:
    lines = []
    for i, chunk in enumerate(chunks, 1):
        lines.append(
            f"[{i}] Paper: {chunk['paper_name']} | Section: {chunk['heading']}\n"
            f"    {chunk['text']}\n"
        )
    return "\n".join(lines)


def build_llm() -> ChatGroq:
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.1,
        groq_api_key=os.getenv("GROQ_API_KEY"),
    )


class ResearchAssistant:
    def __init__(self):
        self.index = HybridIndex()
        self.llm = build_llm()
        self.chain = RAG_PROMPT | self.llm | StrOutputParser()

    def chat(self, question: str, top_k: int = 8) -> Dict:
        if not self.index.chunks:
            return {
                "answer": "No documents have been uploaded yet. Please upload PDFs first.",
                "sources": [],
            }

        chunks = self.index.search(question, top_k=top_k)
        context = format_context(chunks)
        answer = self.chain.invoke({"context": context, "question": question})

        sources = [
            {
                "paper_name": c["paper_name"],
                "heading": c["heading"],
                "text": c["text"][:200],
                "score": round(c["score"], 4),
            }
            for c in chunks
        ]

        return {"answer": answer, "sources": sources}

    def add_document(self, pdf_path: str, paper_name: str) -> int:
        return self.index.add_document(pdf_path, paper_name)

    def remove_document(self, paper_name: str):
        self.index.remove_document(paper_name)

    def list_documents(self) -> List[Dict]:
        return list(self.index.documents.values())