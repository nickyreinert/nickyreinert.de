(function () {
  var nav = document.getElementById('dynamic-navigator');
  if (!nav) return;

  var GAP = 24;
  // Align with the top of the page's first content line (article h1 / first
  // list row) while it is on screen, then stick at GAP once it scrolls away.
  var anchor = document.querySelector('.post-header h1') ||
    document.querySelector('#main > .post');
  var header = document.getElementById('header');
  var switcher = document.querySelector('.chart-mode-switcher');

  function updatePosition() {
    // keep clear of the sticky title bar while it is shown
    var stickyBar = document.getElementById('sticky-title');
    var offset = stickyBar && stickyBar.classList.contains('visible') ? stickyBar.offsetHeight : 0;
    var slim = document.querySelector('#header.header-slim');
    var min = GAP + offset + (slim ? slim.offsetHeight : 0);
    var top = min;
    if (anchor) {
      top = Math.max(min, anchor.getBoundingClientRect().top);
    } else if (header) {
      top = Math.max(min, header.getBoundingClientRect().bottom + GAP);
    }
    nav.style.top = top + 'px';
    if (switcher) switcher.style.top = top + 'px';
    nav.style.maxHeight = 'calc(100vh - ' + top + 'px - ' + GAP + 'px)';
  }

  updatePosition();
  window.addEventListener('scroll', updatePosition, { passive: true });
  window.addEventListener('resize', updatePosition);
  // slide the sidebars along with the title bar instead of jumping
  var animTimer = null;
  window.addEventListener('sticky-title-change', function () {
    nav.classList.add('top-anim');
    if (switcher) switcher.classList.add('top-anim');
    updatePosition();
    clearTimeout(animTimer);
    animTimer = setTimeout(function () {
      nav.classList.remove('top-anim');
      if (switcher) switcher.classList.remove('top-anim');
    }, 350);
  });

  var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  if (!links.length) return;

  var linkByID = {};
  var headings = [];
  links.forEach(function (link) {
    var id = decodeURIComponent(link.getAttribute('href').slice(1));
    var heading = document.getElementById(id);
    if (heading) {
      linkByID[id] = link;
      headings.push(heading);
    }
  });

  var activeLink = null;
  function setActive(id) {
    var link = id ? linkByID[id] : null;
    if (link === activeLink) return;
    if (activeLink) activeLink.classList.remove('active');
    if (link) {
      link.classList.add('active');
      link.scrollIntoView({ block: 'nearest' });
    }
    activeLink = link;
  }

  if (!headings.length) return;

  // Active = last heading above a threshold line. The line sits at 30% of the
  // viewport and moves down to the bottom edge as the page nears its end, so
  // the last headings (which can never reach 30%) still become active.
  var ticking = false;
  var lockUntil = 0;
  function update() {
    ticking = false;
    if (Date.now() < lockUntil) return;
    var vh = window.innerHeight;
    var max = document.documentElement.scrollHeight - vh;
    var t = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    var line = vh * Math.max(0.3, t);
    var current = headings[0];
    headings.forEach(function (heading) {
      if (heading.getBoundingClientRect().top <= line) current = heading;
    });
    setActive(current.id);
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  window.addEventListener('resize', update);
  // A clicked entry stays active even if the page cannot scroll far enough to
  // reach it (e.g. near the bottom); scrolling afterwards takes over again.
  function select(id) {
    if (!linkByID[id]) return;
    setActive(id);
    lockUntil = Date.now() + 800;
  }

  links.forEach(function (link) {
    link.addEventListener('click', function () {
      select(decodeURIComponent(link.getAttribute('href').slice(1)));
    });
  });

  update();
  if (location.hash) select(decodeURIComponent(location.hash.slice(1)));
})();
