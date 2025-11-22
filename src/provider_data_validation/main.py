#!/usr/bin/env python

import os
from .crews.notification_crew import NotificationCrew
import dotenv

dotenv.load_dotenv()
from .crews.data_intake_crew.data_intake_crew import ProviderIntakeCrew

def kickoff_notification_crew():
    """Send SMS or make a call using the notification crew."""
    to = os.getenv("NOTIFY_TO")
    action = os.getenv("NOTIFY_ACTION", "sms").lower()
    message = os.getenv("NOTIFY_MESSAGE")

    if not to:
        raise ValueError("NOTIFY_TO must be set (E.164 format).")

    crew = NotificationCrew().crew()

    if action == "sms":
        if not message:
            raise ValueError("NOTIFY_MESSAGE is required for SMS.")
        print(f"Sending SMS to {to} ...")
        result = crew.kickoff(inputs={"to": to, "message": message})

    elif action == "call":
        print(f"Calling provider at {to} ...")
        result = crew.kickoff(inputs={"to": to})

    else:
        raise ValueError("NOTIFY_ACTION must be 'sms' or 'call'.")

    print("Crew result:", result.raw)

def kickoff_data_intake_crew():
    """Test the data intake crew with sample provider data."""
    inputs = {
        "provider_name": "   Dr Aarav   Mehta ",
        "phone": "8123456789",
        "address": "",
        "specialty": "",
        "license_no": "DL-2024-1901"
    }

    # Enable the PDF tool only if a pdf_path was provided.
    use_pdf_tool = "pdf_path" in inputs and bool(inputs["pdf_path"])
    crew = ProviderIntakeCrew(use_pdf_tool=use_pdf_tool).crew()

