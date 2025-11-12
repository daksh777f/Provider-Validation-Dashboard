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
