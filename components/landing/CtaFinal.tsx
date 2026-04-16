import Link from "next/link";

export function CtaFinal() {
  return (
    <section className="cta-final">
      <span className="eyebrow">Rejoindre la bande</span>
      <h2>C&apos;est <em>gratuit</em>, et entre nous.</h2>
      <p>Tu accèdes à toutes les adresses, tu partages les tiennes, tu participes aux événements près de chez toi. Trois minutes pour t&apos;inscrire.</p>
      <Link href="/inscription" className="btn btn-on-dark">Créer mon compte</Link>
    </section>
  );
}
