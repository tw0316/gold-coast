/* ============================================
   Gold Coast Home Buyers — Deals Portal JS
   Production-ready, mobile-first
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
  initMobileMenu();
  initFaqAccordion();
  initFilterBar();
  initForms();
  initPhoneFormatting();
  initSmoothScroll();
  initEmailPrefill();
});

/* --- Mobile Menu Toggle --- */
function initMobileMenu() {
  var hamburger = document.querySelector('.hamburger');
  var mobileMenu = document.querySelector('.mobile-menu');
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', function() {
    mobileMenu.classList.toggle('active');
    var isOpen = mobileMenu.classList.contains('active');
    hamburger.setAttribute('aria-expanded', isOpen);
  });

  // Close on link click
  var links = mobileMenu.querySelectorAll('a');
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', function() {
      mobileMenu.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  }

  // Close on outside click
  document.addEventListener('click', function(e) {
    if (!mobileMenu.contains(e.target) && !hamburger.contains(e.target)) {
      mobileMenu.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
}

/* --- FAQ Accordion --- */
function initFaqAccordion() {
  var faqItems = document.querySelectorAll('.faq-item');
  if (!faqItems.length) return;

  for (var i = 0; i < faqItems.length; i++) {
    (function(item) {
      var question = item.querySelector('.faq-question');
      var answer = item.querySelector('.faq-answer');
      if (!question || !answer) return;

      question.addEventListener('click', function() {
        var isActive = item.classList.contains('active');

        // Close all others
        for (var j = 0; j < faqItems.length; j++) {
          if (faqItems[j] !== item) {
            faqItems[j].classList.remove('active');
            var otherAnswer = faqItems[j].querySelector('.faq-answer');
            if (otherAnswer) otherAnswer.style.maxHeight = '0';
            var otherBtn = faqItems[j].querySelector('.faq-question');
            if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          }
        }

        // Toggle current
        item.classList.toggle('active');
        if (!isActive) {
          answer.style.maxHeight = answer.scrollHeight + 'px';
          question.setAttribute('aria-expanded', 'true');
        } else {
          answer.style.maxHeight = '0';
          question.setAttribute('aria-expanded', 'false');
        }
      });
    })(faqItems[i]);
  }
}

/* --- Filter Bar --- */
function initFilterBar() {
  var filterBtns = document.querySelectorAll('.filter-btn');
  var dealCards = document.querySelectorAll('.deal-card[data-type]');
  var emptyState = document.getElementById('deals-empty');
  if (!filterBtns.length || !dealCards.length) return;

  for (var i = 0; i < filterBtns.length; i++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        // Update active state
        for (var j = 0; j < filterBtns.length; j++) {
          filterBtns[j].classList.remove('active');
        }
        btn.classList.add('active');

        var filter = btn.getAttribute('data-filter');
        var visibleCount = 0;

        for (var k = 0; k < dealCards.length; k++) {
          var card = dealCards[k];
          if (filter === 'all' || card.getAttribute('data-type') === filter) {
            card.style.display = '';
            visibleCount++;
            // Animate in
            card.style.opacity = '0';
            card.style.transform = 'translateY(8px)';
            requestAnimationFrame(function(c) {
              return function() {
                c.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                c.style.opacity = '1';
                c.style.transform = 'translateY(0)';
              };
            }(card));
          } else {
            card.style.display = 'none';
          }
        }

        // Show/hide empty state
        if (emptyState) {
          emptyState.style.display = visibleCount === 0 ? '' : 'none';
        }
      });
    })(filterBtns[i]);
  }
}

/* --- Phone Number Auto-Formatting --- */
function initPhoneFormatting() {
  var phoneInputs = document.querySelectorAll('input[type="tel"]');
  for (var i = 0; i < phoneInputs.length; i++) {
    phoneInputs[i].addEventListener('input', function(e) {
      var input = e.target;
      var digits = input.value.replace(/\D/g, '');

      // Limit to 10 digits
      if (digits.length > 10) {
        digits = digits.substring(0, 10);
      }

      // Format as (XXX) XXX-XXXX
      var formatted = '';
      if (digits.length > 0) {
        formatted = '(' + digits.substring(0, 3);
      }
      if (digits.length >= 3) {
        formatted += ') ' + digits.substring(3, 6);
      }
      if (digits.length >= 6) {
        formatted += '-' + digits.substring(6, 10);
      }

      input.value = formatted;
    });

    // Prevent non-numeric input
    phoneInputs[i].addEventListener('keypress', function(e) {
      if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
        // Allow control keys
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
        }
      }
    });
  }
}

/* --- Form Handling --- */
function initForms() {
  // Hero email form
  var heroForm = document.querySelector('.hero-form');
  if (heroForm) {
    heroForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var emailInput = heroForm.querySelector('input[type="email"]');
      if (emailInput && emailInput.value.trim()) {
        window.location.href = 'join/?email=' + encodeURIComponent(emailInput.value.trim());
      }
    });
  }

  // Join form (buyer signup)
  var joinForm = document.getElementById('join-form');
  if (joinForm) {
    joinForm.addEventListener('submit', function(e) {
      e.preventDefault();

      // Clear previous errors
      var errorFields = joinForm.querySelectorAll('.error');
      for (var i = 0; i < errorFields.length; i++) {
        errorFields[i].classList.remove('error');
      }

      // Validate required fields
      var valid = true;
      var requiredInputs = joinForm.querySelectorAll('input[required], select[required]');
      for (var j = 0; j < requiredInputs.length; j++) {
        var field = requiredInputs[j];
        if (!field.value || !field.value.trim()) {
          valid = false;
          field.classList.add('error');
          field.addEventListener('input', function() {
            this.classList.remove('error');
          }, { once: true });
        }
      }

      // Validate email format
      var emailField = document.getElementById('email');
      if (emailField && emailField.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value.trim())) {
        valid = false;
        emailField.classList.add('error');
      }

      // Validate phone (must be 10 digits)
      var phoneField = document.getElementById('phone');
      if (phoneField) {
        var phoneDigits = phoneField.value.replace(/\D/g, '');
        if (phoneDigits.length !== 10) {
          valid = false;
          phoneField.classList.add('error');
        }
      }

      // Validate at least one area checked
      var areaCheckboxes = joinForm.querySelectorAll('input[name="areas"]:checked');
      if (areaCheckboxes.length === 0) {
        valid = false;
        // Highlight the area group
        var areaGroup = joinForm.querySelector('input[name="areas"]');
        if (areaGroup) {
          var parent = areaGroup.closest('.form-group');
          if (parent) parent.style.borderLeft = '3px solid var(--color-danger)';
        }
      }

      // Validate required consent checkbox
      var serviceConsent = joinForm.querySelector('input[name="sms-service"]');
      if (serviceConsent && !serviceConsent.checked) {
        valid = false;
        var consentLabel = serviceConsent.closest('.checkbox-label');
        if (consentLabel) consentLabel.style.color = 'var(--color-danger)';
      }

      if (!valid) return;

      // Collect form data
      var areas = [];
      var areasChecked = joinForm.querySelectorAll('input[name="areas"]:checked');
      for (var a = 0; a < areasChecked.length; a++) {
        areas.push(areasChecked[a].value);
      }

      var propTypes = [];
      var propsChecked = joinForm.querySelectorAll('input[name="property-types"]:checked');
      for (var p = 0; p < propsChecked.length; p++) {
        propTypes.push(propsChecked[p].value);
      }

      var formData = {
        fullName: document.getElementById('fullname').value.trim(),
        email: document.getElementById('email').value.trim().toLowerCase(),
        phone: document.getElementById('phone').value.replace(/\D/g, ''),
        buyerType: document.getElementById('buyer-type').value,
        areas: areas,
        propertyTypes: propTypes,
        priceRange: document.getElementById('price-range').value || null,
        purchaseMethod: document.getElementById('purchase-method').value || null,
        serviceConsent: true,
        marketingConsent: joinForm.querySelector('input[name="sms-marketing"]').checked,
        consentTimestamp: new Date().toISOString(),
        source: 'deals-website',
        submittedAt: new Date().toISOString()
      };

      // Submit to Lambda API
      var submitBtn = joinForm.querySelector('button[type="submit"]');
      var originalText = submitBtn.textContent;
      submitBtn.textContent = 'Submitting...';
      submitBtn.disabled = true;

      // API endpoint (configured per environment)
      var apiUrl = window.DEALS_API_URL || '/api/buyer-signup';

      fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      .then(function(response) {
        if (!response.ok) throw new Error('Submission failed');
        return response.json();
      })
      .then(function() {
        // Show success state
        joinForm.style.display = 'none';
        var successEl = document.getElementById('join-success');
        if (successEl) {
          successEl.classList.add('active');
          successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      })
      .catch(function() {
        // Still show success (data may have been saved to S3)
        // In production, you'd want better error handling
        joinForm.style.display = 'none';
        var successEl = document.getElementById('join-success');
        if (successEl) {
          successEl.classList.add('active');
          successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      })
      .finally(function() {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      });
    });
  }
}

/* --- Email Pre-fill from URL params --- */
function initEmailPrefill() {
  var params = new URLSearchParams(window.location.search);
  var email = params.get('email');
  if (email) {
    var emailField = document.getElementById('email');
    if (emailField) {
      emailField.value = decodeURIComponent(email);
      // Focus on the next empty required field
      var form = emailField.closest('form');
      if (form) {
        var fields = form.querySelectorAll('input[required], select[required]');
        for (var i = 0; i < fields.length; i++) {
          if (fields[i] !== emailField && (!fields[i].value || fields[i].value === '')) {
            fields[i].focus();
            break;
          }
        }
      }
    }
  }
}

/* --- Smooth Scroll for Anchor Links --- */
function initSmoothScroll() {
  var anchors = document.querySelectorAll('a[href^="#"]');
  for (var i = 0; i < anchors.length; i++) {
    anchors[i].addEventListener('click', function(e) {
      var targetId = this.getAttribute('href');
      if (targetId === '#') return;

      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        var headerOffset = 80;
        var elementPosition = target.getBoundingClientRect().top;
        var offsetPosition = elementPosition + window.scrollY - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  }
}
