# A2P Registration — Implementation Tickets

> **Context:** A2P (Application-to-Person) SMS registration requires compliance changes to gcoffers.com before the vendor will approve. Three tickets below. All changes are to the existing static site at `/Users/jarvis/Projects/goldcoast-website/site/`.
>
> **After A2P approval:** Ticket 3 (Revert) reverses Ticket 1 and restores the original 2-step flow.

---

## Ticket 1: Single-Page Opt-In Form (A2P Temporary)

**Priority:** P0 — blocks A2P registration  
**Branch:** `feat/a2p-single-page-form`

### What
Collapse the current 2-step form flow into a single-page opt-in form on the homepage. The `/get-your-offer/` page stays deployed but becomes unreachable from the homepage during this period.

### Why
A2P vendor requires a single-page opt-in form for registration approval. Once A2P passes, we revert to the multi-step flow (see Ticket 3).

### Current Flow (to be temporarily disabled)
1. Homepage (`index.html`): address + phone → stored in `sessionStorage` → redirect to `/get-your-offer/`
2. `/get-your-offer/index.html`: name, email, condition, timeline, single TCPA checkbox → POST to Lambda

### New Flow (A2P temporary)
1. Homepage (`index.html`): all fields on one form → POST directly to Lambda
2. `/get-your-offer/` page: no changes, just unreachable (no links point to it)

### Implementation Details

#### `site/index.html` — Hero Form Changes

Replace the current `#step1-form` contents with the following fields (keep the `<form>` element and its `id`):

```
Form ID: step1-form (repurposed, now submits directly)

Fields (in order):
1. Full Name (text, required)
   - id="full-name", name="fullName"
   - placeholder="Full Name"
   - autocomplete="name"

2. Property Address (text, required) [KEEP EXISTING]
   - id="property-address", name="address"
   - Keep Mapbox autocomplete functionality exactly as-is
   - Keep the data-mapbox-token attribute
   - Keep the address-autocomplete dropdown div

3. Phone Number (tel, required) [KEEP EXISTING]
   - id="phone", name="phone"
   - Keep phone formatting JS as-is

4. Email Address (email, required)
   - id="email", name="email"
   - placeholder="Email Address"
   - autocomplete="email"

5. Service Messages Consent (checkbox, required)
   - id="service-consent", name="serviceConsent"
   - MUST be unchecked by default
   - Label text (exact wording):
     "By checking this box, I consent to receive service-related SMS messages from Gold Coast Home Buyers, including appointment confirmations, property updates, document requests, and follow-ups, at the phone number provided above. Messages may be sent using an automated system. Message frequency varies. Message & data rates may apply. Reply STOP to opt out, HELP for help. This consent is not a condition of purchase. View our <a href="/terms/">Terms of Service</a> and <a href="/privacy-policy/">Privacy Policy</a>."

6. Marketing Messages Consent (checkbox, NOT required)
   - id="marketing-consent", name="marketingConsent"
   - MUST be unchecked by default
   - Label text (exact wording):
     "I also consent to receive marketing and promotional SMS messages from Gold Coast Home Buyers, including property opportunities, special offers, and company updates. Message frequency varies. Message & data rates may apply. Reply STOP to opt out at any time."

7. Submit Button
   - text: "Get My Cash Offer"
   - class: btn btn--primary btn--large btn--full
   - data-gc-event="hero_cta_click"
```

**Validation error spans** (add below their respective fields):
- `id="name-error"`: "Please enter your full name"
- `id="address-error"`: "Please enter the property address" (already exists)
- `id="phone-error"`: "Please enter a valid phone number" (already exists)
- `id="email-error"`: "Please enter a valid email address"
- `id="service-consent-error"`: "You must agree to receive service messages to submit your request"

**Remove from homepage form area:**
- The property condition dropdown (moving it out of the A2P form entirely — not needed for single-page)
- The timeline dropdown (same reason)

**Keep unchanged on the homepage:**
- All other sections (How It Works, Benefits, Comparison, Reasons, Testimonials, Service Area, CTA, Footer)
- The bottom CTA button should still scroll to top and focus the first form field
- Header "Get My Cash Offer" button still scrolls to `#top`

#### `site/js/main.js` — Form Submission Changes

Replace the `step1Form` submit handler. Instead of storing to sessionStorage and redirecting, it now:

1. Validates all fields:
   - `fullName`: non-empty, min 2 chars
   - `address`: non-empty, min 5 chars (existing logic)
   - `phone`: 10 digits (existing `isValidPhone` logic)
   - `email`: valid format (existing `isValidEmail` logic)
   - `serviceConsent`: must be checked
   - `marketingConsent`: no validation (optional)

2. On validation failure: show/hide error states using existing `setError()` pattern + show/hide consent error spans

3. On validation pass: build payload and POST directly to `API_ENDPOINT`:

```javascript
var payload = {
  address: address.value.trim(),
  phone: phone.value.replace(/\D/g, ''),
  fullName: fullName.value.trim(),
  email: email.value.trim().toLowerCase(),
  condition: null,       // not collected in A2P form
  timeline: null,        // not collected in A2P form
  serviceConsent: true,
  marketingConsent: marketingCheckbox.checked,
  tcpaConsent: true,     // backward compat
  tcpaTimestamp: new Date().toISOString(),
  source: 'website',
  page: window.location.pathname,
  referrer: document.referrer || null,
  userAgent: navigator.userAgent
};
```

4. Show loading state inline (add a loading spinner div after the submit button, same pattern as Step 2 page)
5. On success: show success message inline (same pattern as Step 2 page)
6. On error: still show success (existing behavior — lead may be in S3)

**Keep the Step 2 form JS intact** — don't delete it. It just won't execute because nobody reaches that page.

#### `site/css/styles.css` — Minor Additions

Add styles for the consent checkboxes in the hero form. Reuse the existing `.form-checkbox` styles but scoped within `.hero__form`:

```css
.hero__form .form-checkbox {
  margin: var(--space-md) 0;
}

.hero__form .form-checkbox label {
  font-size: 0.7rem;     /* slightly smaller for hero context */
  line-height: 1.45;
}

.hero__form .form-group {
  margin-bottom: 0.75rem;
}
```

Add loading/success states for the hero form:
```css
.hero__form .form-loading,
.hero__form .form-success {
  /* same styles as .form-loading / .form-success */
}
```

### Testing Checklist
- [ ] Homepage loads with single form (name, address, phone, email, 2 checkboxes)
- [ ] Mapbox address autocomplete still works
- [ ] Phone auto-formatting still works
- [ ] Service consent checkbox is required; marketing is optional
- [ ] Both checkboxes are unchecked by default
- [ ] Form validates all required fields before submit
- [ ] Successful submission hits Lambda and shows success state
- [ ] `/get-your-offer/` page still works if accessed directly (no breaking changes)
- [ ] Bottom CTA "Get My Cash Offer" scrolls to top and focuses first field
- [ ] Mobile responsive (375px, 768px, 1024px)
- [ ] Consent text includes: business name, STOP/HELP, message frequency, data rates, TOS + Privacy links
- [ ] GA4 events still fire (form_start, hero_cta_click)

---

## Ticket 2: Privacy Policy & Terms of Service Updates (A2P Compliance)

**Priority:** P0 — blocks A2P registration  
**Branch:** `feat/a2p-legal-pages`

### What
Update both legal pages to meet A2P registration requirements. Specific sections are missing or need rewording.

### Privacy Policy (`site/privacy-policy/index.html`)

The current page is mostly there but needs these additions/changes:

#### Add new section: "SMS/Text Messaging Opt-In"
Insert after the existing "Telephone Consumer Protection Act" section. This is a **new standalone section**, not a rewrite of the TCPA section.

```
SMS/Text Messaging Opt-In

When you provide your phone number and check the consent boxes on our forms, you opt in to receive SMS/text messages from Gold Coast Home Buyers. This includes:

Service Messages: Appointment confirmations, property evaluation updates, document requests, and transaction follow-ups.

Marketing Messages (if you opt in separately): Property buying opportunities, special offers, and company updates.

You may opt out of text messages at any time by replying STOP to any message. For help, reply HELP or contact us at (786) 983-5811.

Message frequency varies based on your interaction with our services. Message and data rates may apply depending on your mobile carrier and plan.

We do not sell, rent, or share your phone number or SMS opt-in information with third parties for their marketing purposes.
```

#### Add new section: "Mobile Information Sharing"
Insert after the SMS section.

```
Mobile Information Sharing

We do not share your mobile phone number or any information collected through SMS opt-in with third parties or affiliates for promotional or marketing purposes. Your mobile information is used solely for the purposes described in this Privacy Policy.
```

#### Update existing "Cookies" section
Rename to "Cookies & Tracking Technologies" and expand:

```
Cookies & Tracking Technologies

Our Site uses cookies and similar tracking technologies including:

- Google Analytics (GA4) to understand how visitors use our Site
- Session cookies to maintain your browsing experience
- Third-party advertising pixels (when active) to measure campaign performance

You can control cookie settings through your browser preferences. Disabling cookies may limit some Site functionality.
```

#### Keep everything else as-is
The existing sections (Information We Collect, How We Use, TCPA Disclosure, How We Share, Data Storage, Your Rights, Children's Privacy, Changes, Contact) are fine.

### Terms of Service (`site/terms/index.html`)

#### Add new section: "SMS/Text Message Terms" (insert as Section 5, renumber subsequent sections)

```
5. SMS/Text Message Terms

By opting in to receive text messages from Gold Coast Home Buyers, you agree to the following:

Use Cases: We may send you text messages related to property evaluations, appointment scheduling, transaction updates, document requests, and (if you separately opt in) marketing and promotional content.

Opt-Out: You may opt out at any time by replying STOP to any text message. After opting out, you will receive one final confirmation message. You will not receive further messages unless you re-opt in.

Help: Reply HELP to any message or call (786) 983-5811 for customer support.

Message Frequency: Message frequency varies based on your engagement with our services.

Message & Data Rates: Standard message and data rates may apply depending on your mobile carrier and plan. Gold Coast Home Buyers is not responsible for any carrier charges.

Carrier Liability: Gold Coast Home Buyers and mobile carriers are not liable for delayed or undelivered messages. Delivery is subject to effective transmission by your mobile carrier.

Supported Carriers: Major US carriers are supported. Carrier support is not guaranteed.
```

#### Update Section 1 (Use of the Site)
Add to the existing paragraph:

```
You must be at least 18 years of age to use this Site or opt in to receive SMS messages from Gold Coast Home Buyers.
```
(The 18+ age restriction already exists in the current text. Just confirm it's there — it is.)

#### Add to Section 4 (Communications Consent)
Append to the existing paragraph:

```
Message frequency varies. Message and data rates may apply. Reply STOP to cancel, HELP for help. Consent to receive marketing messages is separate and optional.
```

#### Add "Privacy Policy" reference
At the end of the new SMS section, add:

```
For details on how we collect, use, and protect your information, see our Privacy Policy at gcoffers.com/privacy-policy/.
```

### Testing Checklist
- [ ] Privacy Policy page loads without errors
- [ ] Privacy Policy contains: SMS opt-in section, mobile info sharing statement, expanded cookies section
- [ ] Terms of Service page loads without errors
- [ ] Terms contains: SMS/Text Message Terms section with use cases, opt-out, help, frequency, data rates, carrier liability
- [ ] Terms references 18+ age requirement
- [ ] Terms links to Privacy Policy
- [ ] Both pages are accessible from footer links
- [ ] Both pages display "Last Updated" date as the deploy date

---

## Ticket 3: Revert to Multi-Step Form (Post-A2P Approval)

**Priority:** P2 — execute after A2P registration is approved  
**Branch:** `feat/revert-multi-step-form`  
**Depends on:** A2P registration approval (external)

### What
Restore the original 2-step form flow on the homepage once A2P registration passes. The legal page updates from Ticket 2 stay permanent.

### Why
The single-page form was a temporary requirement for A2P registration. The multi-step flow is better UX (lower friction on Step 1, progressive disclosure).

### Implementation Details

#### `site/index.html` — Revert Hero Form

Restore the hero form to its original state with only two fields:
1. Property Address (with Mapbox autocomplete)
2. Phone Number

Remove from the hero form:
- Full Name field
- Email field
- Service consent checkbox
- Marketing consent checkbox
- Inline loading/success states

The form should go back to storing address + phone in `sessionStorage` and redirecting to `/get-your-offer/`.

**Reference:** The original `index.html` hero form is in git history on the `main` branch (commit before `feat/a2p-single-page-form` merged).

#### `site/js/main.js` — Revert Form Handler

Restore the `step1Form` submit handler to its original behavior:
1. Validate address (non-empty) and phone (10 digits)
2. Store in `sessionStorage` as `gc_address` and `gc_phone`
3. Redirect to `/get-your-offer/`

Remove the direct-submit-to-Lambda logic from the homepage handler.

#### `site/get-your-offer/index.html` — Update Consent Checkboxes

Keep the Step 2 page but update its TCPA consent to use the two-checkbox pattern from Ticket 1:
- Service consent (required) — same wording as Ticket 1
- Marketing consent (optional) — same wording as Ticket 1

Replace the current single TCPA checkbox with these two.

#### `lambda/index.js` — Keep Lambda Changes

The Lambda changes from Ticket 1 (accepting `serviceConsent` + `marketingConsent`) stay. No revert needed on the backend.

### Testing Checklist
- [ ] Homepage shows only address + phone fields
- [ ] Submitting Step 1 redirects to `/get-your-offer/`
- [ ] Step 2 page loads with name, email, condition, timeline, two consent checkboxes
- [ ] Step 2 submission works end-to-end (S3 + GHL)
- [ ] Consent checkboxes on Step 2 use A2P-compliant wording
- [ ] Direct navigation to `/get-your-offer/` without Step 1 data still redirects to homepage
- [ ] All GA4 events fire correctly

---

## Lambda Backend Note (applies to Tickets 1 and 3)

**File:** `lambda/index.js`

Update the `validateLead` function and handler to accept the new consent fields:

```javascript
// In validateLead():
// Replace:  if (!body.tcpaConsent) { errors.push('TCPA consent is required'); }
// With:     if (!body.serviceConsent && !body.tcpaConsent) { errors.push('Service message consent is required'); }

// In the lead object construction, add:
//   serviceConsent: body.serviceConsent || false,
//   marketingConsent: body.marketingConsent || false,
//   tcpaConsent: body.tcpaConsent || body.serviceConsent || false,  // backward compat
```

Update the GHL sync payload to include the new fields:

```javascript
// In syncToGHL(), update customField:
customField: {
  property_condition: lead.condition || '',
  sell_timeline: lead.timeline || '',
  tcpa_consent: lead.serviceConsent ? 'yes' : (lead.tcpaConsent ? 'yes' : 'no'),
  marketing_consent: lead.marketingConsent ? 'yes' : 'no',
  tcpa_timestamp: lead.tcpaTimestamp,
  lead_source_page: lead.page || '/'
}
```

This Lambda change is **permanent** — it supports both the A2P single-page form and the eventual multi-step revert.

---

## File Change Summary

| File | Ticket 1 | Ticket 2 | Ticket 3 |
|------|----------|----------|----------|
| `site/index.html` | ✏️ Hero form → single page | — | ✏️ Revert hero form |
| `site/js/main.js` | ✏️ Direct submit handler | — | ✏️ Revert to sessionStorage + redirect |
| `site/css/styles.css` | ✏️ Add hero form checkbox styles | — | — (keep styles) |
| `site/privacy-policy/index.html` | — | ✏️ Add SMS, mobile info, cookies sections | — |
| `site/terms/index.html` | — | ✏️ Add SMS terms section | — |
| `site/get-your-offer/index.html` | — (untouched) | — | ✏️ Update consent checkboxes |
| `lambda/index.js` | ✏️ Accept new consent fields | — | — (keep changes) |
