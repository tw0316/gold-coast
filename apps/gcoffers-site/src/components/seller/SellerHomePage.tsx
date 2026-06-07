import { Fragment } from 'react'

import type { SiteSurface } from '@/lib/routing/hosts'
import { getSellerHomeContent, getSellerHomePageSeed } from '@/lib/seller/content'

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
              <div className="hero-social" aria-label="Seller rating">
                <span className="stars" aria-hidden="true">
                  ★★★★★
                </span>
                <span>{content.hero.rating}</span>
              </div>
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
                      {step.icon}
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
                    {card.icon}
                  </span>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </article>
              ))}
            </div>
            <aside className="move-panel" aria-label="The Move On Package">
              <span className="move-panel__icon" aria-hidden="true">
                ⚿
              </span>
              <div>
                <span className="eyebrow eyebrow--dark">{content.proof.movePanel.eyebrow}</span>
                <h3>{content.proof.movePanel.title}</h3>
                <p>{content.proof.movePanel.text}</p>
              </div>
            </aside>
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
              <p className="lede on-dark">{content.comparison.lede}</p>
            </div>
            <div className="comparison-table" role="table" aria-label="Gold Coast compared with a traditional agent">
              <div className="comparison-head comparison-empty" role="columnheader" />
              <div className="comparison-head comparison-head--gc" role="columnheader">
                ⌂ Gold Coast
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
                <span aria-hidden="true">☎</span>
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
