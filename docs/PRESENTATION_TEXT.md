# WasteLess AI — Presentation Deck Text, Animations & Speaker Notes

- **Deck File:** `WasteLess_AI_CSE276.pptx` (13 active slides + 1 hidden Viva Q&A backup slide = 14 total slides)
- **Course:** CSE276 | **University:** Lovely Professional University | **Duration:** 10–12 minutes
- **Team Split (~4 min each):**
  - `12528039 – Bhanu Pratap Singh` (Slides 1–4, 0:00–3:45)
  - `12526861 – Ansh Kumar` (Slides 5–8, 3:45–7:45)
  - `12527718 – Avani Joshi` (Slides 9–13, 7:45–12:00)
- **Embedded Screenshots Status:** All 7 real application and website screenshots (`web-dashboard.png`, `web-action-plan.png`, `web-insights.png`, `app-home.png`, `app-add-item.png`, `app-recipes.png`, `app-settings-ai.png`) are captured from the running Expo Web SPA (`1024×640`) and Android Release APK (`1344×2992` on Pixel 10 Pro XL) in `docs/screenshots/` and embedded with exact aspect-ratio preservation inside browser and phone mockups on Slides 1, 7, 9, and 10.

---

## Global Transition & Animation Spec
- **Slide Transition (all 14 slides):** `Fade` (fast, ~0.4–0.5s, advance On Click).
- **Title Entrance:** `Wipe from Left` (auto with slide load, 0.35s) or `Fade` (Slide 1).
- **Bullets:** Appear `1-by-1 On Click` (`Fade`, 0.32–0.35s).
- **Mockups:** Browser/Phone frames `Fly In` (`0.42–0.45s`), followed by numbered callouts & captions `On Click` (`Fade`, 0.34–0.38s).
- **Diagrams (Slides 5 & 7):** Step-by-step `Box → Arrow → Next Box` (`0.26–0.38s`).

---

## Slide 1: WasteLess AI – An AI Assistant to Reduce Household Food Waste
- **Slide Text:**
  - Badge: `CSE276 • LOVELY PROFESSIONAL UNIVERSITY`
  - Title: `WasteLess AI – An AI Assistant to Reduce Household Food Waste`
  - Subtitle: `Track fridge expiry. Prioritize safely. Cut food waste.`
  - Team (`12 November 2026`): `12528039 – Bhanu Pratap Singh` | `12526861 – Ansh Kumar` | `12527718 – Avani Joshi`
  - Mockups: Browser frame `docs/screenshots/web-dashboard.png` ("Website Dashboard") + Phone frame `docs/screenshots/app-home.png` ("Android Mobile App")
- **Animations:** Title (`Fade`, auto) → Subtitle + Team (`Fly In`, Click 1) → Browser (`Fly In`, Click 2) → Phone (`Fly In`, Click 3).
- **Speaker Notes (`Bhanu`, `0:00–0:45`):** Good morning faculty and classmates. I am Bhanu Pratap Singh, presenting WasteLess AI alongside Ansh Kumar and Avani Joshi for CSE276. WasteLess AI ek smart assistant hai jo households ko expiry dates track karke food waste kam karne mein madad karta hai. On the right, you see our single Expo codebase running across both the web dashboard and our Android mobile app. *Demo script:* Point first to the browser dashboard frame, then highlight the Android mobile phone frame beside it.

## Slide 2: Introduction: Food Waste Problem & Solution
- **Slide Text:**
  - Chart: `Global Food Waste Share (UNEP 2024)` — Households `60%`, Food Service `28%`, Retail `12%` (`631M tonnes wasted in homes, 79 kg/capita/year — UNEP Food Waste Index Report 2024`)
  - Highlight Quote: `"Fridge mein paneer expire ho gaya kyunki yaad hi nahi tha."`
  - Bullets:
    - `Forgotten items spoil behind newer groceries.`
    - `Users confuse Use-By and Best-Before dates.`
    - `Discarded dairy wastes money and emissions.`
    - `WasteLess AI plans safe recipes before expiry.`
- **Animations:** Title (`Wipe Left`, auto) → Doughnut Chart (`Fade`, Click 1) → Paneer Quote (`Fly In Left`, Click 2) → Bullets 1–4 one-by-one (`Fade`, Clicks 3–6).
- **Speaker Notes (`Bhanu`, `0:45–1:50`):** According to the UNEP Food Waste Index Report 2024, households account for 60 percent of all food waste—around 631 million tonnes globally. Sabse common situation har ghar mein hoti hai: fridge mein paneer expire ho gaya kyunki yaad hi nahi tha, ya Use-By aur Best-Before label mein confusion tha. Every wasted perishable item wastes grocery money and unnecessary greenhouse gases. WasteLess AI solves this by tracking fridge items and recommending safe actions before spoilage.

## Slide 3: Objectives & Project Scope
- **Slide Text:**
  - Objectives: `01 Safety Rules` (Prioritize fridge items safely before expiry) | `02 Search Plan` (Generate optimal actions using A* search) | `03 Grounded RAG` (Provide food guidance with verified sources) | `04 Green AI` (Cut LLM cost via rules and caching)
  - In Scope: Inventory dashboard with alerts and item CRUD; Household profile, recipes, and meal planning; Estimated food, money, and CO2e impact tracker; Full offline demo mode without API key; Single Expo codebase for Web and Android.
  - Out of Scope (`[fill]`): `[fill: Live grocery checkout integration]`; `[fill: IoT smart-fridge camera hardware]`; `[fill: Medical clinical diet prescriptions]`.
- **Animations:** Title (`Wipe Left`, auto) → Objective cards 1–4 (`Fly In`, Clicks 1–4) → In Scope (`Fade`, Click 5) → Out of Scope (`Fade`, Click 6).
- **Speaker Notes (`Bhanu`, `1:50–2:45`):** We structured WasteLess AI around four measurable engineering objectives: food-safety priority rules, optimal A* action planning, source-grounded RAG, and sustainable-AI cost reduction. In scope ke andar poora offline-ready ecosystem aata hai: inventory CRUD, recipes, impact estimates, aur web plus Android build. Hardware fridge sensors, supermarket billing sync, and medical diet therapy are kept strictly out of scope for this semester.

## Slide 4: Gap Analysis vs. Existing Solutions
- **Slide Text:**
  - Comparison Table (`Manual Tracking`, `Generic Inventory Apps`, `Recipe Apps`, `Plain LLM Chatbots`, **`WasteLess AI (Ours)`**) across `Expiry Prioritization`, `Explainable Plans`, `Grounded & Sourced Advice`, `Works Without API Key`, `Tracks AI Usage`.
  - Problem Statement: `Existing tools fail to unite expiry rules, explainable rescue plans, sourced guidance, and offline execution without paid LLM keys.`
- **Animations:** Title (`Wipe Left`, auto) → Comparison Table (`Fade`, Click 1) → Problem Statement banner (`Fly In`, Click 2).
- **Speaker Notes (`Bhanu`, `2:45–3:45`):** When comparing existing categories—manual notes, generic inventory apps, recipe apps, and plain chatbots—each covers only one narrow piece. Chatbots kabhi-kabhi unsafe food advice de dete hain bina source ke, aur API key ke bina bilkul kaam nahi karte. WasteLess AI bridges all five columns together cleanly. Next, Ansh will walk us through our architecture and core AI methodology.

## Slide 5: Methodology: System Architecture
- **Slide Text:**
  - Vector Flow: `Expo Client App (Web SPA + Android, Local Storage, Demo Mode Seed, Offline Core Fallback)` → `REST JSON (No Keys)` → `Node.js Backend API (Request Validation, Response Cache, Metrics Telemetry, Server-Only Keys)` → `1. Rules Engine`, `2. Search Planner (A*)`, `3. Utility Agents`, `4. RAG + Switchable LLM`
  - Key Points: `Offline fallback runs core rules locally.` | `LLM keys stay strictly inside Node.js server.`
- **Animations:** Title (`Wipe Left`, auto) → Client (`Fly Left`, Click 1) → Arrow 1 (`Wipe`, After) → API (`Fly Left`, After) → Arrow 2 + Lane 1 (`Click 2` + After) → Lane 2 (`Click 3`) → Lane 3 (`Click 4`) → Lane 4 (`Click 5`) → Highlights (`Fade`, Click 6).
- **Speaker Notes (`Ansh`, `3:45–4:45`):** Thank you Bhanu. Now let us inspect the end-to-end architecture built on one shared TypeScript core. Left side mein hamara Expo app hai jo Android aur browser dono par chalta hai aur offline fallback handle karta hai. It sends typed REST requests to our Node.js backend, which isolates LLM API keys and orchestrates rules, caching, A* planning, utility agents, and RAG.

## Slide 6: Methodology: Rules, A* Planner & Utility Agents
- **Slide Text:**
  - `1. Rules Engine`: Separates Use-By vs Best-Before labels; Never clears unsafe food by smell; Doubt triggers throw-it-out safety rule.
  - `2. Search Planner (A*)`: Models inventory state and time budget; Searches cook, freeze, leftovers, discard; Outputs steps plus rejected alternatives.
  - `3. Utility Agents`: Inventory & expiry agents rank items; Recipe & action agents score options; Weighted sliders configure scoring in Settings.
  - Formula: `U(x) = (w₁·Urgency + w₂·WasteSaved + w₃·Cost + w₄·TimeFit + w₅·Preference) / Σw`
- **Animations:** Title (`Wipe Left`, auto) → Pillars 1–3 (`Fly In`, Clicks 1–3) → Weighted Utility Formula (`Wipe Left`, Click 4).
- **Speaker Notes (`Ansh`, `4:45–5:50`):** Slide 6 explains our three complementary AI layers. First, explicit food-safety rules guard against expired Use-By foods—'smell karke check karo' jaisi risky advice kabhi nahi dete. Second, an A*/best-first search planner evaluates multi-item cooking, freezing, and leftover actions and explains why alternatives were rejected. Third, utility agents evaluate every option with the five-factor weighted formula shown at the bottom.

## Slide 7: Methodology: Grounded RAG & LLM Flow
- **Slide Text:**
  - Pipeline: `1. Query` → `2. Rules / Cache ($0, 0 tokens)` → `3. BM25 Retrieve (USDA FoodKeeper & FoodSafety.gov)` → `4. Grounded Answer (Cited sources or fallback to rules)`
  - Guarantees: `Orders rules first, then cache, then LLM.` | `Offline fallback switches cleanly to local rules.` | `Unmatched queries refuse to guess safely.`
  - Phone Mockup: `docs/screenshots/app-settings-ai.png` — Caption: `"Settings shows AI metrics & provider status"` — Callouts: `1 Non-LLM %`, `2 LLM Provider`, `3 Agent Weights`
- **Animations:** Title (`Wipe Left`, auto) → Flow `1 -> Arrow -> 2` (Click 1), `Arrow -> 3` (Click 2), `Arrow -> 4` (Click 3) → Guarantees (`Fade`, Click 4) → Phone Mockup (`Fly In`, Click 5) → Callouts & Caption (`Fade`, Click 6).
- **Speaker Notes (`Ansh`, `5:50–6:50`):** Here is our green-AI request pipeline: every query checks deterministic rules and cache first to eliminate redundant LLM calls. Only unmatched guidance hits RAG retrieval over verified USDA FoodKeeper and FoodSafety.gov documents—agar koi source match na ho, toh system guess karne ki jagah honestly mana karta hai. *Demo script:* Point to the Settings phone frame on the right: [1] 100% answered without an LLM, [2] server provider status (keys kept off-app), and [3] configurable utility agent weights.

## Slide 8: Methodology: Tech Stack & Development Process
- **Slide Text:**
  - Stack Cards: `Frontend: Expo + React Native + TS` (One codebase builds Website and Android APK) | `Backend: Node.js + TypeScript` (Handles RAG, providers, and keeps keys server-only) | `Storage: SQLite / AsyncStorage` (Repository layer enables fast offline demo mode) | `AI & QA: Shared Rules + Tests` (Core AI modules shared across Web, Android, API)
  - Timeline: `Phase 1 Core AI + Unit Tests` → `Phase 2 Offline UI + Demo` → `Phase 3 API + RAG + Metrics` → `Phase 4 Web + Android APK`
- **Animations:** Title (`Wipe Left`, auto) → Stack Cards 1–4 (`Fly In`, Clicks 1–4) → Timeline Phases 1–4 (`Wipe Left` step-by-step, Click 5).
- **Speaker Notes (`Ansh`, `6:50–7:45`):** Every stack choice balances speed, portability, and simplicity. Expo + TypeScript humein ek hi codebase se Website aur Android APK dono banane deta hai, aur Node.js backend keys ko safely hide karta hai. Development proceeded in four tested phases—core rules first, then offline demo UI, backend RAG, and finally Web export plus Android APK. Now Avani will present our live web, mobile, and impact results.

## Slide 9: Results: Web App Showcase (Browser Frames)
- **Slide Text:**
  - Frame 1 (`wasteless.app/`): `docs/screenshots/web-dashboard.png` — Caption: `"Dashboard highlights items to use soon"` — Callouts: `1 Urgency bucket`, `2 Days-left tag`
  - Frame 2 (`wasteless.app/plan`): `docs/screenshots/web-action-plan.png` — Caption: `"Action plan explains A* steps & safety"` — Callouts: `3 Ranked steps`, `4 Rule safety note`
  - Frame 3 (`wasteless.app/insights`): `docs/screenshots/web-insights.png` — Caption: `"Insights track estimated CO2e & savings"` — Callouts: `5 Estimate label`, `6 Formula guide`
  - Bullets: `Responsive Expo Web SPA built with TypeScript.` | `Urgency badges combine clear text and color.`
- **Animations:** Title (`Wipe Left`, auto) → Browser 1 (`Fly In`, Click 1) → Callouts + Caption (`Fade`, Click 2) → Browser 2 (`Fly In`, Click 3) → Callouts + Caption (`Fade`, Click 4) → Browser 3 (`Fly In`, Click 5) → Callouts + Caption (`Fade`, Click 6) → Summary Bar (`Fade`, Click 7).
- **Speaker Notes (`Avani`, `7:45–8:40`):** Thank you Ansh. I will first show our Website views, followed by the Android mobile app. On the website, all three screens run seamlessly in a desktop browser from the shared React Native codebase. *Demo script:* Left browser (`web-dashboard.png`): point to [1] urgency bucket labels and [2] days-left indicators; center (`web-action-plan.png`): [3] A* rescue plan steps and [4] safety rule warning; right (`web-insights.png`): [5] Estimate badges and [6] 'How is this calculated?' guide.

## Slide 10: Results: Android App Showcase (Mobile Views)
- **Slide Text:**
  - Phone 1: `docs/screenshots/app-home.png` — Caption: `"Home groups urgent & safe pantry items"` — Callouts: `1 Quick actions`, `2 Urgent alert`
  - Phone 2: `docs/screenshots/app-add-item.png` — Caption: `"Add Item enforces Use-By vs Best-Before"` — Callouts: `3 Date type`, `4 Storage pick`
  - Phone 3: `docs/screenshots/app-recipes.png` — Caption: `"Recipes & RAG answers cite real sources"` — Callouts: `5 Source URLs`, `6 Matched dish`
- **Animations:** Title (`Wipe Left`, auto) → Phone 1 (`Fly In`, Click 1) → Callouts + Caption (`Fade`, Click 2) → Phone 2 (`Fly In`, Click 3) → Callouts + Caption (`Fade`, Click 4) → Phone 3 (`Fly In`, Click 5) → Callouts + Caption (`Fade`, Click 6).
- **Speaker Notes (`Avani`, `8:40–9:35`):** Next, we showcase the Android mobile experience built from the exact same codebase. Mobile app kitchen ke paas quick logging aur instant meal check ke liye design kiya gaya hai. *Demo script:* Left phone (`app-home.png`): point to [1] quick action buttons and [2] Expired/Use-Today safety alert card; center (`app-add-item.png`): [3] Use-By vs Best-Before toggle and [4] Fridge/Freezer/Pantry selector; right (`app-recipes.png`): [5] clickable USDA/FoodSafety.gov source links and [6] ingredient-matched recipes.

## Slide 11: Results: Impact Tracking & Sustainable-AI Metrics
- **Slide Text:**
  - Household Impact Tracking (Labeled Estimates): `Food Waste Prevented: [placeholder: X.X kg (Estimate)]` | `Grocery Money Saved: [placeholder: ₹ / $ Value (Estimate)]` | `CO2e Avoided: [placeholder: Y.Y kg CO2e (Estimate)]`
  - Sustainable-AI Metrics (`Rules → Cache → LLM`): `Answered Without LLM: [placeholder: X% non-LLM rate]` | `Avg Request Latency: [placeholder: Y ms response time]` | `Tokens & Est. AI Cost: [placeholder: N tokens / $0.00xx]` | `Cache Hit & Fallback Rate: [placeholder: Z% cache / fallback]`
  - Transparency Notice: `Data Transparency: Household pilot figures remain marked [placeholder] rather than fabricated; impact savings always display as Estimate.`
- **Animations:** Title (`Wipe Left`, auto) → Left Impact Panel (`Fly Left`, Click 1) → Right Telemetry Panel (`Fly Bottom`, Click 2) → Transparency Note (`Fade`, Click 3).
- **Speaker Notes (`Avani`, `9:35–10:30`):** Slide 11 presents the exact tracking metrics instrumented inside WasteLess AI. Left side tracks food kg, money, and CO2e saved—every value is explicitly labeled 'Estimate' with transparent formulas inside the app. Right side logs Sustainable-AI telemetry: non-LLM percentage, response time, token cost, and cache hits. Because we have not conducted a multi-week live user trial yet, household totals are honestly marked as `[placeholder]`.

## Slide 12: Conclusion, Limitations & Future Scope
- **Slide Text:**
  - Takeaways: `1. Offline rules plus A* prioritize household food safely.` | `2. Grounded RAG prevents hallucinated food-safety advice.` | `3. One Expo codebase runs Web and Android.`
  - Limitations: `Manual typing needed to log items.` | `Savings use documented category estimates.` | `Curated local RAG covers core guides.`
  - Future Work (`[fill]`): `[fill: Barcode scan for quick entry]` | `[fill: Receipt OCR automatic pantry import]` | `[fill: Multi-household shared inventory sync]`
- **Animations:** Title (`Wipe Left`, auto) → Takeaways 1–3 (`Fly In`, Clicks 1–3) → Limitations (`Fade`, Click 4) → Future Work (`Fade`, Click 5).
- **Speaker Notes (`Avani`, `10:30–11:20`):** To summarize: deterministic rules paired with A* planning make food-rescue choices transparent and offline-ready. Abhi manual item entry aur category-level estimates hamari main limitations hain. In future versions, barcode scanning, grocery receipt OCR, and shared household syncing can make daily tracking effortless.

## Slide 13: Thank You, Q&A & Verified References
- **Slide Text:**
  - Left Panel: `Thank You! Questions & Live Demo Q&A` — `12528039 – Bhanu Pratap Singh` | `12526861 – Ansh Kumar` | `12527718 – Avani Joshi` | `CSE276 • Lovely Professional University`
  - Verified References:
    1. UNEP & WRAP (2024) — Food Waste Index Report 2024 (`https://www.unep.org/resources/publication/food-waste-index-report-2024`)
    2. FoodSafety.gov — Cold Storage Charts & FoodKeeper (`https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts`)
    3. USDA FSIS — Product Dating, Leftovers & Freezing (`https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/food-product-dating`)
    4. WRAP / LFHW — Date Labels & Household Storage (`https://www.lovefoodhatewaste.com/`)
    5. U.S. EPA & OWID — WARM Model & Food CO2e Factors (`https://www.epa.gov/warm` | `https://ourworldindata.org/food-choice-vs-eating-local`)
- **Animations:** Title (`Wipe Left`, auto) → Verified References (`Fade`, Click 1) → Thank You Panel (`Fly Left`, Click 2).
- **Speaker Notes (`Avani & All Team`, `11:20–12:00`):** Here are the verified public sources powering our knowledge base and impact factors—no synthetic citations are ever shown. Thank you very much for listening! Hum ab aapke questions aur live demo review ke liye ready hain.

## Slide 14 (Hidden Backup): Viva Q&A Backup — Top 10 Likely Questions
1. **Why use A\* search instead of a plain sorted list?** Balances multi-item recipes, time budget, and waste—explaining rejected alternatives.
2. **Why run Rules & Cache before calling an LLM?** Deterministic $0 safety responses, fast execution, and offline availability.
3. **How does RAG avoid unsafe hallucinations?** Retrieves only verified passages; unrelated queries trigger honest no-match refusals.
4. **Why store LLM API keys strictly on the server?** Prevents exposing private API secrets inside web bundles or decompiled APKs.
5. **Difference between 'Use by' and 'Best before'?** Use-By marks perishable safety cutoffs; Best-Before signals peak pantry quality.
6. **Why never judge food safety by smell or look?** Pathogens like Listeria lack odor/color change—doubt triggers 'throw it out'.
7. **Why label CO2e, food, and money as Estimates?** Uses documented EPA/WRAP/OWID category averages rather than exact store receipts.
8. **How does WasteLess AI run without an API key?** Demo mode runs seeded data with local TypeScript rules, A\*, and agents offline.
9. **What happens if the backend server disconnects?** The client catches request errors and executes core safety rules locally.
10. **Why Expo + Node.js instead of Kotlin + Python?** One TypeScript codebase targets Web and Android while sharing rules with backend.
