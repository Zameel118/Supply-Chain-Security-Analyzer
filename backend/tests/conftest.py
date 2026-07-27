"""
Pytest bootstrap: allow a clean clone to run tests without a local .env.

Must set secrets before any `app.*` import — `app.core.database` calls
`get_settings()` at module load, which rejects missing keys.
"""

from __future__ import annotations

import os

# Fixed test-only values (never used in production). Fernet key = url-safe
# base64 of 32 zero bytes — valid format for cryptography.Fernet.
os.environ.setdefault("SECRET_KEY", "pytest-only-secret-key-not-for-production")
os.environ.setdefault(
    "TOKEN_ENCRYPTION_KEY",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
)
