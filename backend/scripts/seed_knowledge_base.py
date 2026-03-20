"""
Run this script to seed / re-seed the RAG knowledge base.
Usage: python scripts/seed_knowledge_base.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.rag_service import rag_service

if __name__ == "__main__":
    print("🔄 Seeding knowledge base...")
    count = rag_service.vectorstore._collection.count()
    print(f"   Current chunks in store: {count}")
    if count == 0:
        rag_service.seed_knowledge_base()
    else:
        print("   Knowledge base already seeded. To re-seed, delete the chroma_db folder and run again.")
    print(f"   Total chunks after seed: {rag_service.vectorstore._collection.count()}")
    print("✅ Done.")
