import os
import time
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List
from pydantic import BaseModel
from app.core.auth import require_role
from app.models.models import User, UserRole
from app.services.rag_service import rag_service
from app.core.config import settings

router = APIRouter(prefix="/api/knowledge", tags=["Knowledge Base (Admin)"])


class TextIngestRequest(BaseModel):
    title: str
    content: str
    category: str = "general"


def _uploaded_by_name(current_user: User) -> str:
    name = getattr(current_user, "name", None)
    if isinstance(name, str) and name.strip():
        return name.strip()
    return "admin"


@router.get("/documents", response_model=List[dict])
def list_documents(current_user: User = Depends(require_role(UserRole.admin))):
    return rag_service.list_documents()


@router.post("/ingest/text")
def ingest_text(
    data: TextIngestRequest,
    current_user: User = Depends(require_role(UserRole.admin))
):
    if not data.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Content is required")
    if len(data.content) < 50:
        raise HTTPException(status_code=400, detail="Content too short (minimum 50 characters)")

    uploaded_by = _uploaded_by_name(current_user)
    result = rag_service.ingest_text(
        title=data.title.strip(),
        content=data.content.strip(),
        category=data.category,
        uploaded_by=uploaded_by
    )
    return {"success": True, "message": f"Ingested '{result['title']}' — {result['chunks']} chunks added", **result}


@router.post("/ingest/file")
async def ingest_file(
    file: UploadFile = File(...),
    title: str = Form(...),
    category: str = Form("general"),
    current_user: User = Depends(require_role(UserRole.admin))
):
    filename = file.filename or "upload"
    ext = os.path.splitext(filename)[1].lower()
    allowed = [".pdf", ".txt", ".md"]
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"File type not supported. Use: {', '.join(allowed)}")
    if not title.strip():
        raise HTTPException(status_code=400, detail="Title is required")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    safe_name = f"{int(time.time())}_{filename.replace(' ', '_')}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_name)

    with open(file_path, "wb") as f:
        content_bytes = await file.read()
        f.write(content_bytes)

    uploaded_by = _uploaded_by_name(current_user)

    try:
        result = rag_service.ingest_file(
            file_path=file_path,
            title=title.strip(),
            category=category,
            uploaded_by=uploaded_by
        )
        return {
            "success": True,
            "message": f"File '{result['title']}' ingested — {result['chunks']} chunks added",
            **result
        }
    except ValueError as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")


@router.delete("/documents/{doc_id}")
def delete_document(
    doc_id: str,
    current_user: User = Depends(require_role(UserRole.admin))
):
    try:
        result = rag_service.delete_document(doc_id)
        return {
            "success": True,
            "message": f"Deleted {result['deleted_chunks']} chunks for document '{doc_id}'",
            **result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
def get_kb_stats(current_user: User = Depends(require_role(UserRole.admin))):
    assert rag_service.vectorstore is not None
    total_chunks = rag_service.vectorstore._collection.count()
    docs = rag_service.list_documents()
    # 5 default SOPs: HR, Finance, Admin, IT onboarding + Offboarding
    default_doc_count = 5
    return {
        "total_chunks": total_chunks,
        "custom_documents": len(docs),
        "default_documents": default_doc_count,
        "total_documents": len(docs) + default_doc_count,
        "categories": list({d["category"] for d in docs}) if docs else []
    }
