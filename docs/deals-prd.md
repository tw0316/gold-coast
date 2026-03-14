# PRD: deals.gcoffers.com — Investor Deal Portal

> **Author:** Jarvis (PM)
> **Date:** March 13, 2026
> **Status:** Draft
> **Stakeholder:** Tej (s0n3w)

---

## 1. Overview

Build a buyer-facing deal portal at `deals.gcoffers.com` where real estate investors can browse available wholesale properties, join the Gold Coast Home Buyers buyer list, and express interest in specific deals. This is the counterpart to `gcoffers.com` (seller-facing lead generation).

### Goals
- Build and grow the buyer list (the single most valuable asset for a wholesaling business)
- Distribute deals faster than manual FB posts and text blasts
- Create a professional, mobile-first experience that differentiates Gold Coast from Carrot-template competitors
- Capture investor buy box data for targeted deal distribution via GHL

### Non-Goals (V1)
- Investor accounts / login
- In-portal offer submission or negotiation
- Automated deal alerts (use GHL workflows manually)
- Document sharing / e-signatures
- Deal status tracking for investors
- Blog / SEO content

---

## 2. Competitive Analysis Summary

Six competitor sites analyzed. Full teardown in project docs.

| Pattern | Who Does It | Our Approach |
|---------|-------------|--------------|
| Gate all deals behind signup | Miami Market Deals, HousesAtWholesale | **No:** All deals public, buyer signup is for alerts only |
| Show everything publicly | OffMarketLS | **Yes:** Active + closed deals visible to anyone |
| Email-only first capture | New Western | **Yes:** Low-friction first touch, collect details on deal interest |
| Buy box collection on signup | Miami Market Deals, HousesAtWholesale | **Yes:** Areas, property types, strategy, price range |
| Before/After photos | New Western | **Yes (V2):** When we have closed deals with rehab photos |
| Sold deals as social proof | New Western, OffMarketLS | **Yes:** "Recently Closed" section with key numbers |
| Stats bar | New Western ($1.7B, 250K investors) | **Later:** Once we have real numbers |
| Account-based with password | HousesAtWholesale | **No:** Too much friction for V1 |
| Dual consent checkboxes | Miami Market Deals, gcoffers.com | **Yes:** Reuse A2P-compliant pattern from seller site |
| FAQ page | OffMarketLS, Miami Market Deals | **Yes:** Addresses common objections |

### Design Differentiation

Every competitor except New Western uses Carrot templates (dark backgrounds, outdated layouts, poor mobile UX). gcoffers.com already has a clean, modern design language (Inter + Montserrat, blue primary `#2F63AE`, 18px border radius cards, subtle shadows). The deal portal should extend this design system while being optimized for mobile-first browsing (investors check deals on their phone between job sites/meetings).

---

## 3. Information Architecture

```
deals.gcoffers.com
├── / (Landing + deal listing + closed deals — all public)
├── /deals/{slug}/ (Individual deal detail — public)
├── /join/ (Buyer list signup with buy box — for deal alerts)
├── /faq/ (Common investor questions)
├── /privacy-policy/ (Shared with gcoffers.com or duplicated)
└── /terms/ (Shared with gcoffers.com or duplicated)
```

---

## 4. Page Specifications

### 4.1 Landing Page (`/`)

**Purpose:** Convert visitors into buyer list signups by showing credibility and teasing deal quality.

**Layout (top to bottom):**

**Header (sticky)**
- Logo: Gold Coast Home Buyers (same logo as seller site)
- Nav: How It Works | FAQ | (786) 983-5811
- CTA button: "Join Buyers List"
- Mobile: hamburger menu, logo, CTA button only

**Hero Section**
- Headline: "Off-Market Investment Properties in South Florida"
- Subhead: "Get first access to wholesale deals at 20-40% below market value. Cash buyers only."
- Single email input + "Get Access" button (lowest friction capture)
- Micro-trust: "Free to join. No spam. First come, first served."
- Trust pills: "Off-Market Deals" | "Cash/HML Only" | "First Access for Members"

**How It Works (3 steps)**
1. "Join Our Buyers List" — Tell us what you're looking for. Takes 60 seconds.
2. "Get Deal Alerts" — We send you new properties as they come available.
3. "Move Fast, Close Fast" — Express interest, we connect you with details.

**Recently Closed Deals (public, not gated)**
- Section title: "Deals We've Closed"
- Subtitle: "Real properties. Real numbers. See the types of deals we source."
- Grid of 3-6 deal cards showing CLOSED deals only
- Each card:
  - Hero photo
  - Status badge: "CLOSED" (green)
  - Deal type: "Assignment of Contract" or "Double Close"
  - Area (neighborhood/city, NOT full address)
  - Property type (SFH, Multi-family, etc.)
  - Key numbers: Purchase Price | ARV | Sqft | Beds/Baths
  - Close date
- Below grid: "Want to see active deals? →" CTA linking to /join/
- NOTE: When there are no closed deals yet, show placeholder section: "Deals Coming Soon — Join our buyers list to get first access when properties go live."

**Why Gold Coast? (value props)**
- "Off-Market Only" — Properties you won't find on the MLS
- "Below Market Value" — 20-40% below ARV, sourced direct from sellers
- "Cash Buyer Friendly" — No lender hoops, close fast
- "First Come, First Served" — Buyers list members get first shot
- "South Florida Focus" — Miami-Dade, Broward, Palm Beach specialists
- "No Fees to Buyers" — Our profit is built into the deal price

**Buyer Personas Section**
- "Whether you're a..."
- Fix & Flipper — looking for rehab deals with wide margins
- Buy & Hold Investor — looking for rental properties that cash flow
- BRRRR Investor — buy, rehab, rent, refinance, repeat
- Wholesaler/JV Partner — looking to co-wholesale or take assignments

**CTA Section (bottom)**
- "Get First Access to Our Deals"
- Full signup form (same as /join/ page) OR link to /join/
- Phone: "Prefer to talk? Call/Text (786) 983-5811"

**Footer**
- Logo
- Links: Privacy Policy | Terms of Service | Contact
- Disclaimer: "All properties are sold as-is for cash or hard money. Buyers are responsible for their own due diligence. Prices are NET to seller with buyer paying all closing costs. Opinions of value are given as a courtesy; no guarantees are expressed or implied."
- © 2026 Gold Coast Home Buyers. All rights reserved.

---

### 4.2 Buyer List Signup (`/join/`)

**Purpose:** Collect investor contact info + buy box preferences for segmented deal distribution.

**Layout:**

**Header:** Same as landing page

**Form Card (centered, max-width 560px)**

Title: "Join Our Buyers List"
Subtitle: "Get first access to off-market investment properties in South Florida."

**Fields:**

1. **Full Name** (text, required)
   - id="full-name", placeholder="Full Name"

2. **Email** (email, required)
   - id="email", placeholder="Email Address"

3. **Phone** (tel, required)
   - id="phone", placeholder="Phone Number"
   - Same auto-formatting as seller site

4. **What Best Describes You?** (select, required)
   - Options: "Fix & Flip Investor", "Buy & Hold / Rental Investor", "BRRRR Investor", "Wholesaler / JV Partner", "New Investor (First Deal)", "Other"

5. **Areas You Buy In** (multi-select checkboxes)
   - Miami-Dade County
   - Broward County
   - Palm Beach County
   - Other / Flexible

6. **Property Types** (multi-select checkboxes)
   - Single Family Home
   - Multi-family (2-4 units)
   - Condo / Townhouse
   - Vacant Land

7. **Price Range** (select, optional)
   - Options: "Under $150K", "$150K - $300K", "$300K - $500K", "$500K+", "Flexible"

8. **Preferred Purchase Method** (select, optional)
   - Options: "Cash", "Hard Money", "Either"

9. **Service Messages Consent** (checkbox, required)
   - Same A2P-compliant wording as gcoffers.com seller site, adapted for buyer context:
   - "By checking this box, I consent to receive service-related SMS messages from Gold Coast Home Buyers, including property deal alerts, availability updates, and transaction communications, at the phone number provided above. Messages may be sent using an automated system. Message frequency varies. Message & data rates may apply. Reply STOP to opt out, HELP for help. This consent is not a condition of purchase. View our Terms of Service and Privacy Policy."

10. **Marketing Messages Consent** (checkbox, optional)
    - "I also consent to receive marketing and promotional SMS messages from Gold Coast Home Buyers, including investment tips, market updates, and company news. Message frequency varies. Message & data rates may apply. Reply STOP to opt out at any time."

11. **Submit button:** "Join Buyers List"

**Success State:**
- "You're on the list! 🎉"
- "We'll send you deal alerts as new properties become available. In the meantime, check out our recently closed deals."
- Link to `/` (landing page)
- Note: "Deals are first come, first served. When you get an alert, respond fast."

---

### 4.3 Active Deal Listing (on Landing Page `/`)

**Purpose:** Show all available properties publicly. No gate, no signup required to browse.

The deal listing lives directly on the landing page below the hero section (not on a separate `/deals/` route). This keeps everything on one page and reduces friction. The `/join/` page is for investors who want deal alerts via text/email, not for access control.

**Layout:**

**Filter Bar (sticky on mobile, below header)**
- Filter chips: All | SFH | Multi-family | Condo
- Sort: Newest First | Price: Low-High | Price: High-Low
- Clear filters link

**Deal Grid**
- Responsive: 1 column mobile, 2 columns tablet, 3 columns desktop
- Each card:
  - Hero photo (16:9 aspect ratio, lazy loaded)
  - Status badge: "AVAILABLE" (blue) | "UNDER CONTRACT" (orange) | "SOLD" (green)
  - Deal type badge: "Assignment" | "Double Close"
  - Area/Neighborhood (not full address until they express interest)
  - Property type | Beds | Baths | Sqft
  - **Key numbers:**
    - Asking Price (prominent, large font)
    - ARV
    - Est. Rehab
    - Potential ROI %
  - "View Details →" link to deal detail page
  - "I'm Interested" quick-action button (opens mini form or scrolls to form on detail page)

**Empty State (no active deals)**
- "No deals available right now."
- "We're always sourcing new properties. You'll get a text/email as soon as something hits."
- "In the meantime, make sure your buy box is up to date." → Link to update preferences (V2, or just "call us")

---

### 4.4 Deal Detail Page (`/deals/{slug}/`)

**Purpose:** Give investors enough information to decide whether to express interest. Fully public, no gate.

**Layout:**

**Photo Gallery**
- Hero image (full-width on mobile)
- Thumbnail strip below (tap to expand, swipe on mobile)
- 5-10 photos: exterior, interior rooms, any damage/rehab areas, street view
- Lightbox on tap (pinch to zoom on mobile)

**Deal Header**
- Status badge + Deal type badge
- Area/Neighborhood, City, County
- Property type | Beds | Baths | Sqft | Lot Size | Year Built

**Numbers Breakdown (card)**
- Asking Price (large, prominent)
- After Repair Value (ARV)
- Estimated Rehab Cost
- Estimated Closing Costs
- **Potential Profit** (calculated: ARV - Asking - Rehab - Closing)
- **Potential ROI %** (calculated: Profit / Total Investment)
- Note: "All numbers are estimates. Buyers are responsible for their own due diligence."

**Property Details**
- Occupancy: Vacant / Occupied / Tenant-occupied
- Construction: CBS / Frame / etc.
- Rehab Scope: Brief description of what needs work
- Additional notes (free text from admin)

**Map**
- General area pin (neighborhood-level, NOT exact address)
- Label: "Exact address provided upon expressing interest"

**"I'm Interested" Form**
- Pre-filled if we have their info from buyer list signup (via cookie/token)
- Fields: Name, Email, Phone, Message (optional: "Tell us about your offer or questions")
- Submit button: "I'm Interested — Send Me Details"
- Success: "Got it! We'll reach out within 24 hours with the full property address and next steps."

**Disclaimer Footer**
- "This property may be sold via assignment of contract. Seller may hold equitable interest via an executed Purchase and Sale Agreement. All properties sold as-is. Cash or hard money only. Buyer responsible for due diligence and all closing costs."

---

### 4.5 FAQ Page (`/faq/`)

**Purpose:** Address common objections and educate new investors.

**Questions (based on competitor patterns + wholesaling-specific):**

1. **What is a wholesale deal?**
   "A wholesale deal is an off-market property that we've negotiated directly with the seller at a below-market price. We pass the deal to you via an assignment of contract or double close, so you get the property at a significant discount."

2. **Why are these properties discounted?**
   "We work directly with homeowners in situations where they need to sell quickly — foreclosure, inheritance, divorce, relocation, costly repairs, etc. Because we buy direct (no MLS, no agents), we negotiate prices 20-40% below market and pass the savings to our buyers."

3. **Can I use bank financing?**
   "Our deals are structured for cash buyers or hard money lenders. Traditional bank financing typically takes too long for these time-sensitive deals. If you need a lender recommendation, contact us and we can connect you with trusted hard money lenders in South Florida."

4. **How do I make an offer?**
   "Click 'I'm Interested' on any deal page. We'll send you the full property address and details within 24 hours. From there, you can schedule a walkthrough and submit your offer. Deals are first come, first served."

5. **How often do you add new properties?**
   "We're constantly sourcing new deals. When a new property becomes available, we notify our buyers list via text and email. Sign up to get alerted first."

6. **Do you charge buyers any fees?**
   "No separate fees. Our wholesale fee (the spread between our contract price and the assignment price) is built into the asking price. What you see is what you pay, plus standard closing costs."

7. **What areas do you cover?**
   "We specialize in South Florida: Miami-Dade County, Broward County, and Palm Beach County. This includes Miami, Fort Lauderdale, Boca Raton, West Palm Beach, Hollywood, Pompano Beach, and surrounding areas."

8. **What does 'Assignment of Contract' mean?**
   "It means we've signed a purchase contract with the seller, and we assign our position in that contract to you (the end buyer). You close directly with the seller at the agreed price. This is the most common wholesale transaction structure."

---

## 5. Design System

### Extend gcoffers.com brand

The deal portal inherits the seller site's design tokens:

- **Fonts:** Montserrat (headings), Inter (body)
- **Primary:** `#2F63AE` (blue)
- **Accent:** `#D5B238` (gold) — use sparingly for "premium" feel
- **Neutrals:** Same scale (`#1F2937` dark, `#475569` mid, `#F8FAFC` off-white)
- **Border radius:** 10-18px (cards), 12px (inputs/buttons)
- **Shadows:** Same 3-tier system (sm, md, lg)

### Investor-Specific Additions

- **Status badges:**
  - Available: `#2F63AE` (primary blue) bg, white text
  - Under Contract: `#F59E0B` (amber) bg, white text
  - Sold/Closed: `#15803D` (green) bg, white text
- **Deal card accent:** Subtle left border with status color
- **Numbers emphasis:** Asking price in large Montserrat bold, ROI % in accent gold

### Mobile-First Principles

- **Touch targets:** Min 44px height for all interactive elements
- **Card layout:** Full-width cards on mobile (no side-by-side)
- **Photo gallery:** Swipe-native, not thumbnail grid
- **Sticky filter bar:** Stays accessible while scrolling deal list
- **Bottom-sticky CTA:** "I'm Interested" button fixed to bottom of screen on deal detail page (mobile)
- **Thumb-friendly:** Key actions (interested, call, filter) reachable with one hand
- **Performance:** Lazy load images, minimal JS, fast initial paint

### Visual Reference

- **Layout/structure:** New Western's clean hero + "Previously Sold" grid
- **Card design:** OffMarketLS property cards (status badges, key metrics on card)
- **Form UX:** Miami Market Deals' buyer type dropdown + gcoffers.com's modern input styling
- **Overall polish:** gcoffers.com's existing design language (the bar to beat is Carrot templates, which is low)

---

## 6. Data Model

### Deal Object (JSON)

```json
{
  "id": "deal-001",
  "slug": "hollywood-sfh-3bd-2ba",
  "status": "available",
  "dealType": "assignment",
  "createdAt": "2026-03-13T00:00:00Z",
  "updatedAt": "2026-03-13T00:00:00Z",

  "location": {
    "neighborhood": "Hollywood Hills",
    "city": "Hollywood",
    "county": "Broward",
    "state": "FL",
    "zip": "33024",
    "fullAddress": "6401 Evans St, Hollywood, FL 33024",
    "lat": 26.0112,
    "lng": -80.1495
  },

  "property": {
    "type": "sfh",
    "beds": 3,
    "baths": 2,
    "sqft": 1082,
    "lotSize": 8062,
    "yearBuilt": 1964,
    "construction": "CBS",
    "occupancy": "vacant",
    "rehabScope": "Full cosmetic rehab: kitchen, baths, flooring, paint, landscaping. Roof in good condition."
  },

  "numbers": {
    "askingPrice": 270000,
    "arv": 450000,
    "estimatedRehab": 75000,
    "estimatedClosingCosts": 12000,
    "potentialProfit": 93000,
    "potentialROI": 26.1
  },

  "photos": [
    "deals/deal-001/exterior-front.jpg",
    "deals/deal-001/kitchen.jpg",
    "deals/deal-001/bathroom.jpg",
    "deals/deal-001/backyard.jpg"
  ],

  "notes": "Corner lot. No HOA. Motivated seller — inherited property.",

  "closedAt": null,
  "closedPrice": null
}
```

### Buyer Signup Object (JSON)

```json
{
  "fullName": "John Smith",
  "email": "john@example.com",
  "phone": "9545551234",
  "buyerType": "fix-flip",
  "areas": ["broward", "miami-dade"],
  "propertyTypes": ["sfh", "multi-family"],
  "priceRange": "150-300k",
  "purchaseMethod": "cash",
  "serviceConsent": true,
  "marketingConsent": false,
  "consentTimestamp": "2026-03-13T22:00:00Z",
  "source": "deals-website",
  "submittedAt": "2026-03-13T22:00:00Z"
}
```

### Deal Interest Object (JSON)

```json
{
  "dealId": "deal-001",
  "fullName": "John Smith",
  "email": "john@example.com",
  "phone": "9545551234",
  "message": "I'd like to schedule a walkthrough this week.",
  "submittedAt": "2026-03-13T22:30:00Z"
}
```

---

## 7. Technical Architecture

### Monorepo structure

The deals portal lives in the same repo as the seller site (`goldcoast-website/`). Directory layout:

```
goldcoast-website/
├── site/              ← seller site (gcoffers.com) — existing
├── deals/             ← investor portal (deals.gcoffers.com) — NEW
├── lambda/            ← shared Lambda functions (seller + buyer)
├── infra/             ← shared Terraform/infra
├── scripts/           ← deploy scripts (both sites)
├── shared/            ← shared assets (logo, brand files)
├── docs/              ← PRDs, specs
└── wireframes/        ← design wireframes
```

### Same pattern as gcoffers.com

- **Hosting:** S3 + CloudFront at `deals.gcoffers.com`
- **DNS:** CNAME in Route 53 (same hosted zone: Z00488533G8QVLLZQK5L6)
- **SSL:** Wildcard cert for `*.gcoffers.com` or new cert for `deals.gcoffers.com`
- **Static site:** HTML/CSS/JS (no framework, same as seller site)
- **Deal data:** JSON files in S3 bucket (`goldcoast-deals/`)
- **Photos:** Same S3 bucket, served via CloudFront
- **API:** Lambda + API Gateway for:
  - `GET /api/deals` — returns all deals (public, no auth)
  - `GET /api/deals/{slug}` — returns single deal (public, no auth)
  - `POST /api/buyer-signup` — buyer list registration
  - `POST /api/deal-interest` — express interest in a deal
- **Forms → S3 (source of truth) + GHL (CRM sync)** — same pattern as seller site
- **Admin:** Simple approach: upload deal JSON + photos to S3 folder, Lambda reads them. OR: password-protected admin page at `deals.gcoffers.com/admin/` (basic auth) where you fill out a form to create/edit deals.

### No Access Gate in V1

All deal pages are fully public. No login, no tokens, no cookies for access control. The buyer list signup (`/join/`) is purely for deal alert notifications via SMS/email, not for gating content. This maximizes deal exposure and minimizes friction.

---

## 8. GHL Integration

### Buyer Signup → GHL Contact

```
firstName: from fullName
lastName: from fullName
email: email
phone: +1{phone}
source: "Deals Website - deals.gcoffers.com"
tags: ["buyer-list", "deals-website"]
customField:
  buyer_type: buyerType
  buy_areas: areas (joined)
  property_types: propertyTypes (joined)
  price_range: priceRange
  purchase_method: purchaseMethod
  service_consent: "yes"
  marketing_consent: "yes"/"no"
  consent_timestamp: consentTimestamp
```

### Deal Interest → GHL (update existing contact + trigger workflow)

When a buyer expresses interest in a deal:
1. Find or create contact by email/phone
2. Add tag: `interested-{dealSlug}`
3. Add note: "Expressed interest in {deal address} on {date}"
4. Trigger GHL workflow: "Deal Interest Notification" → notifies Tej via text/email

---

## 9. Admin Workflow

### Adding a New Deal

**Option A: S3 folder upload (simplest)**
1. Create folder: `goldcoast-deals/deal-{slug}/`
2. Upload `deal.json` with the deal object schema above
3. Upload photos to same folder
4. Lambda auto-detects new deals on next API call (or has a refresh trigger)

**Option B: Admin page (better UX, build if time allows)**
1. Navigate to `deals.gcoffers.com/admin/` (basic auth: username/password)
2. Fill out form: all deal fields + photo upload
3. Submit → Lambda writes JSON + photos to S3
4. Deal immediately appears on `/deals/`

**Updating Deal Status**
- Edit the `status` field in `deal.json` (or toggle in admin page)
- Options: `available` → `under_contract` → `sold`
- When status changes to `sold`, deal moves from `/deals/` to the "Recently Closed" section on landing page

**Triggering Buyer Blast**
- Manually in GHL: create campaign, select "buyer-list" tag, compose message with link to deal page
- Future (V2): automated workflow triggered when new deal JSON appears in S3

---

## 10. Implementation Priority

### Phase 1 — MVP (build this)
1. Landing page with hero, how it works, "Recently Closed" section (placeholder until real deals), value props, bottom CTA
2. Buyer signup page (`/join/`) with full buy box form
3. Lambda for buyer signup (S3 + GHL sync)
4. FAQ page
5. Infrastructure: S3 bucket, CloudFront, Route 53 subdomain, SSL cert
6. Legal pages (can link to gcoffers.com's existing ones or duplicate)

### Phase 2 — Deal Listings (build when first deal is ready to post)
7. Deal listing section on landing page with cards + filters
8. Deal detail page (`/deals/{slug}/`) with gallery, numbers, interest form
9. Lambda for deal data API + interest form submission
10. Admin page (or S3 folder workflow)

### Phase 3 — Growth (build after 10+ buyers on list)
12. Before/after photos on closed deals
13. Stats bar (deals closed, avg discount, buyer count)
14. Automated deal alerts via GHL workflow
15. Investor testimonials (real ones)
16. Blog / SEO content for buyer acquisition

---

## 11. Metrics

**Track via GA4 + Lambda logs:**
- Buyer signup conversion rate (landing page visitors → signups)
- Deal interest rate (deal page views → interest form submissions)
- Time from deal posted → first interest expressed
- Buyer list growth rate (signups per week)
- Deal page views per deal
- Source attribution (direct, GHL blast, FB, referral)

---

## 12. Legal Disclaimers

**Required on all pages (footer):**
> All properties are sold as-is for cash or hard money. Buyers are responsible for their own due diligence and verification of all information. Prices are NET to seller with buyer paying all closing costs. Opinions of value, ARV, rehab estimates, and rental projections are given as a courtesy and no guarantees are expressed or implied. The sale of properties may be contingent upon a successful close by the buyer under contract with the current owner. Seller may hold equitable interest via an executed Purchase and Sale Agreement. Sales may be fulfilled by assignment of contract. Gold Coast Home Buyers is not a licensed real estate brokerage.

This disclaimer is adapted from OffMarketLS and Miami Market Deals, which both include similar language.

---

## 13. Open Questions

1. **Deal photos:** Who takes them? Tej during property visits? Should we spec a photo checklist (exterior front/back, kitchen, baths, bedrooms, damage areas, street view)?
2. **Admin preference:** S3 folder upload vs. admin page? Admin page is nicer but adds build time.
3. **Legal pages:** Duplicate privacy/terms for deals subdomain, or link to gcoffers.com's existing pages?
4. **GHL workflow:** Does the current GHL setup support buyer-side workflows, or does a new pipeline need to be created?
5. **Timeline:** What's the priority vs. the A2P ticket work? Is there a first deal ready to post, or is buyer list building the immediate goal?
