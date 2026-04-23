"""Password hashing helpers."""

from passlib.context import CryptContext

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """
    Hash a plaintext password for persistent storage.

    Args:
        plain: User-provided password.

    Returns:
        str: bcrypt hash suitable for `password_hash` columns.
    """

    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """
    Verify a plaintext password against a stored bcrypt hash.

    Args:
        plain: Candidate password from the login form.
        hashed: Stored hash from the database.

    Returns:
        bool: True when the password matches.
    """

    return _pwd.verify(plain, hashed)
