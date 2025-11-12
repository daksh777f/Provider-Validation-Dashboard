import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional

DATA_DIR = Path(__file__).parent / "_compliance_data"
DATA_DIR.mkdir(exist_ok=True)
SANCTIONS_FILE = DATA_DIR / "sanction_registry.json"
STATUS_FILE = DATA_DIR / "provider_compliance_status.json"


def _load_json(path: Path) -> Any:
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text())
    except Exception:
        return []


def _save_json(path: Path, data: Any):
    path.write_text(json.dumps(data, default=str, indent=2))


def load_sanctions() -> List[Dict[str, Any]]:
    return _load_json(SANCTIONS_FILE)


def save_sanctions(records: List[Dict[str, Any]]):
    _save_json(SANCTIONS_FILE, records)


