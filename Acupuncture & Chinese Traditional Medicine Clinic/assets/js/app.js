/**
 * Harmony Spring TCM Clinic - Main Application Script
 */

// Immediate theme & direction application to prevent flash of wrong mode
(function applyInitialSettings() {
  try {
    const savedTheme = localStorage.getItem('tcm_theme') || 
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    const savedDir = localStorage.getItem('tcm_direction') || 'ltr';
    if (savedDir === 'rtl') {
      document.documentElement.setAttribute('dir', 'rtl');
    }
  } catch (e) {
    // LocalStorage fallback
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  initThemeAndDirection();
  initNavbar();
  initAuthNavState();
  initFaqAccordions();
  initNewsletter();
  initToasts();
  initPhoneNumberValidation();
});

// Toast Notifications System
let toastContainer = null;
function initToasts() {
  toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
}

function showToast(message, type = 'success') {
  if (!toastContainer) initToasts();

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : type === 'warning' ? 'toast-warning' : ''}`;
  
  const iconSvg = type === 'error'
    ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c93b2b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
    : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1b5e50" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';

  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem;">
      ${iconSvg}
      <span>${message}</span>
    </div>
    <button style="background:none;border:none;cursor:pointer;color:#738079;font-size:1.1rem;" onclick="this.parentElement.remove()">&times;</button>
  `;

  toastContainer.appendChild(toast);

  // Trigger enter animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Auto remove after 4.5s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4500);
}
window.showToast = showToast;

// Navbar & Sticky Behavior & Mobile Drawer
function initNavbar() {
  // Ensure top-notice-bar and header are wrapped together for sticky positioning
  const noticeBar = document.querySelector('.top-notice-bar');
  const header = document.querySelector('.header');
  let stickyWrapper = document.querySelector('.sticky-header-wrapper');

  if (noticeBar && header && !stickyWrapper) {
    stickyWrapper = document.createElement('div');
    stickyWrapper.className = 'sticky-header-wrapper';
    noticeBar.parentNode.insertBefore(stickyWrapper, noticeBar);
    stickyWrapper.appendChild(noticeBar);
    stickyWrapper.appendChild(header);
  }

  // Scroll elevation indicator for always-sticky navbar
  const scrollTargets = [stickyWrapper, header].filter(Boolean);
  if (scrollTargets.length > 0) {
    const onScroll = () => {
      const isScrolled = window.scrollY > 10;
      scrollTargets.forEach(el => {
        if (isScrolled) {
          el.classList.add('scrolled');
        } else {
          el.classList.remove('scrolled');
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  const toggleBtn = document.querySelector('.mobile-nav-toggle');
  const drawer = document.querySelector('.mobile-nav-drawer');
  const overlay = document.querySelector('.mobile-nav-overlay');
  const closeBtn = document.querySelector('.mobile-nav-close');

  if (toggleBtn && drawer && overlay) {
    const openMenu = () => {
      drawer.classList.add('open');
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
      drawer.classList.remove('open');
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    };

    toggleBtn.addEventListener('click', openMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);

    // Mobile Sub-menu Accordion Toggle
    document.querySelectorAll('.mobile-sub-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const parentLi = toggle.closest('.mobile-nav-has-sub');
        if (parentLi) {
          parentLi.classList.toggle('open');
        }
      });
    });
  }

  // Navigation Dropdown Interaction (Home 1 Up, Home 2 Down)
  const dropdownContainers = document.querySelectorAll('.nav-item-dropdown');
  dropdownContainers.forEach(container => {
    const trigger = container.querySelector('.nav-link');
    if (!trigger) return;

    // Toggle on click/tap
    trigger.addEventListener('click', (e) => {
      // If clicking toggle, toggle open state
      const isOpen = container.classList.contains('open');
      dropdownContainers.forEach(c => {
        if (c !== container) {
          c.classList.remove('open');
          const t = c.querySelector('.nav-link');
          if (t) t.setAttribute('aria-expanded', 'false');
        }
      });

      if (!isOpen) {
        // Prevent immediate navigation so user can see and pick Home 1 or Home 2
        e.preventDefault();
        container.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      } else {
        container.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    // Keyboard focus support
    container.addEventListener('focusin', () => {
      container.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    });
  });

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-item-dropdown')) {
      dropdownContainers.forEach(c => {
        c.classList.remove('open');
        const t = c.querySelector('.nav-link');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // Close dropdown on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdownContainers.forEach(c => {
        c.classList.remove('open');
        const t = c.querySelector('.nav-link');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
    }
  });
}

// Update Nav state based on login status
function initAuthNavState() {
  const user = API.getCurrentUser();
  const token = API.getToken();

  const authSlots = document.querySelectorAll('#navAuthSlot');
  const mobileAuthSlot = document.getElementById('mobileNavAuthSlot');

  const isLoggedIn = !!(token && user);
  const firstName = (isLoggedIn && user.name) ? user.name.split(' ')[0] : 'Sarah';
  const portalName = `${firstName}'s Portal`;
  const portalHref = isLoggedIn ? 'dashboard.html' : 'login.html';

  // Update Portal Buttons
  const portalBtns = document.querySelectorAll('.nav-portal-btn, #navPortalBtn');
  portalBtns.forEach(btn => {
    btn.setAttribute('href', portalHref);
    btn.setAttribute('title', isLoggedIn ? `${portalName} (Patient Dashboard)` : 'Sign In to Patient Portal');
    const textEl = btn.querySelector('.nav-portal-text');
    if (textEl) textEl.textContent = portalName;
  });

  // Update Auth Icon Buttons
  const authIconBtns = document.querySelectorAll('.nav-auth-icon-btn, #navAuthIconBtn');
  authIconBtns.forEach(btn => {
    btn.setAttribute('title', isLoggedIn ? 'Log Out' : 'Sign In');
    btn.setAttribute('aria-label', isLoggedIn ? 'Log Out' : 'Sign In');
    btn.onclick = isLoggedIn ? handleLogout : () => { window.location.href = 'login.html'; };
    btn.innerHTML = isLoggedIn 
      ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`
      : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>`;
  });

  // Legacy fallback for any parent #navAuthSlot container
  authSlots.forEach(slot => {
    if (!slot.querySelector('.nav-portal-btn')) {
      slot.innerHTML = `
        <a href="${portalHref}" class="nav-portal-btn" id="navPortalBtn" title="${isLoggedIn ? `${portalName} (Patient Dashboard)` : 'Sign In to Patient Portal'}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span class="nav-portal-text">${portalName}</span>
        </a>
        <button type="button" class="nav-auth-icon-btn" id="navAuthIconBtn" title="${isLoggedIn ? 'Log Out' : 'Sign In'}" aria-label="${isLoggedIn ? 'Log Out' : 'Sign In'}" onclick="${isLoggedIn ? 'handleLogout()' : 'window.location.href=\'login.html\''}">
          ${isLoggedIn 
            ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`
            : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>`
          }
        </button>
      `;
    }
  });

  if (mobileAuthSlot) {
    if (isLoggedIn) {
      mobileAuthSlot.innerHTML = `
        <a href="dashboard.html" class="btn btn-primary btn-block" style="margin-bottom:0.75rem;">Patient Dashboard</a>
        <button onclick="handleLogout()" class="btn btn-secondary btn-block">Log Out</button>
      `;
    } else {
      mobileAuthSlot.innerHTML = `
        <a href="login.html" class="btn btn-secondary btn-block" style="margin-bottom:0.8rem;">Patient Login</a>
        <a href="booking.html" class="btn btn-primary btn-block">Book Appointment</a>
      `;
    }
  }
}

async function handleLogout() {
  try {
    await API.auth.logout();
    showToast('You have been logged out successfully.', 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 500);
  } catch (err) {
    API.clearSession();
    window.location.href = 'index.html';
  }
}
window.handleLogout = handleLogout;

// FAQ Accordions
function initFaqAccordions() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const btn = item.querySelector('.faq-question-btn');
    const panel = item.querySelector('.faq-answer-panel');

    if (btn && panel) {
      btn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');

        // Close other accordions in the same group
        faqItems.forEach(other => {
          if (other !== item) {
            other.classList.remove('active');
            const otherPanel = other.querySelector('.faq-answer-panel');
            if (otherPanel) otherPanel.style.maxHeight = null;
          }
        });

        if (isActive) {
          item.classList.remove('active');
          panel.style.maxHeight = null;
        } else {
          item.classList.add('active');
          panel.style.maxHeight = panel.scrollHeight + 'px';
        }
      });
    }
  });
}

// Newsletter Subscription
function initNewsletter() {
  const forms = document.querySelectorAll('.newsletter-form');
  forms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const submitBtn = form.querySelector('.newsletter-submit');
      if (!input || !input.value.trim()) return;

      const origText = submitBtn ? submitBtn.innerText : 'Subscribe';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Subscribing...';
      }

      try {
        const res = await API.general.subscribeNewsletter(input.value.trim());
        showToast(res.message || 'Subscribed successfully to our TCM Wellness Journal!', 'success');
        input.value = '';
      } catch (err) {
        showToast(err.message || 'Subscription failed. Please check your email.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = origText;
        }
      }
    });
  });
}

// Phone Number Input Guard: Disallow alphabets, allow numbers and phone symbols only
function initPhoneNumberValidation() {
  const isPhoneField = (el) => {
    if (!el || !el.matches) return false;
    return el.matches('input[type="tel"], input#bookPatientPhone, input#contactPhone, input#regPhone, input#profilePhone') ||
           (el.tagName === 'INPUT' && /phone/i.test(el.id || el.name || ''));
  };

  // Configure existing phone inputs on load
  document.querySelectorAll('input[type="tel"], input#bookPatientPhone, input#contactPhone, input#regPhone, input#profilePhone').forEach(input => {
    input.setAttribute('inputmode', 'tel');
    input.setAttribute('pattern', '[0-9+\\-()\\s]*');
  });

  // Capture phase: Intercept and block alphabet keystrokes immediately
  document.addEventListener('keydown', (e) => {
    if (!isPhoneField(e.target)) return;

    // Allow navigation & control keys
    if (
      e.key === 'Backspace' ||
      e.key === 'Tab' ||
      e.key === 'Enter' ||
      e.key === 'Escape' ||
      e.key === 'Delete' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }

    // Strictly block alphabet letters (a-z, A-Z) and any non-numeric/phone characters
    if (/^[a-zA-Z]$/.test(e.key) || (e.key.length === 1 && !/^[0-9+\-()\s]$/.test(e.key))) {
      e.preventDefault();
    }
  }, true);

  // Input event: Immediately sanitize any characters from paste, virtual keyboard, or autofill
  document.addEventListener('input', (e) => {
    if (!isPhoneField(e.target)) return;
    const input = e.target;
    // Strip all alphabetic characters and any characters that are not digits or phone symbols
    const cleaned = input.value.replace(/[a-zA-Z]/g, '').replace(/[^0-9+\-()\s]/g, '');
    if (input.value !== cleaned) {
      input.value = cleaned;
    }
  }, true);

  // Paste event: Ensure pasted text has all alphabet characters removed
  document.addEventListener('paste', (e) => {
    if (!isPhoneField(e.target)) return;
    const input = e.target;
    const pasted = (e.clipboardData || window.clipboardData)?.getData('text') || '';
    if (/[a-zA-Z]/.test(pasted)) {
      e.preventDefault();
      const sanitized = pasted.replace(/[a-zA-Z]/g, '').replace(/[^0-9+\-()\s]/g, '');
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const val = input.value;
      input.value = val.substring(0, start) + sanitized + val.substring(end);
      input.selectionStart = input.selectionEnd = start + sanitized.length;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, true);
}

// ==========================================================================
// Theme (Light / Dark) and Text Direction (LTR / RTL) Controller
// ==========================================================================
function initThemeAndDirection() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 
    localStorage.getItem('tcm_theme') || 
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  
  const currentDir = document.documentElement.getAttribute('dir') || 
    localStorage.getItem('tcm_direction') || 'ltr';

  // Apply attributes immediately
  document.documentElement.setAttribute('data-theme', currentTheme);
  document.documentElement.setAttribute('dir', currentDir);

  const controlsHtml = `
    <button class="nav-pill-btn dir-toggle-btn" type="button" title="Switch text direction (LTR / RTL)" aria-label="Toggle text direction">
      <span class="dir-opt ${currentDir === 'ltr' ? 'active' : ''}" data-dir="ltr">LTR</span>
      <span class="dir-divider">/</span>
      <span class="dir-opt ${currentDir === 'rtl' ? 'active' : ''}" data-dir="rtl">RTL</span>
    </button>
    <button class="nav-icon-btn theme-toggle-btn" type="button" title="${currentTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}" aria-label="Toggle dark mode">
      <svg class="theme-icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
      <svg class="theme-icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    </button>
  `;

  // Inject into navbar actions if not already present (placed at end before mobile toggle)
  document.querySelectorAll('.nav-actions').forEach(navActions => {
    if (!navActions.querySelector('.nav-controls')) {
      const controlsWrap = document.createElement('div');
      controlsWrap.className = 'nav-controls';
      controlsWrap.innerHTML = controlsHtml;
      const toggle = navActions.querySelector('.mobile-nav-toggle');
      if (toggle) {
        navActions.insertBefore(controlsWrap, toggle);
      } else {
        navActions.appendChild(controlsWrap);
      }
    }
  });

  // Inject into standalone navbar if nav-actions not present (e.g., login, register)
  const standaloneNavbar = document.querySelector('.navbar');
  if (standaloneNavbar && !document.querySelector('.nav-controls')) {
    const controlsWrap = document.createElement('div');
    controlsWrap.className = 'nav-controls';
    controlsWrap.innerHTML = controlsHtml;
    standaloneNavbar.appendChild(controlsWrap);
  }

  // Inject into mobile drawer if present
  const mobileDrawer = document.querySelector('.mobile-nav-drawer');
  if (mobileDrawer && !mobileDrawer.querySelector('.mobile-nav-controls')) {
    const mobileControls = document.createElement('div');
    mobileControls.className = 'mobile-nav-controls';
    mobileControls.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;margin-bottom:1.25rem;border-bottom:1px solid var(--c-border);';
    mobileControls.innerHTML = `
      <span style="font-size:0.85rem;font-weight:600;color:var(--c-ink-muted);">Display &amp; Language:</span>
      <div class="nav-controls">${controlsHtml}</div>
    `;
    const mobileHeader = mobileDrawer.querySelector('.mobile-nav-header');
    if (mobileHeader && mobileHeader.nextSibling) {
      mobileDrawer.insertBefore(mobileControls, mobileHeader.nextSibling);
    }
  }

  // Helper function to sync all buttons on page
  const updateControlsUI = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const isRtl = document.documentElement.getAttribute('dir') === 'rtl';

    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
      btn.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    });

    document.querySelectorAll('.dir-toggle-btn').forEach(btn => {
      const ltrOpt = btn.querySelector('[data-dir="ltr"]');
      const rtlOpt = btn.querySelector('[data-dir="rtl"]');
      if (ltrOpt && rtlOpt) {
        ltrOpt.classList.toggle('active', !isRtl);
        rtlOpt.classList.toggle('active', isRtl);
      }
    });
  };

  updateControlsUI();

  // Attach event delegation for theme and RTL toggle buttons
  document.addEventListener('click', (e) => {
    // Theme Toggle Handler
    const themeBtn = e.target.closest('.theme-toggle-btn') || e.target.closest('#themeToggleBtn');
    if (themeBtn) {
      e.preventDefault();
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      try { localStorage.setItem('tcm_theme', nextTheme); } catch (err) {}
      updateControlsUI();
      if (typeof window.showToast === 'function') {
        window.showToast(`${nextTheme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'} enabled`);
      }
      return;
    }

    // Direction (LTR / RTL) Toggle Handler
    const dirBtn = e.target.closest('.dir-toggle-btn') || e.target.closest('#dirToggleBtn');
    if (dirBtn) {
      e.preventDefault();
      const clickedOpt = e.target.closest('.dir-opt');
      let nextDir;
      if (clickedOpt && clickedOpt.dataset.dir) {
        nextDir = clickedOpt.dataset.dir;
      } else {
        const current = document.documentElement.getAttribute('dir') || 'ltr';
        nextDir = current === 'rtl' ? 'ltr' : 'rtl';
      }
      document.documentElement.setAttribute('dir', nextDir);
      try { localStorage.setItem('tcm_direction', nextDir); } catch (err) {}
      updateControlsUI();
      if (typeof window.showToast === 'function') {
        window.showToast(`Layout set to ${nextDir.toUpperCase()}`);
      }
      return;
    }
  });
}

