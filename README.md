# Cosmic RAG Assistant 🚀

A modern Retrieval-Augmented Generation (RAG) assistant powered by **FastAPI**, **LangChain**, **Google Gemini** (`gemini-2.5-flash`), and **Chroma DB**. Upload PDF/text documents, ask contextual questions with page-level citations, and interact with a modern glassmorphic web interface.

---

## ✨ Features

- **Document Ingestion & Chunking**: Upload PDF, TXT, or Markdown documents with automatic chunking and embedding.
- **Vector Search with Chroma**: Fast similarity search on pre-indexed or uploaded knowledge bases.
- **Grounding with Citations**: Responses include page numbers and excerpt references from source documents.
- **Sleek Web Interface**: Responsive, glassmorphic dark-mode UI with chat history, instant search (⌘K), and document switching.
- **Ready for Deployment**: Includes `Dockerfile`, `Procfile`, and dynamic port configuration for 1-click cloud deployment.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn.
- **AI / Embeddings**: LangChain, Google Generative AI (`gemini-2.5-flash`, `gemini-embedding-2-preview`).
- **Vector Store**: Chroma DB.
- **Frontend**: Modern Vanilla JS, CSS3, HTML5.

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/premshaw04/AgenticAI_project.git
cd AgenticAI_project
```

### 2. Set up virtual environment
```bash
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure environment variables
Create a `.env` file in the root directory (based on `.env.example`):
```env
GOOGLE_API_KEY=your_gemini_api_key_here
PORT=8000
```
> Get your free Gemini API key from [Google AI Studio](https://aistudio.google.com/).

### 5. Run the application
```bash
python server.py
```
Open your browser and navigate to `http://localhost:8000`.

---

## 🌐 Cloud Deployment

### Deploy to Render
1. Connect this repository to a new **Web Service** on [Render](https://render.com).
2. Set:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
3. Add Environment Variable:
   - `GOOGLE_API_KEY` = *your Gemini API key*
   - `ENV` = `production`

### Deploy with Docker
```bash
docker build -t cosmic-rag .
docker run -p 8000:8000 -e GOOGLE_API_KEY="your_api_key_here" cosmic-rag
```

---

## 📄 License
MIT License. Feel free to use and customize!
