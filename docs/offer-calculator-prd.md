# Offer Calculator — Product Requirements Document

**Product:** Gold Coast Home Buyers — Offer Calculator
**Version:** MVP (v1.0)
**Author:** Tej (s0n3w) + Jarvis
**Date:** March 17, 2026
**Status:** Draft
**Handoff:** #development

---

## 0. Key Assumptions

This model is built on the following assumptions. If a deal breaks one of these, inputs should be adjusted accordingly.

- **Cash buyer on disposition.** No financing costs modeled on the buy side.
- **Broward County, FL.** Doc stamp rates, title insurance customs (buyer pays in Broward), and market defaults are Broward-specific.
- **Seller pays their own closing costs in a traditional sale.** The presentation comparison assumes the seller would bear standard costs if listing traditionally.
- **Wholesaler is not the end buyer.** The tool calculates an assignment deal structure, not a buy-and-hold or fix-and-flip from the wholesaler's own capital.
- **Rehab estimates are for pricing purposes, not construction budgets.** The end buyer will perform their own detailed scope during due diligence.

---

## 1. Overview

### Problem
When preparing for a seller appointment, there is no structured tool to analyze a property, calculate an informed offer range, and present the value proposition to the seller. The current workflow involves manually stitching together data from Zillow, mental math, and gut feel across multiple browser tabs.

### Solution
A single-page responsive web application that takes property and market inputs, calculates offer ranges, closing costs, rehab estimates, and potential returns, then synthesizes the data into three purpose-built views:

1. **Analysis View** — Pre-appointment prep and offer planning (internal)
2. **Seller Presentation View** — Persuasion materials for the seller appointment
3. **Disposition View** — Deal marketing summary for end buyers (V2 priority)

### Where It Lives
- Hosted at `tools.gcoffers.com` (or similar internal subdomain)
- Single-page app with tabbed/sectioned views
- Local storage for state persistence (no backend database in MVP)
- No authentication required in MVP

---

## 2. Users & Use Cases

### Primary User: Tej (Acquisitions)
- **Pre-appointment:** Enters property data, pulls comps, reviews offer range, builds confidence in the numbers before meeting a seller
- **During appointment:** Switches to Seller Presentation view on tablet/laptop to walk the seller through the value proposition
- **Post-appointment:** References the analysis when making a formal offer

### Secondary User: Juhi (Transaction Coordination)
- May reference saved analyses for deal tracking and pipeline management

### Future User: End Buyer / Investor
- Views a deal summary generated from the Disposition view (V2)

---

## 3. Data Model — Inputs

### 3.1 Property Information
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Address | text | yes | Street address |
| City | text | yes | |
| County | dropdown | yes | Default: Broward. (Miami-Dade as future option) |
| Zip Code | text | yes | |
| Beds | number | yes | |
| Baths | number | yes | |
| Sqft | number | yes | Living area square footage. Used in comp calculations and rehab estimate. |
| Lot Size | text | no | |
| Year Built | number | no | |
| Property Type | dropdown | no | SFH, Condo, Townhouse, Multi-family |

### 3.2 Seller Context
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Zestimate | currency | yes | Pulled manually from Zillow. Primary anchor for seller-side calculations. |
| Purchase Price | currency | no | What the current owner paid. Informs motivation analysis. |
| Purchase Date | date | no | When the current owner bought. |
| Last Listed Price | currency | no | If recently listed, the asking price. Indicates seller expectations. |
| Last Listed Date | date | no | When it was last listed. |
| Notes | textarea | no | Freeform seller context, motivation signals, etc. |

### 3.3 Market Data
| Field | Type | Default | Notes |
|-------|------|---------|-------|
| List-to-Sale Ratio | % | 97% | How much below asking homes actually sell for. Broward County default. Used in seller presentation. Editable. |
| Avg Days on Market | number | 60 | Average DOM for Broward County. Feeds holding cost calculation and seller presentation. Editable. |

> **Note:** Defaults are set for Broward County as of Q1 2026. Ideally refreshed periodically (fast follow: automated refresh from a data source). Zip-code-level data is aspirational.

### 3.4 Comparable Sales (Comps)
Editable table. Minimum 0 rows, recommended 3-5.

| Column | Type | Notes |
|--------|------|-------|
| Address | text | Comp property address |
| Sale Price | currency | Actual sale price |
| Sqft | number | Living area |
| $/Sqft | currency | **Auto-calculated:** Sale Price ÷ Sqft |
| Condition | dropdown | **As-Is** or **Flipped** |
| Sale Date | date | MM/YYYY is sufficient |

**+ Add Comp** button to add rows.

**Comp Summary (auto-calculated):**
- Avg As-Is $/sqft (from comps marked "As-Is")
- Avg Flipped $/sqft (from comps marked "Flipped")
- Estimated As-Is Value = Avg As-Is $/sqft × Subject Sqft
- **Estimated ARV** = Avg Flipped $/sqft × Subject Sqft

### 3.5 Rehab Estimate
| Field | Type | Notes |
|-------|------|-------|
| Rehab Scope | dropdown | **Light ($30/sqft)**, **Medium ($60/sqft)**, **Heavy ($90/sqft)**, **Custom** |
| Custom $/sqft | currency | Enabled when "Custom" is selected |
| Contingency | % | Default: **3%**. Editable. Added to rehab total. |

**Auto-calculated:**
- Base Rehab = selected $/sqft × Subject Sqft
- Contingency Amount = Base Rehab × Contingency %
- **Total Rehab Estimate** = Base Rehab + Contingency Amount

### 3.6 Deal Structure
| Field | Type | Default | Notes |
|-------|------|---------|-------|
| Assignment Fee | $ | $10,000 | Target wholesale fee. Feeds into opening offer calc and disposition profit. Editable. |
| Minimum Profit Margin | % | 20% | Minimum investor margin. Used in max offer calculation. Editable. |

---

## 4. Closing Cost Model

### 4.1 Seller-Side Closing Costs
Editable table. Each row has: Category, Type toggle (% or $), Default Value (editable), and a calculated Amount.

| Category | Type | Default | Calculation |
|----------|------|---------|-------------|
| Agent Commissions | % | 6% | % × Zestimate (or sale price anchor) |
| Transfer Taxes (Doc Stamps) | % | 0.70% | % × sale price. Broward rate: $0.70/$100 |
| Title & Escrow Fees | % | 1.5% | Rolls up: title search, abstract, owner's title insurance, escrow/settlement, recording fees |
| Attorney Fees | $ | $500 | Flat fee |
| Make-Ready Costs | % | 2% | What seller would spend to list traditionally (paint, repairs, staging). Persuasion number. |
| Prorated Property Taxes | $ | (from lookup) | Actual annual tax ÷ 12 × months remaining. User enters annual tax amount. |
| Holding Costs | $ | (calculated) | (Monthly property tax + est. monthly insurance) × (Avg DOM ÷ 30). Insurance default: **$400/mo** for Broward (avg annual premium ~$4,575-$6,112; lower-value distressed properties skew toward lower end). Editable. |
| Other | toggle | — | User-defined label and value |
| **+ Add Row** | | | Additional custom line items |
| **Total Seller Closing Costs** | | | **Sum of all rows** |

### 4.2 Buyer-Side Closing Costs (Cash Buyer)
Same table format, simplified for cash buyer assumption. No financing costs.

| Category | Type | Default | Calculation |
|----------|------|---------|-------------|
| Transfer Taxes | % | 0.70% | % × purchase price |
| Title & Escrow Fees | % | 1.5% | Title insurance (buyer pays in Broward), settlement, recording |
| Inspection & Due Diligence | $ | $1,500 | Appraisal, inspection, survey |
| Other | toggle | — | User-defined |
| **+ Add Row** | | | |
| **Total Buyer Closing Costs** | | | **Sum of all rows** |

---

## 5. Core Calculations

### 5.1 Offer Range

**Opening Offer (Negotiation Anchor — Zestimate-Based)**
```
Opening Offer = Zestimate − Total Seller Closing Costs − Assignment Fee
```
This is a negotiation anchor, not an investment-driven floor. It represents what's left after deducting all the costs a seller would face in a traditional sale, minus your assignment fee. The intent is to ground your opening number in a framework the seller can follow: "Here's what Zillow says, here's what it actually costs to sell, here's what's left." It's a persuasion tool backed by real math.

**Max Offer (Ceiling — ARV-Based)**
```
Max Offer = ARV − Total Rehab Estimate − Buyer Closing Costs (buy + sell side) − (ARV × Minimum Profit Margin %)
```
This is the most you should pay and still have enough margin for an investor to want the deal. Derived from the comp-based ARV, working backwards through all costs.

**Offer Range = Opening Offer → Max Offer**

### 5.2 Seller Net Proceeds (Traditional vs. Our Offer)

**Traditional Sale Net:**
```
Traditional Net = Zestimate × List-to-Sale Ratio − Total Seller Closing Costs
```

**Our Offer Net:**
```
Our Offer Net = Our Offer Price (user selects via slider or manual input) − $0 costs to seller
```
Offer selection UX: slider within the Opening Offer → Max Offer range, with manual override input. Defaults to midpoint.

The delta between these two numbers is the core of the seller presentation.

**All-In Basis (Analysis View only):**
```
All-In Basis = Contract Price + Your Closing Costs + Assignment Fee
```
This is what it actually costs you to do the deal. Shown in View 1 only, never in the seller presentation.

### 5.3 Disposition Profit & ROI (V2 — outline only)

**Investor Profit:**
```
Profit = ARV − Contract Price − Total Rehab Estimate − Buyer Closing Costs (buy + sell)
```

**ROI:**
```
ROI % = Profit ÷ (Contract Price + Total Rehab Estimate + Buyer Closing Costs) × 100
```

---

## 6. Output Views

### 6.1 View 1: Analysis (Pre-Appointment Prep)

**Purpose:** Internal dashboard for offer planning. Shows all data and calculations.

**Sections:**
1. **Property Summary** — Address, sqft, beds/baths, Zestimate, purchase history, listing history
2. **Market Context** — List-to-sale ratio, avg DOM
3. **Comp Summary** — Comp table + calculated avg $/sqft (as-is and flipped), estimated as-is value, estimated ARV
4. **Seller Closing Cost Breakdown** — The editable table with all categories and totals
5. **Rehab Estimate** — Scope, $/sqft, contingency, total
6. **Offer Range** — Opening offer, max offer, spread. Slider for selection. Visually prominent.
7. **Net Revenue Projection** — If you acquire at X, rehab for Y, sell at ARV: what's the profit? (Feeds into disposition view later)
8. **All-In Basis** — Contract price + your closing costs + assignment fee. Your true cost to do the deal.

**Design notes:**
- This is the "full spreadsheet" view. Dense is OK. It's for analysis, not presentation.
- All inputs are editable from this view.
- Recalculates in real time as inputs change.

### 6.2 View 2: Seller Presentation

**Purpose:** Walk the seller through a narrative that anchors on money in their pocket, not the offer price. Designed to be shown on a tablet or laptop during the appointment.

**Narrative Flow:**

**Section 1: "Your Home's Value"**
- Zestimate displayed prominently
- Property details (beds, baths, sqft)
- Positive framing: "Here's what Zillow estimates your home is worth."

**Section 2: "What You'd Actually Take Home"**
- Waterfall breakdown: Zestimate → minus each cost category → **Net Proceeds**
- Each deduction shown as a line item with the dollar amount
- The final "net in your pocket" number is visually emphasized
- Frame: "After commissions, taxes, fees, repairs, and waiting, here's what you'd actually walk away with."

**Section 3: "Market Reality"**
- List-to-sale ratio: "Homes in your area sell for X% below asking"
- Avg DOM: "It takes an average of X days to sell"
- Adjusted net: the Section 2 number drops further when accounting for market discount
- Frame: "And that assumes you sell at full Zestimate. The market says otherwise."

**Section 4: "What We Can Put In Your Pocket"**
- A single, clean number: the net amount they receive from our offer
- No commissions, no repairs, no showings, no uncertainty
- "At your convenience" — they choose the timeline
- Frame: "This is what we can put in your hands, on your schedule."

**Section 5: "Side-by-Side"**
| | Traditional Sale | With Us |
|---|---|---|
| **In Your Pocket** | **$X** | **$Y** |
| Commissions | ($X) | $0 |
| Closing Costs | ($X) | $0 |
| Repairs / Make-Ready | ($X) | $0 |
| Holding Costs | ($X) | $0 |
| Timeline | ~X months | At your convenience |
| Certainty | ❌ | ✅ |

**Design notes:**
- The offer price itself does NOT appear. Only net-to-seller numbers.
- Clean, minimal design. Large fonts. No clutter.
- Should feel like a professional presentation, not a spreadsheet.
- Optimized for tablet display (landscape).
- All internal numbers (ARV, rehab, your margin, assignment fee) are hidden.

### 6.3 View 3: Disposition Summary (V2 — Low Priority)

**Purpose:** Deal marketing package for end buyers / investors.

**Sections (outline only, to be refined when we have a deal to work with):**
1. Property details (address, beds/baths/sqft, year built, lot size)
2. Photos (manual upload, V2)
3. Contract price
4. ARV + supporting comps
5. Estimated rehab (scope + cost)
6. Buyer closing costs
7. Potential profit and ROI %
8. Property tax info
9. Rehab scope notes
10. Map / neighborhood context

**Open questions for V2:**
- Does this output as a shareable page, a PDF, an email template?
- Does it feed into GHL for buyer list distribution?
- Does it sync with deals.gcoffers.com?

---

## 7. Technical Scope — MVP

### Platform
- Responsive single-page web application
- Desktop-first input, responsive for tablet (presentation) and mobile (reference)
- Hosted at `tools.gcoffers.com` (or similar subdomain)

### Tech Stack
- To be determined by #development
- Suggestion: lightweight frontend framework (React/Next.js or even vanilla JS)
- No backend database in MVP — local storage for state persistence
- No authentication in MVP

### Key Behaviors
- All calculations update in real time as inputs change
- Closing cost tables are fully editable (% or $ toggle, default values, add/remove rows)
- Comp table supports add/remove rows
- View 2 (Seller Presentation) is a separate clean view, no editing controls visible
- Local storage saves current analysis so work isn't lost on refresh
- Export JSON / Import JSON for portability across devices and backup
- Print-friendly CSS for View 2 (Seller Presentation) — clean print/PDF output for leaving a copy with the seller

### Design
- Clean, professional aesthetic consistent with Gold Coast Home Buyers brand
- Colors: Primary `#2F63AE`, Accent `#D5B238`, Dark `#1F2937`
- View 1 (Analysis): dense, data-rich, spreadsheet-like. Function over form.
- View 2 (Presentation): clean, minimal, large typography, presentation-quality. Tablet-optimized.
- View 3 (Disposition): deferred design, functional only in MVP if included.

---

## 8. Out of Scope — Fast Follow / V2

| Feature | Priority | Notes |
|---------|----------|-------|
| Automated Zestimate / property data pull | High | API integration (Zillow, ATTOM, PropStream, or MLS) |
| Automated comp sourcing | High | Pull sold comps within radius from data source |
| Market data auto-refresh | Medium | List-to-sale ratio, DOM by county/zip on a scheduled refresh |
| Saved deals / persistence | Medium | Backend database, unique URLs per analysis |
| Shareable presentation URL | Medium | `/calc/{id}/present` — clean URL for seller view without internal data |
| PDF export | Medium | Export View 2 or View 3 as PDF for email/print |
| Zip-code-level market data | Medium | More granular than county-level defaults |
| Miami-Dade county support | Low | Different doc stamp rates and title insurance customs |
| View 3 full build-out | Low | Photos, maps, email/newsletter integration |
| GHL / CRM integration | Low | Push deal data into GoHighLevel pipeline |
| deals.gcoffers.com sync | Low | Surface disposition data on investor portal |
| MLS integration | Low | Tej has MLS access; could automate comp pulling |
| Authentication / multi-user | Low | Only needed if team grows |

---

## 9. Success Criteria

**MVP is successful if:**
1. Tej can analyze a property in under 10 minutes (vs. 30+ minutes of manual Zillow tab-hopping)
2. The seller presentation view is clean enough to show on a tablet during an appointment without embarrassment
3. The offer range calculation gives Tej confidence to make an offer he can back up with data
4. The tool replaces the mental math and gut-feel process with a structured, repeatable framework

---

## 10. Open Questions

1. ~~**Default market data:**~~ **Resolved.** List-to-Sale: 97%, DOM: 60 days (Broward County defaults).
2. ~~**Assignment fee:**~~ **Resolved.** Promoted to first-class input under Deal Structure (Section 3.6). Default: $10,000.
3. ~~**View 2 — "Our Offer Net":**~~ **Resolved.** Slider within Opening Offer → Max Offer range, with manual override. Defaults to midpoint.
4. ~~**Insurance estimate for holding costs:**~~ **Resolved.** Default: $400/mo. Broward County avg annual premium is $4,575-$6,112 (~$380-$510/mo). $400/mo accounts for lower-value distressed properties typical of wholesale targets.
5. **View 3 delivery format:** PDF? Shareable link? Email template? CRM integration? (Deferred to V2, but worth deciding before building persistence.)

---

*This PRD is a living document. Update as decisions are made and scope evolves.*
