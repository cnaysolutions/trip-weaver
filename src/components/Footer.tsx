import { Compass } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/30 mt-24">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-gradient-hero flex items-center justify-center">
                <Compass className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold">TripWeave</p>
                <p className="text-xs text-muted-foreground">Concierge</p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
              Premium travel planning that feels like a private concierge. 
              Calm, precise, and always in your control.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-medium mb-4">Explore</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Destinations
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Travel Guides
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-medium mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/privacy" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} TripWeave Concierge. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
