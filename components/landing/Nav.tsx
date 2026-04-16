"use client";

import { useState } from "react";
import Link from "next/link";

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="landing-nav">
        <Link href="/" className="nav-logo">HILMY</Link>
        <div className="nav-links">
          <a href="#histoire">Notre histoire</a>
          <a href="#categories">Nos catégories</a>
          <a href="#journal">Journal</a>
        </div>
        <div className="nav-cta">
          <Link href="/connexion" className="nav-btn nav-btn-outline">Connexion</Link>
          <Link href="/inscription" className="nav-btn nav-btn-primary">Rejoindre</Link>
        </div>
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </nav>

      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <button
          className="mobile-menu-close"
          onClick={() => setMenuOpen(false)}
          aria-label="Fermer le menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="6" y1="18" x2="18" y2="6" />
          </svg>
        </button>
        <a href="#histoire" onClick={() => setMenuOpen(false)}>Notre histoire</a>
        <a href="#categories" onClick={() => setMenuOpen(false)}>Nos catégories</a>
        <a href="#journal" onClick={() => setMenuOpen(false)}>Journal</a>
        <div className="mobile-menu-cta">
          <Link href="/connexion" className="nav-btn nav-btn-outline" onClick={() => setMenuOpen(false)}>Connexion</Link>
          <Link href="/inscription" className="nav-btn nav-btn-primary" onClick={() => setMenuOpen(false)}>Rejoindre</Link>
        </div>
      </div>
    </>
  );
}
