(function () {
  var nav = document.getElementById('dynamic-navigator');
  if (!nav) return;

  var GAP = 24;
  var header = document.getElementById('header');

  function updatePosition() {
    var top = GAP;
    if (header) {
      top = Math.max(GAP, header.getBoundingClientRect().bottom + GAP);
    }
    nav.style.top = top + 'px';
    nav.style.maxHeight = 'calc(100vh - ' + top + 'px - ' + GAP + 'px)';
  }

  updatePosition();
  window.addEventListener('scroll', updatePosition, { passive: true });
  window.addEventListener('resize', updatePosition);

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

  var observer = new IntersectionObserver(function (entries) {
    var visible = entries.filter(function (entry) {
      return entry.isIntersecting;
    });
    if (visible.length) {
      visible.sort(function (a, b) {
        return a.boundingClientRect.top - b.boundingClientRect.top;
      });
      setActive(visible[0].target.id);
    }
  }, {
    rootMargin: '0px 0px -70% 0px',
    threshold: 0
  });

  headings.forEach(function (heading) {
    observer.observe(heading);
  });
})();
