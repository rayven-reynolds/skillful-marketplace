#!/usr/bin/env python3
"""
End-to-end security demonstration for the Eventsee API.

Walks through the full permission story using a fresh ``Alice`` planner,
``Bob`` planner, and ``Carol`` client. Each scenario hits the API with the
appropriate session cookie and asserts the expected HTTP status. Output is a
clean PASS / FAIL table suitable for a homework demo screenshot.

Usage::

    cd api
    source .venv/bin/activate
    PYTHONPATH=. python scripts/security_demo.py

Requires the API to be running locally on http://127.0.0.1:8000.
"""

from __future__ import annotations

import sys
import time
from typing import Optional, Tuple

import httpx

BASE = "http://127.0.0.1:8000/v1"
SUFFIX = str(int(time.time()))  # makes accounts unique each run

ALICE_EMAIL = f"alice{SUFFIX}@example.com"
BOB_EMAIL = f"bob{SUFFIX}@example.com"
CAROL_EMAIL = f"carol{SUFFIX}@example.com"
PASSWORD = "demoPass1234"

ALICE_SLUG = f"alice-{SUFFIX}"
BOB_SLUG = f"bob-{SUFFIX}"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
BOLD = "\033[1m"
DIM = "\033[2m"
END = "\033[0m"


results: list[Tuple[str, bool, str]] = []


def section(title: str) -> None:
    """Print a labeled section header."""

    print(f"\n{BOLD}{BLUE}── {title} ──{END}")


def check(label: str, *, got: int, expected: int, detail: str = "") -> None:
    """
    Record one assertion. ``got == expected`` becomes a PASS row.

    Args:
        label: Human-readable scenario name shown in the summary table.
        got: Actual HTTP status returned.
        expected: Required status for the scenario to pass.
        detail: Optional ``response.json().detail`` echoed for context.
    """

    ok = got == expected
    color = GREEN if ok else RED
    tag = "PASS" if ok else "FAIL"
    extra = f" {DIM}({detail}){END}" if detail else ""
    print(f"  {color}{tag}{END}  {label} — expected {expected}, got {got}{extra}")
    results.append((label, ok, f"expected {expected} got {got}"))


def signup(email: str, password: str, role: str, display_name: str) -> httpx.Client:
    """
    Register a fresh user (or log in if already exists) and return a cookie-bearing client.

    Args:
        email: Account email.
        password: Plaintext password.
        role: ``client`` | ``planner`` | ``admin``.
        display_name: Display name for the account.

    Returns:
        httpx.Client: Persistent client carrying the ``eventsee_session`` cookie.
    """

    client = httpx.Client(base_url=BASE, timeout=10.0)
    r = client.post(
        "/auth/register",
        json={"email": email, "password": password, "role": role, "display_name": display_name},
    )
    if r.status_code == 409:
        r = client.post("/auth/login", json={"email": email, "password": password})
    r.raise_for_status()
    return client


def detail_of(r: httpx.Response) -> str:
    """Extract the ``detail`` field from a JSON error body, or empty string."""

    try:
        body = r.json()
        if isinstance(body, dict) and "detail" in body:
            return str(body["detail"])
    except Exception:
        pass
    return ""


# ---------------------------------------------------------------------------
# Scenario
# ---------------------------------------------------------------------------


def main() -> int:
    """Run the full demo and return the process exit code."""

    print(f"{BOLD}Eventsee API security demo{END}  {DIM}base={BASE}{END}")

    # Health check
    section("Connectivity")
    h = httpx.get(f"{BASE}/health", timeout=5.0)
    check("API /v1/health responds 200", got=h.status_code, expected=200)
    if h.status_code != 200:
        print(f"\n{RED}API is not reachable. Start it with `uvicorn app.main:app --reload` and rerun.{END}")
        return 1

    # ---------- 1. Sign up two planners + one client ----------
    section("1. Account creation")
    alice = signup(ALICE_EMAIL, PASSWORD, "planner", "Alice Planner")
    print(f"  {GREEN}OK{END}    Alice signed up + logged in  {DIM}({ALICE_EMAIL}){END}")
    bob = signup(BOB_EMAIL, PASSWORD, "planner", "Bob Planner")
    print(f"  {GREEN}OK{END}    Bob signed up + logged in    {DIM}({BOB_EMAIL}){END}")
    carol = signup(CAROL_EMAIL, PASSWORD, "client", "Carol Client")
    print(f"  {GREEN}OK{END}    Carol (client) signed up     {DIM}({CAROL_EMAIL}){END}")
    anon = httpx.Client(base_url=BASE, timeout=10.0)

    # /auth/me sanity check confirms the cookie flow is real
    me = alice.get("/auth/me").json()
    check("Alice /auth/me reflects role=planner", got=200 if me.get("role") == "planner" else 0, expected=200)

    # ---------- 2. Each planner creates their own profile ----------
    section("2. Each planner creates their OWN profile (planner-only route)")
    r = alice.post(
        "/planner/profile",
        json={
            "slug": ALICE_SLUG,
            "bio": "Alice — minimalist weddings",
            "location_text": "Brooklyn, NY",
            "price_min": 2500,
            "price_max": 8000,
            "planning_styles": ["month_of"],
            "event_sizes": ["under_50", "50_150"],
            "specialties": ["micro_wedding"],
            "aesthetic_tags": ["modern_minimal"],
            "timezone": "America/New_York",
        },
    )
    check("Alice creates her profile (201)", got=r.status_code, expected=201, detail=detail_of(r))
    alice_portfolio = alice.post(
        "/planner/portfolio/me",
        json={"title": "Alice's Hudson loft wedding", "event_type": "wedding"},
    )
    check("Alice adds a portfolio item (200)", got=alice_portfolio.status_code, expected=200)
    alice_item_id = alice_portfolio.json().get("id", "")

    r = bob.post(
        "/planner/profile",
        json={
            "slug": BOB_SLUG,
            "bio": "Bob — corporate offsites",
            "location_text": "Austin, TX",
            "price_min": 4000,
            "price_max": 15000,
            "planning_styles": ["full_service"],
            "event_sizes": ["150_300"],
            "specialties": ["corporate"],
            "aesthetic_tags": ["industrial"],
            "timezone": "America/Chicago",
        },
    )
    check("Bob creates his profile (201)", got=r.status_code, expected=201, detail=detail_of(r))
    bob_portfolio = bob.post(
        "/planner/portfolio/me",
        json={"title": "Bob's Q4 leadership offsite", "event_type": "corporate"},
    )
    check("Bob adds a portfolio item (200)", got=bob_portfolio.status_code, expected=200)
    bob_item_id = bob_portfolio.json().get("id", "")

    # ---------- 3. Cross-tenant editing must be blocked ----------
    section("3. Cross-tenant edits — Alice tries to mutate Bob's data")

    # Architectural isolation: every planner-self route is /me, so Alice's PATCH
    # always lands on her own row. Demonstrate that even when Alice references
    # Bob's portfolio_item id directly, the API refuses.
    r = alice.delete(f"/planner/portfolio/me/{bob_item_id}")
    check(
        "Alice DELETE Bob's portfolio item -> 404 (tenant isolation)",
        got=r.status_code,
        expected=404,
        detail=detail_of(r),
    )

    # If Alice tries to take Bob's slug via her own PATCH, the conflict check rejects it.
    r = alice.patch(
        "/planner/profile/me",
        json={
            "slug": BOB_SLUG,  # Bob already owns this slug
            "bio": "I'm Alice trying to impersonate Bob",
            "location_text": "Brooklyn, NY",
            "price_min": 2500,
            "price_max": 8000,
            "planning_styles": ["month_of"],
            "event_sizes": ["under_50"],
            "specialties": [],
            "aesthetic_tags": [],
            "timezone": "America/New_York",
        },
    )
    check(
        "Alice PATCH her profile w/ Bob's slug -> 409 (slug owned by Bob)",
        got=r.status_code,
        expected=409,
        detail=detail_of(r),
    )

    # ---------- 4. Cross-tenant booking transition must 403 ----------
    section("4. Cross-tenant booking transition — Alice tries to act on Bob's booking")
    bob_profile_id = bob.get("/planner/profile/me").json()["id"]
    booking = carol.post(
        "/bookings",
        json={"planner_profile_id": bob_profile_id, "proposed_terms": {"fee": 5000}},
    )
    check("Carol creates a booking with Bob (201)", got=booking.status_code, expected=201)
    booking_id = booking.json().get("id", "")

    # Alice (a planner, but NOT Bob) tries to accept Bob's booking -> 403.
    r = alice.post(f"/bookings/{booking_id}/transition", json={"action": "planner_accept"})
    check(
        "Alice tries to accept Bob's booking -> 403",
        got=r.status_code,
        expected=403,
        detail=detail_of(r),
    )

    # Bob accepting his own booking succeeds.
    r = bob.post(f"/bookings/{booking_id}/transition", json={"action": "planner_accept"})
    check("Bob accepts his own booking -> 200", got=r.status_code, expected=200, detail=detail_of(r))

    # ---------- 5. Role gates ----------
    section("5. Role gates — clients and anon users hit the right walls")

    # Client can browse public planners.
    r = anon.get("/public/planners")
    check("Anonymous GET /public/planners -> 200", got=r.status_code, expected=200)

    # Anonymous cannot create planner profile.
    r = anon.post(
        "/planner/profile",
        json={
            "slug": "anon",
            "bio": "",
            "location_text": "",
            "price_min": 0,
            "price_max": 0,
            "planning_styles": [],
            "event_sizes": [],
            "specialties": [],
            "aesthetic_tags": [],
            "timezone": "UTC",
        },
    )
    check("Anonymous POST /planner/profile -> 401", got=r.status_code, expected=401, detail=detail_of(r))

    # Anonymous cannot read its own profile.
    r = anon.get("/auth/me")
    check("Anonymous GET /auth/me -> 401", got=r.status_code, expected=401, detail=detail_of(r))

    # Carol (client) cannot create a planner profile (wrong role).
    r = carol.post(
        "/planner/profile",
        json={
            "slug": "carol-cant",
            "bio": "",
            "location_text": "",
            "price_min": 0,
            "price_max": 0,
            "planning_styles": [],
            "event_sizes": [],
            "specialties": [],
            "aesthetic_tags": [],
            "timezone": "UTC",
        },
    )
    check("Client POST /planner/profile -> 403 (role)", got=r.status_code, expected=403, detail=detail_of(r))

    # Carol cannot patch a planner profile.
    r = carol.patch("/planner/profile/me", json={
        "slug": "carol-cant", "bio": "", "location_text": "",
        "price_min": 0, "price_max": 0,
        "planning_styles": [], "event_sizes": [], "specialties": [], "aesthetic_tags": [],
        "timezone": "UTC",
    })
    check("Client PATCH /planner/profile/me -> 403", got=r.status_code, expected=403, detail=detail_of(r))

    # Planner cannot reach the admin-only premium toggle.
    r = alice.patch(
        f"/admin/planners/{bob_profile_id}/premium",
        json={"is_premium": True},
    )
    check("Alice (planner) PATCH /admin/...premium -> 403 (admin only)", got=r.status_code, expected=403, detail=detail_of(r))

    # Client can read planners (browse).
    r = carol.get("/public/planners")
    check("Carol (client) GET /public/planners -> 200", got=r.status_code, expected=200)

    # Client can favorite a planner; planner cannot (favorites are client/admin).
    r = carol.post(f"/favorites/{bob_profile_id}")
    check("Carol (client) saves Bob -> 201", got=r.status_code, expected=201, detail=detail_of(r))
    r = alice.post(f"/favorites/{bob_profile_id}")
    check("Alice (planner) tries to save Bob -> 403", got=r.status_code, expected=403, detail=detail_of(r))

    # ---------- Summary ----------
    section("Summary")
    passed = sum(1 for _, ok, _ in results if ok)
    failed = len(results) - passed
    print()
    for label, ok, info in results:
        color = GREEN if ok else RED
        tag = "PASS" if ok else "FAIL"
        print(f"  {color}{tag}{END}  {label}  {DIM}[{info}]{END}")
    print()
    color = GREEN if failed == 0 else RED
    print(f"{color}{BOLD}{passed} passed, {failed} failed{END}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
