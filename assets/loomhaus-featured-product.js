(function () {
  'use strict';

  function init(root) {
    if (root.dataset.fpReady) return;
    root.dataset.fpReady = '1';

    var variants = JSON.parse(root.querySelector('[data-fp-variants]').textContent);
    var slides = root.querySelectorAll('[data-fp-slide]');
    var thumbs = root.querySelectorAll('[data-fp-thumb]');
    var options = root.querySelectorAll('[data-fp-option]');
    var qtyInput = root.querySelector('[data-fp-qty]');
    var addBtn = root.querySelector('[data-fp-add]');
    var buyBtn = root.querySelector('[data-fp-buy]');
    var errorEl = root.querySelector('[data-fp-error]');
    var current = 0;
    var variant = null;

    function $(sel) { return root.querySelector(sel); }

    /* ---------- Gallery ---------- */
    function goTo(i) {
      if (!slides.length) return;
      current = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) { s.classList.toggle('is-active', n === current); });
      thumbs.forEach(function (t, n) { t.classList.toggle('is-active', n === current); });
    }

    /* ---------- Variants ---------- */
    function selected() {
      return Array.prototype.map.call(options, function (fs) {
        var checked = fs.querySelector('input:checked');
        return checked ? checked.value : '';
      });
    }

    function matches(v, opts) {
      return v.options.every(function (o, i) { return o === opts[i]; });
    }

    // Jis value ka koi available variant nahi, use disable karo
    function updateDisabled(sel) {
      options.forEach(function (fs, pos) {
        fs.querySelectorAll('input').forEach(function (input) {
          var test = sel.slice();
          test[pos] = input.value;
          input.disabled = !variants.some(function (v) { return v.available && matches(v, test); });
        });
      });
    }

    function update() {
      var sel = selected();
      variant = variants.filter(function (v) { return matches(v, sel); })[0] || null;
      updateDisabled(sel);

      // Colour label
      options.forEach(function (fs, i) {
        var label = fs.querySelector('[data-fp-chosen]');
        if (label) label.textContent = sel[i];
      });

      if (!variant) {
        addBtn.disabled = buyBtn.disabled = true;
        root.querySelector('[data-fp-add-label]').textContent = 'Unavailable';
        return;
      }

      $('[data-fp-price]').textContent = variant.price;
      var compare = $('[data-fp-compare]');
      var save = $('[data-fp-save]');
      var onSale = variant.save > 0;
      compare.hidden = save.hidden = !onSale;
      compare.textContent = variant.compare;
      save.textContent = 'Save ' + variant.save + '%';

      variant.offers.forEach(function (price, i) {
        var el = $('[data-fp-offer="' + i + '"]');
        if (el) el.textContent = price;
      });

      addBtn.disabled = buyBtn.disabled = !variant.available;
      root.querySelector('[data-fp-add-label]').textContent = variant.available ? 'Add to cart' : 'Sold out';

      // Variant ki image par jao
      if (variant.mediaId) {
        slides.forEach(function (s, n) {
          if (Number(s.dataset.mediaId) === variant.mediaId) goTo(n);
        });
      }
      showError('');
    }

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.hidden = !msg;
    }

    /* ---------- Quantity ---------- */
    function qty() { return Math.max(1, parseInt(qtyInput.value, 10) || 1); }
    function setQty(n) { qtyInput.value = String(Math.max(1, n)).padStart(2, '0'); }
    setQty(1);

    /* ---------- Cart ---------- */
    function addItem() {
      var item = { id: variant.id, quantity: qty() };
      if (window.LoomhausCart) return window.LoomhausCart.add(item);
      return fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [item] })
      }).then(function (r) {
        if (!r.ok) throw new Error('Could not add to cart.');
        window.location.href = '/cart';
      });
    }

    function lock(btn, fn) {
      if (!variant || !variant.available) return;
      btn.disabled = true;
      Promise.resolve()
        .then(fn)
        .catch(function (e) { showError(e.message); })
        .then(function () { btn.disabled = !variant.available; });
    }

    /* ---------- Events ---------- */
    root.addEventListener('change', function (e) {
      if (e.target.closest('[data-fp-option]')) update();
    });

    root.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('[data-fp-prev]')) return goTo(current - 1);
      if (t.closest('[data-fp-next]')) return goTo(current + 1);

      var thumb = t.closest('[data-fp-thumb]');
      if (thumb) return goTo(Number(thumb.dataset.index));

      if (t.closest('[data-fp-minus]')) return setQty(qty() - 1);
      if (t.closest('[data-fp-plus]')) return setQty(qty() + 1);

      if (t.closest('[data-fp-add]')) return lock(addBtn, addItem);

      // Buy it now: add karo, phir seedha checkout (Black + M rule drawer JS se chalta rahe)
      if (t.closest('[data-fp-buy]')) {
        return lock(buyBtn, function () {
          return addItem().then(function () { window.location.href = '/checkout'; });
        });
      }

      var copy = t.closest('[data-fp-copy]');
      if (copy && navigator.clipboard) {
        navigator.clipboard.writeText(copy.dataset.fpCopy).then(function () {
          copy.classList.add('is-copied');
          setTimeout(function () { copy.classList.remove('is-copied'); }, 1500);
        });
      }
    });

    goTo(Math.max(0, Array.prototype.findIndex.call(slides, function (s) {
      return s.classList.contains('is-active');
    })));
    update();
  }

  function initAll() { document.querySelectorAll('[data-lh-fp]').forEach(init); }
  initAll();
  document.addEventListener('shopify:section:load', initAll); // customizer me reload par
})();