import type { SellerLegalPageContent } from '@/fixtures/sellerPages'

import { SellerFooter } from './SellerFooter'
import { SellerHeader } from './SellerHeader'

type SellerLegalPageProps = {
  page: SellerLegalPageContent
}

export function SellerLegalPage({ page }: SellerLegalPageProps) {
  return (
    <div
      className="seller-site"
      data-payload-page={page.seed.slug}
      data-payload-surface={page.seed.surface}
    >
      <SellerHeader />
      <main className="legal-page" data-payload-section="legal">
        <div className="container legal-page__container">
          <p className="eyebrow">Gold Coast Home Buyers</p>
          <h1>{page.title}</h1>
          <p className="legal-page__updated">
            <strong>Last Updated:</strong> {page.lastUpdated}
          </p>
          {page.intro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}

          {page.sections.map((section) => (
            <section className="legal-section" key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.items ? (
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </main>
      <SellerFooter />
    </div>
  )
}
