export function HeroSection() {
  return (
    <section
      className="
        relative
        w-full
        py-20
        md:py-28
        flex
        items-center
        justify-center
        bg-transparent
      "
    >
      {/* Soft contrast layer — DOES NOT block app background */}
      <div
        className="
          absolute
          inset-0
          bg-white/65
          dark:bg-slate-900/65
          backdrop-blur-sm
        "
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground leading-tight">
            How much will my <span className="text-accent">holiday really cost?</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            See the full picture before you travel — flights, accommodation, transport, and realistic daily expenses
            calculated in real time.
          </p>

          <p className="text-sm text-muted-foreground/80 max-w-lg mx-auto">
            No bookings. No pressure. Just clear, data-driven planning.
          </p>
        </div>
      </div>
    </section>
  );
}
