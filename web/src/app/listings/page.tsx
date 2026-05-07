import { redirect } from "next/navigation";

/** The Listings page has been replaced by Browse Planners. */
export default function ListingsPage() {
  redirect("/browse");
}
