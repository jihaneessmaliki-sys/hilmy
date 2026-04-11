"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";

interface PlaceResult {
  google_place_id: string;
  name: string;
  address: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  google_category: string | null;
}

interface Props {
  onSelect: (place: PlaceResult) => void;
}

export function PlaceSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleChange(value: string) {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/places/search?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 400);
  }

  function handleSelect(place: PlaceResult) {
    setQuery(place.name);
    setOpen(false);
    onSelect(place);
  }

  return (
    <div className="relative">
      <Input
        placeholder="Tape le nom du lieu..."
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        className="bg-cream border-border-subtle"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          ...
        </div>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card-white border border-border-subtle rounded-xl shadow-lg overflow-hidden">
          {results.map((r) => (
            <button
              key={r.google_place_id}
              type="button"
              onClick={() => handleSelect(r)}
              className="w-full text-left px-4 py-3 hover:bg-cream transition-colors border-b border-border-subtle last:border-0"
            >
              <span className="block text-sm font-medium text-foreground">
                {r.name}
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                {r.address}
              </span>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && !loading && query.length >= 3 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card-white border border-border-subtle rounded-xl shadow-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Aucun résultat. Tu peux saisir les infos manuellement.
          </p>
        </div>
      )}
    </div>
  );
}
