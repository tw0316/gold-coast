/**
 * Gold Coast Home Buyers — static site interactions and forms.
 */
(function () {
  'use strict';

  var SELLER_ENDPOINT = '/api/submit-lead';
  var BUYER_ENDPOINT = '/api/buyer-signup';

  function qs(selector, root) { return (root || document).querySelector(selector); }
  function qsa(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

  function formatPhone(value) {
    var digits = String(value || '').replace(/\D/g, '').slice(0, 10);
    if (digits.length === 0) return '';
    if (digits.length <= 3) return '(' + digits;
    if (digits.length <= 6) return '(' + digits.slice(0, 3) + ') ' + digits.slice(3);
    return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
  }

  function phoneDigits(value) { return String(value || '').replace(/\D/g, ''); }
  function isValidPhone(value) { return phoneDigits(value).length === 10; }
  function isValidEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim()); }

  function setFieldError(field, hasError) {
    if (!field) return;
    field.classList.toggle('error', !!hasError);
    field.setAttribute('aria-invalid', hasError ? 'true' : 'false');
    var error = document.getElementById(field.id + '-error');
    if (error) {
      error.classList.toggle('active', !!hasError);
      field.setAttribute('aria-describedby', error.id);
    }
  }

  function setManualError(id, hasError) {
    var error = document.getElementById(id);
    if (error) error.classList.toggle('active', !!hasError);
    var fieldId = id.replace(/-error$/, '');
    var field = document.getElementById(fieldId);
    if (field) {
      field.setAttribute('aria-invalid', hasError ? 'true' : 'false');
      field.setAttribute('aria-describedby', id);
    }
  }

  function setStatus(formName, status) {
    ['loading', 'success', 'error'].forEach(function (state) {
      var el = document.getElementById(formName + '-' + state);
      if (el) el.classList.toggle('active', state === status);
    });
  }

  function trackEvent(name, data) {
    if (window.gtag) window.gtag('event', name, data || {});
  }

  qsa('input[type="tel"]').forEach(function (input) {
    input.addEventListener('input', function () {
      input.value = formatPhone(input.value);
    });
  });

  var navToggle = qs('.nav__toggle');
  var navLinks = qs('#primary-nav');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var open = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!open));
      navLinks.classList.toggle('active', !open);
      document.body.classList.toggle('nav-open', !open);
    });
  }

  async function postJson(endpoint, payload) {
    var response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    var body = null;
    try { body = await response.json(); } catch (err) { body = null; }
    if (!response.ok) {
      var message = body && (body.error || body.message) ? (body.error || body.message) : 'Submission failed';
      throw new Error(message);
    }
    return body;
  }

  function initSellerForm() {
    var form = document.getElementById('seller-form');
    if (!form) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      setStatus('seller', null);

      var address = qs('#property-address', form);
      var fullName = qs('#full-name', form);
      var phone = qs('#phone', form);
      var email = qs('#email', form);
      var serviceConsent = qs('#service-consent', form);
      var marketingConsent = qs('#marketing-consent', form);
      var valid = true;

      setFieldError(address, !address.value.trim() || address.value.trim().length < 5);
      setFieldError(fullName, !fullName.value.trim() || fullName.value.trim().length < 2);
      setFieldError(phone, !isValidPhone(phone.value));
      setFieldError(email, !isValidEmail(email.value));
      setManualError('service-consent-error', !serviceConsent.checked);

      valid = !qsa('.error', form).length && serviceConsent.checked;
      if (!valid) return;

      var payload = {
        address: address.value.trim(),
        phone: phoneDigits(phone.value),
        fullName: fullName.value.trim(),
        email: email.value.trim().toLowerCase(),
        condition: qs('#condition', form).value || null,
        timeline: qs('#timeline', form).value || null,
        propertyType: qs('#property-type', form).value || null,
        occupancy: null,
        repairs: qs('#repairs', form).value.trim() || null,
        serviceConsent: serviceConsent.checked,
        marketingConsent: marketingConsent.checked,
        tcpaConsent: serviceConsent.checked,
        tcpaTimestamp: new Date().toISOString(),
        source: 'website',
        page: window.location.pathname || '/',
        referrer: document.referrer || null,
        userAgent: navigator.userAgent
      };

      var submit = qs('button[type="submit"]', form);
      if (submit) submit.disabled = true;
      setStatus('seller', 'loading');

      postJson(SELLER_ENDPOINT, payload)
        .then(function () {
          setStatus('seller', 'success');
          form.reset();
          trackEvent('lead_submitted', { page: 'homepage', source: 'redesign_static' });
        })
        .catch(function () {
          setStatus('seller', 'error');
        })
        .finally(function () {
          if (submit) submit.disabled = false;
        });
    });
  }

  function checkedValues(form, name) {
    return qsa('input[name="' + name + '"]:checked', form).map(function (input) { return input.value; });
  }

  function initBuyerForm() {
    var form = document.getElementById('buyer-form');
    if (!form) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      setStatus('buyer', null);

      var fullName = qs('#buyer-full-name', form);
      var email = qs('#buyer-email', form);
      var phone = qs('#buyer-phone', form);
      var buyerType = qs('#buyer-type', form);
      var serviceConsent = qs('#buyer-service-consent', form);
      var marketingConsent = qs('#buyer-marketing-consent', form);
      var areas = checkedValues(form, 'areas');

      setFieldError(fullName, !fullName.value.trim() || fullName.value.trim().length < 2);
      setFieldError(email, !isValidEmail(email.value));
      setFieldError(phone, !isValidPhone(phone.value));
      setFieldError(buyerType, !buyerType.value);
      setManualError('buyer-areas-error', areas.length === 0);
      setManualError('buyer-service-consent-error', !serviceConsent.checked);

      if (qsa('.error', form).length || areas.length === 0 || !serviceConsent.checked) return;

      var payload = {
        fullName: fullName.value.trim(),
        email: email.value.trim().toLowerCase(),
        phone: phoneDigits(phone.value),
        buyerType: buyerType.value,
        areas: areas,
        propertyTypes: [],
        priceRange: qs('#price-range', form).value || null,
        purchaseMethod: qs('#purchase-method', form).value || null,
        serviceConsent: serviceConsent.checked,
        marketingConsent: marketingConsent.checked,
        consentTimestamp: new Date().toISOString(),
        source: 'deals-page',
        submittedAt: new Date().toISOString()
      };

      var submit = qs('button[type="submit"]', form);
      if (submit) submit.disabled = true;
      setStatus('buyer', 'loading');

      postJson(BUYER_ENDPOINT, payload)
        .then(function () {
          setStatus('buyer', 'success');
          form.reset();
          trackEvent('buyer_signup_submitted', { page: 'deals' });
        })
        .catch(function () {
          setStatus('buyer', 'error');
        })
        .finally(function () {
          if (submit) submit.disabled = false;
        });
    });
  }

  initSellerForm();
  initBuyerForm();
})();
