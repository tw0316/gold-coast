import { Fragment, type ReactNode } from 'react'

import type { SiteSurface } from '@/lib/routing/hosts'
import { getSellerHomeContent, getSellerHomePageSeed } from '@/lib/seller/content'

const CARD_ICON_GLYPHS: Record<string, ReactNode> = {
  home: (
    <>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </>
  ),
  offer: (
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
  key: (
    <>
      <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L21 4" />
      <path d="m21 2-9.6 9.6" />
      <circle cx="7.5" cy="15.5" r="5.5" />
    </>
  ),
  wrench: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  ),
  dollar: (
    <>
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  calendar: (
    <>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
}

function CardIcon({ name }: { name: string }) {
  const glyph = CARD_ICON_GLYPHS[name]
  if (!glyph) return null
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {glyph}
    </svg>
  )
}

import { SellerFooter } from './SellerFooter'
import { SellerHeader } from './SellerHeader'
import { SellerHeroAddressBar } from './SellerHeroAddressBar'
import { SellerLeadForm } from './SellerLeadForm'

type SellerHomePageProps = {
  routeSurface: SiteSurface
}

export function SellerHomePage({ routeSurface }: SellerHomePageProps) {
  const pageSeed = getSellerHomePageSeed()
  const content = getSellerHomeContent()

  return (
    <div
      className="seller-site"
      data-route-surface={routeSurface}
      data-payload-page={pageSeed.slug}
      data-payload-surface={pageSeed.surface}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SellerHeader />
      <main id="main">
        <section className="hero seller-hero" aria-labelledby="seller-hero-title" data-payload-section="hero">
          <div className="container seller-hero__grid">
            <div className="seller-hero__copy">
              <h1 className="hero__title" id="seller-hero-title">
                {content.hero.heading}
              </h1>
              <p className="lede">{content.hero.lede}</p>

              <SellerHeroAddressBar />

              <div className="micro-assurance" aria-label="Offer assurance">
                {content.hero.assurances.map((assurance, index) => (
                  <span key={assurance}>
                    {index > 0 ? <span aria-hidden="true">· </span> : null}
                    {assurance}
                  </span>
                ))}
              </div>

              <div className="trust-row" aria-label="Seller benefits">
                {content.hero.trustRow.map((benefit) => (
                  <div key={benefit}>
                    <span className="check-dot" aria-hidden="true">
                      ✓
                    </span>
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="situation-chips" aria-label="Seller situations Gold Coast can help with">
                <p>{content.hero.situationsIntro}</p>
                <div>
                  {content.hero.situations.map((situation) => (
                    <span key={situation}>✓ {situation}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="seller-hero__photo-wrap">
              <img
                className="seller-hero__photo"
                src={content.hero.image.src}
                alt={content.hero.image.alt}
                loading="eager"
              />
              <article className="offer-float" aria-label="Sample cash offer">
                <div className="offer-float__label">
                  <span aria-hidden="true" />
                  {content.hero.offerFloat.label}
                </div>
                <p>{content.hero.offerFloat.property}</p>
                <strong>{content.hero.offerFloat.amount}</strong>
                <small>{content.hero.offerFloat.note}</small>
              </article>
            </div>
          </div>
        </section>

        <section className="section section--coastal how-section" id="how-it-works" aria-labelledby="how-title" data-payload-section="rich_text">
          <div className="container">
            <div className="section__header section__header--wide">
              <span className="eyebrow">{content.howItWorks.eyebrow}</span>
              <h2 id="how-title">{content.howItWorks.heading}</h2>
              <p className="lede">{content.howItWorks.lede}</p>
            </div>
            <div className="step-card-grid">
              {content.howItWorks.steps.map((step) => (
                <article className="step-card" key={step.num}>
                  <div className="step-card__top">
                    <span className="step-card__icon" aria-hidden="true">
                      <CardIcon name={step.icon} />
                    </span>
                    <span className="step-card__num">{step.num}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--cream proof-section" aria-labelledby="proof-title" data-payload-section="rich_text">
          <div className="container">
            <div className="section__header section__header--wide">
              <span className="eyebrow">{content.proof.eyebrow}</span>
              <h2 id="proof-title">{content.proof.heading}</h2>
              <p className="lede">{content.proof.lede}</p>
            </div>
            <div className="proof-grid">
              {content.proof.cards.map((card) => (
                <article className="proof-card" key={card.title}>
                  <span className="proof-card__icon" aria-hidden="true">
                    <CardIcon name={card.icon} />
                  </span>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--coastal reviews-section" id="reviews" aria-labelledby="reviews-title" data-payload-section="rich_text">
          <div className="container">
            <div className="section__header section__header--center">
              <span className="eyebrow">{content.reviews.eyebrow}</span>
              <h2 id="reviews-title">{content.reviews.heading}</h2>
              <p className="lede">{content.reviews.lede}</p>
              <div className="review-score">
                <span className="stars" aria-hidden="true">
                  ★★★★★
                </span>
                <span>{content.reviews.score}</span>
              </div>
            </div>
            <div className="review-grid">
              {content.reviews.cards.map((review) => (
                <figure className="review-card" key={review.name}>
                  <div className="stars" aria-hidden="true">
                    ★★★★★
                  </div>
                  <blockquote>“{review.quote}”</blockquote>
                  <figcaption>
                    <span className="avatar" aria-hidden="true">
                      {review.initials}
                    </span>
                    <span>
                      <strong>{review.name}</strong>
                      <small>{review.detail}</small>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--navy comparison-section" aria-labelledby="comparison-title" data-payload-section="two_column">
          <div className="container">
            <div className="section__header section__header--wide">
              <span className="eyebrow eyebrow--dark">{content.comparison.eyebrow}</span>
              <h2 id="comparison-title">{content.comparison.heading}</h2>
            </div>
            <div className="comparison-table" role="table" aria-label="Gold Coast compared with a traditional agent">
              <div className="comparison-head comparison-empty" role="columnheader" />
              <div className="comparison-head comparison-head--gc" role="columnheader">
                <CardIcon name="home" /> Gold Coast
              </div>
              <div className="comparison-head comparison-head--agent" role="columnheader">
                Traditional agent
              </div>
              {content.comparison.rows.map(([label, goldCoast, agent]) => (
                <Fragment key={label}>
                  <div className="comparison-label" role="rowheader">
                    {label}
                  </div>
                  <div className="comparison-gc">{goldCoast}</div>
                  <div className="comparison-agent">{agent}</div>
                </Fragment>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--cream faq-section" id="faq" aria-labelledby="faq-title" data-payload-section="rich_text">
          <div className="container container--narrow">
            <div className="section__header section__header--center">
              <span className="eyebrow">{content.faqs.eyebrow}</span>
              <h2 id="faq-title">{content.faqs.heading}</h2>
            </div>
            <div className="faq-list">
              {content.faqs.rows.map((faq) => (
                <details className="faq-row" key={faq.question}>
                  <summary>
                    <span>{faq.question}</span>
                    <span className="faq-chevron" aria-hidden="true">
                      ⌄
                    </span>
                  </summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--navy offer-section" id="offer" aria-labelledby="offer-title" data-payload-section="cta">
          <div className="container offer-grid">
            <div className="offer-rail">
              <span className="eyebrow eyebrow--dark">{content.offer.eyebrow}</span>
              <h2 id="offer-title">{content.offer.heading}</h2>
              <p className="lede on-dark">{content.offer.lede}</p>
              <a className="offer-phone" href={content.offer.phoneHref}>
                <span aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                <strong>
                  {content.offer.phoneText}
                  <br />
                  {content.offer.phoneLabel}
                </strong>
              </a>
            </div>
            <SellerLeadForm />
          </div>
        </section>
      </main>
      <SellerFooter />
    </div>
  )
}
