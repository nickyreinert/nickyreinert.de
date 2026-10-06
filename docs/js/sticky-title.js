(function () {
  var h1 = document.querySelector('.post-header h1');
  if (!h1) return;

  var bar = document.createElement('div');
  bar.id = 'sticky-title';
  bar.setAttribute('aria-hidden', 'true');
  var text = document.createElement('span');
  text.textContent = h1.textContent.trim();
  bar.appendChild(text);
  document.body.prepend(bar);

  // stack below the sticky slim header
  var slim = document.querySelector('#header.header-slim');
  function setHeaderHeight() {
    document.documentElement.style.setProperty('--header-h', (slim ? slim.offsetHeight : 0) + 'px');
  }
  setHeaderHeight();
  window.addEventListener('resize', setHeaderHeight);

  var visible = false;

  function setVisible(value) {
    if (value === visible) return;
    visible = value;
    bar.classList.toggle('visible', value);
    window.dispatchEvent(new Event('sticky-title-change'));
  }

  // shown as soon as the real h1 has scrolled out of view
  function update() {
    setVisible(h1.getBoundingClientRect().bottom < 0);
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        update();
      });
    }
  }, { passive: true });
  update();
})();
