/**
 * e-mruh Checkout Page Logic
 * Reads cart items from emruh_cart, renders item totals, handles quantity adjustments,
 * performs client-side form validation, and submits live orders to /e-mruh/api/orders.
 */

(function () {
  'use strict';

  const STORAGE_KEY_CART = 'emruh_cart';

  const layoutContainer = document.getElementById('checkoutMainLayout');
  const demoAlert = document.getElementById('checkoutDemoAlert');
  const demoAlertMsg = document.getElementById('demoAlertMessage');

  // Helper: Retrieve cart
  function getCart() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CART);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('Could not read cart from localStorage', e);
      return [];
    }
  }

  // Helper: Save cart
  function saveCart(cart) {
    try {
      localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(cart));
    } catch (e) {
      console.warn('Could not save cart to localStorage', e);
    }
  }

  // Helper: Escape HTML
  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Calculate order totals
  function calculateTotals(cart) {
    return cart.reduce(
      (acc, item) => {
        const qty = parseInt(item.quantity, 10) || 1;
        const price = parseFloat(item.price) || 0;
        acc.itemCount += qty;
        acc.subtotal += price * qty;
        return acc;
      },
      { itemCount: 0, subtotal: 0 }
    );
  }

  // Render the checkout UI
  function renderCheckout() {
    if (!layoutContainer) return;

    const cart = getCart();

    // If cart is empty, render friendly empty state
    if (!cart || cart.length === 0) {
      layoutContainer.innerHTML = `
        <div class="checkout-empty-state">
          <div class="checkout-empty-icon">&#128722;</div>
          <h3>Your shopping bag is empty</h3>
          <p>You don't have any items in your cart to checkout. Browse our campus store for college uniforms, lab coats, and course textbooks.</p>
          <a href="shop.html" class="btn-primary" style="padding: 12px 26px; display: inline-flex; align-items: center; gap: 8px;">
            &larr; Return to Campus Shop
          </a>
        </div>
      `;
      return;
    }

    const { itemCount, subtotal } = calculateTotals(cart);

    layoutContainer.innerHTML = `
      <div class="checkout-grid">

        <!-- Column 1: Customer Details Form -->
        <section class="checkout-card" aria-labelledby="formHeading">
          <div class="checkout-card-header">
            <h2 id="formHeading" class="checkout-card-title">Campus Delivery Details</h2>
            <p class="checkout-card-subtitle">Please enter your student contact information and campus hostel/room address.</p>
          </div>

          <form id="checkoutForm" novalidate>
            <!-- Full Name -->
            <div class="form-group">
              <label for="custName" class="form-label">
                Full Name <span class="required-star">*</span>
              </label>
              <input type="text" id="custName" class="form-input" placeholder="e.g. Rahul Sharma" autocomplete="name" required>
              <div id="custNameError" class="form-error">Please enter your full name (minimum 2 characters).</div>
            </div>

            <!-- Contact Row: Phone & Email -->
            <div class="form-row">
              <div class="form-group">
                <label for="custPhone" class="form-label">
                  Mobile Number <span class="required-star">*</span>
                </label>
                <input type="tel" id="custPhone" class="form-input" placeholder="e.g. 9876543210" autocomplete="tel" required>
                <div id="custPhoneError" class="form-error">Please enter a valid 10-digit mobile number.</div>
              </div>

              <div class="form-group">
                <label for="custEmail" class="form-label">
                  Email Address <span class="required-star">*</span>
                </label>
                <input type="email" id="custEmail" class="form-input" placeholder="e.g. student@college.edu" autocomplete="email" required>
                <div id="custEmailError" class="form-error">Please enter a valid email address.</div>
              </div>
            </div>

            <!-- Campus Delivery Address -->
            <div class="form-group">
              <label for="custAddress" class="form-label">
                Campus Delivery Address / Hostel &amp; Room No. <span class="required-star">*</span>
              </label>
              <textarea id="custAddress" class="form-textarea" rows="3" placeholder="e.g. Room 304, North Campus Boys Hostel / Block B" required></textarea>
              <div id="custAddressError" class="form-error">Please provide your hostel name and room number (minimum 6 characters).</div>
              <div class="form-hint">&#128666; Campus couriers deliver directly to departmental gates and hostel receptions.</div>
            </div>

            <!-- Order Notes / Optional Roll Number -->
            <div class="form-group">
              <label for="custRoll" class="form-label">Student ID / Roll Number (Optional)</label>
              <input type="text" id="custRoll" class="form-input" placeholder="e.g. 24BCS1089">
            </div>

            <button type="submit" id="placeOrderBtn" class="btn-place-order">
              Place Order (&#8377;${subtotal.toLocaleString('en-IN')})
            </button>

            <div class="checkout-notice">
              <strong>Campus Guarantee:</strong> Orders placed before 4:00 PM are fulfilled directly to designated hostel wardens within 24 hours.
            </div>
          </form>
        </section>

        <!-- Column 2: Order Items & Subtotal Review -->
        <aside class="checkout-card" aria-labelledby="orderSummaryHeading">
          <div class="checkout-card-header">
            <h2 id="orderSummaryHeading" class="checkout-card-title">Order Summary</h2>
            <p class="checkout-card-subtitle">${itemCount} item${itemCount === 1 ? '' : 's'} in your order</p>
          </div>

          <!-- Items list -->
          <div class="checkout-items-list" id="checkoutItemsList">
            ${cart
              .map((item) => {
                const qty = parseInt(item.quantity, 10) || 1;
                const price = parseFloat(item.price) || 0;
                const lineTotal = price * qty;
                return `
                  <div class="checkout-item-row" data-id="${item.id}">
                    <div class="checkout-item-details">
                      <span class="checkout-item-category">${escapeHtml(item.category || 'Product')}</span>
                      <h4 class="checkout-item-title">${escapeHtml(item.title)}</h4>
                      <span class="checkout-item-unit-price">&#8377;${price.toLocaleString('en-IN')} each</span>

                      <!-- Inline Quantity Adjuster -->
                      <div class="checkout-item-qty-wrap">
                        <div class="qty-control" style="background-color: var(--color-bg);">
                          <button type="button" class="qty-btn" data-action="decrease-qty" data-id="${item.id}" aria-label="Decrease quantity">&minus;</button>
                          <span class="qty-number">${qty}</span>
                          <button type="button" class="qty-btn" data-action="increase-qty" data-id="${item.id}" aria-label="Increase quantity">&plus;</button>
                        </div>
                        <button type="button" class="checkout-item-remove-btn" data-action="remove-item" data-id="${item.id}">
                          Remove
                        </button>
                      </div>
                    </div>

                    <div class="checkout-item-subtotal">
                      &#8377;${lineTotal.toLocaleString('en-IN')}
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>

          <!-- Price breakdown summary -->
          <div class="checkout-summary-box">
            <div class="summary-line">
              <span>Items Subtotal</span>
              <span>&#8377;${subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div class="summary-line">
              <span>Hostel Delivery</span>
              <span style="color: var(--color-secondary-dark); font-weight: 600;">FREE</span>
            </div>
            <div class="summary-line summary-total">
              <span>Grand Total</span>
              <span>&#8377;${subtotal.toLocaleString('en-IN')}</span>
            </div>
            <p style="font-size: 0.78rem; color: var(--color-text-muted); margin-top: 10px;">
              Pay on Delivery (Cash or UPI) at your departmental reception desk.
            </p>
          </div>
        </aside>

      </div>
    `;

    bindCheckoutEvents();
    autofillUserIfLoggedIn();
  }

  // Pre-populate customer details if student is already logged in
  function autofillUserIfLoggedIn() {
    fetch('/e-mruh/api/auth/me', { cache: 'no-store', credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (data) {
        if (data && data.authenticated && data.user) {
          const nameInput = document.getElementById('custName');
          const emailInput = document.getElementById('custEmail');
          if (nameInput && !nameInput.value) {
            nameInput.value = data.user.full_name || '';
          }
          if (emailInput && !emailInput.value) {
            emailInput.value = data.user.email || '';
          }
        }
      })
      .catch(function () {});
  }

  // Adjust item quantity
  function changeItemQuantity(id, delta) {
    let cart = getCart();
    const itemIndex = cart.findIndex((item) => String(item.id) === String(id));

    if (itemIndex > -1) {
      const newQty = (cart[itemIndex].quantity || 1) + delta;
      if (newQty <= 0) {
        cart.splice(itemIndex, 1);
      } else {
        cart[itemIndex].quantity = newQty;
      }
      saveCart(cart);

      if (window.emruhApp && typeof window.emruhApp.updateCartUI === 'function') {
        window.emruhApp.updateCartUI();
      }
      renderCheckout();
    }
  }

  // Remove item
  function removeCartItem(id) {
    let cart = getCart();
    const itemToRemove = cart.find((item) => String(item.id) === String(id));
    cart = cart.filter((item) => String(item.id) !== String(id));
    saveCart(cart);

    if (window.emruhApp && typeof window.emruhApp.updateCartUI === 'function') {
      window.emruhApp.updateCartUI();
    }
    renderCheckout();

    if (itemToRemove && window.emruhApp && typeof window.emruhApp.showToast === 'function') {
      window.emruhApp.showToast(`Removed "${itemToRemove.title}"`);
    }
  }

  // Form Validation and submission handler
  function bindCheckoutEvents() {
    const itemsList = document.getElementById('checkoutItemsList');
    if (itemsList) {
      itemsList.addEventListener('click', function (e) {
        const btn = e.target.closest('button');
        if (!btn) return;

        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');
        if (!action || !id) return;

        if (action === 'increase-qty') {
          changeItemQuantity(id, 1);
        } else if (action === 'decrease-qty') {
          changeItemQuantity(id, -1);
        } else if (action === 'remove-item') {
          removeCartItem(id);
        }
      });
    }

    const form = document.getElementById('checkoutForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const nameInput = document.getElementById('custName');
      const phoneInput = document.getElementById('custPhone');
      const emailInput = document.getElementById('custEmail');
      const addressInput = document.getElementById('custAddress');
      const rollInput = document.getElementById('custRoll');
      const placeOrderBtn = document.getElementById('placeOrderBtn');

      const nameErr = document.getElementById('custNameError');
      const phoneErr = document.getElementById('custPhoneError');
      const emailErr = document.getElementById('custEmailError');
      const addressErr = document.getElementById('custAddressError');

      let isValid = true;

      // Validate Name
      const nameVal = nameInput.value.trim();
      if (!nameVal || nameVal.length < 2) {
        nameInput.classList.add('is-invalid');
        nameErr.classList.add('active');
        isValid = false;
      } else {
        nameInput.classList.remove('is-invalid');
        nameErr.classList.remove('active');
      }

      // Validate Phone (10 digits)
      const phoneVal = phoneInput.value.trim().replace(/\s+/g, '');
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(phoneVal)) {
        phoneInput.classList.add('is-invalid');
        phoneErr.classList.add('active');
        isValid = false;
      } else {
        phoneInput.classList.remove('is-invalid');
        phoneErr.classList.remove('active');
      }

      // Validate Email
      const emailVal = emailInput.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailVal)) {
        emailInput.classList.add('is-invalid');
        emailErr.classList.add('active');
        isValid = false;
      } else {
        emailInput.classList.remove('is-invalid');
        emailErr.classList.remove('active');
      }

      // Validate Address
      const addressVal = addressInput.value.trim();
      if (!addressVal || addressVal.length < 6) {
        addressInput.classList.add('is-invalid');
        addressErr.classList.add('active');
        isValid = false;
      } else {
        addressInput.classList.remove('is-invalid');
        addressErr.classList.remove('active');
      }

      if (!isValid) {
        const firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const cart = getCart();
      if (!cart || cart.length === 0) {
        alert('Your shopping bag is empty.');
        renderCheckout();
        return;
      }

      // Prevent duplicate submissions
      if (placeOrderBtn) {
        placeOrderBtn.disabled = true;
        placeOrderBtn.setAttribute('data-original-text', placeOrderBtn.innerHTML);
        placeOrderBtn.innerHTML = 'Processing Order...';
      }

      // Prepare request payload
      const orderPayload = {
        customerName: nameVal,
        customerPhone: phoneVal,
        customerEmail: emailVal,
        deliveryAddress: addressVal,
        rollNumber: rollInput ? rollInput.value.trim() : null,
        items: cart.map((item) => ({
          productId: parseInt(item.id, 10),
          quantity: parseInt(item.quantity, 10) || 1
        }))
      };

      fetch('/e-mruh/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8'
        },
        credentials: 'same-origin',
        body: JSON.stringify(orderPayload)
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, status: res.status, data: data };
          });
        })
        .then(function (result) {
          if (result.ok && result.data && result.data.status === 'SUCCESS') {
            const orderId = result.data.order_id;
            const finalTotal = parseFloat(result.data.total_amount) || 0;

            // Clear cart ONLY on backend success
            saveCart([]);
            if (window.emruhApp && typeof window.emruhApp.updateCartUI === 'function') {
              window.emruhApp.updateCartUI();
            }

            // Display genuine order confirmation banner
            if (demoAlert && demoAlertMsg) {
              demoAlert.className = 'checkout-demo-alert show';
              demoAlert.style.backgroundColor = '#f0fdf4';
              demoAlert.style.borderColor = '#86efac';

              const alertIcon = demoAlert.querySelector('.demo-alert-icon');
              if (alertIcon) alertIcon.innerHTML = '&#10003;';

              const titleEl = demoAlert.querySelector('.demo-alert-title');
              if (titleEl) {
                titleEl.textContent = 'Order Confirmed!';
                titleEl.style.color = '#166534';
              }

              const badgeEl = demoAlert.querySelector('.demo-alert-badge');
              if (badgeEl) {
                badgeEl.textContent = `Order #${orderId}`;
                badgeEl.style.backgroundColor = '#166534';
              }

              demoAlertMsg.innerHTML = `
                Thank you, <strong>${escapeHtml(nameVal)}</strong>! Your order <strong>#${orderId}</strong> has been saved directly to the database.
                <br><br>
                <strong>Total Amount:</strong> &#8377;${finalTotal.toLocaleString('en-IN')} (Pay on Delivery)
                <br>
                <strong>Campus Destination:</strong> ${escapeHtml(addressVal)}
                <br>
                <strong>Contact:</strong> ${escapeHtml(phoneVal)} (${escapeHtml(emailVal)})
                <br><br>
                Our campus courier will deliver your items directly to your hostel/department gate within 24 hours.
              `;

              demoAlert.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            // Re-render empty checkout state
            renderCheckout();
          } else {
            // Show failure and PRESERVE cart
            const errorMsg = (result.data && result.data.message) || 'Failed to place order. Please check availability.';
            if (demoAlert && demoAlertMsg) {
              demoAlert.className = 'checkout-demo-alert show';
              demoAlert.style.backgroundColor = '#fef2f2';
              demoAlert.style.borderColor = '#fca5a5';

              const alertIcon = demoAlert.querySelector('.demo-alert-icon');
              if (alertIcon) alertIcon.innerHTML = '&#9888;';

              const titleEl = demoAlert.querySelector('.demo-alert-title');
              if (titleEl) {
                titleEl.textContent = 'Order Submission Failed';
                titleEl.style.color = '#991b1b';
              }

              const badgeEl = demoAlert.querySelector('.demo-alert-badge');
              if (badgeEl) {
                badgeEl.textContent = 'Please Retry';
                badgeEl.style.backgroundColor = '#991b1b';
              }

              demoAlertMsg.innerHTML = `
                <strong>Notice:</strong> ${escapeHtml(errorMsg)}
                <br><br>
                Your cart items have been preserved. You can adjust quantities or retry placing the order.
              `;

              demoAlert.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        })
        .catch(function (err) {
          console.error('Order submission request failed:', err);
          if (demoAlert && demoAlertMsg) {
            demoAlert.className = 'checkout-demo-alert show';
            demoAlert.style.backgroundColor = '#fef2f2';
            demoAlert.style.borderColor = '#fca5a5';

            const titleEl = demoAlert.querySelector('.demo-alert-title');
            if (titleEl) {
              titleEl.textContent = 'Connection Error';
              titleEl.style.color = '#991b1b';
            }

            demoAlertMsg.innerHTML = `
              Could not reach the order service: ${escapeHtml(err.message)}. Please verify your network and server status. Your cart items have been saved.
            `;
            demoAlert.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        })
        .finally(function () {
          if (placeOrderBtn) {
            placeOrderBtn.disabled = false;
            placeOrderBtn.innerHTML = placeOrderBtn.getAttribute('data-original-text') || 'Place Order';
          }
        });
    });

    // Real-time clearance of invalid state on input
    ['custName', 'custPhone', 'custEmail', 'custAddress'].forEach((id) => {
      const input = document.getElementById(id);
      const err = document.getElementById(id + 'Error');
      if (input && err) {
        input.addEventListener('input', function () {
          if (input.classList.contains('is-invalid')) {
            input.classList.remove('is-invalid');
            err.classList.remove('active');
          }
        });
      }
    });
  }

  // Initialization
  function init() {
    renderCheckout();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
