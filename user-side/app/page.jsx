import Navbar from "@/components/Navbar";
import HeroSection from "@/components/homepage/HeroSection";
import FeaturesSection from "@/components/homepage/FeaturesSection";
import HowItWorksSection from "@/components/homepage/HowItWorksSection";
import VideoShowcaseSection from "@/components/homepage/VideoShowcaseSection";
import SocialProofSection from "@/components/homepage/SocialProofSection";
import BenefitsSection from "@/components/homepage/BenefitsSection";
import FinalCTASection from "@/components/homepage/FinalCTASection";
import ScrollAnimationWrapper from "@/components/homepage/ScrollAnimationWrapper";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      {/* Preload critical assets for faster initial render */}
      <link rel="preload" href="/assets/logos/logo_full.png" as="image" />
      
      <Navbar />
      
      <main role="main" aria-label="OrderZap Homepage" className="pt-16">
        <HeroSection />
        <ScrollAnimationWrapper animationClass="animate-slide-up">
          <div id="features">
            <FeaturesSection />
          </div>
        </ScrollAnimationWrapper>
        <ScrollAnimationWrapper animationClass="animate-fade-slide-up">
          <div id="how-it-works">
            <HowItWorksSection />
          </div>
        </ScrollAnimationWrapper>
        <ScrollAnimationWrapper animationClass="animate-fade-in">
          <VideoShowcaseSection />
        </ScrollAnimationWrapper>
        <ScrollAnimationWrapper animationClass="animate-fade-in">
          <SocialProofSection />
        </ScrollAnimationWrapper>
        <ScrollAnimationWrapper animationClass="animate-slide-up">
          <div id="benefits">
            <BenefitsSection />
          </div>
        </ScrollAnimationWrapper>
        <ScrollAnimationWrapper animationClass="animate-fade-in">
          <FinalCTASection />
        </ScrollAnimationWrapper>
      </main>
    </>
  );
}
