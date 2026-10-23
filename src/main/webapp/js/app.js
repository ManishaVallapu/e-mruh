/**
 * e-mruh College E-Commerce
 * Vanilla JavaScript - Core App
 * Handles navigation toggling, cart drawer modal, quantity adjustments,
 * localStorage persistence (emruh_cart), and toast notifications.
 * Exposes window.emruhApp for interoperability with shop.html.
 */

(function () {
  'use strict';

  // Constants & LocalStorage Keys
  const STORAGE_KEY_CART = 'emruh_cart';

  // DOM Elements
  const mobileToggleBtn = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('navMenu');
  const cartBtn = document.getElementById('cartBtn');
  const cartCountEl = document.getElementById('cartCount');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartDrawer = document.getElementById('cartDrawer');
  const cartCloseBtn = document.getElementById('cartCloseBtn');
  const cartContinueBtn = document.getElementById('cartContinueBtn');
  const cartDrawerCount = document.getElementById('cartDrawerCount');
  const cartItemsList = document.getElementById('cartItemsList');
  const cartSubtotal = document.getElementById('cartSubtotal');
  const toastEl = document.getElementById('toast');
  const toastMsgEl = document.getElementById('toastMsg');

  let toastTimer = null;

  // Retrieve cart from localStorage
  function getCart() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CART);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.warn('Unable to read cart from localStorage', err);
      return [];
    }
  }

  // Save cart to localStorage
  function saveCart(cart) {
    try {
      localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(cart));
    } catch (err) {
      console.warn('Unable to save cart to localStorage', err);
    }
  }

  // Calculate cart metrics (total count, subtotal)
  function getCartSummary(cart) {
    return cart.reduce(
      (acc, item) => {
        const qty = parseInt(item.quantity, 10) || 1;
        const price = parseFloat(item.price) || 0;
        acc.totalItems += qty;
        acc.subtotal += price * qty;
        return acc;
      },
      { totalItems: 0, subtotal: 0 }
    );
  }

  // Update navbar cart badge & drawer contents
  function updateCartUI() {
    const cart = getCart();
    const summary = getCartSummary(cart);

    if (cartCountEl) {
      cartCountEl.textContent = summary.totalItems;
    }

    if (cartDrawerCount) {
      cartDrawerCount.textContent = `${summary.totalItems} item${summary.totalItems === 1 ? '' : 's'}`;
    }

    if (cartSubtotal) {
      cartSubtotal.innerHTML = `&#8377;${summary.subtotal.toLocaleString('en-IN')}`;
    }

    const checkoutBtn = document.getElementById('cartCheckoutBtn');
    if (checkoutBtn) {
      if (summary.totalItems === 0) {
        checkoutBtn.style.pointerEvents = 'none';
        checkoutBtn.style.opacity = '0.5';
        checkoutBtn.setAttribute('aria-disabled', 'true');
      } else {
        checkoutBtn.style.pointerEvents = '';
        checkoutBtn.style.opacity = '';
        checkoutBtn.removeAttribute('aria-disabled');
      }
    }

    renderCartItems(cart);
  }

  // Render items inside the cart drawer
  function renderCartItems(cart) {
    if (!cartItemsList) return;

    if (!cart || cart.length === 0) {
      cartItemsList.innerHTML = `
        <div class="cart-empty-state">
          <div class="cart-empty-icon">&#128722;</div>
          <h4>Your cart is empty</h4>
          <p>Explore college uniforms, lab coats, and course textbooks.</p>
        </div>
      `;
      return;
    }

    cartItemsList.innerHTML = cart
      .map((item) => {
        const qty = parseInt(item.quantity, 10) || 1;
        const price = parseFloat(item.price) || 0;
        const itemTotal = price * qty;
        return `
          <div class="cart-item" data-id="${item.id}">
            <div class="cart-item-info">
              <span class="cart-item-category">${escapeHtml(item.category || 'Item')}</span>
              <h5 class="cart-item-title">${escapeHtml(item.title)}</h5>
              <div class="cart-item-unit-price">&#8377;${price.toLocaleString('en-IN')} each</div>
              <div class="cart-item-controls">
                <div class="qty-control">
                  <button type="button" class="qty-btn" data-action="decrease-qty" data-id="${item.id}" aria-label="Decrease quantity">&minus;</button>
                  <span class="qty-number">${qty}</span>
                  <button type="button" class="qty-btn" data-action="increase-qty" data-id="${item.id}" aria-label="Increase quantity">&plus;</button>
                </div>
                <strong class="cart-item-subtotal">&#8377;${itemTotal.toLocaleString('en-IN')}</strong>
              </div>
            </div>
            <button type="button" class="cart-item-remove" data-action="remove-item" data-id="${item.id}" title="Remove item" aria-label="Remove ${escapeHtml(item.title)}">
              &times;
            </button>
          </div>
        `;
      })
      .join('');
  }

  // Escape HTML helper
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Cart Drawer open/close methods
  function openCartDrawer() {
    if (!cartDrawer || !cartOverlay) return;
    updateCartUI();
    cartDrawer.classList.add('active');
    cartOverlay.classList.add('active');
    cartDrawer.setAttribute('aria-hidden', 'false');
    cartOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeCartDrawer() {
    if (!cartDrawer || !cartOverlay) return;
    cartDrawer.classList.remove('active');
    cartOverlay.classList.remove('active');
    cartDrawer.setAttribute('aria-hidden', 'true');
    cartOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Display unobtrusive toast notification
  function showToast(message) {
    if (!toastEl || !toastMsgEl) return;

    toastMsgEl.textContent = message;
    toastEl.classList.add('show');

    if (toastTimer) {
      clearTimeout(toastTimer);
    }

    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 3200);
  }

  // Adjust product quantity
  function changeItemQuantity(id, delta) {
    const cart = getCart();
    const itemIndex = cart.findIndex((item) => item.id === id);

    if (itemIndex > -1) {
      const newQty = (cart[itemIndex].quantity || 1) + delta;
      if (newQty <= 0) {
        cart.splice(itemIndex, 1);
      } else {
        cart[itemIndex].quantity = newQty;
      }
      saveCart(cart);
      updateCartUI();
    }
  }

  // Remove product from cart
  function removeCartItem(id) {
    let cart = getCart();
    const itemToRemove = cart.find((item) => item.id === id);
    cart = cart.filter((item) => item.id !== id);
    saveCart(cart);
    updateCartUI();

    if (itemToRemove) {
      showToast(`Removed "${itemToRemove.title}"`);
    }
  }

  // Add item to cart and trigger badge & toast
  function addItemToCart(productId, title, price, category, quantity) {
    const qtyToAdd = Math.max(1, parseInt(quantity, 10) || 1);
    const cart = getCart();
    const existingIndex = cart.findIndex((item) => item.id === productId);

    if (existingIndex > -1) {
      cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + qtyToAdd;
    } else {
      cart.push({
        id: productId,
        title: title,
        price: parseFloat(price) || 0,
        category: category,
        quantity: qtyToAdd
      });
    }

    saveCart(cart);
    updateCartUI();
    showToast(`Added ${qtyToAdd > 1 ? qtyToAdd + 'x ' : ''}"${title}" to your cart!`);
  }

  // Setup Mobile Navigation toggle
  function setupMobileNav() {
    if (!mobileToggleBtn || !navMenu) return;

    mobileToggleBtn.addEventListener('click', function () {
      const isExpanded = navMenu.classList.toggle('active');
      mobileToggleBtn.setAttribute('aria-expanded', isExpanded);
    });

    document.addEventListener('click', function (e) {
      if (!navMenu.contains(e.target) && !mobileToggleBtn.contains(e.target)) {
        navMenu.classList.remove('active');
        mobileToggleBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Setup Cart Drawer Events
  function setupCartDrawer() {
    if (cartBtn) {
      cartBtn.addEventListener('click', function (e) {
        e.preventDefault();
        openCartDrawer();
      });
    }

    if (cartCloseBtn) {
      cartCloseBtn.addEventListener('click', closeCartDrawer);
    }

    if (cartContinueBtn) {
      cartContinueBtn.addEventListener('click', closeCartDrawer);
    }

    if (cartOverlay) {
      cartOverlay.addEventListener('click', closeCartDrawer);
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && cartDrawer && cartDrawer.classList.contains('active')) {
        closeCartDrawer();
      }
    });

    if (cartItemsList) {
      cartItemsList.addEventListener('click', function (e) {
        const target = e.target.closest('button');
        if (!target) return;

        const action = target.getAttribute('data-action');
        const id = target.getAttribute('data-id');
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
  }

  // Setup global event delegation for any buttons with data-action="add-to-cart"
  function setupCartButtons() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action="add-to-cart"]');
      if (!btn) return;

      e.preventDefault();
      const id = btn.getAttribute('data-id');
      const title = btn.getAttribute('data-title');
      const price = btn.getAttribute('data-price');
      const category = btn.getAttribute('data-category');

      if (id && title && price) {
        addItemToCart(id, title, price, category);
      }
    });
  }

  // Setup Auth Status & Profile Menu
  function setupAuthStatus() {
    const authContainer = document.getElementById('navAuthContainer');
    const menuLogin = document.getElementById('navMenuLoginLink');
    const menuRegister = document.getElementById('navMenuRegisterLink');

    fetch('/e-mruh/api/auth/me', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store'
    })
      .then(function (res) {
        if (!res.ok) {
          throw new Error('Not logged in');
        }
        return res.json();
      })
      .then(function (data) {
        if (data && data.authenticated && data.user) {
          const user = data.user;
          const fullName = user.full_name || 'Student';
          const email = user.email || '';
          const initial = fullName.trim().charAt(0).toUpperCase() || 'U';

          // Update Mobile / Primary nav links
          if (menuLogin) {
            menuLogin.textContent = `My Orders (${fullName.split(' ')[0]})`;
            menuLogin.href = 'my-orders.html';
            menuLogin.onclick = null;
          }
          if (menuRegister) {
            menuRegister.textContent = 'Logout';
            menuRegister.href = '#';
            menuRegister.style.color = '#ef4444';
            menuRegister.onclick = function (e) {
              e.preventDefault();
              performLogout();
            };
          }

          // Update Navbar action container with avatar & dropdown menu
          if (authContainer) {
            authContainer.innerHTML = `
              <div class="user-menu-wrapper" id="userMenuWrapper">
                <button type="button" class="user-menu-btn" id="userMenuBtn" aria-haspopup="true" aria-expanded="false" title="User Account">
                  <span class="user-avatar-icon">${escapeHtml(initial)}</span>
                  <span>${escapeHtml(fullName.split(' ')[0])}</span>
                  <span style="font-size: 0.7rem;">&#9662;</span>
                </button>
                <div class="user-dropdown-menu" id="userDropdownMenu" role="menu">
                  <div class="user-dropdown-header">
                    <div class="user-dropdown-name">${escapeHtml(fullName)}</div>
                    <div class="user-dropdown-email">${escapeHtml(email)}</div>
                  </div>
                  <a href="my-orders.html" class="user-dropdown-item" role="menuitem">
                    <span>&#128221;</span> My Orders
                  </a>
                  <a href="shop.html" class="user-dropdown-item" role="menuitem">
                    <span>&#128717;</span> Browse Catalog
                  </a>
                  <button type="button" class="user-dropdown-item logout-item" id="logoutActionBtn" role="menuitem">
                    <span>&#128682;</span> Logout
                  </button>
                </div>
              </div>
            `;

            const menuBtn = document.getElementById('userMenuBtn');
            const dropdown = document.getElementById('userDropdownMenu');
            const logoutBtn = document.getElementById('logoutActionBtn');

            if (menuBtn && dropdown) {
              menuBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                const isShown = dropdown.classList.toggle('show');
                menuBtn.setAttribute('aria-expanded', isShown);
              });

              document.addEventListener('click', function (e) {
                if (!authContainer.contains(e.target)) {
                  dropdown.classList.remove('show');
                  menuBtn.setAttribute('aria-expanded', 'false');
                }
              });
            }

            if (logoutBtn) {
              logoutBtn.addEventListener('click', function (e) {
                e.preventDefault();
                performLogout();
              });
            }
          }
        } else {
          renderUnauthenticatedNav();
        }
      })
      .catch(function () {
        renderUnauthenticatedNav();
      });
  }

  function renderUnauthenticatedNav() {
    const authContainer = document.getElementById('navAuthContainer');
    const menuLogin = document.getElementById('navMenuLoginLink');
    const menuRegister = document.getElementById('navMenuRegisterLink');

    if (authContainer) {
      authContainer.innerHTML = `
        <a href="login.html" class="nav-btn btn-secondary">Sign In</a>
      `;
    }
    if (menuLogin) {
      menuLogin.textContent = 'Login';
      menuLogin.href = 'login.html';
      menuLogin.onclick = null;
    }
    if (menuRegister) {
      menuRegister.textContent = 'Register';
      menuRegister.href = 'register.html';
      menuRegister.style.color = '';
      menuRegister.onclick = null;
    }
  }

  // Perform server-side Logout
  function performLogout() {
    fetch('/e-mruh/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin'
    })
      .then(function (res) {
        return res.json().catch(function () {
          return { status: 'SUCCESS' };
        });
      })
      .then(function () {
        showToast('Logged out successfully');
        renderUnauthenticatedNav();
        // Optional smooth reload or redirect
        setTimeout(function () {
          window.location.reload();
        }, 800);
      })
      .catch(function (err) {
        console.error('Logout failed:', err);
        showToast('Error during logout');
      });
  }

  // Initialize function
  function init() {
    setupMobileNav();
    setupCartDrawer();
    updateCartUI();
    setupCartButtons();
    setupAuthStatus();
  }

  // Expose public API for shop.html / future pages
  window.emruhApp = {
    getCart: getCart,
    addItemToCart: addItemToCart,
    openCartDrawer: openCartDrawer,
    closeCartDrawer: closeCartDrawer,
    updateCartUI: updateCartUI,
    showToast: showToast
  };

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
