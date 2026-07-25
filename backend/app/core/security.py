"""
Encrypt GitHub access tokens before storing them in Postgres.
Uses Fernet (symmetric encryption) with TOKEN_ENCRYPTION_KEY from .env.
"""

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


def _fernet() -> Fernet:
    settings = get_settings()
    return Fernet(settings.token_encryption_key.encode("utf-8"))


def encrypt_token(plain_token: str) -> str:
    """Turn a plaintext GitHub token into a ciphertext string for the DB."""
    return _fernet().encrypt(plain_token.encode("utf-8")).decode("utf-8")


def decrypt_token(cipher_token: str) -> str:
    """Restore a plaintext GitHub token from the DB ciphertext."""
    try:
        return _fernet().decrypt(cipher_token.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Could not decrypt access token — check TOKEN_ENCRYPTION_KEY") from exc
