import { SellerFooter } from './SellerFooter'
import { SellerHeader } from './SellerHeader'
import { sellerPhoneHref, sellerPhoneLabel } from '@/lib/seller/contact'

const dealsEmail = ['deals', 'gcoffers.com'].join('@')

const countyCoverage = [
  {
    county: 'Miami-Dade',
    markets: ['Miami', 'Hialeah', 'Miami Gardens', 'Homestead', 'Doral', 'North Miami', 'Miami Beach', 'Coral Gables'],
  },
  {
    county: 'Broward',
    markets: ['Fort Lauderdale', 'Hollywood', 'Miramar', 'Pembroke Pines', 'Pompano Beach', 'Davie', 'Lauderhill', 'Sunrise'],
  },
  {
    county: 'Palm Beach',
    markets: ['West Palm Beach', 'Boca Raton', 'Delray Beach', 'Boynton Beach', 'Lake Worth', 'Wellington', 'Jupiter', 'Palm Beach Gardens'],
  },
]

const longIslandCoverage = [
  {
    county: 'Nassau',
    markets: ['Hempstead', 'Freeport', 'Elmont', 'Uniondale', 'Valley Stream', 'Westbury', 'Mineola', 'Levittown'],
  },
  {
    county: 'Suffolk',
    markets: ['Brentwood', 'Central Islip', 'Wyandanch', 'Bay Shore', 'Patchogue', 'Huntington Station', 'Riverhead', 'Mastic-Shirley'],
  },
]

const stats = [
  { value: '14+', label: 'Years in real estate' },
  { value: '5', label: 'Counties covered' },
  { value: '24', label: 'Hour cash offer' },
  { value: '$0', label: 'In fees or commissions' },
]

export function SellerAboutPage() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <SellerHeader active="about" />
      <main id="main">
        <section className="section section--cream">
          <div className="container">
            <div className="section__header">
              <span className="eyebrow">Why Gold Coast</span>
              <h1>Built to move fast.</h1>
              <p className="lede">
                South Florida and Long Island have some of the most active real estate markets in the country, and some of the most motivated sellers.
                Homeowners facing foreclosure, probate, job relocation, or deferred maintenance deserve a fast, fair exit. Investors
                deserve access to real deals at real prices.
              </p>
            </div>
            <p className="lede about-intro">
              Gold Coast Home Buyers exists to bridge that gap. We source directly from sellers who need speed and certainty. We bring
              those properties to a network of investors who move fast and close clean. No fluff, and no middlemen stacking fees. A
              straightforward transaction that works for everyone at the table.
            </p>
            <div className="stats-band" aria-label="Gold Coast placeholder stats">
              {stats.map((stat) => (
                <div className="stat" key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--coastal">
          <div className="container">
            <div className="section__header">
              <span className="eyebrow">Where we buy</span>
              <h2>South Florida</h2>
              <p className="lede">
                We are active buyers across all three counties, from Homestead to Jupiter.
              </p>
            </div>
            <div className="county-grid">
              {countyCoverage.map((county) => (
                <article className="county-card" key={county.county}>
                  <h3>{county.county}</h3>
                  <ul>
                    {county.markets.map((market) => (
                      <li key={market}>{market}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <div className="section__header section__header--stacked">
              <h2>Long Island</h2>
              <p className="lede">
                We are active buyers across both counties, from Floral Park to Montauk.
              </p>
            </div>
            <div className="county-grid county-grid--two">
              {longIslandCoverage.map((county) => (
                <article className="county-card" key={county.county}>
                  <h3>{county.county}</h3>
                  <ul>
                    {county.markets.map((market) => (
                      <li key={market}>{market}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--navy" id="contact">
          <div className="container">
            <div className="section__header section__header--center about-contact-header">
              <span className="eyebrow eyebrow--dark">Get in touch</span>
              <h2>We are local. We pick up the phone.</h2>
              <p className="lede on-dark">
                Whether you are a seller with questions or a buyer looking for deals, reach out directly.
              </p>
            </div>
            <div className="contact-grid">
              <a className="contact-card" href={sellerPhoneHref}>
                <span className="contact-card__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                <span>Phone</span>
                <strong>{sellerPhoneLabel}</strong>
              </a>
              <a className="contact-card" href={`mailto:${dealsEmail}`}>
                <span className="contact-card__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-10 6L2 7" />
                  </svg>
                </span>
                <span>Email</span>
                <strong>{dealsEmail}</strong>
              </a>
              <a className="contact-card" href="https://instagram.com/gc.homebuyers">
                <span className="contact-card__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </span>
                <span>Instagram</span>
                <strong>@gc.homebuyers</strong>
              </a>
            </div>
          </div>
        </section>
      </main>
      <SellerFooter />
    </>
  )
}
