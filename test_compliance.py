"""
Quick test script for Compliance Intelligence Module
"""
import asyncio
from src.provider_data_validation.compliance.sanction_ingestion import ingest_sanctions
from src.provider_data_validation.compliance.sanction_checker import check_sanctions, check_provider
from src.provider_data_validation.compliance.compliance_engine import calculate_cri
from src.provider_data_validation.compliance_store import load_sanctions, load_statuses


async def test_compliance_module():
    print("=" * 60)
    print("Compliance Intelligence Module - Test Suite")
    print("=" * 60)
    
    # Test 1: Sanction Ingestion
    print("\n[1/5] Testing Sanction Ingestion...")
    try:
        result = await ingest_sanctions()
        print(f"✓ Ingestion successful!")
        print(f"  - OIG records: {result['oig_records']}")
        print(f"  - SAM records: {result['sam_records']}")
        print(f"  - Total: {result['total']}")
    except Exception as e:
        print(f"✗ Ingestion failed: {e}")
    
    # Test 2: Load Sanctions
    print("\n[2/5] Testing Sanction Storage...")
    try:
        sanctions = load_sanctions()
        print(f"✓ Loaded {len(sanctions)} sanctions from storage")
        if len(sanctions) > 0:
            print(f"  - Sample: {sanctions[0]['full_name']} ({sanctions[0]['source']})")
    except Exception as e:
        print(f"✗ Storage load failed: {e}")
    
    # Test 3: Fuzzy Matching
    print("\n[3/5] Testing Fuzzy Name Matching...")
    try:
        # Test with a common name (likely to have matches)
        matches = check_sanctions("John Smith", threshold=70)
        print(f"✓ Found {len(matches)} matches for 'John Smith'")
        if len(matches) > 0:
            print(f"  - Top match: {matches[0]['matched_name']} ({matches[0]['similarity_score']}% similar)")
    except Exception as e:
        print(f"✗ Fuzzy matching failed: {e}")
    
    # Test 4: Provider Compliance Check
    print("\n[4/5] Testing Provider Compliance Check...")
    try:
        test_provider = {
            "id": "test-001",
            "full_name": "Dr. John Smith",
            "first_name": "John",
