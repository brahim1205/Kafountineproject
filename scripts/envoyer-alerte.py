#!/usr/bin/env python3
"""Envoie le fichier passé en argument par e-mail (SMTP SSL), sujet dans ALERT_SUBJECT.

Variables : ALERT_EMAIL (destinataire), ALERT_SMTP_USER, ALERT_SMTP_PASSWORD,
ALERT_SMTP_HOST (défaut smtp.gmail.com), ALERT_SMTP_PORT (défaut 465).
"""
import os
import smtplib
import sys
from email.message import EmailMessage


def main() -> None:
    with open(sys.argv[1], encoding="utf-8") as fichier:
        corps = fichier.read()
    message = EmailMessage()
    message["Subject"] = os.environ["ALERT_SUBJECT"]
    message["From"] = os.environ["ALERT_SMTP_USER"]
    message["To"] = os.environ["ALERT_EMAIL"]
    message.set_content(corps)
    hote = os.environ.get("ALERT_SMTP_HOST") or "smtp.gmail.com"
    port = int(os.environ.get("ALERT_SMTP_PORT") or "465")
    with smtplib.SMTP_SSL(hote, port, timeout=30) as smtp:
        smtp.login(os.environ["ALERT_SMTP_USER"], os.environ["ALERT_SMTP_PASSWORD"])
        smtp.send_message(message)


if __name__ == "__main__":
    main()
