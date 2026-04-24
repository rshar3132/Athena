import os
from prac import ResearchAssistant
import shutil
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()


UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Research Assistant API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

assistant = ResearchAssistant()


class ChatRequest(BaseModel):
    question: str
    top_k: Optional[int] = 8


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    paper_name: Optional[str] = None,
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    name = (paper_name or Path(file.filename).stem).strip()
    dest = UPLOAD_DIR / f"{uuid.uuid4().hex}_{file.filename}"

    try:
        with open(dest, "wb") as f:
            shutil.copyfileobj(file.file, f)
        chunk_count = assistant.add_document(str(dest), name)
        return {
            "message": f"Document '{name}' indexed successfully.",
            "paper_name": name,
            "chunks_created": chunk_count,
        }
    except ValueError as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {e}")


@app.delete("/documents/{paper_name}")
def delete_document(paper_name: str):
    try:
        assistant.remove_document(paper_name)
        return {"message": f"Document '{paper_name}' removed."}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/documents")
def list_documents():
    return {"documents": assistant.list_documents()}


@app.post("/chat")
def chat(req: ChatRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    result = assistant.chat(req.question, top_k=req.top_k)
    return result


@app.get("/")
def root():
    return {"message": "Research Assistant API — visit /docs for Swagger UI."}