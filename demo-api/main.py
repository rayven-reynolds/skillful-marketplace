"""
Simple CRUD demo API — FastAPI + in-memory storage.

Models: User, Listing
Auth:   HTTP Basic (email + password), wired to Swagger Authorize button
Roles:  seller — list, get, create, update, delete OWN listings
        buyer  — list, get (read-only)
"""

from __future__ import annotations

import secrets
from enum import Enum
from typing import Annotated, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel, EmailStr

# ---------------------------------------------------------------------------
# Enums & models
# ---------------------------------------------------------------------------

class Role(str, Enum):
    buyer = "buyer"
    seller = "seller"


class User(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    favorite_pokemon: str
    role: Role


class Listing(BaseModel):
    id: int
    name: str
    price: float
    condition: str
    user_id: int  # seller's user id


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class ListingCreate(BaseModel):
    name: str
    price: float
    condition: str


class ListingUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    condition: Optional[str] = None


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    favorite_pokemon: str
    role: Role


# ---------------------------------------------------------------------------
# In-memory "database"
# ---------------------------------------------------------------------------

# Passwords stored in plaintext — demo only, never do this in production.
_PASSWORDS: dict[str, str] = {
    "alice@demo.com": "alice123",
    "bob@demo.com":   "bob123",
    "carol@demo.com": "carol123",
}

_USERS: list[User] = [
    User(id=1, email="alice@demo.com", full_name="Alice Smith",
         favorite_pokemon="Bulbasaur", role=Role.seller),
    User(id=2, email="bob@demo.com",   full_name="Bob Jones",
         favorite_pokemon="Charmander", role=Role.seller),
    User(id=3, email="carol@demo.com", full_name="Carol White",
         favorite_pokemon="Squirtle", role=Role.buyer),
]

_LISTINGS: list[Listing] = [
    Listing(id=1, name="Vintage camera",   price=120.00, condition="good",    user_id=1),
    Listing(id=2, name="Mechanical keyboard", price=85.00, condition="like new", user_id=1),
    Listing(id=3, name="Leather backpack", price=55.00, condition="fair",    user_id=1),
]

_next_listing_id = 4  # auto-increment counter


def _get_user_by_email(email: str) -> Optional[User]:
    return next((u for u in _USERS if u.email == email), None)


def _get_listing_by_id(listing_id: int) -> Optional[Listing]:
    return next((l for l in _LISTINGS if l.id == listing_id), None)


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

security = HTTPBasic()


def get_current_user(
    credentials: Annotated[HTTPBasicCredentials, Depends(security)],
) -> User:
    """
    Validate HTTP Basic credentials and return the matching User.

    Raises 401 if the email is unknown or the password is wrong.
    """
    user = _get_user_by_email(credentials.username)
    stored_pw = _PASSWORDS.get(credentials.username, "")

    # Use a constant-time comparison to prevent timing attacks.
    pw_ok = secrets.compare_digest(
        credentials.password.encode(), stored_pw.encode()
    )

    if not user or not pw_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Basic"},
        )
    return user


def require_seller(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """Gate: only sellers may proceed."""
    if current_user.role != Role.seller:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only sellers can perform this action.",
        )
    return current_user


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Marketplace CRUD Demo",
    description="""
## Demo marketplace API

Use the **Authorize** button (top-right) to sign in with one of the seed accounts:

| Email | Password | Role |
|---|---|---|
| alice@demo.com | alice123 | seller |
| bob@demo.com | bob123 | seller |
| carol@demo.com | carol123 | buyer |

### Permission rules
- **Buyers** — read-only: list all listings, view a single listing.
- **Sellers** — full CRUD, but only on *their own* listings (403 otherwise).
""",
    version="1.0.0",
)


# ---------------------------------------------------------------------------
# User routes
# ---------------------------------------------------------------------------

@app.get(
    "/users",
    response_model=list[UserOut],
    summary="List all users",
    description="Returns every registered user. Requires authentication (any role).",
    tags=["users"],
)
def list_users(
    _: Annotated[User, Depends(get_current_user)],
) -> list[UserOut]:
    return [UserOut(**u.model_dump()) for u in _USERS]


@app.get(
    "/users/me",
    response_model=UserOut,
    summary="Get current user",
    description="Returns the currently signed-in user's profile.",
    tags=["users"],
)
def get_me(current_user: Annotated[User, Depends(get_current_user)]) -> UserOut:
    return UserOut(**current_user.model_dump())


@app.get(
    "/users/{user_id}",
    response_model=UserOut,
    summary="Get a user by ID",
    tags=["users"],
    responses={404: {"description": "User not found."}},
)
def get_user(
    user_id: int,
    _: Annotated[User, Depends(get_current_user)],
) -> UserOut:
    user = next((u for u in _USERS if u.id == user_id), None)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    return UserOut(**user.model_dump())


# ---------------------------------------------------------------------------
# Listing routes
# ---------------------------------------------------------------------------

@app.get(
    "/listings",
    response_model=list[Listing],
    summary="List all listings",
    description="Any authenticated user (buyer or seller) can view all listings.",
    tags=["listings"],
)
def list_listings(
    _: Annotated[User, Depends(get_current_user)],
) -> list[Listing]:
    return _LISTINGS


@app.get(
    "/listings/{listing_id}",
    response_model=Listing,
    summary="Get a single listing",
    description="Any authenticated user can view a listing.",
    tags=["listings"],
    responses={404: {"description": "Listing not found."}},
)
def get_listing(
    listing_id: int,
    _: Annotated[User, Depends(get_current_user)],
) -> Listing:
    listing = _get_listing_by_id(listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found.")
    return listing


@app.post(
    "/listings",
    response_model=Listing,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new listing",
    description="**Seller only.** Creates a listing owned by the currently signed-in seller.",
    tags=["listings"],
    responses={
        403: {"description": "Buyers cannot create listings."},
    },
)
def create_listing(
    payload: ListingCreate,
    current_user: Annotated[User, Depends(require_seller)],
) -> Listing:
    global _next_listing_id
    listing = Listing(
        id=_next_listing_id,
        name=payload.name,
        price=payload.price,
        condition=payload.condition,
        user_id=current_user.id,
    )
    _LISTINGS.append(listing)
    _next_listing_id += 1
    return listing


@app.put(
    "/listings/{listing_id}",
    response_model=Listing,
    summary="Update a listing",
    description=(
        "**Seller only.** Updates a listing. "
        "Returns **403** if the listing belongs to a different seller."
    ),
    tags=["listings"],
    responses={
        403: {"description": "You do not own this listing."},
        404: {"description": "Listing not found."},
    },
)
def update_listing(
    listing_id: int,
    payload: ListingUpdate,
    current_user: Annotated[User, Depends(require_seller)],
) -> Listing:
    listing = _get_listing_by_id(listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found.")
    if listing.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Listing {listing_id} belongs to user {listing.user_id}, not you.",
        )
    if payload.name is not None:
        listing.name = payload.name
    if payload.price is not None:
        listing.price = payload.price
    if payload.condition is not None:
        listing.condition = payload.condition
    return listing


@app.delete(
    "/listings/{listing_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a listing",
    description=(
        "**Seller only.** Deletes a listing. "
        "Returns **403** if the listing belongs to a different seller."
    ),
    tags=["listings"],
    responses={
        403: {"description": "You do not own this listing."},
        404: {"description": "Listing not found."},
    },
)
def delete_listing(
    listing_id: int,
    current_user: Annotated[User, Depends(require_seller)],
) -> dict:
    listing = _get_listing_by_id(listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found.")
    if listing.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Listing {listing_id} belongs to user {listing.user_id}, not you.",
        )
    _LISTINGS.remove(listing)
    return {"deleted": listing_id}
