import os
import json
import uuid
import shutil
from datetime import datetime
from typing import List, Optional
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# LangChain and AI integrations
from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Load environment variables
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

# Directories
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = BASE_DIR / "uploads"
VECTOR_DB_DIR = BASE_DIR / "vector_db"
WEB_DIR = BASE_DIR / "web"

DATA_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)
VECTOR_DB_DIR.mkdir(exist_ok=True)

DOCS_JSON_FILE = DATA_DIR / "documents.json"
CHATS_JSON_FILE = DATA_DIR / "chats.json"

# Initialize Data Stores
def load_json(filepath: Path, default_data):
    if not filepath.exists():
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(default_data, f, indent=2)
        return default_data
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default_data

def save_json(filepath: Path, data):
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

# Initial sample chats matching the reference UI
DEFAULT_CHATS = [
    {
        "id": "chat-gate-cse",
        "title": "GATE CSE Notes Q&A",
        "timestamp": "2 hours ago",
        "saved": True,
        "doc_name": "GRU.pdf",
        "messages": [
            {"role": "user", "content": "What is the key difference between GRU and LSTM in recurrent architectures?"},
            {
                "role": "assistant",
                "content": "The primary difference lies in the gating mechanism and internal state management:\n\n1. **Gating Units**: **LSTM** uses three gates (input, forget, and output gate), whereas **GRU** (Gated Recurrent Unit) combines the forget and input gates into a single **update gate** and also adds a **reset gate**.\n2. **Cell State**: LSTM separates cell state ($c_t$) from hidden state ($h_t$), while GRU merges them into a unified hidden state ($h_t$).\n3. **Efficiency**: Because GRUs have fewer parameters, they are computationally faster to train and often perform comparably to LSTMs on small-to-medium datasets.",
                "sources": [{"page": 2, "source": "GRU.pdf", "content": "Gated Recurrent Unit simplifies LSTM by coupling forget and input gates..."}]
            }
        ]
    },
    {
        "id": "chat-research-paper",
        "title": "Research Paper Summary",
        "timestamp": "1 day ago",
        "saved": True,
        "doc_name": "GRU.pdf",
        "messages": [
            {"role": "user", "content": "Can you summarize the empirical evaluation results from the paper?"},
            {
                "role": "assistant",
                "content": "The paper provides an empirical evaluation comparing Gated Recurrent Units (GRU) against traditional Long Short-Term Memory (LSTM) and standard tanh RNNs across polyphonic music modeling and speech recognition tasks. Key findings demonstrate that GRU achieves comparable or slightly superior convergence speeds due to its reduced parameter space.",
                "sources": [{"page": 4, "source": "GRU.pdf", "content": "We evaluated GRU and LSTM on sequence modeling benchmarks..."}]
            }
        ]
    },
    {
        "id": "chat-project-report",
        "title": "Project Report Help",
        "timestamp": "3 days ago",
        "saved": False,
        "doc_name": "GRU.pdf",
        "messages": []
    },
    {
        "id": "chat-syllabus-explanation",
        "title": "Syllabus Explanation",
        "timestamp": "4 days ago",
        "saved": False,
        "doc_name": "GRU.pdf",
        "messages": []
    },
    {
        "id": "chat-ml-concepts",
        "title": "ML Concepts Clarification",
        "timestamp": "1 week ago",
        "saved": True,
        "doc_name": "GRU.pdf",
        "messages": []
    },
    {
        "id": "chat-internship-prep",
        "title": "Internship Preparation",
        "timestamp": "1 week ago",
        "saved": False,
        "doc_name": "GRU.pdf",
        "messages": []
    },
    {
        "id": "chat-resume-review",
        "title": "Resume Review",
        "timestamp": "2 weeks ago",
        "saved": False,
        "doc_name": "GRU.pdf",
        "messages": []
    }
]

# Ensure initial default document exists (GRU.pdf)
def init_default_documents():
    try:
        docs_data = load_json(DOCS_JSON_FILE, [])
        gru_pdf_path = BASE_DIR / "document_loaders" / "GRU.pdf"
        
        # Check if GRU is already listed
        has_gru = any(d.get("filename") == "GRU.pdf" for d in docs_data)
        if not has_gru and gru_pdf_path.exists():
            docs_data.append({
                "id": "doc-gru-pdf",
                "filename": "GRU.pdf",
                "pages": 15,
                "chunks": 74,
                "uploaded_at": "Pre-indexed",
                "path": str(gru_pdf_path)
            })
            save_json(DOCS_JSON_FILE, docs_data)
        
        # Initialize chats if empty
        load_json(CHATS_JSON_FILE, DEFAULT_CHATS)
    except Exception as err:
        print(f"Notice: Initial document setup skipped ({err})")

init_default_documents()

# Initialize AI Embedding & Vectorstore
def get_embedding_model():
    current_key = os.getenv("GOOGLE_API_KEY")
    if not current_key:
        raise HTTPException(status_code=400, detail="GOOGLE_API_KEY is not configured in .env file.")
    return GoogleGenerativeAIEmbeddings(
        model="gemini-embedding-2-preview",
        google_api_key=current_key
    )

def get_vector_db():
    embeddings = get_embedding_model()
    return Chroma(
        persist_directory=str(VECTOR_DB_DIR),
        embedding_function=embeddings
    )

def get_chat_model():
    current_key = os.getenv("GOOGLE_API_KEY")
    if not current_key:
        raise HTTPException(status_code=400, detail="GOOGLE_API_KEY is not configured in .env file.")
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=current_key,
        temperature=0.3
    )

# FastAPI App Setup
app = FastAPI(title="Cosmic RAG Assistant API", version="1.0.0")

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
is_wildcard = allowed_origins == ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if is_wildcard else allowed_origins,
    allow_credentials=not is_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class ChatRequest(BaseModel):
    message: str
    doc_id: Optional[str] = None
    chat_id: Optional[str] = None
    search_web: bool = False
    history: Optional[List[dict]] = []

class SaveChatRequest(BaseModel):
    id: Optional[str] = None
    title: str
    messages: List[dict]
    doc_name: Optional[str] = None
    saved: bool = True

class SettingsRequest(BaseModel):
    google_api_key: Optional[str] = None

# API Endpoints
@app.get("/api/health")
def health():
    key_set = bool(os.getenv("GOOGLE_API_KEY"))
    return {"status": "ok", "api_key_configured": key_set}

@app.get("/api/documents")
def list_documents():
    docs = load_json(DOCS_JSON_FILE, [])
    return {"documents": docs}

@app.post("/api/upload")
def upload_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    filename = file.filename
    ext = Path(filename).suffix.lower()
    if ext not in [".pdf", ".txt", ".md"]:
        raise HTTPException(status_code=400, detail="Unsupported format. Please upload PDF, TXT, or MD files.")

    doc_id = f"doc-{uuid.uuid4().hex[:8]}"
    saved_path = UPLOADS_DIR / f"{doc_id}_{filename}"

    with open(saved_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        # Load documents
        if ext == ".pdf":
            loader = PyPDFLoader(file_path=str(saved_path))
            docs = loader.load()
        else:
            loader = TextLoader(file_path=str(saved_path), encoding="utf-8")
            docs = loader.load()

        page_count = len(docs)
        if page_count == 0:
            raise HTTPException(status_code=400, detail="Document contains no readable text.")

        # Attach metadata to all docs
        for doc in docs:
            doc.metadata["source"] = filename
            doc.metadata["doc_id"] = doc_id

        # Text Splitting
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_documents(docs)

        # Ingest into Chroma Vector Store
        embeddings = get_embedding_model()
        vector_db = Chroma(
            persist_directory=str(VECTOR_DB_DIR),
            embedding_function=embeddings
        )
        vector_db.add_documents(chunks)

        # Update documents record
        docs_list = load_json(DOCS_JSON_FILE, [])
        doc_entry = {
            "id": doc_id,
            "filename": filename,
            "pages": page_count,
            "chunks": len(chunks),
            "uploaded_at": datetime.now().strftime("%b %d, %Y %I:%M %p"),
            "path": str(saved_path)
        }
        docs_list.insert(0, doc_entry)
        save_json(DOCS_JSON_FILE, docs_list)

        return {
            "success": True,
            "message": f"Successfully processed and indexed '{filename}'.",
            "document": doc_entry
        }

    except Exception as e:
        if saved_path.exists():
            saved_path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

@app.post("/api/chat")
def chat_endpoint(request: ChatRequest):
    query = request.message.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        vector_db = get_vector_db()
        filter_kwargs = {}
        if request.doc_id:
            # Check document metadata
            filter_kwargs = {"doc_id": request.doc_id}

        # Perform similarity retrieval
        try:
            if filter_kwargs:
                results = vector_db.similarity_search(query, k=4, filter=filter_kwargs)
            else:
                results = vector_db.similarity_search(query, k=4)
        except Exception:
            # Fallback if filter not matched
            results = vector_db.similarity_search(query, k=4)

        context_texts = []
        sources = []
        for doc in results:
            content = doc.page_content.strip()
            page = doc.metadata.get("page", 1)
            source_file = doc.metadata.get("source", "Document")
            context_texts.append(f"--- Excerpt from {source_file} (Page {page}) ---\n{content}")
            sources.append({
                "source": source_file,
                "page": page if isinstance(page, int) else 1,
                "content": content[:240] + ("..." if len(content) > 240 else "")
            })

        context_str = "\n\n".join(context_texts) if context_texts else "No specific document context found."

        # Format prompt
        system_instruction = (
            "You are the Cosmic RAG Assistant, an intelligent, helpful, and precise AI assistant. "
            "Your task is to answer the user's question accurately using the provided document excerpts. "
            "Format your answers with clean Markdown, bullet points, and code blocks where helpful. "
            "If the answer is found in the context, synthesize a clear, comprehensive explanation and reference the source pages. "
            "If the context doesn't contain sufficient details, state that clearly and provide the best known general knowledge if helpful."
        )

        history_messages = []
        if request.history:
            for item in request.history[-6:]:
                history_messages.append(f"{item.get('role', 'user').capitalize()}: {item.get('content', '')}")

        history_str = "\n".join(history_messages)

        full_prompt = (
            f"{system_instruction}\n\n"
            f"=== DOCUMENT CONTEXT ===\n{context_str}\n\n"
            f"=== CONVERSATION HISTORY ===\n{history_str}\n\n"
            f"=== USER QUESTION ===\n{query}\n\n"
            f"=== ASSISTANT ANSWER ==="
        )

        llm = get_chat_model()
        response = llm.invoke(full_prompt)
        response_text = response.content

        return {
            "response": response_text,
            "sources": sources,
            "web_search_enabled": request.search_web
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

@app.get("/api/chats")
def get_chats():
    chats = load_json(CHATS_JSON_FILE, DEFAULT_CHATS)
    return {"chats": chats}

@app.get("/api/chats/{chat_id}")
def get_chat(chat_id: str):
    chats = load_json(CHATS_JSON_FILE, DEFAULT_CHATS)
    for c in chats:
        if c["id"] == chat_id:
            return {"chat": c}
    raise HTTPException(status_code=404, detail="Chat not found.")

@app.post("/api/chats")
def save_or_update_chat(request: SaveChatRequest):
    chats = load_json(CHATS_JSON_FILE, DEFAULT_CHATS)
    chat_id = request.id or f"chat-{uuid.uuid4().hex[:8]}"

    existing_idx = next((i for i, c in enumerate(chats) if c["id"] == chat_id), None)
    chat_entry = {
        "id": chat_id,
        "title": request.title or "New Conversation",
        "timestamp": "Just now",
        "saved": request.saved,
        "doc_name": request.doc_name or "Document",
        "messages": request.messages
    }

    if existing_idx is not None:
        chats[existing_idx] = chat_entry
    else:
        chats.insert(0, chat_entry)

    save_json(CHATS_JSON_FILE, chats)
    return {"success": True, "chat": chat_entry}

@app.delete("/api/chats/{chat_id}")
def delete_chat(chat_id: str):
    chats = load_json(CHATS_JSON_FILE, DEFAULT_CHATS)
    new_chats = [c for c in chats if c["id"] != chat_id]
    save_json(CHATS_JSON_FILE, new_chats)
    return {"success": True, "message": "Chat deleted"}

# Mount frontend static files
app.mount("/", StaticFiles(directory=str(WEB_DIR), html=True), name="web")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    is_dev = os.getenv("ENV", "development").lower() == "development"
    print(f"Starting Cosmic RAG Assistant on port {port} (reload={is_dev}) ...")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=is_dev)
