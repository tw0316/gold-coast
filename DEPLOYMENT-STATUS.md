# Gold Coast Home Buyers — Deployment Status

**Last Updated:** 2026-03-05 01:12 AM EST

## ✅ Completed

### Code & Repository
- [x] Website built (HTML/CSS/JS)
- [x] Lambda function written
- [x] Infrastructure code written (Terraform)
- [x] All code committed to Git
- [ ] GitHub repo created (pending gh approval)

### AWS Infrastructure
- [x] **S3 Buckets:** `gcoffers-site`, `gcoffers-site-staging`, `goldcoast-leads`
- [x] **Route 53:** Hosted zone created (Z00488533G8QVLLZQK5L6)
- [x] **ACM Certificate:** Requested (pending validation)
- [x] **Lambda:** `gcoffers-lead-handler` function deployed
- [x] **API Gateway:** `nifdys6vre` (https://nifdys6vre.execute-api.us-east-1.amazonaws.com)
- [x] **Secrets Manager:** GHL API key stored
- [x] **Site Upload:** All 6 files uploaded to S3

### Configuration
- [x] API endpoint updated in main.js
- [x] Phone number updated to (786) 983-5811
- [x] TCPA checkbox configured (unchecked by default, required)

## ⏳ Pending

### DNS Setup (Manual - Namecheap)
**Action Required:** Update Namecheap nameservers for gcoffers.com

Current Namecheap nameservers need to be changed to:
```
ns-1708.awsdns-21.co.uk
ns-838.awsdns-40.net
ns-300.awsdns-37.com
ns-1125.awsdns-12.org
```

**Steps:**
1. Log in to Namecheap
2. Go to Domain List → gcoffers.com → Manage
3. Nameservers section → Custom DNS
4. Enter the 4 nameservers above
5. Save changes

**Wait time:** 5-30 minutes for SSL cert validation after nameserver update

### CloudFront Distributions
**Blocked by:** SSL certificate validation

Once cert validates, run:
```bash
python3 scripts/setup-cloudfront.py
```

This will create:
- Production distribution (gcoffers.com)
- Staging distribution (staging.gcoffers.com) with IP restriction

### GitHub Repo
**Blocked by:** gh CLI approval

Once approved, repo will be created and code pushed.

## 📊 Resources

| Resource | ID/ARN | Status |
|----------|--------|--------|
| S3 Bucket (Prod) | gcoffers-site | ✅ Active |
| S3 Bucket (Staging) | gcoffers-site-staging | ✅ Active |
| S3 Bucket (Leads) | goldcoast-leads | ✅ Active |
| Route 53 Zone | Z00488533G8QVLLZQK5L6 | ✅ Active |
| ACM Certificate | arn:aws:acm:us-east-1:108750423275:certificate/2135d6a8-d734-42d2-aaca-294d30a4f226 | ⏳ PENDING_VALIDATION |
| Lambda Function | gcoffers-lead-handler | ✅ Active |
| API Gateway | nifdys6vre | ✅ Active |
| CloudFront (Prod) | - | ❌ Not created |
| CloudFront (Staging) | - | ❌ Not created |

## 🚀 Next Steps

1. **Immediate (You):** Update Namecheap nameservers (see above)
2. **Wait:** 5-30 min for cert validation
3. **Then:** Run `python3 scripts/setup-cloudfront.py` to create distributions
4. **Test:** Visit https://gcoffers.com (once CloudFront propagates, ~15 min)
5. **Approve:** GitHub repo creation (gh CLI command pending)

## 📝 Testing Checklist (After CloudFront Setup)

- [ ] Homepage loads at https://gcoffers.com
- [ ] Step 1 form (address + phone) works
- [ ] Step 2 form (name + email + TCPA) works
- [ ] Form submission creates lead in S3 (check goldcoast-leads bucket)
- [ ] Form submission creates contact in GoHighLevel
- [ ] Privacy policy and terms pages load
- [ ] Mobile responsive (test at 375px, 768px, 1024px)
- [ ] SSL cert shows valid (green padlock)

## 📞 Contact Info

- Phone: (786) 983-5811
- Domain: gcoffers.com
- API: https://nifdys6vre.execute-api.us-east-1.amazonaws.com

---

**Total build time:** ~2 hours (12:30 AM - 1:15 AM)
**Bottleneck:** Exec approvals + SSL cert validation
**Estimated time to live:** 30-45 minutes after nameserver update
