import os
import uuid

from fastapi import HTTPException, UploadFile

from app.core.config import settings

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
DOC_EXT = IMAGE_EXT | {".pdf"}
MAX_BYTES = 10 * 1024 * 1024


def save_upload(file: UploadFile, subdir: str, prefix: str, allowed_ext=IMAGE_EXT) -> str:
    """Validates type/size and stores the file under UPLOAD_DIR/subdir. Returns its public URL."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_ext:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext or 'none'}'. Allowed: {', '.join(sorted(allowed_ext))}")
    data = file.file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")
    folder = os.path.join(settings.UPLOAD_DIR, subdir)
    os.makedirs(folder, exist_ok=True)
    name = f"{prefix}_{uuid.uuid4().hex[:12]}{ext}"
    with open(os.path.join(folder, name), "wb") as fh:
        fh.write(data)
    return f"/uploads/{subdir}/{name}"
