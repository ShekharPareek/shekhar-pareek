(function () {
  var ROOT = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
  var modal = null;
  var product = null;
  var lastFocus = null;

  /* ---------- Helpers ---------- */
  function esc(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // product.js price paise/cents me deta hai
  function money(cents) {
    var currency = (window.Shopify && Shopify.currency && Shopify.currency.active) || 'INR';
    return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: currency });
  }

  function resize(url, width) {
    return url + (url.indexOf('?') > -1 ? '&' : '?') + 'width=' + width;
  }

  // Description me HTML hota hai, plain text banao aur chhota karo
  function shortText(html) {
    var div = document.createElement('div');
    div.innerHTML = html || '';
    var text = (div.textContent || '').trim();
    return text.length > 140 ? text.slice(0, 140) + '…' : text;
  }

  function isColour(name) {
    return /colou?r/i.test(name);
  }

  // Variants se option ki unique values nikalo
  function optionValues(index) {
    var values = [];
    product.variants.forEach(function (v) {
      var value = v.options[index];
      if (values.indexOf(value) === -1) values.push(value);
    });
    return values;
  }

  /* ---------- Modal ---------- */
  function build() {
    modal = document.createElement('div');
    modal.className = 'lh-qv';
    modal.innerHTML =
      '<div class="lh-qv__overlay" data-qv-close></div>' +
      '<div class="lh-qv__dialog" role="dialog" aria-modal="true" aria-label="Quick view" tabindex="-1">' +
      '<div data-qv-body></div></div>';
    document.body.appendChild(modal);
  }

  function open() {
    modal.classList.add('is-open');
    document.body.classList.add('lh-qv-open');
    modal.querySelector('.lh-qv__dialog').focus();
  }

  function close() {
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.classList.remove('lh-qv-open');
    if (lastFocus) lastFocus.focus();
  }

  /* ---------- Render ---------- */
  function render() {
    var image = product.featured_image
      ? '<img src="' + esc(resize(product.featured_image, 700)) + '" alt="' + esc(product.title) + '" data-qv-image>'
      : '';

    var optionsHtml = product.options.map(function (opt, i) {
      var name = typeof opt === 'string' ? opt : opt.name;
      var values = optionValues(i);
      var html = '<div class="lh-qv__option" data-qv-option><p class="lh-qv__label">' + esc(name) + '</p>';

      if (isColour(name)) {
        html += '<div class="lh-qv__colours">';
        values.forEach(function (value, n) {
          html +=
            '<label class="lh-qv__colour">' +
            '<input type="radio" name="qv-' + i + '" value="' + esc(value) + '"' + (n === 0 ? ' checked' : '') + '>' +
            '<span><i style="background:' + esc(value.replace(/ /g, '')) + '"></i>' + esc(value) + '</span>' +
            '</label>';
        });
        html += '</div>';
      } else {
        html += '<select class="lh-qv__select" name="qv-' + i + '"><option value="">Choose your ' + esc(name.toLowerCase()) + '</option>';
        values.forEach(function (value) {
          html += '<option value="' + esc(value) + '">' + esc(value) + '</option>';
        });
        html += '</select>';
      }
      return html + '</div>';
    }).join('');

    modal.querySelector('[data-qv-body]').innerHTML =
      '<button type="button" class="lh-qv__close" data-qv-close aria-label="Close">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>' +
      '<div class="lh-qv__grid">' +
      '<div class="lh-qv__media">' + image + '</div>' +
      '<div class="lh-qv__info">' +
      '<h3 class="lh-qv__title">' + esc(product.title) + '</h3>' +
      '<p class="lh-qv__price" data-qv-price>' + money(product.variants[0].price) + '</p>' +
      '<p class="lh-qv__desc">' + esc(shortText(product.description)) + '</p>' +
      optionsHtml +
      '<p class="lh-qv__error" data-qv-error hidden></p>' +
      '<button type="button" class="lh-qv__add" data-qv-add><span>Add to cart</span>' +
      '<svg width="16" height="12" viewBox="0 0 16 12" fill="none"><path d="M1 6h14M10 1l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '</div></div>';

    updatePrice();
  }

  /* ---------- Selected variant ---------- */
  function chosenOptions() {
    var chosen = [];
    modal.querySelectorAll('[data-qv-option]').forEach(function (group) {
      var radio = group.querySelector('input:checked');
      var select = group.querySelector('select');
      chosen.push(radio ? radio.value : select ? select.value : '');
    });
    return chosen;
  }

  function findVariant() {
    var chosen = chosenOptions().join('|');
    return product.variants.filter(function (v) {
      return v.options.join('|') === chosen;
    })[0];
  }

  // Poora variant select hone par price aur image badlo
  function updatePrice() {
    var variant = findVariant();
    if (!variant) return;
    modal.querySelector('[data-qv-price]').textContent = money(variant.price);
    if (variant.featured_image) {
      modal.querySelector('[data-qv-image]').src = resize(variant.featured_image.src, 700);
    }
  }

  function showError(message) {
    var el = modal.querySelector('[data-qv-error]');
    el.textContent = message;
    el.hidden = !message;
  }

  /* ---------- Add to cart ---------- */
  function addToCart() {
    var variant = findVariant();
    if (!variant) return showError('Please choose all options.');
    if (!variant.available) return showError('This variant is sold out.');

    var item = { id: variant.id, quantity: 1 };

    if (window.LoomhausCart) {
      window.LoomhausCart.add(item).then(close); // cart drawer khulta hai
    } else {
      fetch(ROOT + 'cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [item] })
      }).then(function () { window.location.href = ROOT + 'cart'; });
    }
  }

  /* ---------- Open for a product ---------- */
  function openProduct(handle) {
    if (!modal) build();
    fetch(ROOT + 'products/' + handle + '.js')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        product = data;
        render();
        open();
      });
  }

  /* ---------- Events ---------- */
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-lh-quickview]');
    if (trigger) {
      lastFocus = trigger;
      openProduct(trigger.dataset.handle);
      return;
    }
    if (!modal) return;
    if (e.target.closest('[data-qv-close]')) close();   // overlay ya X
    if (e.target.closest('[data-qv-add]')) addToCart();
  });

  document.addEventListener('change', function (e) {
    if (modal && modal.contains(e.target)) {
      showError('');
      updatePrice();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });
})();