import smtplib
from collections import deque
from email.message import EmailMessage

from app.core.config import settings

# Last messages, for local inspection and tests when no SMTP server is configured
outbox = deque(maxlen=50)


def send_email(to: str, subject: str, body: str) -> None:
    outbox.append({"to": to, "subject": subject, "body": body})
    if not settings.SMTP_HOST:
        print(f"[MAIL] (no SMTP_HOST set) To: {to} | {subject}\n{body}")
        return
    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
        if settings.SMTP_USE_TLS:
            smtp.starttls()
        if settings.SMTP_USER:
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.send_message(msg)
