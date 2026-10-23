/**
 * e-mruh Shop Page Logic
 * Fetches real-time catalog from /e-mruh/api/products,
 * handles search, category filtering, price sorting,
 * loading/error states, and dynamic product rendering.
 */

(function () {
  'use strict';

  // State
  let products = [];
  let currentCategory = 'all';
  let searchQuery = '';
  let currentSort = 'default';
  let isLoading = true;
  let fetchError = null;

  // DOM Elements
  const shopGrid = document.getElementById('shopProductsGrid');
  const searchInput = document.getElementById('shopSearchInput');
  const sortSelect = document.getElementById('shopSortSelect');
  const categoryPills = document.querySelectorAll('[data-filter-category]');
  const resultCountEl = document.getElementById('shopResultCount');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');

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

  // Filter and sort catalog
  function getFilteredProducts() {
    let list = [...products];

    // Filter by Category
    if (currentCategory && currentCategory !== 'all') {
      list = list.filter((item) => (item.category || '').toLowerCase() === currentCategory.toLowerCase());
    }

    // Filter by Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          (item.name && item.name.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q))
      );
    }

    // Sort
    if (currentSort === 'price-low-high') {
      list.sort((a, b) => a.price - b.price);
    } else if (currentSort === 'price-high-low') {
      list.sort((a, b) => b.price - a.price);
    }

    return list;
  }

  // Render product cards into the grid
  function renderProducts() {
    if (!shopGrid) return;

    // Loading State
    if (isLoading) {
      if (resultCountEl) {
        resultCountEl.textContent = 'Loading products from campus database...';
      }
      shopGrid.innerHTML = `
        <div class="shop-empty-state" style="padding: 50px 20px;">
          <div class="shop-empty-icon" style="animation: spin 1.4s linear infinite; display: inline-block;">&#9696;</div>
          <h3>Connecting to Campus Inventory...</h3>
          <p>Retrieving available uniforms, lab coats, and textbooks from the MySQL database.</p>
        </div>
      `;
      return;
    }

    // Error State (Network or Server Failure) - Does NOT fall back silently
    if (fetchError) {
      if (resultCountEl) {
        resultCountEl.textContent = 'Failed to load catalog';
      }
      shopGrid.innerHTML = `
        <div class="shop-empty-state" style="border-color: #ef4444;">
          <div class="shop-empty-icon" style="color: #ef4444;">&#9888;</div>
          <h3>Unable to Load Products</h3>
          <p>${escapeHtml(fetchError)}</p>
          <button type="button" id="retryFetchBtn" class="btn-primary" style="margin-top: 16px; padding: 10px 24px;">
            Retry Connection
          </button>
        </div>
      `;
      const retryBtn = document.getElementById('retryFetchBtn');
      if (retryBtn) {
        retryBtn.addEventListener('click', loadProductsFromApi);
      }
      return;
    }

    const filtered = getFilteredProducts();

    if (resultCountEl) {
      resultCountEl.textContent = `Showing ${filtered.length} of ${products.length} products`;
    }

    // Empty Search / Filter State
    if (filtered.length === 0) {
      shopGrid.innerHTML = `
        <div class="shop-empty-state">
          <div class="shop-empty-icon">&#128269;</div>
          <h3>No matching college essentials found</h3>
          <p>Try searching for a different term (like "uniform", "lab coat", "math", or "drafter") or select another department category.</p>
          <button type="button" id="resetFiltersInnerBtn" class="btn-primary" style="margin-top: 14px; padding: 10px 20px;">
            Reset All Filters
          </button>
        </div>
      `;
      const innerReset = document.getElementById('resetFiltersInnerBtn');
      if (innerReset) {
        innerReset.addEventListener('click', resetFilters);
      }
      return;
    }

    // Render cards
    shopGrid.innerHTML = filtered
      .map((item) => {
        const productId = item.product_id;
        const detailsUrl = `product-details.html?id=${encodeURIComponent(productId)}`;
        const meta = getCategoryMeta(item.category);
        const inStock = item.stock_quantity > 0;
        const priceNum = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;

        // Visual presentation: If image file exists and is valid, load with onerror fallback to visual icon
        const imageMarkup = item.image_path
          ? `
            <img src="${escapeHtml(item.image_path)}"
                 alt="${escapeHtml(item.name)}"
                 loading="lazy"
                 style="max-width: 100%; max-height: 100%; object-fit: contain;"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="product-art-preview" style="display: none;">
              <span class="product-art-icon">${meta.icon}</span>
              <span class="product-art-label">${escapeHtml(meta.artLabel)}</span>
            </div>
          `
          : `
            <div class="product-art-preview">
              <span class="product-art-icon">${meta.icon}</span>
              <span class="product-art-label">${escapeHtml(meta.artLabel)}</span>
            </div>
          `;

        return `
          <article class="product-card">
            <span class="product-card-badge ${meta.badgeClass}">${escapeHtml(meta.badge)}</span>
            <a href="${detailsUrl}" class="product-card-link" aria-label="View details for ${escapeHtml(item.name)}">
              <div class="product-image-box">
                ${imageMarkup}
              </div>
            </a>
            <div class="product-content">
              <span class="product-category-label">${escapeHtml(item.category)}</span>
              <h3 class="product-title">
                <a href="${detailsUrl}" class="product-title-link">${escapeHtml(item.name)}</a>
              </h3>
              <p class="product-specs">${escapeHtml(item.description || '')}</p>
              <div class="product-footer">
                <div class="product-price">
                  &#8377;${priceNum.toLocaleString('en-IN')}
                </div>
                ${
                  inStock
                    ? `<button type="button" class="btn-add-cart" data-action="add-to-cart" data-id="${productId}" data-title="${escapeHtml(item.name)}" data-price="${priceNum}" data-category="${escapeHtml(item.category)}">
                         Add to Cart
                       </button>`
                    : `<button type="button" class="btn-add-cart" disabled style="opacity: 0.6; cursor: not-allowed;">
                         Out of Stock
                       </button>`
                }
              </div>
            </div>
          </article>
        `;
      })
      .join('');
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

  // Reset all filters
  function resetFilters() {
    currentCategory = 'all';
    searchQuery = '';
    currentSort = 'default';

    if (searchInput) searchInput.value = '';
    if (sortSelect) sortSelect.value = 'default';

    categoryPills.forEach((pill) => {
      pill.classList.toggle('active', pill.getAttribute('data-filter-category') === 'all');
    });

    renderProducts();
  }

  // Check URL parameters (e.g. ?category=uniforms)
  function parseUrlParams() {
    try {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('category');
      if (cat) {
        currentCategory = cat.toLowerCase();
        categoryPills.forEach((pill) => {
          pill.classList.toggle(
            'active',
            pill.getAttribute('data-filter-category').toLowerCase() === currentCategory
          );
        });
      }
    } catch (e) {
      // Ignore URL parsing errors
    }
  }

  // Fetch real products from Java Servlet API
  function loadProductsFromApi() {
    isLoading = true;
    fetchError = null;
    renderProducts();

    const apiUrl = '/e-mruh/api/products';

    fetch(apiUrl, { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status} (${response.statusText || 'Error'})`);
        }
        return response.json();
      })
      .then(function (data) {
        if (data && data.status === 'SUCCESS' && Array.isArray(data.products)) {
          products = data.products;
          isLoading = false;
          fetchError = null;
          renderProducts();
        } else {
          throw new Error((data && data.message) || 'Invalid response received from product server.');
        }
      })
      .catch(function (err) {
        console.error('Error fetching catalog from /api/products:', err);
        isLoading = false;
        fetchError = `Failed to connect to campus product service: ${err.message}. Ensure MySQL and Tomcat are running.`;
        renderProducts();
      });
  }

  // Event Listeners setup
  function initShop() {
    parseUrlParams();

    // Search input
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        searchQuery = e.target.value;

        // When user enters a search term, reset selected category to "All"
        // so products across every department can be found.
        if (searchQuery.trim() !== '') {
          currentCategory = 'all';
          categoryPills.forEach((pill) => {
            pill.classList.toggle('active', pill.getAttribute('data-filter-category') === 'all');
          });
        }

        renderProducts();
      });
    }

    // Sort selector
    if (sortSelect) {
      sortSelect.addEventListener('change', function (e) {
        currentSort = e.target.value;
        renderProducts();
      });
    }

    // Category filter pills
    categoryPills.forEach((pill) => {
      pill.addEventListener('click', function () {
        categoryPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        currentCategory = pill.getAttribute('data-filter-category');

        // Clear search query and input when selecting a category
        searchQuery = '';
        if (searchInput) {
          searchInput.value = '';
        }

        renderProducts();
      });
    });

    // Clear filters button
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', resetFilters);
    }

    // Initiate API fetch
    loadProductsFromApi();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShop);
  } else {
    initShop();
  }
})();
