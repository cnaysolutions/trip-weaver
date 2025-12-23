import heroImage from "@/assets/hero-travel.jpg";

export function HeroSection() {
  return (
    <section className="relative h-[60vh] min-h-[480px] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Premium travel experience with sunset sky view from airplane"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/50 to-background" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
          <p className="text-accent font-medium tracking-widest uppercase text-sm">
            Your Personal Travel Concierge
          </p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground leading-tight">
            Every Journey,{" "}
            <span className="text-accent">Thoughtfully Crafted</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            From flights to daily experiences, we orchestrate every detail of your trip.
            Calm, precise, and always in your control.
          </p>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
