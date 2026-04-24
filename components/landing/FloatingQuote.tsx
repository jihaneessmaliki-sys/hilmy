import { FadeInSection } from '@/components/ui/FadeInSection'

export function FloatingQuote() {
  return (
    <section className="bg-creme py-16 md:py-20">
      <FadeInSection>
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="font-serif font-light text-5xl leading-none text-or opacity-40 md:text-6xl">
            &ldquo;
          </p>
          <blockquote className="mt-5 font-serif font-light leading-[1.2] text-vert text-[clamp(1.75rem,4vw,3rem)]">
            Une adresse qui circule entre femmes,
            <br className="hidden md:block" />
            {' '}c&apos;est déjà{' '}
            <em className="italic text-or">une recommandation.</em>
          </blockquote>
          <cite className="mt-8 block text-[11px] font-medium tracking-[0.28em] text-or uppercase not-italic">
            — Notre parti pris
          </cite>
        </div>
      </FadeInSection>
    </section>
  )
}
