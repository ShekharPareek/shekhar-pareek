// @ts-nocheck
(function () {
  var root = document.querySelector('[data-lh-fp]');
  if (!root) return;

  // Liquid varient data in the JSON
  var variants = JSON.parse(root.querySelector('[data-fp-variants]').textContent);

  var slides = root.querySelectorAll('[data-fp-slide]');
  var thumbs = root.querySelectorAll('[data-fp-thumb]');
  var qtyInput = root.querySelector('[data-fp-qty]');
  var addBtn = root.querySelector('[data-fp-add]');
  var buyBtn = root.querySelector('[data-fp-buy]');
  var errorEl = root.querySelector('[data-fp-error]');

  var currentSlide = 0;
  var variant = variants[0];

  function find(selector) {
    return root.querySelector(selector);
  }

  /* ---------- 1. Image gallery ---------- */
  function showSlide(index) {
    if (!slides.length) return;
    currentSlide = (index + slides.length) % slides.length; // last ke baad first
    slides.forEach(function (slide, i) {
      slide.classList.toggle('is-active', i === currentSlide);
    });
    thumbs.forEach(function (thumb, i) {
      thumb.classList.toggle('is-active', i === currentSlide);
    });
  }

  /* ---------- 2. Variant change (bina reload) ---------- */
  // Jo colour aur size abhi selected hain unki list: ["Black", "M"]
  function selectedOptions() {
    var chosen = [];
    root.querySelectorAll('[data-fp-option]').forEach(function (group) {
      var input = group.querySelector('input:checked');
      chosen.push(input ? input.value : '');
    });
    return chosen;
  }

  function updateVariant() {
    var chosen = selectedOptions();

    variant = variants.filter(function (v) {
      return v.options.join('|') === chosen.join('|');
    })[0];

  
var colourLabel = find('[data-fp-chosen]');
if (colourLabel) {
  var checked = colourLabel.closest('[data-fp-option]').querySelector('input:checked');
  if (checked) colourLabel.textContent = checked.value;
}

    if (!variant) return;

    // Price, compare price aur Save %
    find('[data-fp-price]').textContent = variant.price;
    var compare = find('[data-fp-compare]');
    var save = find('[data-fp-save]');
    var onSale = variant.save > 0;
    compare.hidden = !onSale;
    save.hidden = !onSale;
    compare.textContent = variant.compare;
    save.textContent = 'Save ' + variant.save + '%';

    variant.offers.forEach(function (price, i) {
      var el = find('[data-fp-offer="' + i + '"]');
      if (el) el.textContent = price;
    });

    // Button state
    addBtn.disabled = !variant.available;
    buyBtn.disabled = !variant.available;
    find('[data-fp-add-label]').textContent = variant.available ? 'Add to cart' : 'Sold out';

    // Variant image to slide gallery
    slides.forEach(function (slide, i) {
      if (Number(slide.dataset.mediaId) === variant.mediaId) showSlide(i);
    });

    errorEl.hidden = true;
  }

  /* ---------- 3. Quantity ---------- */
  function getQty() {
    return parseInt(qtyInput.value, 10) || 1;
  }

  function setQty(n) {
    if (n < 1) n = 1;
    qtyInput.value = n < 10 ? '0' + n : String(n);
  }

  /* ---------- 4. Cart ---------- */
  function addToCart() {
    var item = { id: variant.id, quantity: getQty() };

    // Cart drawer 
    if (window.LoomhausCart) return window.LoomhausCart.add(item);

    //if not drawer then add to cart via fetch
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [item] })
    });
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  /* ---------- 5. Events ---------- */
  root.addEventListener('change', function (e) {
    if (e.target.closest('[data-fp-option]')) updateVariant();
  });

  root.addEventListener('click', function (e) {
    var target = e.target;

    // Gallery
    if (target.closest('[data-fp-prev]')) showSlide(currentSlide - 1);
    if (target.closest('[data-fp-next]')) showSlide(currentSlide + 1);
    var thumb = target.closest('[data-fp-thumb]');
    if (thumb) showSlide(Number(thumb.dataset.index));

    // Quantity
    if (target.closest('[data-fp-minus]')) setQty(getQty() - 1);
    if (target.closest('[data-fp-plus]')) setQty(getQty() + 1);

    // Add to cart
    if (target.closest('[data-fp-add]')) {
      addToCart().catch(function () { showError('Could not add to cart.'); });
    }

    // Buy it no:
    if (target.closest('[data-fp-buy]')) {
      addToCart()
        .then(function () { window.location.href = '/checkout'; })
        .catch(function () { showError('Could not start checkout.'); });
    }

    // Offer code copy
    var copyBtn = target.closest('[data-fp-copy]');
    if (copyBtn) {
      navigator.clipboard.writeText(copyBtn.dataset.fpCopy);
      copyBtn.classList.add('is-copied');
      setTimeout(function () { copyBtn.classList.remove('is-copied'); }, 1500);
    }
  });

  // first load: quantity 1, first slide, first variant
  setQty(1);
  showSlide(0);
  updateVariant();
})();