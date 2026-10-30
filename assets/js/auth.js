/**
 * Harmony Spring TCM Clinic - Authentication Flow Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  initPasswordToggles();
  initLoginForm();
  initRegisterForm();
  initForgotPasswordForm();
  initResetPasswordForm();
  initDemoCredentials();
});

// Password visibility toggles
function initPasswordToggles() {
  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const wrap = btn.closest('.password-input-wrap');
      const input = wrap ? wrap.querySelector('input') : btn.previousElementSibling;
      if (input) {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
        btn.innerHTML = isPassword
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      }
    });
  });
}

// 1. Login Form
function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const submitBtn = document.getElementById('loginSubmitBtn');
  const errorAlert = document.getElementById('loginErrorAlert');

  // Clear error alert on input
  if (emailInput && errorAlert) {
    emailInput.addEventListener('input', () => hideError(errorAlert));
  }
  if (passwordInput && errorAlert) {
    passwordInput.addEventListener('input', () => hideError(errorAlert));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(errorAlert);

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Email validation
    if (!email) {
      showError(errorAlert, 'Please enter your email address.');
      emailInput.focus();
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      showError(errorAlert, 'Please enter a valid email address (e.g., name@example.com).');
      emailInput.focus();
      return;
    }

    // Password validation
    if (!password) {
      showError(errorAlert, 'Please enter your password.');
      passwordInput.focus();
      return;
    }

    if (password.length < 6) {
      showError(errorAlert, 'Password must be at least 6 characters long.');
      passwordInput.focus();
      return;
    }

    // Loading indicator & disable controls
    const originalBtnContent = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-spinner"></span> Authenticating...';
    emailInput.disabled = true;
    passwordInput.disabled = true;

    try {
      const res = await API.auth.login(email, password);
      showToast('Welcome back, ' + (res.user?.name || 'Patient') + '!', 'success');
      
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect') || 'dashboard.html';
      setTimeout(() => {
        window.location.href = redirect;
      }, 500);
    } catch (err) {
      showError(errorAlert, err.message || 'Login failed. Please verify credentials.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnContent;
      emailInput.disabled = false;
      passwordInput.disabled = false;
      passwordInput.focus();
    }
  });
}

// 2. Register Form
function initRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  const nameInput = document.getElementById('regName');
  const emailInput = document.getElementById('regEmail');
  const phoneInput = document.getElementById('regPhone');
  const passwordInput = document.getElementById('regPassword');
  const confirmPasswordInput = document.getElementById('regConfirmPassword');
  const termsCheckbox = document.getElementById('regTerms');
  const submitBtn = document.getElementById('registerSubmitBtn');
  const errorAlert = document.getElementById('registerErrorAlert');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!name || !email || !password) {
      showError(errorAlert, 'Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      showError(errorAlert, 'Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      showError(errorAlert, 'Passwords do not match. Please re-enter.');
      return;
    }

    if (termsCheckbox && !termsCheckbox.checked) {
      showError(errorAlert, 'Please agree to clinic privacy and patient terms.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Creating Patient Account...';
    hideError(errorAlert);

    try {
      const res = await API.auth.register({
        name,
        email,
        phone,
        password
      });

      showToast('Account successfully created! Welcome to Harmony Spring.', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
    } catch (err) {
      showError(errorAlert, err.message || 'Registration failed.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Create Patient Account';
    }
  });
}

// 3. Forgot Password
function initForgotPasswordForm() {
  const form = document.getElementById('forgotPasswordForm');
  if (!form) return;

  const emailInput = document.getElementById('forgotEmail');
  const submitBtn = document.getElementById('forgotSubmitBtn');
  const messageBox = document.getElementById('forgotMessage');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Sending Instructions...';

    try {
      const res = await API.auth.forgotPassword(email);
      messageBox.style.display = 'block';
      messageBox.className = 'alert alert-success';
      messageBox.innerHTML = `
        <strong>Reset link generated:</strong> ${res.message}<br/>
        ${res.resetToken ? `<div style="margin-top:0.6rem;font-size:0.85rem;background:#fff;padding:0.6rem;border-radius:4px;border:1px solid #d5e5db;">
          Demo Reset Code: <code>${res.resetToken}</code><br/>
          <a href="forgot-password.html?token=${res.resetToken}#reset" style="color:var(--c-jade-600);font-weight:600;display:inline-block;margin-top:4px;">
            Click here to enter new password now &rarr;
          </a>
        </div>` : ''}
      `;
    } catch (err) {
      messageBox.style.display = 'block';
      messageBox.className = 'alert alert-danger';
      messageBox.textContent = err.message || 'Error requesting password reset.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Send Reset Instructions';
    }
  });
}

// 4. Reset Password with Token
function initResetPasswordForm() {
  const resetSection = document.getElementById('resetPasswordSection');
  const form = document.getElementById('resetPasswordForm');
  if (!form || !resetSection) return;

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (token) {
    resetSection.style.display = 'block';
    const forgotSection = document.getElementById('forgotEmailSection');
    if (forgotSection) forgotSection.style.display = 'none';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPassword = document.getElementById('newPassword').value;
      const confirmNewPassword = document.getElementById('confirmNewPassword').value;
      const statusBox = document.getElementById('resetStatusBox');

      if (newPassword.length < 8) {
        showError(statusBox, 'Password must be at least 8 characters long.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        showError(statusBox, 'Passwords do not match.');
        return;
      }

      try {
        const res = await API.auth.resetPassword(token, newPassword);
        showToast(res.message, 'success');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1200);
      } catch (err) {
        showError(statusBox, err.message || 'Failed to reset password.');
      }
    });
  }
}

// Demo Credentials Autofill Helper
function initDemoCredentials() {
  const demoPatientBtn = document.getElementById('demoPatientFill');
  const demoDoctorBtn = document.getElementById('demoDoctorFill');

  if (demoPatientBtn) {
    demoPatientBtn.addEventListener('click', () => {
      const emailInput = document.getElementById('loginEmail');
      const passwordInput = document.getElementById('loginPassword');
      if (emailInput && passwordInput) {
        emailInput.value = 'sarah.chen@example.com';
        passwordInput.value = 'Patient@123';
        showToast('Filled credentials for Sarah Chen (Patient)', 'success');
      }
    });
  }

  if (demoDoctorBtn) {
    demoDoctorBtn.addEventListener('click', () => {
      const emailInput = document.getElementById('loginEmail');
      const passwordInput = document.getElementById('loginPassword');
      if (emailInput && passwordInput) {
        emailInput.value = 'dr.lin@example.com';
        passwordInput.value = 'Staff@123';
        showToast('Filled credentials for Dr. Meilin Chen (Staff)', 'success');
      }
    });
  }
}

function showError(elem, msg) {
  if (!elem) return;
  elem.textContent = msg;
  elem.style.display = 'block';
}

function hideError(elem) {
  if (!elem) return;
  elem.style.display = 'none';
}

// Social authentication handler (Google, Apple, Facebook, WeChat)
window.handleSocialAuth = async function(provider) {
  const submitBtn = document.getElementById('loginSubmitBtn') || document.getElementById('registerSubmitBtn');
  const originalText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="btn-spinner"></span> Connecting with ${provider}...`;
  }

  showToast(`Authenticating with ${provider}...`, 'info');

  try {
    // Authenticate demo patient session
    const res = await API.auth.login('sarah.chen@example.com', 'Patient@123');
    showToast(`Signed in with ${provider}! Welcome, ${res.user?.name || 'Sarah'}!`, 'success');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);
  } catch (err) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
    showToast(`Signed in with ${provider} (Demo Mode)`, 'success');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);
  }
};
