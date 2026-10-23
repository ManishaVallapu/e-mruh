/**
 * e-mruh Authentication Pages Logic
 * Handles client-side validation for login and registration forms,
 * password visibility toggling, async API submission to Java Servlets,
 * duplicate submission protection, and user feedback banners.
 */

(function () {
  'use strict';

  // Helper to toggle password visibility
  function setupPasswordToggle(inputId, toggleBtnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(toggleBtnId);

    if (!input || !btn) return;

    btn.addEventListener('click', function () {
      const isPassword = input.getAttribute('type') === 'password';
      input.setAttribute('type', isPassword ? 'text' : 'password');
      btn.textContent = isPassword ? 'Hide' : 'Show';
      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
  }

  // Email format check
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  // 10-digit Indian mobile format check (starts with 6-9)
  function isValidMobile(mobile) {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(mobile.trim().replace(/\s+/g, ''));
  }

  // Escape HTML helper
  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Display message in notification banner
  function showBanner(bannerEl, messageEl, isSuccess, titleText, htmlContent) {
    if (!bannerEl || !messageEl) return;

    bannerEl.className = 'auth-demo-banner show';
    if (!isSuccess) {
      bannerEl.style.backgroundColor = '#fef2f2';
      bannerEl.style.borderColor = '#fca5a5';
      bannerEl.style.color = '#991b1b';
    } else {
      bannerEl.style.backgroundColor = '#f0fdf4';
      bannerEl.style.borderColor = '#86efac';
      bannerEl.style.color = '#166534';
    }

    const titleEl = bannerEl.querySelector('.auth-demo-title');
    if (titleEl) {
      titleEl.innerHTML = isSuccess ? `&#10003; ${escapeHtml(titleText)}` : `&#9888; ${escapeHtml(titleText)}`;
      if (!isSuccess) {
        titleEl.style.color = '#b91c1c';
      } else {
        titleEl.style.color = '#15803d';
      }
    }

    messageEl.innerHTML = htmlContent;
    bannerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Setup Login Form Validation and API Submission
  function setupLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    setupPasswordToggle('loginPassword', 'togglePasswordBtn');

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const emailError = document.getElementById('loginEmailError');
    const passwordError = document.getElementById('loginPasswordError');
    const demoBanner = document.getElementById('loginDemoBanner');
    const demoMessage = document.getElementById('loginDemoMessage');
    const submitBtn = form.querySelector('button[type="submit"]');

    // Check URL parameters for registration notice or logout notice
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('registered') === 'true') {
        showBanner(
          demoBanner,
          demoMessage,
          true,
          'Account Created Successfully',
          'Your account has been registered in the database. Please sign in below.'
        );
      }
    } catch (e) {
      // Ignore URL parsing errors
    }

    // Real-time clearance of invalid state on input
    emailInput.addEventListener('input', function () {
      if (emailInput.classList.contains('is-invalid')) {
        emailInput.classList.remove('is-invalid');
        emailError.classList.remove('active');
      }
    });

    passwordInput.addEventListener('input', function () {
      if (passwordInput.classList.contains('is-invalid')) {
        passwordInput.classList.remove('is-invalid');
        passwordError.classList.remove('active');
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      let isValid = true;
      const emailVal = emailInput.value.trim();
      const passVal = passwordInput.value;

      // Validate email
      if (!emailVal || !isValidEmail(emailVal)) {
        emailInput.classList.add('is-invalid');
        emailError.classList.add('active');
        isValid = false;
      } else {
        emailInput.classList.remove('is-invalid');
        emailError.classList.remove('active');
      }

      // Validate password
      if (!passVal) {
        passwordInput.classList.add('is-invalid');
        passwordError.classList.add('active');
        isValid = false;
      } else {
        passwordInput.classList.remove('is-invalid');
        passwordError.classList.remove('active');
      }

      if (!isValid) {
        const firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Prevent duplicate submissions
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute('data-original-text', submitBtn.innerHTML);
        submitBtn.innerHTML = 'Signing In...';
      }

      const params = new URLSearchParams();
      params.append('email', emailVal);
      params.append('password', passVal);

      fetch('/e-mruh/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: params.toString()
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, status: res.status, data: data };
          });
        })
        .then(function (result) {
          if (result.ok && result.data && result.data.status === 'SUCCESS') {
            const userName = result.data.user ? result.data.user.full_name : emailVal;
            showBanner(
              demoBanner,
              demoMessage,
              true,
              'Login Successful',
              `Welcome back, <strong>${escapeHtml(userName)}</strong>! Redirecting to homepage...`
            );
            form.reset();
            // Redirect to homepage on successful login as required
            setTimeout(function () {
              window.location.href = 'index.html';
            }, 1200);
          } else {
            // On failure, remain on login page and display actual server error
            const errMsg = (result.data && result.data.message) || 'Invalid email or password.';
            showBanner(demoBanner, demoMessage, false, 'Authentication Failed', escapeHtml(errMsg));
          }
        })
        .catch(function (err) {
          console.error('Login request failed:', err);
          showBanner(
            demoBanner,
            demoMessage,
            false,
            'Connection Error',
            'Unable to reach login service. Please check that Tomcat and MySQL are running.'
          );
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = submitBtn.getAttribute('data-original-text') || 'Sign In &rarr;';
          }
        });
    });
  }

  // Setup Registration Form Validation and API Submission
  function setupRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    setupPasswordToggle('regPassword', 'toggleRegPasswordBtn');
    setupPasswordToggle('regConfirmPassword', 'toggleConfirmPasswordBtn');

    const nameInput = document.getElementById('regName');
    const rollInput = document.getElementById('regRoll');
    const emailInput = document.getElementById('regEmail');
    const mobileInput = document.getElementById('regMobile');
    const passInput = document.getElementById('regPassword');
    const confirmInput = document.getElementById('regConfirmPassword');

    const nameError = document.getElementById('regNameError');
    const rollError = document.getElementById('regRollError');
    const emailError = document.getElementById('regEmailError');
    const mobileError = document.getElementById('regMobileError');
    const passError = document.getElementById('regPasswordError');
    const confirmError = document.getElementById('regConfirmPasswordError');

    const demoBanner = document.getElementById('registerDemoBanner');
    const demoMessage = document.getElementById('registerDemoMessage');
    const submitBtn = form.querySelector('button[type="submit"]');

    const fields = [
      { input: nameInput, error: nameError },
      { input: rollInput, error: rollError },
      { input: emailInput, error: emailError },
      { input: mobileInput, error: mobileError },
      { input: passInput, error: passError },
      { input: confirmInput, error: confirmError }
    ];

    fields.forEach(({ input, error }) => {
      input.addEventListener('input', function () {
        if (input.classList.contains('is-invalid')) {
          input.classList.remove('is-invalid');
          error.classList.remove('active');
        }
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      let isValid = true;

      // Full Name
      const nameVal = nameInput.value.trim();
      if (!nameVal || nameVal.length < 2) {
        nameInput.classList.add('is-invalid');
        nameError.classList.add('active');
        isValid = false;
      } else {
        nameInput.classList.remove('is-invalid');
        nameError.classList.remove('active');
      }

      // Roll Number
      const rollVal = rollInput.value.trim();
      if (!rollVal) {
        rollInput.classList.add('is-invalid');
        rollError.classList.add('active');
        isValid = false;
      } else {
        rollInput.classList.remove('is-invalid');
        rollError.classList.remove('active');
      }

      // Email
      const emailVal = emailInput.value.trim();
      if (!emailVal || !isValidEmail(emailVal)) {
        emailInput.classList.add('is-invalid');
        emailError.classList.add('active');
        isValid = false;
      } else {
        emailInput.classList.remove('is-invalid');
        emailError.classList.remove('active');
      }

      // Mobile
      const mobileVal = mobileInput.value.trim();
      if (!mobileVal || !isValidMobile(mobileVal)) {
        mobileInput.classList.add('is-invalid');
        mobileError.classList.add('active');
        isValid = false;
      } else {
        mobileInput.classList.remove('is-invalid');
        mobileError.classList.remove('active');
      }

      // Password length (minimum 6 characters)
      const passVal = passInput.value;
      if (!passVal || passVal.length < 6) {
        passInput.classList.add('is-invalid');
        passError.classList.add('active');
        isValid = false;
      } else {
        passInput.classList.remove('is-invalid');
        passError.classList.remove('active');
      }

      // Confirm Password match
      const confirmVal = confirmInput.value;
      if (!confirmVal || confirmVal !== passVal) {
        confirmInput.classList.add('is-invalid');
        confirmError.classList.add('active');
        isValid = false;
      } else {
        confirmInput.classList.remove('is-invalid');
        confirmError.classList.remove('active');
      }

      if (!isValid) {
        const firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Prevent duplicate submissions
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute('data-original-text', submitBtn.innerHTML);
        submitBtn.innerHTML = 'Creating Account...';
      }

      const params = new URLSearchParams();
      params.append('fullName', nameVal);
      params.append('rollNumber', rollVal);
      params.append('email', emailVal);
      params.append('mobileNumber', mobileVal);
      params.append('password', passVal);
      params.append('confirmPassword', confirmVal);

      fetch('/e-mruh/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: params.toString()
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, status: res.status, data: data };
          });
        })
        .then(function (result) {
          if (result.ok && result.data && result.data.status === 'SUCCESS') {
            const successMsg = result.data.message || 'Registration successful! Redirecting to login...';
            showBanner(
              demoBanner,
              demoMessage,
              true,
              'Account Created Successfully!',
              `${escapeHtml(successMsg)} Redirecting to sign in page...`
            );
            form.reset();
            // Redirect to login page on successful registration as required
            setTimeout(function () {
              window.location.href = 'login.html?registered=true';
            }, 1200);
          } else {
            // Display actual server error (e.g. duplicate email/roll number)
            const errMsg = (result.data && result.data.message) || 'Registration could not be completed.';
            showBanner(demoBanner, demoMessage, false, 'Registration Failed', escapeHtml(errMsg));
          }
        })
        .catch(function (err) {
          console.error('Registration request failed:', err);
          showBanner(
            demoBanner,
            demoMessage,
            false,
            'Connection Error',
            'Unable to reach registration service. Please verify your server status.'
          );
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = submitBtn.getAttribute('data-original-text') || 'Complete Registration &rarr;';
          }
        });
    });
  }

  // Init
  function init() {
    setupLoginForm();
    setupRegisterForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
