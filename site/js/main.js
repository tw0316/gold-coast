/**
 * Gold Coast Home Buyers — gcoffers.com
 * Form handling, validation, and submission
 */

(function () {
  'use strict';

  // ---------- Config ----------
  var API_ENDPOINT = 'https://mxxax8a8y9.execute-api.us-east-1.amazonaws.com/api/submit-lead';

  // ---------- Helpers ----------
  function formatPhone(value) {
    var digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.length <= 3) return '(' + digits;
    if (digits.length <= 6) return '(' + digits.slice(0, 3) + ') ' + digits.slice(3);
    return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6, 10);
  }

  function isValidPhone(value) {
    var digits = value.replace(/\D/g, '');
    return digits.length === 10;
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function setError(input, show) {
    if (show) {
      input.classList.add('error');
    } else {
      input.classList.remove('error');
    }
  }

  // ---------- Phone Formatting ----------
  var phoneInputs = document.querySelectorAll('input[type="tel"]');
  phoneInputs.forEach(function (input) {
    input.addEventListener('input', function () {
      var pos = input.selectionStart;
      var prev = input.value;
      input.value = formatPhone(input.value);
      // Try to maintain cursor position
      if (input.value.length > prev.length) {
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  });

  // ---------- Step 1 Form (Homepage — A2P Single-Page) ----------
  var step1Form = document.getElementById('step1-form');
  if (step1Form) {
    step1Form.addEventListener('submit', function (e) {
      e.preventDefault();

      var fullName = document.getElementById('full-name');
      var address = document.getElementById('property-address');
      var phone = document.getElementById('phone');
      var email = document.getElementById('email');
      var serviceConsent = document.getElementById('service-consent');
      var marketingConsent = document.getElementById('marketing-consent');
      var serviceConsentError = document.getElementById('service-consent-error');
      var valid = true;

      // Validate full name
      if (!fullName || !fullName.value.trim() || fullName.value.trim().length < 2) {
        if (fullName) setError(fullName, true);
        var nameErr = document.getElementById('name-error');
        if (nameErr) nameErr.style.display = 'block';
        valid = false;
      } else {
        setError(fullName, false);
        var nameErr2 = document.getElementById('name-error');
        if (nameErr2) nameErr2.style.display = 'none';
      }

      // Validate address
      if (!address.value.trim() || address.value.trim().length < 5) {
        setError(address, true);
        var addrErr = document.getElementById('address-error');
        if (addrErr) addrErr.style.display = 'block';
        valid = false;
      } else {
        setError(address, false);
        var addrErr2 = document.getElementById('address-error');
        if (addrErr2) addrErr2.style.display = 'none';
      }

      // Validate phone
      if (!isValidPhone(phone.value)) {
        setError(phone, true);
        var phoneErr = document.getElementById('phone-error');
        if (phoneErr) phoneErr.style.display = 'block';
        valid = false;
      } else {
        setError(phone, false);
        var phoneErr2 = document.getElementById('phone-error');
        if (phoneErr2) phoneErr2.style.display = 'none';
      }

      // Validate email
      if (!email || !isValidEmail(email.value)) {
        if (email) setError(email, true);
        var emailErr = document.getElementById('email-error');
        if (emailErr) emailErr.style.display = 'block';
        valid = false;
      } else {
        setError(email, false);
        var emailErr2 = document.getElementById('email-error');
        if (emailErr2) emailErr2.style.display = 'none';
      }

      // Service consent is optional — no validation needed

      if (!valid) return;

      // Build payload
      var payload = {
        address: address.value.trim(),
        phone: phone.value.replace(/\D/g, ''),
        fullName: fullName.value.trim(),
        email: email.value.trim().toLowerCase(),
        condition: null,
        timeline: null,
        serviceConsent: serviceConsent ? serviceConsent.checked : false,
        marketingConsent: marketingConsent ? marketingConsent.checked : false,
        tcpaConsent: serviceConsent ? serviceConsent.checked : false,
        tcpaTimestamp: new Date().toISOString(),
        source: 'website',
        page: window.location.pathname,
        referrer: document.referrer || null,
        userAgent: navigator.userAgent
      };

      // Show loading
      var submitBtn = step1Form.querySelector('button[type="submit"]');
      var loadingEl = document.getElementById('hero-form-loading');
      var successEl = document.getElementById('hero-form-success');
      if (submitBtn) submitBtn.style.display = 'none';
      if (loadingEl) loadingEl.style.display = 'block';

      // Submit to API
      fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function () {
        // Show success
        step1Form.querySelectorAll('.form-group, .form-checkbox, .hero__micro-trust').forEach(function (el) { el.style.display = 'none'; });
        if (loadingEl) loadingEl.style.display = 'none';
        if (successEl) successEl.style.display = 'block';
        trackEvent('lead_submitted', { page: 'homepage', source: 'a2p_single_page' });
      })
      .catch(function () {
        // Show success anyway (lead may be in S3)
        step1Form.querySelectorAll('.form-group, .form-checkbox, .hero__micro-trust').forEach(function (el) { el.style.display = 'none'; });
        if (loadingEl) loadingEl.style.display = 'none';
        if (successEl) successEl.style.display = 'block';
      });
    });
  }

  // ---------- Step 2 Form (Get Your Offer) ----------
  var step2Form = document.getElementById('step2-form');
  if (step2Form) {
    // Populate hidden fields from Step 1
    var storedAddress = sessionStorage.getItem('gc_address');
    var storedPhone = sessionStorage.getItem('gc_phone');

    if (!storedAddress || !storedPhone) {
      // If someone lands here directly without Step 1, redirect home
      window.location.href = '/';
      return;
    }

    document.getElementById('s2-address').value = storedAddress;
    document.getElementById('s2-phone').value = storedPhone;

    step2Form.addEventListener('submit', function (e) {
      e.preventDefault();

      var fullName = document.getElementById('full-name');
      var email = document.getElementById('email');
      var tcpa = document.getElementById('tcpa-consent');
      var tcpaError = document.getElementById('tcpa-error');
      var valid = true;

      // Validate name
      if (!fullName.value.trim()) {
        setError(fullName, true);
        valid = false;
      } else {
        setError(fullName, false);
      }

      // Validate email
      if (!isValidEmail(email.value)) {
        setError(email, true);
        valid = false;
      } else {
        setError(email, false);
      }

      // Validate TCPA consent (MUST be checked)
      if (!tcpa.checked) {
        tcpaError.style.display = 'block';
        valid = false;
      } else {
        tcpaError.style.display = 'none';
      }

      if (!valid) return;

      // Build payload
      var payload = {
        address: storedAddress,
        phone: storedPhone,
        fullName: fullName.value.trim(),
        email: email.value.trim().toLowerCase(),
        condition: document.getElementById('condition').value || null,
        timeline: document.getElementById('timeline').value || null,
        tcpaConsent: true,
        tcpaTimestamp: new Date().toISOString(),
        source: 'website',
        page: window.location.pathname,
        referrer: document.referrer || null,
        userAgent: navigator.userAgent
      };

      // Show loading, hide form
      step2Form.style.display = 'none';
      document.getElementById('form-loading').classList.add('active');

      // Submit to API
      fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Submission failed');
          return res.json();
        })
        .then(function () {
          // Success
          document.getElementById('form-loading').classList.remove('active');
          document.getElementById('form-success').classList.add('active');
          // Clear session data
          sessionStorage.removeItem('gc_address');
          sessionStorage.removeItem('gc_phone');
        })
        .catch(function () {
          // Even on API error, show success (lead may have been saved to S3)
          // Better UX than showing an error when the lead might actually be captured
          document.getElementById('form-loading').classList.remove('active');
          document.getElementById('form-success').classList.add('active');
          sessionStorage.removeItem('gc_address');
          sessionStorage.removeItem('gc_phone');
        });
    });
  }

  // ---------- CTA Scroll Button ----------
  var ctaBtn = document.getElementById('cta-scroll-btn');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Focus the address input after scroll
      setTimeout(function () {
        var addr = document.getElementById('property-address');
        if (addr) addr.focus();
      }, 600);
    });
  }
  // ---------- Address Autocomplete (Mapbox Geocoding API) ----------
  (function initAddressAutocomplete() {
    var input = document.getElementById('property-address');
    var list = document.getElementById('address-autocomplete');
    if (!input || !list) return;

    var token = input.getAttribute('data-mapbox-token');
    if (!token) return;

    var debounceTimer;
    var activeIndex = -1;
    var results = [];
    var suppressNextInput = false;

    function clearList() {
      list.innerHTML = '';
      list.classList.remove('active');
      activeIndex = -1;
    }

    function renderList(items) {
      if (!items.length) {
        clearList();
        return;
      }
      list.innerHTML = items.map(function(item, idx) {
        var primary = item.place_name;
        var secondary = '';
        if (item.place_name && item.place_name.indexOf(',') !== -1) {
          var parts = item.place_name.split(',');
          primary = parts.shift().trim();
          secondary = parts.join(',').trim();
        }
        return '<div class="address-item" data-idx="' + idx + '">' +
          '<div class="address-primary">' + primary + '</div>' +
          (secondary ? '<div class="address-secondary">' + secondary + '</div>' : '') +
        '</div>';
      }).join('');
      list.classList.add('active');
    }

    function fetchSuggestions(query) {
      if (!query || query.length < 3) {
        clearList();
        return;
      }
      var url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' +
        encodeURIComponent(query) + '.json' +
        '?autocomplete=true&types=address&limit=6&country=US&access_token=' + encodeURIComponent(token);

      fetch(url)
        .then(function(res) { return res.json(); })
        .then(function(data) {
          results = (data && data.features) ? data.features : [];
          renderList(results);
        })
        .catch(function() { clearList(); });
    }

    input.addEventListener('input', function() {
      if (suppressNextInput) {
        suppressNextInput = false;
        return;
      }
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() {
        fetchSuggestions(input.value.trim());
      }, 200);
    });

    input.addEventListener('keydown', function(e) {
      var items = list.querySelectorAll('.address-item');
      if (!items.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % items.length;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + items.length) % items.length;
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        items[activeIndex].click();
        return;
      } else {
        return;
      }
      items.forEach(function(el, i) {
        el.classList.toggle('active', i === activeIndex);
      });
    });

    list.addEventListener('mousedown', function(e) {
      var item = e.target.closest('.address-item');
      if (!item) return;
      var idx = parseInt(item.getAttribute('data-idx'), 10);
      var feature = results[idx];
      if (feature) {
        input.value = feature.place_name;
        suppressNextInput = true;
      }
      clearList();
    });

    document.addEventListener('click', function(e) {
      if (!list.contains(e.target) && e.target !== input) {
        clearList();
      }
    });
  })();

  // ---------- Event Tracking ----------
  function trackEvent(eventName, data) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, data || {});
    }
    if (typeof fbq === 'function' && eventName === 'form_submit') {
      fbq('track', 'Lead');
    }
    // Console log for dev
    console.log('[GC Event]', eventName, data || {});
  }

  // Track all data-gc-event clicks
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-gc-event]');
    if (el) {
      trackEvent(el.getAttribute('data-gc-event'));
    }
  });

  // Track form field focus (form start)
  var heroAddr = document.getElementById('property-address');
  if (heroAddr) {
    var formStarted = false;
    heroAddr.addEventListener('focus', function () {
      if (!formStarted) {
        formStarted = true;
        trackEvent('form_start');
      }
    });
  }

  // Track phone call taps
  document.querySelectorAll('a[href^="tel:"]').forEach(function (link) {
    link.addEventListener('click', function () {
      trackEvent('phone_click', { number: link.href });
    });
  });
})();
