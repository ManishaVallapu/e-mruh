/**
 * e-mruh My Orders Page Logic
 * Fetches order history from /e-mruh/api/orders/my-orders,
 * handles loading, unauthorized, empty, and populated order list states.
 */

(function () {
  'use strict';

  const container = document.getElementById('ordersContainer');

  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getStatusClass(status) {
    if (!status) return 'order-status-pending';
    const s = status.toUpperCase();
    if (s === 'COMPLETED') return 'order-status-completed';
    if (s === 'PROCESSING') return 'order-status-processing';
    if (s === 'CANCELLED') return 'order-status-cancelled';
    return 'order-status-pending';
  }

  function renderLoading() {
    if (!container) return;
    container.innerHTML = `
      <div class="shop-empty-state" style="padding: 60px 20px;">
        <div class="shop-empty-icon" style="animation: spin 1.4s linear infinite; display: inline-block;">&#9696;</div>
        <h3>Loading your campus orders...</h3>
        <p>Connecting to MySQL database to fetch your purchase records.</p>
      </div>
    `;
  }

  function renderUnauthenticated() {
    if (!container) return;
    container.innerHTML = `
      <div class="shop-empty-state" style="border-color: #cbd5e1; padding: 60px 20px;">
        <div class="shop-empty-icon">&#128274;</div>
        <h3>Authentication Required</h3>
        <p>Please log in with your college student email to view your previous orders and campus deliveries.</p>
        <div style="margin-top: 18px; display: inline-flex; gap: 12px;">
          <a href="login.html" class="btn-primary" style="padding: 10px 24px;">Sign In &rarr;</a>
          <a href="shop.html" class="btn-secondary" style="padding: 10px 20px;">Browse Catalog</a>
        </div>
      </div>
    `;
  }

  function renderEmpty() {
    if (!container) return;
    container.innerHTML = `
      <div class="shop-empty-state" style="padding: 60px 20px;">
        <div class="shop-empty-icon">&#128221;</div>
        <h3>No Previous Orders Found</h3>
        <p>You haven't placed any orders with this student account yet. Explore our campus uniform collection, lab coats, and semester textbooks.</p>
        <div style="margin-top: 18px;">
          <a href="shop.html" class="btn-primary" style="padding: 12px 26px; display: inline-flex; align-items: center; gap: 8px;">
            &larr; Start Shopping
          </a>
        </div>
      </div>
    `;
  }

  function renderError(msg) {
    if (!container) return;
    container.innerHTML = `
      <div class="shop-empty-state" style="border-color: #fca5a5; padding: 60px 20px;">
        <div class="shop-empty-icon" style="color: #ef4444;">&#9888;</div>
        <h3>Unable to Retrieve Orders</h3>
        <p>${escapeHtml(msg || 'An error occurred while loading your orders.')}</p>
        <button type="button" id="retryOrdersBtn" class="btn-primary" style="margin-top: 18px; padding: 10px 24px;">
          Retry
        </button>
      </div>
    `;
    const retryBtn = document.getElementById('retryOrdersBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', loadOrders);
    }
  }

  function renderOrders(orders) {
    if (!container) return;
    if (!Array.isArray(orders) || orders.length === 0) {
      renderEmpty();
      return;
    }

    container.innerHTML = orders
      .map((order) => {
        const orderId = order.order_id;
        const total = parseFloat(order.total_amount) || 0;
        const status = order.order_status || 'PENDING';
        const date = order.created_at || 'Recent';
        const items = Array.isArray(order.items) ? order.items : [];

        return `
          <article class="order-card">
            <header class="order-card-header">
              <div class="order-meta-group">
                <div class="order-meta-item">
                  <span class="order-meta-label">Order Number</span>
                  <span class="order-meta-val">#${orderId}</span>
                </div>
                <div class="order-meta-item">
                  <span class="order-meta-label">Date Placed</span>
                  <span class="order-meta-val">${escapeHtml(date)}</span>
                </div>
                <div class="order-meta-item">
                  <span class="order-meta-label">Total Amount</span>
                  <span class="order-meta-val" style="color: var(--color-secondary-dark);">&#8377;${total.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div>
                <span class="order-status-badge ${getStatusClass(status)}">${escapeHtml(status)}</span>
              </div>
            </header>

            <div class="order-card-body">
              <table class="order-items-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th style="text-align: center; width: 80px;">Qty</th>
                    <th style="text-align: right; width: 120px;">Unit Price</th>
                    <th style="text-align: right; width: 120px;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${items
                    .map((item) => {
                      const itemPrice = parseFloat(item.unit_price) || 0;
                      const itemQty = parseInt(item.quantity, 10) || 1;
                      const itemSub = itemPrice * itemQty;
                      return `
                        <tr>
                          <td>
                            <strong>${escapeHtml(item.product_name || `Product #${item.product_id}`)}</strong>
                          </td>
                          <td style="text-align: center;">${itemQty}</td>
                          <td style="text-align: right;">&#8377;${itemPrice.toLocaleString('en-IN')}</td>
                          <td style="text-align: right; font-weight: 600;">&#8377;${itemSub.toLocaleString('en-IN')}</td>
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>

            <footer class="order-card-footer">
              <div>
                <strong>Campus Delivery:</strong> ${escapeHtml(order.delivery_address || 'Campus Hostel')}
              </div>
              <div style="color: var(--color-text-muted);">
                Pay on Delivery (Cash / UPI)
              </div>
            </footer>
          </article>
        `;
      })
      .join('');
  }

  function loadOrders() {
    renderLoading();

    fetch('/e-mruh/api/orders/my-orders', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store'
    })
      .then(function (res) {
        if (res.status === 401) {
          renderUnauthenticated();
          return null;
        }
        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(function (data) {
        if (!data) return; // Handled 401
        if (data.status === 'SUCCESS' && Array.isArray(data.orders)) {
          renderOrders(data.orders);
        } else {
          throw new Error(data.message || 'Unable to parse orders.');
        }
      })
      .catch(function (err) {
        console.error('Error fetching order history:', err);
        renderError(err.message);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadOrders);
  } else {
    loadOrders();
  }
})();
