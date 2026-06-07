import Link from 'next/link'

import { buyerFAQs } from '@/lib/buyer/content'

import { BuyerFooter } from './BuyerFooter'
import { BuyerHeader } from './BuyerHeader'

export function BuyerFaqPage() {
  return (
    <div className="buyer-site" data-buyer-page="faq">
      <BuyerHeader />
      <main className="buyer-faq-page">
        <div className="container buyer-faq-page__container">
          <div className="buyer-page-header">
            <p className="eyebrow">Buyer FAQ</p>
            <h1>Frequently Asked Questions</h1>
            <p>Common questions about public wholesale deal browsing, buyer-list signup, and diligence expectations.</p>
          </div>

          <div className="buyer-faq-list">
            {buyerFAQs.map((faq) => (
              <details className="buyer-faq-item" key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>

          <section className="buyer-faq-cta" aria-labelledby="buyer-faq-cta-title">
            <h2 id="buyer-faq-cta-title">Ready to see deal alerts?</h2>
            <p>Join with email only, then add buy-box details when useful.</p>
            <div className="buyer-faq-cta__actions">
              <Link href="/join/" className="btn btn--primary">
                Join Buyers List
              </Link>
              <Link href="/#deals" className="btn buyer-btn--outline">
                Browse Active Deals
              </Link>
            </div>
          </section>
        </div>
      </main>
      <BuyerFooter />
    </div>
  )
}
