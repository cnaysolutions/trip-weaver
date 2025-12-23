implementation-plan.md
Build Strategy (Big Picture)
	• Build calm before clever.
	• Ship end-to-end flow early, then deepen intelligence.
	• Prefer visible progress over hidden sophistication.

Step-by-Step Build Sequence
(Designed as mindless micro-tasks — no heavy thinking per step)
Phase 1 — Foundation (Week 1)
	1. Initialize frontend project (Vite + React + TS).
	2. Install Tailwind + shadcn/ui.
	3. Define global layout:
		○ Max-width container.
		○ Soft background.
		○ Generous vertical spacing.
	4. Set typography scale and color tokens.
	5. Implement auth:
		○ Email/password.
		○ Google OAuth (optional, later toggleable).

Phase 2 — Concierge Intake (Week 2)
	1. Create “Concierge Intake” scene:
		○ Single-column.
		○ Conversational pacing.
	2. Implement free-text city inputs.
	3. Connect Amadeus City & Airport Search API.
	4. Normalize input to:
		○ IATA city code.
		○ Airport codes.
		○ Country.
		○ Lat/Lon.
	5. Add passenger selector:
		○ Adults / Children / Infants.
	6. Add flight class selector.
	7. Persist intake state as a Trip.
Checkpoint:
	• A user can describe a trip calmly.
	• System responds intelligently to messy input.

Phase 3 — Flight Curation (Week 3)
	1. Connect Amadeus Flight Offers Search.
	2. Implement “reasonable pricing” filter:
		○ Remove extreme outliers.
	3. Randomize selection within quality band.
	4. Render flight cards:
		○ Route
		○ Times
		○ Class
		○ Price per passenger
	5. Auto-add selected flight to trip cost.
	6. Add “Do not consider in calculation” toggle.
Checkpoint:
	• Flights feel curated, not exhaustive.
	• Cost updates instantly.

Phase 4 — Cost Intelligence Core (Week 4)
	1. Create cost engine:
		○ Line-item ledger.
		○ Included / excluded state.
	2. Compute total trip cost reactively.
	3. Ensure recalculation < 200ms.
	4. Add subtle animation on cost change.
	5. Surface reassurance copy:
		○ “You can change this anytime.”
Checkpoint:
	• Removing items feels safe and reversible.

Phase 5 — Airport Mobility (Week 5)
	1. Add “Include airport car” toggle.
	2. Connect Amadeus Car Rental Offers API.
	3. Auto-set pickup/drop-off:
		○ Arrival airport.
		○ Trip dates.
	4. Select random but reasonable vehicle.
	5. Display:
		○ Vehicle type.
		○ Timing.
		○ Total price.
	6. Hook into cost engine.
Checkpoint:
	• Mobility feels thoughtful, not upsold.

Phase 6 — Hotel Discovery (Week 6)
	1. Add “Include hotel” toggle.
	2. Connect Amadeus Hotel Search API.
	3. Use geo-coordinates for distance calculation.
	4. Display hotel cards:
		○ Name.
		○ Price per night.
		○ Total stay cost.
		○ Distance from airport.
	5. Lock hotels as view-only.
	6. Connect to cost engine.
Checkpoint:
	• Hotels inform decisions without pressure.

Phase 7 — Daily Itinerary Orchestration (Week 7)
	1. Create timeline-based day view.
	2. Generate daily structure:
		○ Arrival / check-in / buffers.
	3. Connect OpenTripMap + Google Places.
	4. AI sequences attractions:
		○ Time-aware.
		○ Distance-optimized.
	5. Display:
		○ Short explanations (≤ 4 rows).
		○ Distance between stops.
Checkpoint:
	• Days feel paced, human, realistic.

Phase 8 — Concierge AI Layer (Week 8)
	1. Define AI personality:
		○ Calm.
		○ Experienced.
		○ Non-intrusive.
	2. Limit verbosity by default.
	3. Enable “Why this?” explanations on demand.
	4. Add gentle suggestions:
		○ “You may want to consider…”
	5. Ensure AI never overrides user choice.
Checkpoint:
	• AI feels like an advisor, not a chatbot.

Timeline Overview
	• Weeks 1–2: Intake + foundation.
	• Weeks 3–4: Flights + cost engine.
	• Weeks 5–6: Cars + hotels.
	• Weeks 7–8: Itinerary + AI concierge.

Team Roles & Rituals
Roles
	• Product / UX (concierge mindset).
	• Frontend engineer (calm UI).
	• Backend / API integrator.
	• AI prompt & behavior designer.
Rituals
	• Weekly 30-min usability test (3 users).
	• Log top 3 confusions.
	• Fix those first. Nothing else.


From <https://chatgpt.com/g/g-67e1e85fbeac8191a69b95c6d5c42ef6-lovable-prd-generator/c/694aa856-ce50-832c-bbca-ea6371c1a3c1> 

<img width="730" height="2975" alt="image" src="https://github.com/user-attachments/assets/911bc70f-e518-43ca-9002-856231ad9e90" />
