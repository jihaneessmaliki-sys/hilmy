"use client";

import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { href: "/prestataires", label: "Prestataires" },
  { href: "/bonnes-adresses", label: "Bonnes adresses" },
  { href: "/evenements", label: "Événements" },
  { href: "/mon-compte", label: "Mon compte" },
];

export function Header({ transparent }: { transparent?: boolean }) {
  const [open, setOpen] = useState(false);

  const wrapperClass = transparent
    ? "absolute top-0 left-0 right-0 z-10 py-7"
    : "sticky top-0 z-50 bg-cream/80 backdrop-blur-md border-b border-border-subtle";

  const logoColor = transparent ? "text-[#F5F0E6]" : "text-green-deep";
  const linkColor = transparent
    ? "text-[#F5F0E6] hover:text-gold"
    : "text-foreground/70 hover:text-green-deep";
  const ctaClass = transparent
    ? "bg-[rgba(245,240,230,0.12)] border border-[rgba(245,240,230,0.3)] text-[#F5F0E6] backdrop-blur-sm hover:bg-[#F5F0E6] hover:text-green-deep"
    : "bg-green-deep text-primary-foreground hover:bg-green-deep/90";

  return (
    <header className={wrapperClass}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between ${transparent ? "" : "h-16"}`}>
          <Link
            href="/"
            className={`font-heading text-2xl md:text-3xl font-normal tracking-tight ${logoColor}`}
          >
            Hilmy
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${linkColor}`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/inscription"
              className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium transition-all ${ctaClass}`}
            >
              Montre-moi les adresses
            </Link>
          </nav>

          <button
            onClick={() => setOpen(!open)}
            className={`md:hidden p-2 ${transparent ? "text-[#F5F0E6]" : "text-foreground"}`}
            aria-label="Menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border-subtle bg-cream">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-base font-medium text-foreground/80 hover:text-green-deep transition-colors py-1"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/inscription"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-medium bg-green-deep text-primary-foreground hover:bg-green-deep/90 transition-colors mt-2 text-center"
            >
              Montre-moi les adresses
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
