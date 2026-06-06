import Link from 'next/link'

import { BuyerFooter } from './BuyerFooter'
import { BuyerHeader } from './BuyerHeader'
import { BuyerSignupForm } from './BuyerSignupForm'

export function BuyerJoinPage() {
  return (
    <div className="buyer-site" data-buyer-page="join">
      <BuyerHeader />
      <main className="buyer-join-page">
        <div className="container buyer-join-page__layout">
          <aside className="buyer-join-page__intro" aria-labelledby="buyer-join-title">
            <p className="eyebrow">Low-friction signup</p>
            <h1 id="buyer-join-title">Start with email. Add your buy box later.</h1>
            <p>
              The buyer list contract is intentionally lightweight: email is required, while name, phone, areas,
              buyer type, property types, price range, and purchase method are optional progressive details.
            </p>
            <ul className="buyer-check-list">
              <li>Email-only first touch</li>
              <li>Optional phone and preference fields</li>
              <li>SMS/service consent explicit and not pre-checked</li>
              <li>Future route must write to S3 before external side effects</li>
            </ul>
            <Link href="/faq/" className="buyer-text-link">
              Read buyer FAQ →
            </Link>
          </aside>
          <BuyerSignupForm />
        </div>
      </main>
      <BuyerFooter />
    </div>
  )
}
