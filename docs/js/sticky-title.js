(function () {
  var h1 = document.querySelector('.post-header h1');
  if (!h1) return;

  var bar = document.createElement('div');
  bar.id = 'sticky-title';
  bar.setAttribute('aria-hidden', 'true');
  var text = document.createElement('span');
  text.textContent = h1.textContent.trim();
  bar.appendChild(text);
  var sub = document.createElement('span');
  sub.className = 'sticky-heading';
  bar.appendChild(sub);
  document.body.prepend(bar);

  var headings = Array.prototype.slice.call(
    document.querySelectorAll('article.content h2, article.content h3'));
  var currentHeading = null;

  function setHeading(heading) {
    if (heading === currentHeading) return;
    currentHeading = heading;
    sub.textContent = heading ? heading.textContent.trim() : '';
    bar.classList.toggle('has-heading', !!heading);
    window.dispatchEvent(new Event('sticky-title-change'));
  }

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
    // current heading = last one that has scrolled under the bar
    var limit = bar.getBoundingClientRect().bottom + 4;
    var found = null;
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].getBoundingClientRect().top <= limit) found = headings[i];
      else break;
    }
    setHeading(visible ? found : null);
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
