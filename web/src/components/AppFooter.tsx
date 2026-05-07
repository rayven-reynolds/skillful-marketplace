import Link from "next/link";

export function AppFooter() {
  const discover = [{ label: "Browse Planners", href: "/browse" }];

  const planners = [
    { label: "List Your Services", href: "/become-a-planner" },
    { label: "My Business", href: "/my-business" },
  ];

  const company = [
    { label: "About Us", href: "/" },
    { label: "Contact", href: "/" },
  ];

  return (
    <footer style={{ background: "#1A2B22" }}>
      <div className="mx-auto max-w-7xl px-12 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <span className="font-display text-[22px] font-extrabold text-white">Eventsee</span>
            <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
              Transparent, verified event planning. Find your perfect planner — for free.
            </p>
          </div>

          {[
            { heading: "Discover", links: discover },
            { heading: "Planners", links: planners },
            { heading: "Company", links: company },
          ].map(({ heading, links }) => (
            <div key={heading} className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">{heading}</h4>
              <ul className="space-y-2">
                {links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[13px] transition hover:text-white/80"
                      style={{ color: "rgba(255,255,255,0.55)" }}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            © {new Date().getFullYear()} Eventsee. All rights reserved.
          </p>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Sitemap"].map((l) => (
              <Link
                key={l}
                href="/"
                className="text-[12px] transition hover:text-white/70"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                {l}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
