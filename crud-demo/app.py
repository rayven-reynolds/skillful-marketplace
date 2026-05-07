"""
Tiny FastAPI CRUD demo (in-memory).

Two resources — ``User`` and ``Listing`` — with HTTP Basic auth wired into
Swagger so the **Authorize** button prompts for an email + password directly.

Permissions
-----------
* Anyone (authenticated) can list users and listings.
* Only **sellers** can create listings.
* A seller can only edit / delete their **own** listings (cross-tenant edits
  return 403 Forbidden).

Run
---
::

    cd crud-demo
    source .venv/bin/activate
    pip install -r requirements.txt
    uvicorn app:app --reload

Then open http://127.0.0.1:8000/docs.
"""

from __future__ import annotations

from enum import Enum
from secrets import compare_digest
from typing import Annotated, Dict, Optional, Tuple

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class Role(str, Enum):
    """Account role gating which actions a user can perform."""

    buyer = "buyer"
    seller = "seller"


class Condition(str, Enum):
    """Listing condition — fixed vocabulary for clean filtering."""

    new = "new"
    like_new = "like_new"
    good = "good"
    fair = "fair"
    poor = "poor"


class User(BaseModel):
    """Public user fields. Passwords are stored separately, never returned."""

    id: int
    email: EmailStr
    full_name: str
    favorite_pokemon: str
    role: Role


class Listing(BaseModel):
    """A marketplace listing owned by exactly one seller."""

    id: int
    name: str
    price: float = Field(ge=0)
    condition: Condition
    user_id: int


class ListingCreate(BaseModel):
    """Body for ``POST /listings``."""

    name: str = Field(min_length=1, max_length=200)
    price: float = Field(ge=0)
    condition: Condition

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"name": "Holo Mewtwo card", "price": 175.00, "condition": "like_new"}
        }
    )


class ListingUpdate(BaseModel):
    """Body for ``PUT /listings/{id}``. All fields optional for partial updates."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    price: Optional[float] = Field(default=None, ge=0)
    condition: Optional[Condition] = None


# ---------------------------------------------------------------------------
# In-memory "database" + seed data
# ---------------------------------------------------------------------------


# id -> (User, password)
USERS: Dict[int, Tuple[User, str]] = {
    1: (
        User(id=1, email="alice@example.com", full_name="Alice Anderson",
             favorite_pokemon="Bulbasaur", role=Role.seller),
        "alice123",
    ),
    2: (
        User(id=2, email="bob@example.com", full_name="Bob Brown",
             favorite_pokemon="Charmander", role=Role.seller),
        "bob123",
    ),
    3: (
        User(id=3, email="carol@example.com", full_name="Carol Carter",
             favorite_pokemon="Squirtle", role=Role.buyer),
        "carol123",
    ),
}

LISTINGS: Dict[int, Listing] = {
    1: Listing(id=1, name="Vintage Game Boy", price=85.00, condition=Condition.good, user_id=1),
    2: Listing(id=2, name="Holo Charizard card", price=220.00, condition=Condition.like_new, user_id=1),
    3: Listing(id=3, name="Pikachu plush", price=15.50, condition=Condition.new, user_id=1),
}

_next_listing_id = max(LISTINGS) + 1


def _allocate_listing_id() -> int:
    """Mint a fresh sequential listing id."""

    global _next_listing_id
    new_id = _next_listing_id
    _next_listing_id += 1
    return new_id


# ---------------------------------------------------------------------------
# Auth (HTTP Basic — Swagger renders an Authorize popup automatically)
# ---------------------------------------------------------------------------


security = HTTPBasic(description="Log in with your email + password.")


def get_current_user(
    credentials: Annotated[HTTPBasicCredentials, Depends(security)],
) -> User:
    """
    Resolve the User attached to the request via HTTP Basic credentials.

    The ``username`` field carries the email address. ``compare_digest`` is
    used so credential comparison is constant-time.

    Args:
        credentials: Decoded ``Authorization: Basic ...`` header.

    Returns:
        User: Matching public user record.

    Raises:
        HTTPException: 401 when no user matches.
    """

    submitted_email = credentials.username.encode("utf-8")
    submitted_password = credentials.password.encode("utf-8")
    for user, password in USERS.values():
        email_match = compare_digest(submitted_email, user.email.encode("utf-8"))
        pw_match = compare_digest(submitted_password, password.encode("utf-8"))
        if email_match and pw_match:
            return user
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password.",
        headers={"WWW-Authenticate": "Basic"},
    )


def require_seller(user: Annotated[User, Depends(get_current_user)]) -> User:
    """Allow only sellers — buyers receive 403 Forbidden."""

    if user.role != Role.seller:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only sellers can perform this action.",
        )
    return user


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------


DESCRIPTION = """
A tiny in-memory FastAPI CRUD demo with two resources (users and listings)
and HTTP Basic authentication wired into Swagger.

### Demo accounts (seeded on every restart)

| Role   | Email                | Password   |
|--------|----------------------|------------|
| seller | `alice@example.com`  | `alice123` |
| seller | `bob@example.com`    | `bob123`   |
| buyer  | `carol@example.com`  | `carol123` |

Click the green **Authorize** button at the top-right and paste an email +
password to try the protected endpoints.

### Permissions
* `GET /listings` and `GET /listings/{id}` — any authenticated user.
* `POST /listings` — sellers only.
* `PUT /listings/{id}` and `DELETE /listings/{id}` — only the seller who owns
  the listing. Cross-tenant edits return **403 Forbidden**.
"""

app = FastAPI(
    title="CRUD Demo API",
    version="1.0.0",
    description=DESCRIPTION,
    swagger_ui_parameters={"persistAuthorization": True, "tryItOutEnabled": True},
)


@app.get("/", include_in_schema=False)
def _root() -> RedirectResponse:
    """Redirect the bare root to the interactive Swagger UI."""

    return RedirectResponse(url="/docs")


# ---------------------------------------------------------------------------
# User routes (read-only — seeded users)
# ---------------------------------------------------------------------------


@app.get("/users/me", response_model=User, tags=["users"], summary="Who am I?")
def read_me(user: Annotated[User, Depends(get_current_user)]) -> User:
    """Return the currently authenticated user."""

    return user


@app.get("/users", response_model=list[User], tags=["users"], summary="List all users")
def list_users(_: Annotated[User, Depends(get_current_user)]) -> list[User]:
    """Return every seeded user. Auth required (any role)."""

    return [user for user, _password in USERS.values()]


# ---------------------------------------------------------------------------
# Listing routes (CRUD)
# ---------------------------------------------------------------------------


@app.get("/listings", response_model=list[Listing], tags=["listings"], summary="List all listings")
def list_listings(_: Annotated[User, Depends(get_current_user)]) -> list[Listing]:
    """Anyone authenticated (buyers + sellers) can browse the catalog."""

    return list(LISTINGS.values())


@app.get(
    "/listings/{listing_id}",
    response_model=Listing,
    tags=["listings"],
    summary="Get a single listing",
    responses={404: {"description": "Listing does not exist."}},
)
def get_listing(listing_id: int, _: Annotated[User, Depends(get_current_user)]) -> Listing:
    """Read one listing by id. Auth required (any role)."""

    listing = LISTINGS.get(listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found.")
    return listing


@app.post(
    "/listings",
    response_model=Listing,
    status_code=201,
    tags=["listings"],
    summary="Create a listing (seller only)",
    responses={
        403: {"description": "Caller is a buyer, not a seller."},
    },
)
def create_listing(
    payload: ListingCreate,
    seller: Annotated[User, Depends(require_seller)],
) -> Listing:
    """Create a new listing owned by the authenticated seller."""

    new_listing = Listing(
        id=_allocate_listing_id(),
        name=payload.name,
        price=payload.price,
        condition=payload.condition,
        user_id=seller.id,
    )
    LISTINGS[new_listing.id] = new_listing
    return new_listing


@app.put(
    "/listings/{listing_id}",
    response_model=Listing,
    tags=["listings"],
    summary="Update one of MY listings (seller-only, owner-only)",
    responses={
        403: {"description": "Authenticated, but you are not the owner of this listing."},
        404: {"description": "Listing does not exist."},
    },
)
def update_listing(
    listing_id: int,
    payload: ListingUpdate,
    seller: Annotated[User, Depends(require_seller)],
) -> Listing:
    """
    Partial-update a listing the caller owns.

    A seller editing **another** seller's listing receives ``403 Forbidden``.
    """

    listing = LISTINGS.get(listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found.")
    if listing.user_id != seller.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own listings.",
        )
    updated = listing.model_copy(
        update={k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    )
    LISTINGS[listing_id] = updated
    return updated


@app.delete(
    "/listings/{listing_id}",
    tags=["listings"],
    summary="Delete one of MY listings (seller-only, owner-only)",
    responses={
        403: {"description": "Authenticated, but you are not the owner of this listing."},
        404: {"description": "Listing does not exist."},
    },
)
def delete_listing(
    listing_id: int,
    seller: Annotated[User, Depends(require_seller)],
) -> dict:
    """Delete a listing the caller owns. Cross-tenant deletes return 403."""

    listing = LISTINGS.get(listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found.")
    if listing.user_id != seller.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own listings.",
        )
    del LISTINGS[listing_id]
    return {"deleted": listing_id}
