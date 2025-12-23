masterplan.md
30-Second Elevator Pitch
TripWeave Concierge is a premium travel planning and cost-intelligence platform that designs fully orchestrated holidays using real airline-grade data.
It feels like a private travel advisor: calm, precise, and in control—without booking pressure or urgency.

Problem & Mission
The problem
	• Travel planning is fragmented, stressful, and opaque.
	• Prices feel unreliable until late.
	• Removing or changing options causes friction and anxiety.
The mission
	• Replace chaos with composure.
	• Turn complex trips into clear, reversible plans.
	• Show real prices, always.
	• Behave like a trusted advisor—not a form, not a sales funnel.

Target Audience
Primary users:
	• Time-constrained professionals planning international holidays.
	• Couples and families seeking clarity before committing.
	• Travelers who value taste, transparency, and emotional calm.
Secondary users:
	• Frequent travelers comparing trip scenarios.
	• High-intent planners validating cost expectations.

Core Product Principles
	• Plan, don’t sell
No bookings. No urgency. No dark patterns.
	• Emotion first
Conversations before configuration.
	• Airline-grade truth
Amadeus + IATA normalization everywhere.
	• Radical reversibility
Every item optional. One click. Instant recalculation.
	• Advisor behavior
Suggests gently. Explains only when asked.

Core Features (High-Level)
1. Concierge Trip Intake
	• Guided, human-sounding conversation.
	• Accepts messy input.
	• Normalizes to:
		○ IATA city codes
		○ Airport codes
		○ Country
		○ Geo-coordinates
2. Flight Curation
	• Real-time Amadeus pricing.
	• “Reasonable” logic over cheapest.
	• Curated, non-overwhelming results.
	• Auto-added to trip total.
3. Airport Mobility (Optional)
	• Arrival-airport pickup.
	• Randomized but sensible vehicle class.
	• Real prices only.
	• Fully excludable.
4. Hotel Discovery (Optional, View-Only)
	• Informational only.
	• Distance-aware via geo-coordinates.
	• No booking pressure.
	• Cost included but reversible.
5. Daily AI-Orchestrated Itinerary
	• Day-by-day flow.
	• Time-aware sequencing.
	• Distance-optimized routing.
	• Calm, minimal explanations.
6. Cost Intelligence & Control
	• Line-item cost breakdown.
	• “Do not consider” toggle on every item.
	• Instant recalculation.
	• Zero penalties for change.

High-Level Tech Stack (Why It Fits)
	• Frontend: Vite + React + TypeScript
→ Fast, predictable, calm UI.
	• UI System: shadcn/ui + Tailwind
→ Consistent, restraint-friendly components.
	• Backend: Lovable Cloud
→ Rapid iteration, AI-native workflows.
	• APIs:
		○ Amadeus (Flights, Cars, Hotels)
		○ OpenTripMap / Google Places (Attractions)
	• Auth: Email/password (+ optional Google)
→ Low friction, no urgency.

Conceptual Data Model (In Words)
	• Trip
		○ Dates, passengers, preferences
	• Segment
		○ Flight | Car | Hotel | Attraction
	• Offer
		○ Provider data + price + metadata
	• Cost State
		○ Included / excluded
		○ Live total
	• Location
		○ IATA codes + geo-coordinates
Relationships:
	• One Trip → many Segments
	• Each Segment → many Offers (one active)

UI Design Principles
	• Don’t make users think.
	• Show the big picture first.
	• Use whitespace to slow the experience.
	• Timeline over tables.
	• Decisions always reversible.
Inspired by:
	• Boutique hotel concierge desks.
	• Calm editorial layouts.
	• Lovable’s “kindness in design” philosophy.

Security & Compliance Notes
	• No payment processing.
	• No booking credentials stored.
	• Minimal PII:
		○ Email
		○ Trip preferences
	• API keys secured server-side.
	• GDPR-aware data retention.

Phased Roadmap
MVP
	• Concierge intake
	• Flights + cost control
	• Daily itinerary (basic)
	• Exclusion toggles
V1
	• Car rentals
	• Hotel discovery
	• Distance-aware sequencing
	• Concierge AI personality
V2
	• Scenario comparison
	• Saved trips
	• Shareable itineraries
	• Cost trend insights

Risks & Mitigations
	• API volatility
→ Graceful fallbacks, cached snapshots.
	• Over-automation
→ AI explains only when asked.
	• Cognitive overload
→ Progressive disclosure, defaults first.



From <https://chatgpt.com/g/g-67e1e85fbeac8191a69b95c6d5c42ef6-lovable-prd-generator/c/694aa856-ce50-832c-bbca-ea6371c1a3c1> 

