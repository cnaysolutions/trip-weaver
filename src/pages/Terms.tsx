import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Terms() {
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
        <h1 className="font-display text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 24, 2024</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="font-display text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using TripWeave Concierge, you agree to be bound by these Terms of Service 
              and all applicable laws and regulations. If you do not agree with any of these terms, you 
              are prohibited from using or accessing this platform.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              TripWeave Concierge is a premium travel planning platform that helps users design and 
              organize international trips. Our service includes flight search, accommodation discovery, 
              car rental options, and itinerary planning tools.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you create an account with us, you must provide accurate, complete, and current 
              information. You are responsible for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold mb-4">4. Booking and Payments</h2>
            <p className="text-muted-foreground leading-relaxed">
              While TripWeave provides cost estimates and travel information, actual bookings are 
              completed through third-party providers. We are not responsible for the terms, conditions, 
              or fulfillment of services provided by airlines, hotels, car rental companies, or other 
              travel service providers.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold mb-4">5. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The TripWeave platform, including its original content, features, and functionality, is 
              owned by TripWeave and is protected by international copyright, trademark, patent, trade 
              secret, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold mb-4">6. Prohibited Uses</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You agree not to use the service to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon the rights of others</li>
              <li>Transmit harmful code or interfere with the platform</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use the service for any commercial purpose without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TripWeave shall not be liable for any indirect, incidental, special, consequential, or 
              punitive damages resulting from your use of or inability to use the service. Our total 
              liability shall not exceed the amount you paid for the service in the past twelve months.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold mb-4">8. Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              The service is provided on an "as is" and "as available" basis. We make no warranties, 
              expressed or implied, regarding the accuracy of travel information, pricing, or availability. 
              Travel details should always be confirmed directly with service providers.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold mb-4">9. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify users of any 
              material changes by posting the new Terms of Service on this page. Your continued use 
              of the platform after such modifications constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold mb-4">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at 
              legal@tripweave.com.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
