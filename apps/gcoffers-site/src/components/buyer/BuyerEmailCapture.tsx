import Link from 'next/link'

type BuyerEmailCaptureProps = {
  className?: string
  source?: 'hero' | 'cta'
}

export function BuyerEmailCapture({ className = '', source = 'hero' }: BuyerEmailCaptureProps) {
  return (
    <div
      className={`buyer-email-capture ${className}`.trim()}
      data-buyer-email-capture={`join-link-${source}`}
    >
      <span className="buyer-email-capture__copy">Open the buyer list form to enter your email on the signup page.</span>
      <Link href="/join/" className="btn btn--primary buyer-email-capture__button">
        Get Access
      </Link>
    </div>
  )
}
