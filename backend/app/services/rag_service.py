import os
import json
import re
from typing import List, Optional
from datetime import datetime
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.schema import Document
from app.core.config import settings

DEFAULT_DOCUMENTS = {
    "onboarding_hr": """
# HR Onboarding Checklist

This checklist covers all tasks owned by the HR department during employee onboarding.

## Steps

1. Buddy Allocation — Assign a buddy to the new employee for their first few weeks.
2. Floorwalk — Conduct a tour of the office space for the new joiner.
3. Office Space Allocation — Ensure a workstation or desk is allocated before Day 1.
4. Laptop/Desktop Allocation — Coordinate with IT to ensure the device is ready.
5. Paper work — Collect all required joining documents from the employee.
6. NDA — Get the Non-Disclosure Agreement signed by the employee.
7. Appointment Letter Generation — Generate and share the appointment letter.
8. Email ID — Ensure the employee's official email ID is created.
9. Teams — Add the employee to Microsoft Teams.
10. Induction Mail — Send the induction welcome email with schedule and details.
11. Employee ID updated in HRMS — Update the system with the new employee ID.
12. Date of Birth as per proofs submitted updated in HRMS — Verify and update DOB.
13. Employee Contact Number updated in HRMS — Record primary phone number.
14. Emergency Contact Number updated in HRMS — Record emergency contact details.
15. Blood Group in HRMS — Record blood group for medical records.
16. Buddy + RM introduction — Formally introduce the buddy and reporting manager.
17. Welcome Mailer — Send the company-wide welcome mailer for the new joiner.
18. HRMS Account creation — Create login credentials for the HR Management System.
19. Leaves Uploaded in HRMS — Upload the leave balance for the current year.
20. Credentials shared with resource — Share HRMS login credentials securely.
21. Birthday + Anniversary + Photo in HRMS — Upload photo and personal dates.
22. Leaves Tracker Updated — Update the shared leaves tracker spreadsheet.
23. Unit Head Orientation session — Schedule and conduct the Unit Head orientation.
24. L1 Orientation — Conduct the Level 1 orientation with the direct manager.
25. BGV — Initiate and track Background Verification with the BGV agency.
""",

    "onboarding_finance": """
# Finance Onboarding Checklist

This checklist covers all tasks owned by the Finance department during employee onboarding.

## Steps

1. Appointment Letter — Verify that the appointment letter has been issued by HR.
2. KYC Update — Collect and update KYC documents (Aadhaar, PAN, etc.) in finance records.
3. Medical Insurance — Enroll the employee in the company medical insurance policy.
4. IT Declaration — Collect the IT (Income Tax) declaration form from the employee.
5. HDFC Salary Account — Open or link the HDFC salary account for the employee.
6. SLA Met — Confirm all Finance tasks are completed within the SLA period.
7. Department — Record the employee's department in the Finance system.
""",

    "onboarding_admin": """
# Admin / HR Admin Onboarding Checklist

This checklist covers all tasks owned by the Admin department during employee onboarding.

## Steps

1. Logistics Feedback from Employees — Collect feedback on relocation or logistics if applicable.
2. Office space allocation — Ensure desk, chair, and workspace are properly assigned.
3. Biometric registration — Register the employee's biometric (fingerprint/face) at the office.
4. Id card - Soft copy — Issue a soft copy of the employee ID card on or before Day 1.
5. Employee details — Collect and file all employee detail forms.
6. Doodle book for DC — Provide the Doodle book / welcome kit for the DC location.
7. Gramener Bag — Issue the company branded bag (Gramener Bag) to the employee.
8. Welcome Kit (Dispatched/In-transit/Received) — Track and confirm welcome kit delivery status.
9. Covid Insurance — Ensure COVID insurance or health coverage is activated.
""",

    "onboarding_it": """
# IT Onboarding Checklist

This checklist covers all tasks owned by the IT department during employee onboarding.

## Steps

1. Email — Create and configure the official email account.
2. DL (Distribution List) — Add the employee to relevant email distribution lists.
3. O365 — Set up Microsoft Office 365 license and account.
4. SharePoint — Grant access to the relevant SharePoint sites and document libraries.
5. PC/Laptop — Assign and configure a laptop or desktop for the employee.
6. Laptop Ship/Receive dates — Record the dates the laptop was shipped and received.
7. IT Asset Allocation Form — Get the IT Asset Acknowledgement Form signed by the employee.
8. Data card — Provide a data card (SIM/dongle) if applicable for the role.
9. Other Assets — Allocate any other IT accessories (mouse, keyboard, headset, monitor).
10. WiKi (Digital) — Grant access to the company Wiki or digital knowledge base.
11. Kaspersky/Sophos — Install and activate endpoint security (Kaspersky or Sophos).
12. Domain policies — Apply company domain policies to the device.
13. Onboarding Email — Send the IT onboarding email with all credentials and access details.
""",

    "offboarding": """
# Employee Offboarding / Relieving Process

## Overview
After receiving a resignation mail from an employee, the offboarding process must be completed across HR, IT, Admin, and Finance teams.

## Key Policy Rules
- LWD (Last Working Day) must be confirmed from the Reporting Manager within 2 weeks of the resignation mail.
- Exit mail must be sent to support@company.com one week before LWD.
- Relieving Letter and Service Letter will be issued by HR to the employee's personal email ID.
- FnF (Full & Final) sheet must be created with basic employee details and shared with HR.

## HR Steps
1. Confirm LWD from Reporting Manager within 2 weeks of resignation.
2. Send exit mail to support@company.com 1 week before LWD.
3. Collect Aadhaar card copy from the employee along with their home address and personal Gmail ID.
4. Share NDA with employee and follow up to get it signed on or before LWD.
5. Issue Relieving Letter to the employee's personal email ID.
6. Issue Service Letter to the employee's personal email ID.
7. Create FnF (Full & Final settlement) sheet with basic employee details and share with Finance/HR.
8. Update off-boarding tracker with all necessary details.

## IT Steps
9. Coordinate with the employee for laptop return before or on LWD.
10. Deactivate Email ID credentials — handled by the designated IT admin.
11. Update Laptop details in the S&H (Stock & Hardware) tracker — IT team is the owner of this sheet.
12. Revoke O365, SharePoint, and domain access.
13. Revoke all system and tool access (Slack, Jira, GitHub, VPN, CRM, etc.)

## Admin Steps
14. Collect ID card from employee on or before LWD.
15. Collect access card from employee on or before LWD.

## Finance Steps
16. Settle any pending expense claims or salary advances.
17. Process Full & Final (FnF) settlement — includes salary, leave encashment, PF transfer.
18. Issue No Dues Certificate after all clearances are complete.
""",
}

METADATA_FILE = os.path.join(settings.CHROMA_PERSIST_DIR, "ingested_docs_metadata.json")


def _load_metadata() -> list:
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, "r") as f:
            return json.load(f)
    return []


def _save_metadata(meta: list) -> None:
    os.makedirs(os.path.dirname(METADATA_FILE), exist_ok=True)
    with open(METADATA_FILE, "w") as f:
        json.dump(meta, f, indent=2)


def _clean_text(text: str) -> str:
    """Fix spaced-out PDF text and normalize whitespace."""
    text = re.sub(r'(?<=[a-zA-Z])\s{3,}(?=[a-zA-Z])', ' ', text)
    text = re.sub(r' {2,}', ' ', text)
    text = text.replace('\u25cf', '-').replace('\u2022', '-')
    return text.strip()


class RAGService:
    def __init__(self) -> None:
        self.embeddings: HuggingFaceEmbeddings = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2",
            model_kwargs={"device": "cpu"}
        )
        self.vectorstore: Optional[Chroma] = None
        self.persist_dir: str = settings.CHROMA_PERSIST_DIR
        self._initialize()

    def _initialize(self) -> None:
        os.makedirs(self.persist_dir, exist_ok=True)
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        self.vectorstore = Chroma(
            persist_directory=self.persist_dir,
            embedding_function=self.embeddings,
            collection_name="audit_knowledge"
        )
        if self.vectorstore._collection.count() == 0:
            self._seed_defaults()

    def _seed_defaults(self) -> None:
        assert self.vectorstore is not None
        splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=80)
        docs: List[Document] = []
        for process_name, content in DEFAULT_DOCUMENTS.items():
            chunks = splitter.create_documents(
                [content],
                metadatas=[{
                    "process": process_name,
                    "source": f"{process_name}_sop",
                    "doc_id": f"default_{process_name}",
                    "is_default": "true"
                }]
            )
            docs.extend(chunks)
        self.vectorstore.add_documents(docs)
        print(f"Seeded {len(docs)} default chunks into knowledge base.")

    # ---- Admin ingestion methods ----

    def ingest_text(self, title: str, content: str, category: str, uploaded_by: str) -> dict:
        assert self.vectorstore is not None
        doc_id = f"custom_{title.lower().replace(' ', '_')}_{int(datetime.utcnow().timestamp())}"
        splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=80)
        docs = splitter.create_documents(
            [content],
            metadatas=[{
                "process": category,
                "source": title,
                "doc_id": doc_id,
                "is_default": "false",
                "uploaded_by": uploaded_by
            }]
        )
        self.vectorstore.add_documents(docs)
        meta = _load_metadata()
        meta.append({
            "doc_id": doc_id,
            "title": title,
            "category": category,
            "uploaded_by": uploaded_by,
            "uploaded_at": datetime.utcnow().isoformat(),
            "chunk_count": len(docs),
            "type": "text",
            "file_path": None
        })
        _save_metadata(meta)
        return {"doc_id": doc_id, "chunks": len(docs), "title": title}

    def ingest_file(self, file_path: str, title: str, category: str, uploaded_by: str) -> dict:
        assert self.vectorstore is not None
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            content = "\n\n".join(page.extract_text() or "" for page in reader.pages)
        elif ext in [".txt", ".md"]:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        else:
            raise ValueError(f"Unsupported file type: {ext}. Use PDF, TXT, or MD.")

        if not content.strip():
            raise ValueError("File appears to be empty or could not be read.")

        doc_id = f"file_{title.lower().replace(' ', '_')}_{int(datetime.utcnow().timestamp())}"
        splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=80)
        docs = splitter.create_documents(
            [content],
            metadatas=[{
                "process": category,
                "source": title,
                "doc_id": doc_id,
                "is_default": "false",
                "uploaded_by": uploaded_by
            }]
        )
        self.vectorstore.add_documents(docs)
        meta = _load_metadata()
        meta.append({
            "doc_id": doc_id,
            "title": title,
            "category": category,
            "uploaded_by": uploaded_by,
            "uploaded_at": datetime.utcnow().isoformat(),
            "chunk_count": len(docs),
            "type": ext.lstrip("."),
            "file_path": file_path
        })
        _save_metadata(meta)
        return {"doc_id": doc_id, "chunks": len(docs), "title": title}

    def delete_document(self, doc_id: str) -> dict:
        assert self.vectorstore is not None
        if doc_id.startswith("default_"):
            raise ValueError("Default system documents cannot be deleted.")
        collection = self.vectorstore._collection
        results = collection.get(where={"doc_id": doc_id})
        ids_to_delete: List[str] = results.get("ids", [])
        if not ids_to_delete:
            raise ValueError(f"No chunks found for doc_id: {doc_id}")
        collection.delete(ids=ids_to_delete)
        meta = _load_metadata()
        record = next((m for m in meta if m["doc_id"] == doc_id), None)
        meta = [m for m in meta if m["doc_id"] != doc_id]
        _save_metadata(meta)
        if record and record.get("file_path") and os.path.exists(str(record["file_path"])):
            os.remove(str(record["file_path"]))
        return {"doc_id": doc_id, "deleted_chunks": len(ids_to_delete)}

    def list_documents(self) -> list:
        return _load_metadata()

    def retrieve_context(self, query: str, k: int = 5) -> List[Document]:
        assert self.vectorstore is not None
        return self.vectorstore.similarity_search(query, k=k)

    def get_llm_answer(self, query: str, context_docs: List[Document]) -> str:
        cleaned = [_clean_text(d.page_content) for d in context_docs]
        context = "\n\n".join(cleaned)

        prompt = (
            f'You are an internal HR and IT audit assistant. A user asked: "{query}"\n\n'
            f'Use the information below from the company internal documentation to give a clear, '
            f'well-structured answer with numbered steps where applicable. '
            f'Do NOT dump raw text. Summarize and explain in plain English.\n\n'
            f'DOCUMENTATION:\n{context}\n\nANSWER:'
        )

        groq_key = str(settings.GROQ_API_KEY).strip()

        if groq_key:
            try:
                from groq import Groq
                client = Groq(api_key=groq_key)
                completion = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=1024
                )
                answer = completion.choices[0].message.content or ""
                print("LLM answered via Groq")
                return answer
            except Exception as e:
                print(f"Groq error: {e}")

        print("No GROQ_API_KEY found - using smart fallback")
        return self._smart_fallback(query, context_docs)

    def _smart_fallback(self, query: str, context_docs: List[Document]) -> str:
        if not context_docs:
            return "No relevant information found in the knowledge base for your query."

        query_words = set(query.lower().split())
        all_sentences: List[tuple] = []

        for doc in context_docs:
            text = _clean_text(doc.page_content)
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+|\n', text) if len(s.strip()) > 25]
            for s in sentences:
                score = sum(1 for w in query_words if w in s.lower())
                all_sentences.append((score, s, doc.metadata.get('source', 'unknown')))

        all_sentences.sort(key=lambda x: x[0], reverse=True)
        top = [x for x in all_sentences if x[0] > 0][:8]
        if not top:
            top = all_sentences[:5]

        by_source: dict = {}
        for score, sentence, source in top:
            by_source.setdefault(source, []).append(sentence)

        lines = ["Note: Add GROQ_API_KEY to your .env file for full AI-powered answers.\n"]
        for source, sentences in by_source.items():
            lines.append(f"From {source}:")
            for i, s in enumerate(sentences, 1):
                lines.append(f"{i}. {s}")
            lines.append("")

        return "\n".join(lines)

    def query(self, question: str) -> dict:
        docs = self.retrieve_context(question)
        answer = self.get_llm_answer(question, docs)
        sources = list({d.metadata.get("source", "unknown") for d in docs})
        return {"answer": answer, "sources": sources, "chunks_used": len(docs)}


rag_service = RAGService()
