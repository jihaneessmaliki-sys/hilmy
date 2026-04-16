import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Histoire } from "@/components/landing/Histoire";
import { Categories } from "@/components/landing/Categories";
import { Journal } from "@/components/landing/Journal";
import { CtaFinal } from "@/components/landing/CtaFinal";
import { LandingFooter } from "@/components/landing/Footer";
import "@/components/landing/landing.css";

export default function HomePage() {
  return (
    <div className="landing">
      <Nav />
      <main>
        <Hero />
        <Histoire />
        <Categories />
        <Journal />
        <CtaFinal />
      </main>
      <LandingFooter />
    </div>
  );
}
