import type { Metadata } from 'next'

import { SellerLegalPage } from '@/components/seller/SellerLegalPage'
import { getSellerLegalPage } from '@/lib/seller/content'

const termsPage = getSellerLegalPage('terms')

export const metadata: Metadata = {
  title: termsPage.seed.seo.title,
  description: termsPage.seed.seo.description,
  alternates: {
    canonical: termsPage.seed.seo.canonicalPath,
  },
}

export default function TermsPage() {
  return <SellerLegalPage page={termsPage} />
}
