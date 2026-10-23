/**
 * e-mruh Product Details Page Logic
 * Reads the ?id= parameter, queries /e-mruh/api/products to locate the product
 * by its database product_id, renders detailed view, handles quantity changes,
 * and integrates with emruhApp cart.
 */

(function () {
  'use strict';

  const container = document.getElementById('productDetailsContainer');
  const breadcrumbCategory = document.getElementById('breadcrumbCategory');
  const breadcrumbTitle = document.getElementById('breadcrumbTitle');

  // Category badge mapping for consistent campus styling
  const CATEGORY_META = {
    'uniforms': { badge: 'Mandatory Wear', badgeClass: 'tag-uniform', icon: '\uD83D\uDC54', artLabel: 'Official Uniform' },
    'lab coats': { badge: 'Lab Mandatory', badgeClass: 'tag-lab', icon: '\uD83E\uDDEA', artLabel: 'Lab Wear & Apron' },
    'textbooks': { badge: 'Course Textbook', badgeClass: 'tag-study', icon: '\uD83D\uDCD8', artLabel: 'Academic Book' },
    'stationery': { badge: 'Campus Gear', badgeClass: 'tag-study', icon: '\uD83D\uDCDD', artLabel: 'Study Stationery' }
  };

  function getCategoryMeta(category) {
    if (!category) {
      return { badge: 'Campus Essential', badgeClass: 'tag-uniform', icon: '\uD83D\uDCE6', artLabel: 'Product' };
    }
    const key = category.toLowerCase().trim();
    return CATEGORY_META[key] || {
      badge: 'Campus Essential',
      badgeClass: 'tag-uniform',
      icon: '\uD83D\uDCE6',
      artLabel: category
    };
  }

  // Helper to escape HTML
  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Get product by ID from query string
  function getProductIdFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('id');
    } catch (e) {
      return null;
    }
  }

  // Render Loading State
  function renderLoading() {
    if (!container) return;
    container.innerHTML = `
      <div class="not-found-container" style="border: 1px dashed var(--color-border); padding: 60px 20px;">
        <div class="not-found-icon" style="animation: spin 1.4s linear infinite; display: inline-block;">&#9696;</div>
        <h2 class="not-found-title">Loading Product Details...</h2>
        <p class="not-found-desc">Fetching specifications and inventory status from the MySQL database.</p>
      </div>
    `;
  }

  // Render 404 / Missing Product State
  function renderNotFound(invalidId, customMessage) {
    document.title = 'Product Not Found | e-mruh Campus Store';
    if (breadcrumbCategory) breadcrumbCategory.textContent = 'Shop';
    if (breadcrumbTitle) breadcrumbTitle.textContent = 'Product Not Found';

    if (!container) return;
    container.innerHTML = `
      <div class="not-found-container">
        <div class="not-found-icon">&#128269;</div>
        <h2 class="not-found-title">Product Not Found</h2>
        <p class="not-found-desc">
          ${customMessage ? escapeHtml(customMessage) : (invalidId ? `We couldn't locate any product with code <strong>"${escapeHtml(invalidId)}"</strong>.` : 'No product was specified in your request.')}
          It might have been moved or removed from this semester's college catalog.
        </p>
        <a href="shop.html" class="btn-primary" style="padding: 12px 24px; display: inline-flex; align-items: center; gap: 8px;">
          &larr; Return to Campus Shop
        </a>
      </div>
    `;
  }

  // Render Product Details View
  function renderProductDetails(product) {
    const productName = product.name || product.title;
    const productId = product.product_id || product.id;
    const priceNum = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;
    const stockQty = typeof product.stock_quantity === 'number' ? product.stock_quantity : 0;
    const inStock = stockQty > 0;
    const meta = getCategoryMeta(product.category);

    document.title = `${productName} | e-mruh Campus Store`;

    // Update breadcrumbs
    if (breadcrumbCategory) {
      breadcrumbCategory.innerHTML = `<a href="shop.html?category=${encodeURIComponent((product.category || '').toLowerCase())}">${escapeHtml(product.category)}</a>`;
    }
    if (breadcrumbTitle) {
      breadcrumbTitle.textContent = productName;
    }

    if (!container) return;

    // Check availability text
    const availabilityText = inStock ? `In Stock (${stockQty} units available)` : 'Out of Stock';
    const availabilityClass = inStock ? 'status-in-stock' : 'status-out-stock';

    // Image with graceful fallback
    const imageArtworkHtml = product.image_path
      ? `
        <img src="${escapeHtml(product.image_path)}"
             alt="${escapeHtml(productName)}"
             style="max-width: 100%; max-height: 100%; object-fit: contain;"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="product-art-preview" style="display: none;">
          <span class="details-art-icon">${meta.icon}</span>
          <span class="details-art-label">${escapeHtml(meta.artLabel)}</span>
        </div>
      `
      : `
        <div class="product-art-preview">
          <span class="details-art-icon">${meta.icon}</span>
          <span class="details-art-label">${escapeHtml(meta.artLabel)}</span>
        </div>
      `;

    container.innerHTML = `
      <article class="product-details-grid">
        <!-- Visual Column -->
        <div class="details-image-container">
          <div class="details-image-box">
            <span class="details-badge-pill ${meta.badgeClass}">${escapeHtml(meta.badge)}</span>
            ${imageArtworkHtml}
          </div>
          <div style="font-size: 0.82rem; color: var(--color-text-muted); text-align: center;">
            &#128269; Guaranteed official campus department standard &amp; certified material
          </div>
        </div>

        <!-- Info Column -->
        <div class="details-info">
          <span class="details-category">${escapeHtml(product.category)}</span>
          <h1 class="details-title">${escapeHtml(productName)}</h1>

          <div class="details-price-row">
            <span class="details-price">&#8377;${priceNum.toLocaleString('en-IN')}</span>
          </div>

          <p class="details-desc">
            ${escapeHtml(product.description || 'Official college curriculum item inspected and compliant with semester academic and dress guidelines.')}
          </p>

          <!-- Specifications & Meta Grid -->
          <div class="details-meta-grid">
            <div class="meta-item">
              <span class="meta-item-label">Availability</span>
              <span class="meta-item-value ${availabilityClass}">
                &#9679; ${availabilityText}
              </span>
            </div>
            <div class="meta-item">
              <span class="meta-item-label">Hostel Delivery</span>
              <span class="meta-item-value">Within 24 Hours</span>
            </div>
            <div class="meta-item">
              <span class="meta-item-label">Item Code</span>
              <span class="meta-item-value" style="font-family: monospace;">#${escapeHtml(String(productId).toUpperCase())}</span>
            </div>
            <div class="meta-item">
              <span class="meta-item-label">Department</span>
              <span class="meta-item-value">${escapeHtml(product.category)}</span>
            </div>
          </div>

          <!-- Purchase Controls -->
          <div class="details-actions-wrap">
            <div class="details-qty-row">
              <label for="detailQtyInput" class="details-qty-label">Quantity:</label>
              <div class="details-qty-box">
                <button type="button" id="detailQtyMinus" class="qty-btn" aria-label="Decrease quantity" ${!inStock ? 'disabled' : ''}>&minus;</button>
                <input type="number" id="detailQtyInput" class="details-qty-input" value="1" min="1" max="${stockQty > 0 ? stockQty : 1}" ${!inStock ? 'disabled' : ''}>
                <button type="button" id="detailQtyPlus" class="qty-btn" aria-label="Increase quantity" ${!inStock ? 'disabled' : ''}>&plus;</button>
              </div>
            </div>

            <div class="details-btn-group">
              ${
                inStock
                  ? `<button type="button" id="detailAddCartBtn" class="btn-primary details-btn-cart">
                       Add to Shopping Bag
                     </button>`
                  : `<button type="button" disabled class="btn-primary details-btn-cart" style="opacity: 0.6; cursor: not-allowed;">
                       Currently Out of Stock
                     </button>`
              }
              <a href="shop.html" class="btn-secondary" style="padding: 12px 20px; text-align: center;">
                Browse Other Items
              </a>
            </div>
          </div>
        </div>
      </article>
    `;

    // Quantity controls and Add to Cart event binding
    const qtyInput = document.getElementById('detailQtyInput');
    const minusBtn = document.getElementById('detailQtyMinus');
    const plusBtn = document.getElementById('detailQtyPlus');
    const addBtn = document.getElementById('detailAddCartBtn');

    if (qtyInput && minusBtn && plusBtn) {
      minusBtn.addEventListener('click', function () {
        const val = parseInt(qtyInput.value, 10) || 1;
        if (val > 1) {
          qtyInput.value = val - 1;
        }
      });

      plusBtn.addEventListener('click', function () {
        const val = parseInt(qtyInput.value, 10) || 1;
        const maxVal = stockQty > 0 ? stockQty : 99;
        if (val < maxVal) {
          qtyInput.value = val + 1;
        }
      });
    }

    if (addBtn && qtyInput && inStock) {
      addBtn.addEventListener('click', function (e) {
        e.preventDefault();
        const quantity = parseInt(qtyInput.value, 10) || 1;

        if (window.emruhApp && typeof window.emruhApp.addItemToCart === 'function') {
          window.emruhApp.addItemToCart(
            productId,
            productName,
            priceNum,
            product.category,
            quantity
          );
        }
      });
    }
  }

  // Fetch product from live API
  function loadProductDetails(requestedId) {
    renderLoading();

    fetch('/e-mruh/api/products', { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) {
          throw new Error(`Database service returned HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(function (data) {
        if (data && data.status === 'SUCCESS' && Array.isArray(data.products)) {
          const cleanId = String(requestedId).trim().toLowerCase();
          const match = data.products.find(
            (p) => String(p.product_id).toLowerCase() === cleanId
          );

          if (match) {
            renderProductDetails(match);
          } else {
            // Also check mock data fallback if user navigated from legacy link
            if (Array.isArray(window.EMRUH_PRODUCTS)) {
              const mockMatch = window.EMRUH_PRODUCTS.find(
                (p) => String(p.id).toLowerCase() === cleanId
              );
              if (mockMatch) {
                renderProductDetails(mockMatch);
                return;
              }
            }
            renderNotFound(requestedId);
          }
        } else {
          throw new Error((data && data.message) || 'Unexpected data format received.');
        }
      })
      .catch(function (err) {
        console.error('Failed to load product details:', err);
        renderNotFound(requestedId, `Unable to reach campus inventory database (${err.message}).`);
      });
  }

  // Initialization
  function init() {
    const id = getProductIdFromUrl();
    if (!id) {
      renderNotFound(null);
      return;
    }

    loadProductDetails(id);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
