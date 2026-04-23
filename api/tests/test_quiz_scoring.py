"""Unit tests for quiz scoring helpers (no database required)."""

import uuid

from app.models import PlannerProfile
from app.services.quiz_match import score_planner


def test_score_planner_rewards_overlap_and_premium() -> None:
    """
    ``score_planner`` should increase when tags overlap and when the planner is premium.

    This guards the primary ranking signal used by the fit quiz endpoint.
    """

    base = PlannerProfile(
        user_id=uuid.uuid4(),
        slug="demo",
        location_text="San Francisco, CA",
        price_min=2000,
        price_max=8000,
        planning_styles=["full_service"],
        event_sizes=["50_150"],
        specialties=["south_asian"],
        aesthetic_tags=["modern_minimal"],
        is_premium=False,
    )
    answers = {
        "location": "san francisco",
        "planning_styles": ["full_service"],
        "aesthetic_tags": ["modern_minimal"],
        "specialties": ["south_asian"],
        "event_sizes": ["50_150"],
        "budget_max": 9000,
    }
    s_base = score_planner(base, answers, event_date=None)
    base.is_premium = True
    s_prem = score_planner(base, answers, event_date=None)
    assert s_prem > s_base
