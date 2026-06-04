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

  function scrollToElement(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setOfferStep(form, step) {
    if (!form) return;
    var target = Number(step) || 0;
    qsa('.offer-step', form).forEach(function (panel) {
      panel.classList.toggle('is-active', Number(panel.getAttribute('data-step')) === target);
    });
    qsa('.offer-progress span', form).forEach(function (bar, index) {
      bar.classList.toggle('is-active', target >= 3 || index <= target);
    });
    form.setAttribute('data-current-step', String(target));
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

  function initHeroAddressForm() {
    var heroForm = document.getElementById('hero-address-form');
    var offerForm = document.getElementById('seller-form');
    if (!heroForm || !offerForm) return;
    heroForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var heroAddress = qs('#hero-address', heroForm);
      var offerAddress = qs('#property-address', offerForm);
      var value = heroAddress ? heroAddress.value.trim() : '';
      if (heroAddress && !value) {
        heroAddress.focus();
        return;
      }
      if (offerAddress) {
        offerAddress.value = value;
        setFieldError(offerAddress, false);
      }
      setStatus('seller', null);
      setOfferStep(offerForm, 0);
      scrollToElement(document.getElementById('offer'));
      if (offerAddress) setTimeout(function () { offerAddress.focus(); }, 320);
      trackEvent('hero_address_started', { page: 'homepage' });
    });
  }

  function initOfferWizard() {
    var form = document.getElementById('seller-form');
    if (!form) return;
    setOfferStep(form, 0);

    qsa('.offer-next', form).forEach(function (button) {
      button.addEventListener('click', function () {
        var next = Number(button.getAttribute('data-next')) || 0;
        var address = qs('#property-address', form);
        if (next === 1 && address) {
          var hasAddressError = !address.value.trim() || address.value.trim().length < 5;
          setFieldError(address, hasAddressError);
          if (hasAddressError) {
            address.focus();
            return;
          }
        }
        setStatus('seller', null);
        setOfferStep(form, next);
      });
    });

    qsa('.offer-back', form).forEach(function (button) {
      button.addEventListener('click', function () {
        setStatus('seller', null);
        setOfferStep(form, Number(button.getAttribute('data-back')) || 0);
      });
    });

    qsa('.offer-reset', form).forEach(function (button) {
      button.addEventListener('click', function () {
        form.reset();
        setStatus('seller', null);
        qsa('.error', form).forEach(function (field) { field.classList.remove('error'); field.removeAttribute('aria-invalid'); });
        qsa('.error-message', form).forEach(function (msg) { msg.classList.remove('active'); });
        setOfferStep(form, 0);
      });
    });
  }

  function initFaqAccordion() {
    qsa('.faq-row').forEach(function (row) {
      row.addEventListener('toggle', function () {
        if (!row.open) return;
        qsa('.faq-row').forEach(function (other) {
          if (other !== row) other.open = false;
        });
      });
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
      var beds = qs('#beds', form);
      var baths = qs('#baths', form);
      var sqft = qs('#sqft', form);
      var condition = qs('#condition', form);
      var timeline = qs('#timeline', form);
      var propertyType = qs('#property-type', form);
      var repairs = qs('#repairs', form);
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
        beds: beds && beds.value ? beds.value.trim() : null,
        baths: baths && baths.value ? baths.value.trim() : null,
        sqft: sqft && sqft.value ? sqft.value.trim() : null,
        condition: condition && condition.value ? condition.value : null,
        timeline: timeline && timeline.value ? timeline.value : null,
        propertyType: propertyType && propertyType.value ? propertyType.value : null,
        occupancy: null,
        repairs: repairs && repairs.value ? repairs.value.trim() : null,
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
          setOfferStep(form, 3);
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


  function initDealFilters() {
    var buttons = qsa('[data-county-filter]');
    if (!buttons.length) return;
    var cards = qsa('[data-county]');
    var countEl = document.getElementById('deals-count');
    var regionEl = document.getElementById('deals-region');
    var emptyMessage = document.getElementById('empty-deals-message');

    function labelFor(filter) {
      return filter === 'all' ? 'South Florida' : filter;
    }

    function applyFilter(filter) {
      var visible = 0;
      buttons.forEach(function (button) {
        button.setAttribute('aria-pressed', String(button.getAttribute('data-county-filter') === filter));
      });
      cards.forEach(function (card) {
        var show = filter === 'all' || card.getAttribute('data-county') === filter;
        card.hidden = !show;
        if (show) visible += 1;
      });
      var label = labelFor(filter);
      if (countEl) countEl.textContent = visible + ' active ' + (filter === 'all' ? 'deal' : label + ' deal') + (visible === 1 ? '' : 's');
      if (regionEl) regionEl.textContent = label;
      if (emptyMessage && visible === 0) {
        emptyMessage.textContent = filter === 'all'
          ? 'We are under contract on new inventory. Join the buyer list and you will hear about the next one before it posts here.'
          : 'No active ' + label + ' deals right now. Join the buyer list and we will send the next matching opportunity before it posts here.';
      }
      trackEvent('deal_filter_selected', { county: filter });
    }

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        applyFilter(button.getAttribute('data-county-filter') || 'all');
      });
    });
    applyFilter('all');
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

  initHeroAddressForm();
  initOfferWizard();
  initFaqAccordion();
  initSellerForm();
  initBuyerForm();
  initDealFilters();
})();
