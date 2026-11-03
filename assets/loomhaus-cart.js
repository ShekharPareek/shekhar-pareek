(function () {
  if (window.LoomhausCart) return;

  var SECTION_ID = 'loomhaus-cart-drawer'; // footer-group.json me yahi key honi chahiye
  var DISMISS_KEY = 'lh_gift_dismissed';
  var queue = Promise.resolve(); // requests ek-ek karke chalti hain

  function drawer() { return document.querySelector('[data-lh-drawer]'); }

  /* ---------- Cart API ---------- */
  function post(url, body) {
    return fetch('/' + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.description || 'Could not update cart.');
        return data;
      });
    });
  }

  function getCart() {
    return fetch('/cart.js').then(function (res) { return res.json(); });
  }

  /* ---------- Auto-add rule: Black + M => Soft Winter Jacket ---------- */
  // User ne jacket khud hataya to wapas add na ho, jab tak Black + M hat na jaye
  function dismissed(value) {
    try {
      if (value === undefined) return sessionStorage.getItem(DISMISS_KEY) === '1';
      if (value) sessionStorage.setItem(DISMISS_KEY, '1');
      else sessionStorage.removeItem(DISMISS_KEY);
    } catch (e) {}
    return false;
  }

  function checkJacketRule(cart) {
    var el = drawer();
    if (!el || !el.dataset.giftVariantId) return Promise.resolve(cart);

    var giftProductId = Number(el.dataset.giftProductId);
    var giftVariantId = Number(el.dataset.giftVariantId);

    // Variant title "Black / M" ko todke dono values dhundo (order kuch bhi ho)
    var hasTrigger = cart.items.some(function (item) {
      if (item.product_id === giftProductId) return false;
      var parts = (item.variant_title || '').toLowerCase().split(' / ');
      return parts.indexOf(el.dataset.triggerColor) > -1 && parts.indexOf(el.dataset.triggerSize) > -1;
    });

    var jacket = cart.items.filter(function (item) {
      return item.product_id === giftProductId;
    })[0];

    if (!hasTrigger) dismissed(false);

    // Black + M hai, jacket nahi hai: add karo
    if (hasTrigger && !jacket && !dismissed()) {
      return post('cart/add.js', {
        items: [{ id: giftVariantId, quantity: 1, properties: { _auto_added: 'true' } }]
      }).then(getCart);
    }
    // Black + M hat gaya, jacket auto-added hai: hatao
    if (!hasTrigger && jacket && jacket.properties && jacket.properties._auto_added) {
      return post('cart/change.js', { id: jacket.key, quantity: 0 });
    }
    return Promise.resolve(cart);
  }

  /* ---------- Render ---------- */
  function render() {
    return fetch('/?section_id=' + SECTION_ID)
      .then(function (res) { return res.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var fresh = doc.querySelector('[data-lh-content]');
        var current = document.querySelector('[data-lh-content]');
        if (fresh && current) current.innerHTML = fresh.innerHTML;
      });
  }

  // Cart change -> jacket rule -> drawer refresh -> header count event
  function run(task) {
    var el = drawer();
    if (el) el.classList.add('is-loading');

    var job = queue
      .then(task)
      .then(getCart)
      .then(checkJacketRule)
      .then(function (cart) {
        return render().then(function () {
          document.dispatchEvent(new CustomEvent('loomhaus:cart:updated', { detail: { cart: cart } }));
        });
      })
      .catch(function (err) {
        return render().then(function () {
          var box = document.querySelector('[data-lh-error]');
          if (box) { box.textContent = err.message; box.hidden = false; }
        });
      })
      .then(function () {
        if (el) el.classList.remove('is-loading');
      });

    queue = job;
    return job;
  }

  /* ---------- Open / close ---------- */
  function open() {
    var el = drawer();
    if (!el) return;
    el.classList.add('is-open');
    document.body.classList.add('lh-drawer-open');
  }

  function close() {
    var el = drawer();
    if (!el) return;
    el.classList.remove('is-open');
    document.body.classList.remove('lh-drawer-open');
  }

  /* ---------- Public API: quick view aur featured product yahi use karte hain ---------- */
  window.LoomhausCart = {
    add: function (item) {
      return run(function () { return post('cart/add.js', { items: [item] }); }).then(open);
    },
    change: function (key, quantity) {
      return run(function () { return post('cart/change.js', { id: key, quantity: quantity }); });
    },
    open: open,
    close: close
  };

  /* ---------- Events ---------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-lh-qty]');
    if (btn) {
      var qty = Number(btn.dataset.qty);
      if (btn.hasAttribute('data-gift') && qty === 0) dismissed(true);
      window.LoomhausCart.change(btn.dataset.key, qty);
      return;
    }
    if (e.target.closest('[data-lh-close]')) close();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });

  document.addEventListener('loomhaus:cart:open', open); // header cart icon
})();