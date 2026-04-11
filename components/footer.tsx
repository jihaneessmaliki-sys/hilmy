import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-cream border-t border-border-subtle mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr] gap-10 md:gap-8">
          {/* Brand */}
          <div>
            <h2 className="font-heading text-2xl font-normal text-green-deep">Hilmy</h2>
            <p className="mt-3 font-heading text-sm italic text-gold leading-relaxed">
              L&apos;annuaire des femmes pour les femmes.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-sans text-xs font-medium uppercase tracking-[0.3em] text-gold">
              Hilmy
            </h3>
            <nav className="mt-4 flex flex-col gap-2">
              <Link href="/comment-ca-marche" className="text-sm text-muted-foreground hover:text-green-deep transition-colors">
                Comment ça marche
              </Link>
              <Link href="/charte" className="text-sm text-muted-foreground hover:text-green-deep transition-colors">
                Notre charte
              </Link>
              <Link href="/inscription" className="text-sm text-muted-foreground hover:text-green-deep transition-colors">
                Rejoindre Hilmy
              </Link>
              <Link href="/inscription-prestataire" className="text-sm text-muted-foreground hover:text-green-deep transition-colors">
                Devenir prestataire
              </Link>
              <Link href="/proposer-un-evenement" className="text-sm text-muted-foreground hover:text-green-deep transition-colors">
                Proposer un événement
              </Link>
            </nav>
          </div>

          {/* Legal + contact */}
          <div>
            <h3 className="font-sans text-xs font-medium uppercase tracking-[0.3em] text-gold">
              Informations
            </h3>
            <nav className="mt-4 flex flex-col gap-2">
              <Link href="/mentions-legales" className="text-sm text-muted-foreground hover:text-green-deep transition-colors">
                Mentions légales
              </Link>
              <Link href="/confidentialite" className="text-sm text-muted-foreground hover:text-green-deep transition-colors">
                Confidentialité
              </Link>
              <Link href="/cgu" className="text-sm text-muted-foreground hover:text-green-deep transition-colors">
                CGU
              </Link>
              <Link href="/cookies" className="text-sm text-muted-foreground hover:text-green-deep transition-colors">
                Cookies
              </Link>
              <a href="mailto:hello@hilmy.io" className="text-sm text-muted-foreground hover:text-green-deep transition-colors">
                hello@hilmy.io
              </a>
            </nav>
          </div>
        </div>

        <div className="mt-12 h-px bg-border-subtle" />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Hilmy — Fait avec soin, entre nous.
        </p>
      </div>
    </footer>
  );
}
