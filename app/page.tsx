import { Hero } from "@/components/sections/Hero";
import { Statement } from "@/components/sections/Statement";
import { Signal } from "@/components/sections/Signal";
import { Connected } from "@/components/sections/Connected";
import { Attention } from "@/components/sections/Attention";
import { UseCases } from "@/components/sections/UseCases";
import { StoryScroll } from "@/components/sections/StoryScroll";
import { Beliefs } from "@/components/sections/Beliefs";
import { MobileMoment } from "@/components/sections/MobileMoment";
import { FinalCta } from "@/components/sections/FinalCta";

export default function Home() {
  return (
    <>
      <span id="top" />
      <Hero />
      <main>
        <Statement />
        <Signal />
        <Connected />
        <Attention />
        <UseCases />
        <StoryScroll />
        <Beliefs />
        <MobileMoment />
      </main>
      <FinalCta />
    </>
  );
}
