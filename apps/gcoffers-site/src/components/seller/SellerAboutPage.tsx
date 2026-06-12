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

const stats = [
  { value: '500+', label: 'Families helped' },
  { value: '3', label: 'Counties covered' },
  { value: '14', label: 'Avg days to close' },
  { value: '$85M', label: 'Total volume' },
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
              <h1>Built for South Florida. Built to move fast.</h1>
              <p className="lede">
                South Florida has one of the most active real estate markets in the country, and some of the most motivated sellers.
                Homeowners facing foreclosure, probate, job relocation, or deferred maintenance deserve a fast, fair exit. Investors
                deserve access to real deals at real prices.
              </p>
            </div>
            <p className="lede about-intro">
              Gold Coast Home Buyers exists to bridge that gap. We source directly from sellers who need speed and certainty. We bring
              those properties to a network of cash buyers who move fast and close clean. No fluff. No middlemen stacking fees. A
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
              <h2>Miami-Dade, Broward, and Palm Beach.</h2>
              <p className="lede">
                We are active buyers across all three counties, from Homestead to West Palm Beach. We know the neighborhoods, the comps,
                and the buyers ready to close.
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
          </div>
        </section>

        <section className="section section--navy" id="contact">
          <div className="container">
            <div className="section__header section__header--center about-contact-header">
              <span className="eyebrow eyebrow--dark">Get in touch</span>
              <h2>We are local. We pick up the phone.</h2>
              <p className="lede on-dark">
                Whether you are a seller with questions or a buyer looking for deals, reach out directly. No bots, no runaround.
              </p>
            </div>
            <div className="contact-grid">
              <a className="contact-card" href={sellerPhoneHref}>
                <span>Phone</span>
                <strong>{sellerPhoneLabel}</strong>
              </a>
              <a className="contact-card" href={`mailto:${dealsEmail}`}>
                <span>Email</span>
                <strong>{dealsEmail}</strong>
              </a>
              <a className="contact-card" href="https://instagram.com/gc.homebuyers">
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
