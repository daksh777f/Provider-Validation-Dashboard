<div align="center">

# Provider Data Validation System

**AI-Native Healthcare Provider Credentialing with Async SMS Verification**

<img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
<img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
<img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
<img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
<img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=FastAPI&logoColor=white" alt="FastAPI" />
<img src="https://img.shields.io/badge/CrewAI-FF7B00?style=for-the-badge&logoColor=white" alt="CrewAI" />
<img src="https://img.shields.io/badge/Ollama-FFFFFF?style=for-the-badge&logo=ollama&logoColor=black" alt="Ollama" />
<img src="https://img.shields.io/badge/Twilio-F22F46?style=for-the-badge&logo=twilio&logoColor=white" alt="Twilio" />
<img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />

</div>

---

## Demo

[![Demo](abc.png)](https://drive.google.com/file/d/1vFGxHLnD_6z_FDpSSSlDY5V1593uwa78/view?usp=sharing)


---

## What This Actually Does

Healthcare provider credentialing is historically slow, fragmented, and prone to **silent data drift**. When a provider updates their address on a state license board but not on their NPI profile, it creates **compliance risks**. I built this system to completely automate the cross-referencing of that data without relying on expensive, black-box third-party APIs.

The system takes a provider's basic payload and dispatches a **CrewAI multi-agent pipeline** to scrape and query five independent sources simultaneously: the NPI registry, state license boards, hospital rosters, map listings, and clinic websites. I parse the structured data with **deterministic rules** and hand the unstructured HTML off to a **local Ollama LLM** (Llama 3.1) for fuzzy extraction. 

The pipeline feeds everything into a strict **weighted penalty algorithm** to generate a final confidence score. If that score dips below 90%, the backend fires a **non-blocking Twilio SMS** to the provider's phone asking them to verify a specific mutable field (like an address). When they reply, a webhook catches it, recalculates the score, and pushes the live update directly to the React dashboard via **WebSockets**.

---

## Why This Is Technically Interesting

**Zero-Latency Orchestration:** The **FastAPI** backend never blocks. All data scraping, LLM inference, and SMS webhook waiting happens **asynchronously**.  
**Local-First AI Integration:** By using **Ollama** and Llama 3.1, I ensure **zero Protected Health Information (PHI)** ever leaves the infrastructure during the validation phase.  
**Hybrid Inference Pipeline:** LLMs hallucinate. To prevent this, I built a routing layer that forces structured data through **deterministic Regex/Hash checkers**, leaving only the messy, unstructured clinic website HTML for the LLM to parse.  
**Async State Machine:** The **Twilio SMS** verification flow uses a detached state machine. The server fires the SMS, saves a `PENDING` session, and drops the thread until the webhook wakes it back up.  

---

## Architecture & Workflow

### Architecture

```mermaid
flowchart TB
    %% Styling Definitions
    classDef frontend fill:#20232A,stroke:#61DAFB,stroke-width:2px,color:#fff
    classDef backend fill:#009688,stroke:#fff,stroke-width:2px,color:#fff
    classDef aiLayer fill:#FF7B00,stroke:#fff,stroke-width:2px,color:#fff
    classDef dataSrc fill:#2496ED,stroke:#fff,stroke-width:2px,color:#fff
    classDef external fill:#F22F46,stroke:#fff,stroke-width:2px,color:#fff

    subgraph User_Interface ["Frontend Layer (React / Vite)"]
        UI[Dashboard UI]:::frontend
        Map[Interactive WorldMap]:::frontend
        Details[Provider Details View]:::frontend
    end

    subgraph API_Gateway ["Backend Services (FastAPI)"]
        Router[API Router]:::backend
        Auth[Auth & Rate Limiting]:::backend
        Orchestrator[Validation Orchestrator]:::backend
        Webhooks[Twilio Webhooks]:::backend
    end

    subgraph AI_Engine ["AI Validation Core (CrewAI + Ollama)"]
        Agent1[Data Extraction Agent]:::aiLayer
        Agent2[Discrepancy Analyzer]:::aiLayer
        Agent3[Confidence Scoring]:::aiLayer
        LLM[(Local LLM - Llama 3.1)]:::aiLayer
    end

    subgraph External_Integrations ["Third-Party & Data Sources"]
        NPI[(NPI Registry)]:::dataSrc
        License[(State License Board)]:::dataSrc
        Hospital[(Hospital Rosters)]:::dataSrc
        Twilio[Twilio SMS API]:::external
    end

    %% Flow connections
    UI <-->|REST API| Router
    Map --> Router
    Details --> Router
    
    Router --> Auth
    Auth --> Orchestrator
    Orchestrator --> Agent1
    Orchestrator --> Agent2
    Orchestrator --> Agent3
    
    Agent1 <--> LLM
    Agent2 <--> LLM
    Agent3 <--> LLM
    
    Agent1 -->|Scrapes/API| NPI
    Agent1 -->|Scrapes/API| License
    Agent1 -->|Scrapes/API| Hospital
    
    Webhooks <--> Twilio
    Orchestrator -->|Trigger SMS Verification| Twilio
```

### Workflow

```mermaid
%%{init: {"theme": "base", "themeVariables": {"background": "#0d1117", "primaryColor": "#161b22", "primaryTextColor": "#e6edf3", "primaryBorderColor": "#8b949e", "lineColor": "#58a6ff", "actorBkg": "#161b22", "actorTextColor": "#e6edf3", "signalColor": "#e6edf3", "signalTextColor": "#e6edf3", "noteBkgColor": "#1f6feb", "noteTextColor": "#ffffff", "noteBorderColor": "#58a6ff"}}}%%
sequenceDiagram
    autonumber
    
    actor Admin as Healthcare Admin
    participant UI as React Dashboard
    participant API as FastAPI Backend
    participant Orchestrator as CrewAI Orchestrator
    participant Sources as Registries & Databases
    participant Twilio as Twilio Webhook Service
    actor Doc as Provider Mobile
    
    note over Admin,Doc: Phase 1: Data Submission
    Admin->>UI: Submit Provider Payload
    activate UI
    UI->>API: POST /validate
    activate API
    API->>Orchestrator: Trigger Multi-Agent Pipeline
    activate Orchestrator
    
    note over Admin,Doc: Phase 2: Parallel Data Extraction
    Orchestrator->>Sources: Async Queries (NPI, License, Hospital)
    activate Sources
    Sources-->>Orchestrator: Return Structured & Unstructured Data
    deactivate Sources
    
    note over Admin,Doc: Phase 3: AI Discrepancy Analysis
    Orchestrator->>Orchestrator: Fuzzy Match Addresses & Names
    Orchestrator->>Orchestrator: Apply Weighted Penalty Matrix
    Orchestrator-->>API: Yield Final Confidence Score (e.g. 74%)
    deactivate Orchestrator
    
    alt Confidence Score < 90% (Requires Action)
        note over Admin,Doc: Phase 4: Interactive Resolution
        API->>Twilio: Initiate SMS Verification Session
        activate Twilio
        Twilio->>Doc: SMS: "Verify Mercy Health affiliation..."
        activate Doc
        Doc-->>Twilio: SMS Reply: "YES" (or Correction)
        deactivate Doc
        Twilio-->>API: Webhook Callback with Updated State
        deactivate Twilio
        API->>API: Adjust Score based on Provider Input
    end
    
    note over Admin,Doc: Phase 5: Finalization
    API-->>UI: Return Validated Provider Object
    deactivate API
    UI-->>Admin: Render Detailed Validation Report & Logs
    deactivate UI
```

---

## How It Works

### 1. Multi-Agent Pipeline
Instead of one massive prompt, **CrewAI** orchestrates three isolated agents: an **Extraction Agent** that asynchronously scrapes the 5 data sources, an **Analyzer** for name/address fuzzy matching, and a **Scoring Agent** to finalize results.

### 2. Weighted Scoring Algorithm
Confidence isn't an arbitrary LLM guess. A **deterministic algorithm** starts at 100% and strictly deducts points based on:
- **Identity:** 25% | **License:** 20% | **Location:** 20% | **Specialty:** 15% | **Hospital:** 10% | **Consistency:** 10%

### 3. Async State Machine
To handle SMS verification without blocking, **FastAPI** logs a `PENDING` token and drops the connection. Twilio's async reply hits a `/verify/webhook`, updating the DB and instantly pushing to the UI via **WebSockets**.

### 4. Hybrid Routing
I explicitly prevent the LLM from touching **structured registry JSON**. That data routes through **deterministic Python logic**, reserving the local **Ollama LLM** solely for parsing unstructured HTML.

---

## Performance

> **Note:** All benchmarks measured against mock data in a local development environment. Real-world production results will vary based on hardware and network conditions.

| Metric | Measurement | Notes |
| :--- | :--- | :--- |
| **Accuracy** | 98.5% | Drift detection against baseline mock set |
| **Latency** | < 5s | Average verification time per provider |
| **Throughput** | ~200ms API | Average API routing latency (excluding LLM inference) |

---

## Tech Stack & Design Decisions

| Technology | Role | Why This, Not X |
| :--- | :--- | :--- |
| **FastAPI** | Backend API | Over Express/Django: First-class **async support** makes managing long-running agentic tasks and webhooks trivial. |
| **React + TypeScript** | Frontend UI | Over Vanilla JS: **Strict typing** prevents runtime errors when handling complex, deeply nested JSON responses from the validation engine. |
| **CrewAI** | Agent Orchestration | Over LangChain: Forces a highly opinionated, **role-based architecture** which is perfect for isolating extraction vs. analysis tasks. |
| **Ollama (Llama 3.1)** | Local Inference | Over OpenAI API: Guarantees that **zero PHI** leaves the local infrastructure, ensuring immediate HIPAA compliance during validation. |
| **Twilio** | SMS Gateway | Industry standard for reliable, **webhook-driven async communication**. |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Ollama (installed locally with `llama3.1:latest` pulled)
- Docker (optional, for isolated deployments)

### 1. Clone & Configure
```bash
git clone <repository-url>
cd provider_data_validation

# Copy environment variables
cp .env.example .env
```
Ensure your `.env` has:
```ini
DEMO_MODE=true
OLLAMA_MODEL=llama3.1:latest
API_PORT=8000
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
```

### 2. Start the Backend
**Mac / Linux:**
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn src.provider_data_validation.api:app --reload --port 8000
```
**Windows:**
```cmd
scripts\install.bat
scripts\start_system.bat
```

### 3. Start the Frontend
**Mac / Linux / Windows:**
```bash
cd external_frontend
npm install
npm run dev
```
Access the dashboard at `http://localhost:5173`.

---

## API Reference

### Core Endpoints
- `POST /validate` - Trigger a validation pipeline for a single provider
- `POST /batch/validate` - Trigger batch validation
- `POST /verify/webhook` - Twilio callback handler
- `GET /stats` - Fetch system health and verification statistics

### Example: `/validate`

**Request:**
```bash
curl -X POST http://localhost:8000/validate \
  -H "Content-Type: application/json" \
  -d '{
    "npi": "1234567890",
    "first_name": "John",
    "last_name": "Doe",
    "specialty": "Cardiology",
    "state": "CA",
    "phone": "+12345678900"
  }'
```
