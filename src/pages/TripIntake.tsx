import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TripIntakeForm } from "@/components/TripIntakeForm";
import { generateMockTripPlan } from "@/data/mockTripData";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useTripPersistence } from "@/hooks/useTripPersistence";
import type { TripDetails, TripPlan } from "@/types/trip";
function setMetaTag(name: string, content: string) {
  const existing = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (existing) {
    existing.setAttribute("content", content);
    return;
  }

  const meta = document.createElement("meta");
  meta.setAttribute("name", name);
  meta.setAttribute("content", content);
  document.head.appendChild(meta);
}

function setCanonical(url: string) {
  const existing = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (existing) {
    existing.setAttribute("href", url);
    return;
  }

  const link = document.createElement("link");
  link.setAttribute("rel", "canonical");
  link.setAttribute("href", url);
  document.head.appendChild(link);
}

export default function TripIntake() {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { theme, toggleTheme, themeClass, modeClass } = useTheme();
  const { saveTrip } = useTripPersistence();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Plan a Trip | Best Holiday Plan";
    setMetaTag("description", "Plan an international trip with calm guidance, real prices, and reversible choices.");
    setCanonical(`${window.location.origin}/trip/new`);
  }, []);

  const handleFormSubmit = async (details: TripDetails) => {
    setIsLoading(true);

    // Simulate API call delay for realistic experience
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Generate the trip plan
    const plan = await generateMockTripPlan(details);

    // Save to Supabase if user is logged in
    let savedTripId: string | null = null;
    if (user) {
      const result = await saveTrip(user.id, details, plan);
      savedTripId = result.tripId;
      if (result.error) {
        console.error("Error saving trip:", result.error);
      }
    }

    setIsLoading(false);

    // Navigate to trip details page with the generated data
    if (savedTripId) {
      // Trip saved successfully - navigate to /trip/{id} with data in state
      navigate(`/trip/${savedTripId}`, {
        state: {
          tripDetails: details,
          tripPlan: plan,
          freshlyGenerated: true,
        },
      });
    } else {
      // Save failed or not logged in - navigate to /trip/new with data in state
      navigate(`/trip/new`, {
        state: {
          tripDetails: details,
          tripPlan: plan,
          freshlyGenerated: true,
        },
      });
    }
  };

  return (
    <div className={`app-shell ${themeClass} ${modeClass} flex flex-col`}>
      <Header theme={theme} onToggleTheme={toggleTheme} />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <section className="max-w-2xl mx-auto">
          <header className="text-center mb-12 animate-fade-in">
            <h1 className="font-display text-3xl font-semibold text-foreground mb-3">Plan Your Trip</h1>
            <p className="text-muted-foreground leading-relaxed">
              Share the essentials. We'll orchestrate the details—calmly, with full control.
            </p>
          </header>

          <TripIntakeForm onSubmit={handleFormSubmit} isLoading={isLoading} />
        </section>
      </main>

      <Footer />
    </div>
  );
}
