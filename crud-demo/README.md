# CRUD Demo API

A tiny in-memory FastAPI service that demonstrates:

- Two resources: **users** and **listings**.
- HTTP Basic auth wired into Swagger (the green **Authorize** button takes
  email + password directly).
- Role-based permissions: only **sellers** can create listings, and a seller
  can only edit / delete listings they own.

Data lives in plain Python dicts — every restart re-seeds Alice, Bob, and
Carol.

## Run

```bash
cd crud-demo
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload
```

Then open http://127.0.0.1:8000/docs.

## Demo accounts

| Role   | Email                | Password   |
|--------|----------------------|------------|
| seller | `alice@example.com`  | `alice123` |
| seller | `bob@example.com`    | `bob123`   |
| buyer  | `carol@example.com`  | `carol123` |

Three listings are seeded — all owned by Alice.

## Permissions

| Endpoint                                | Auth          | Notes                                       |
|-----------------------------------------|---------------|---------------------------------------------|
| `GET /listings`                         | any user      | Browse catalog.                             |
| `GET /listings/{id}`                    | any user      | Read one listing.                           |
| `POST /listings`                        | seller only   | 403 if a buyer calls it.                    |
| `PUT /listings/{id}`                    | owning seller | 403 if a seller targets another's listing.  |
| `DELETE /listings/{id}`                 | owning seller | 403 if a seller targets another's listing.  |
| `GET /users` / `GET /users/me`          | any user      | Read-only user directory.                   |

## Demo flow (for class)

1. Open http://127.0.0.1:8000/docs.
2. Click **Authorize** at the top right and log in as
   `alice@example.com` / `alice123`. Try `GET /listings` — you'll see her three.
3. `POST /listings` as Alice — works, listing is created with `user_id: 1`.
4. **Authorize** again as `bob@example.com` / `bob123`. Try
   `PUT /listings/1` (one of Alice's). It returns **403 Forbidden** —
   *"You can only edit your own listings."*
5. **Authorize** as `carol@example.com` / `carol123` (the buyer). Try
   `POST /listings`. It returns **403 Forbidden** —
   *"Only sellers can perform this action."*
6. `GET /listings` as Carol still works — buyers can browse.
7. Hit any endpoint without authorizing — **401 Unauthorized**.
