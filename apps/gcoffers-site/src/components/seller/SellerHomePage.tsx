import { Fragment } from 'react'

import type { SiteSurface } from '@/lib/routing/hosts'
import { getSellerHomeContent, getSellerHomePageSeed } from '@/lib/seller/content'

import { SellerFooter } from './SellerFooter'
import { SellerHeader } from './SellerHeader'
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
      <SellerHeader />
      <main>
        <section className="hero" id="top" aria-labelledby="seller-hero-title" data-payload-section="hero">
          <div className="container hero__layout">
            <div className="hero__left">
              <p className="eyebrow">{content.hero.eyebrow}</p>
              <h1 id="seller-hero-title">{content.hero.heading}</h1>
              <p className="hero__sub">{content.hero.subheading}</p>

              <div className="hero__trust-pills" aria-label="Seller benefits">
                {content.hero.trustPills.map((pill) => (
                  <span className="trust-pill" key={pill}>
                    {pill}
                  </span>
                ))}
              </div>

              <SellerLeadForm />

              <p className="hero__micro-trust">{content.hero.microTrust}</p>
              <div className="hero__next-steps" aria-label="What happens after submitting the form">
                {content.nextSteps.map((step) => (
                  <div className="hero__next-step" key={step}>
                    <span aria-hidden="true">✓</span>
                    {step}
                  </div>
                ))}
              </div>

              <div className="hero__proof">
                <span className="hero__stars" aria-label="Five star review">
                  ★★★★★
                </span>
                <span className="hero__proof-text">{content.hero.proof}</span>
              </div>
            </div>

            <div className="hero__right" aria-hidden="true">
              <div className="hero__image-wrap">
                <img src={content.hero.image.src} alt={content.hero.image.alt} className="hero__image" />
              </div>
            </div>
          </div>
        </section>

        <section className="how-it-works" id="how-it-works" data-payload-section="rich_text">
          <div className="container text-center">
            <p className="eyebrow">Simple Process</p>
            <h2>How It Works</h2>
            <p className="section-subtitle">Three simple steps to sell your home. No stress, no surprises.</p>
            <div className="steps">
              {content.howItWorks.map((step, index) => (
                <article className="step" key={step.title}>
                  <div className="step__number">{index + 1}</div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="benefits" id="benefits" data-payload-section="rich_text">
          <div className="container text-center">
            <p className="eyebrow">Why Sellers Choose Us</p>
            <h2>Why Sell to Gold Coast Home Buyers?</h2>
            <p className="section-subtitle">Simple, transparent, and fast. Here is what sellers like most.</p>
            <div className="benefits__grid">
              {content.benefits.map((benefit) => (
                <article className="benefit-card" key={benefit.title}>
                  <div className="benefit-card__icon" aria-hidden="true">
                    {benefit.icon}
                  </div>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="comparison" data-payload-section="two_column">
          <div className="container text-center">
            <p className="eyebrow">Direct Sale Advantage</p>
            <h2>Listing the traditional way vs. selling direct</h2>
            <p className="section-subtitle">See why homeowners choose the simpler path.</p>
            <div className="comparison__cards">
              <article className="comparison-card comparison-card--them">
                <h3>{content.comparison.traditional.title}</h3>
                <ul>
                  {content.comparison.traditional.items.map((item) => (
                    <li key={item}>
                      <span aria-hidden="true">×</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
              <article className="comparison-card comparison-card--us">
                <h3>{content.comparison.direct.title}</h3>
                <ul>
                  {content.comparison.direct.items.map((item) => (
                    <li key={item}>
                      <span aria-hidden="true">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="reasons" id="reasons" data-payload-section="rich_text">
          <div className="container text-center">
            <p className="eyebrow">Seller Situations</p>
            <h2>Common reasons homeowners sell to us</h2>
            <p className="section-subtitle">If your situation is not listed, we can still help.</p>
            <div className="reasons__grid">
              {content.reasons.map((reason) => (
                <div className="reason-tag" key={reason}>
                  <span aria-hidden="true">✓</span>
                  {reason}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="testimonials" data-payload-section="rich_text">
          <div className="container text-center">
            <p className="eyebrow">Seller Reviews</p>
            <h2>What Our Sellers Say</h2>
            <p className="section-subtitle">Real homeowners, real results.</p>
            <div className="testimonials__grid">
              {content.testimonials.map((testimonial) => (
                <article className="testimonial-card" key={testimonial.author}>
                  <div className="testimonial-card__stars" aria-label="Five star review">
                    ★★★★★
                  </div>
                  <p>“{testimonial.quote}”</p>
                  <div className="testimonial-card__author">— {testimonial.author}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="service-area" data-payload-section="rich_text">
          <div className="container text-center">
            <p className="service-area__text">
              Proudly serving{' '}
              {content.serviceArea.map((area, index) => (
                <Fragment key={area}>
                  <strong>{area}</strong>
                  {index < content.serviceArea.length - 1 ? ', ' : '.'}
                </Fragment>
              ))}
            </p>
          </div>
        </section>

        <section className="cta" id="contact" data-payload-section="cta">
          <div className="container">
            <h2>{content.cta.heading}</h2>
            <p>{content.cta.text}</p>
            <a href={content.cta.href} className="btn btn--primary btn--large">
              {content.cta.label}
            </a>
          </div>
        </section>
      </main>
      <SellerFooter />
    </div>
  )
}
