import type { PlannerCardData } from "@/components/PlannerCard";

/**
 * Static seed data for the planner directory — used on pages that render
 * before the live API is available (e.g. the Get Matched hero section).
 *
 * These planners mirror the seeded DB rows so their slugs link to real API
 * profiles when the backend is running.
 */
export const PLANNERS: PlannerCardData[] = [
  {
    id: "ja",
    slug: "jordan-avery",
    display_name: "Jordan Avery Events",
    bio: "Full-service weddings and corporate events with calm coordination.",
    location_text: "San Francisco, CA",
    price_min: 3500,
    price_max: 12000,
    specialties: ["wedding", "corporate", "anniversary"],
    planning_styles: ["full_service", "month_of"],
    event_sizes: ["50_150", "150_300"],
    avg_rating: 4.85,
    review_count: 134,
    is_premium: true,
    cover_photo:
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
  },
  {
    id: "sm",
    slug: "studio-meridian",
    display_name: "Studio Meridian",
    bio: "Intimate weddings and anniversary celebrations with a modern aesthetic.",
    location_text: "Oakland, CA",
    price_min: 2800,
    price_max: 8000,
    specialties: ["wedding", "anniversary"],
    planning_styles: ["month_of", "partial"],
    event_sizes: ["under_50", "50_150"],
    avg_rating: 4.82,
    review_count: 98,
    is_premium: false,
    cover_photo:
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80",
  },
  {
    id: "gn",
    slug: "gather-north",
    display_name: "Gather North Co.",
    bio: "Destination weddings and vineyard celebrations with a rustic edge.",
    location_text: "Napa, CA",
    price_min: 4200,
    price_max: 14000,
    specialties: ["wedding", "anniversary"],
    planning_styles: ["full_service"],
    event_sizes: ["50_150", "150_300"],
    avg_rating: 4.78,
    review_count: 56,
    is_premium: false,
    cover_photo:
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80",
  },
  {
    id: "nc",
    slug: "north-and-co",
    display_name: "North & Co.",
    bio: "High-production corporate events and brand activations.",
    location_text: "San Francisco, CA",
    price_min: 6000,
    price_max: 30000,
    specialties: ["corporate", "conference"],
    planning_styles: ["full_service", "partial"],
    event_sizes: ["150_300", "300_plus"],
    avg_rating: 4.91,
    review_count: 87,
    is_premium: true,
    cover_photo:
      "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80",
  },
];
