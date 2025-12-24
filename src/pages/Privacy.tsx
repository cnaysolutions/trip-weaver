import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-hero flex items-center justify-center">
                <Compass className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold">TripWeave</p>
                <p className="text-xs text-muted-foreground">Concierge</p>
              </div>
            </Link>
            <Button variant="ghost" asChild>
              <Link to="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="font-display text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 24, 2024</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="font-display text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to TripWeave Concierge. We are committed to protecting your personal information 
              and your right to privacy. This Privacy Policy explains how we collect, use, disclose, 
              and safeguard your information when you use our travel planning platform.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Account information (name, email address, password)</li>
              <li>Travel preferences and itinerary details</li>
              <li>Payment information for booking services</li>
              <li>Communications you send to us</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process your travel bookings and reservations</li>
              <li>Send you updates about your trips and account</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Personalize your experience and recommendations</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold mb-4">4. Information Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell, trade, or otherwise transfer your personal information to third parties 
              without your consent, except as necessary to provide our services (such as sharing booking 
              details with travel providers) or as required by law.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold mb-4">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your 
              personal information against unauthorized access, alteration, disclosure, or destruction. 
              However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to or restrict certain processing activities</li>
              <li>Data portability</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold mb-4">7. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar tracking technologies to enhance your experience on our platform. 
              You can control cookies through your browser settings, though disabling cookies may affect 
              some features of our service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold mb-4">8. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact 
              us at privacy@tripweave.com.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
