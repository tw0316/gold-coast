/* ============================================
   Gold Coast Home Buyers — Deals Portal JS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initFaqAccordion();
  initFilterBar();
  initForms();
  initSmoothScroll();
  initGallery();
  initLightbox();
  initEmailPrefill();
});

/* --- Mobile Menu Toggle --- */
function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
    const isOpen = mobileMenu.classList.contains('active');
    hamburger.setAttribute('aria-expanded', isOpen);
  });

  // Close on link click
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

/* --- FAQ Accordion --- */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  if (!faqItems.length) return;

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!question || !answer) return;

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all others
      faqItems.forEach(other => {
        if (other !== item) {
          other.classList.remove('active');
          const otherAnswer = other.querySelector('.faq-answer');
          if (otherAnswer) otherAnswer.style.maxHeight = '0';
        }
      });

      // Toggle current
      item.classList.toggle('active');
      if (!isActive) {
        answer.style.maxHeight = answer.scrollHeight + 'px';
      } else {
        answer.style.maxHeight = '0';
      }
    });
  });
}

/* --- Filter Bar --- */
function initFilterBar() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const dealCards = document.querySelectorAll('.deal-card[data-type]');
  if (!filterBtns.length || !dealCards.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;

      dealCards.forEach(card => {
        if (filter === 'all' || card.dataset.type === filter) {
          card.style.display = '';
          // Animate in
          card.style.opacity = '0';
          card.style.transform = 'translateY(8px)';
          requestAnimationFrame(() => {
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          });
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/* --- Form Handling --- */
function initForms() {
  // Generic form submission handler
  document.querySelectorAll('form[data-success]').forEach(form => {
    const successId = form.dataset.success;
    const successEl = document.getElementById(successId);
    if (!successEl) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Basic validation
      const requiredFields = form.querySelectorAll('[required]');
      let valid = true;

      requiredFields.forEach(field => {
        if (!field.value.trim()) {
          valid = false;
          field.style.borderColor = '#DC2626';
          field.addEventListener('input', () => {
            field.style.borderColor = '';
          }, { once: true });
        }
      });

      if (!valid) return;

      // Show success
      form.style.display = 'none';
      successEl.classList.add('active');

      // Scroll to top of success message
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  // Interest form (deal detail page)
  const interestForm = document.getElementById('interest-form');
  if (interestForm) {
    interestForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const requiredFields = interestForm.querySelectorAll('[required]');
      let valid = true;

      requiredFields.forEach(field => {
        if (!field.value.trim()) {
          valid = false;
          field.style.borderColor = '#DC2626';
          field.addEventListener('input', () => {
            field.style.borderColor = '';
          }, { once: true });
        }
      });

      if (!valid) return;

      // Show inline success
      const btn = interestForm.querySelector('button[type="submit"]');
      btn.textContent = '✓ Request Sent!';
      btn.style.background = '#15803D';
      btn.disabled = true;

      setTimeout(() => {
        btn.textContent = "I'm Interested — Send Me Details";
        btn.style.background = '';
        btn.disabled = false;
        interestForm.reset();
      }, 3000);
    });
  }

  // Mobile CTA button scroll
  const mobileCta = document.querySelector('.mobile-cta-bar .btn');
  if (mobileCta) {
    mobileCta.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(mobileCta.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}

/* --- Gallery Thumbnail Click --- */
function initGallery() {
  const hero = document.querySelector('.gallery__hero');
  const thumbs = document.querySelectorAll('.gallery__thumb');
  if (!hero || !thumbs.length) return;

  thumbs.forEach((thumb, index) => {
    thumb.addEventListener('click', () => {
      // Swap hero content with clicked thumb content
      const thumbImg = thumb.querySelector('.placeholder-img');
      const heroImg = hero.querySelector('.placeholder-img');
      if (!thumbImg || !heroImg) return;

      // Copy the class and emoji from thumb to hero
      heroImg.className = thumbImg.className;
      heroImg.textContent = thumbImg.textContent;
      heroImg.style.fontSize = '5rem';

      // Update active state
      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  // Click hero to open lightbox
  hero.addEventListener('click', () => {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
      lightbox.classList.add('active');
      updateLightbox(0);
    }
  });
  hero.style.cursor = 'pointer';
}

/* --- Lightbox --- */
function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  const thumbs = document.querySelectorAll('.gallery__thumb');
  let currentIndex = 0;
  const totalImages = thumbs.length;

  window.updateLightbox = function(index) {
    currentIndex = index;
    const thumb = thumbs[currentIndex];
    if (!thumb) return;
    const img = thumb.querySelector('.placeholder-img');
    const container = document.getElementById('lightbox-image');
    const counter = document.getElementById('lightbox-counter');

    container.innerHTML = '';
    const clone = img.cloneNode(true);
    clone.style.fontSize = '';
    container.appendChild(clone);
    counter.textContent = (currentIndex + 1) + ' / ' + totalImages;
  };

  // Find active thumb index based on hero
  lightbox.querySelector('.lightbox__close').addEventListener('click', () => {
    lightbox.classList.remove('active');
  });

  lightbox.querySelector('.lightbox__nav--prev').addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + totalImages) % totalImages;
    updateLightbox(currentIndex);
  });

  lightbox.querySelector('.lightbox__nav--next').addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % totalImages;
    updateLightbox(currentIndex);
  });

  // Close on backdrop click
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.classList.remove('active');
  });

  // Keyboard nav
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') lightbox.classList.remove('active');
    if (e.key === 'ArrowLeft') {
      currentIndex = (currentIndex - 1 + totalImages) % totalImages;
      updateLightbox(currentIndex);
    }
    if (e.key === 'ArrowRight') {
      currentIndex = (currentIndex + 1) % totalImages;
      updateLightbox(currentIndex);
    }
  });

  // Swipe support for mobile
  let touchStartX = 0;
  lightbox.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  lightbox.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        currentIndex = (currentIndex + 1) % totalImages;
      } else {
        currentIndex = (currentIndex - 1 + totalImages) % totalImages;
      }
      updateLightbox(currentIndex);
    }
  }, { passive: true });
}

/* --- Email Pre-fill from URL params --- */
function initEmailPrefill() {
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email');
  if (email) {
    const emailField = document.getElementById('email');
    if (emailField) {
      emailField.value = email;
      // Focus on the next empty required field
      const form = emailField.closest('form');
      if (form) {
        const fields = form.querySelectorAll('input[required], select[required]');
        for (const field of fields) {
          if (!field.value || field.value === '') {
            field.focus();
            break;
          }
        }
      }
    }
  }
}

/* --- Smooth Scroll for Anchor Links --- */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}
