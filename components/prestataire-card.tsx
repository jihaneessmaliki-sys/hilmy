import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { categoryLabel, type Profile } from "@/lib/constants";

export function PrestataireCard({ p }: { p: Profile }) {
  const photo = p.photos?.[0];

  return (
    <Link
      href={`/prestataire/${p.slug}`}
      className="group block bg-card-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-border-subtle overflow-hidden"
    >
      <div className="aspect-[4/3] bg-border-subtle relative">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={p.nom}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-deep/5 to-gold/10">
            <span className="text-muted-foreground text-sm">Photo</span>
          </div>
        )}
        <Badge className="absolute top-3 right-3 bg-green-deep text-primary-foreground border-0 text-xs">
          {categoryLabel(p.categorie)}
        </Badge>
      </div>
      <div className="p-5">
        <h3 className="font-heading text-base font-medium text-foreground group-hover:text-green-deep transition-colors">
          {p.nom}
        </h3>
        {p.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {p.description}
          </p>
        )}
        <div className="mt-2 text-xs text-muted-foreground">
          {p.ville}{p.pays ? `, ${p.pays}` : ""}
        </div>
      </div>
    </Link>
  );
}
