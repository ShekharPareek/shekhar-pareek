(function () {
  'use strict';

  var countEls = document.querySelectorAll('[data-lh-cart-count]');
  var openEls = document.querySelectorAll('[data-lh-cart-open]');

  function renderCount(count) {
    countEls.forEach(function (el) {
      el.textContent = count;
      el.hidden = count < 1;
    });
  }

  // Page load par cart ka current count lao
  fetch('/cart.js', { headers: { Accept: 'application/json' } })
    .then(function (res) { return res.json(); })
    .then(function (cart) { renderCount(cart.item_count); })
    .catch(function () {});

  // Cart drawer, quick view aur featured product ye event bhejenge
  document.addEventListener('loomhaus:cart:updated', function (e) {
    if (e.detail && e.detail.cart) renderCount(e.detail.cart.item_count);
  });

  // Click par drawer kholo. Drawer na ho to normal /cart link chalega.
  openEls.forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('loomhaus:cart:open'));
    });
  });
})();