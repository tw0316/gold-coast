import type { Metadata } from 'next'

import { SellerLegalPage } from '@/components/seller/SellerLegalPage'
import { getSellerLegalPage } from '@/lib/seller/content'

const privacyPolicyPage = getSellerLegalPage('privacyPolicy')

export const metadata: Metadata = {
  title: privacyPolicyPage.seed.seo.title,
  description: privacyPolicyPage.seed.seo.description,
  alternates: {
    canonical: privacyPolicyPage.seed.seo.canonicalPath,
  },
}

export default function PrivacyPolicyPage() {
  return <SellerLegalPage page={privacyPolicyPage} />
}
