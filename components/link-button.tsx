import Link from "next/link";
import { cn } from "@/lib/utils";

interface LinkButtonProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "outline";
  external?: boolean;
}

const base =
  "inline-flex items-center justify-center text-sm font-medium transition-colors whitespace-nowrap";

const variants = {
  primary:
    "rounded-full px-8 py-3 bg-green-deep text-primary-foreground hover:bg-green-deep/90",
  outline:
    "rounded-full px-8 py-3 border border-green-deep text-green-deep hover:bg-green-deep/5",
};

export function LinkButton({
  href,
  children,
  className,
  variant = "primary",
  external,
}: LinkButtonProps) {
  const cls = cn(base, variants[variant], className);

  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
