from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv
from langchain_chroma import Chroma
import os

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

loader = PyPDFLoader(
           file_path = "document_loaders/GRU.pdf",
)

docs = loader.load()
print("Number of pages:", len(docs))
# print("\n First Page:", docs[0].page_content)
# print("\nMetaData", docs[0].metadata)


text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000, 
    chunk_overlap=200
    )
chunks = text_splitter.split_documents(docs)

embedding_model = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-2-preview",
    google_api_key=api_key,
)

vector = embedding_model.embed_query(chunks[0].page_content)
print("Length of vector:",len(vector))

vector_db = Chroma.from_documents(
    documents = chunks,
    embedding = embedding_model,
    persist_directory = "./vector_db"
)

print("Vector database created successfully!", vector_db._collection.count())