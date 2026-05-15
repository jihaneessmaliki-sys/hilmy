import { GoldLine } from '@/components/ui/GoldLine'

export function PassCopineHero() {
  return (
    <section className="bg-creme pt-32 pb-16 md:pt-40 md:pb-20">
      <div className="mx-auto max-w-3xl px-6 text-center md:px-8">
        <div className="flex items-center justify-center gap-4">
          <GoldLine width={32} />
          <span className="text-[11px] font-medium uppercase tracking-[0.32em] text-or">
            Pass Copine
          </span>
          <GoldLine width={32} />
        </div>

        <h1 className="mt-8 font-serif text-[44px] font-light leading-[1.05] text-vert md:text-[64px]">
          Le <span className="italic">Pass Copine</span>
        </h1>

        <p className="mt-6 text-[17px] leading-[1.7] text-texte-sec md:text-[19px]">
          Tu fais déjà partie de la team.
          <br className="hidden md:block" />
          Le Pass, c&apos;est juste pour aller plus loin.
        </p>
      </div>
    </section>
  )
}
