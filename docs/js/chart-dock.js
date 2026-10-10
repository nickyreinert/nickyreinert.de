(function () {
  // Docks the last passed chart below the sticky title bar while the text
  // that follows it (up to the next heading) is being read.
  var article = document.querySelector('article.content');
  if (!article) return;

  var charts = Array.prototype.slice.call(article.querySelectorAll('.chart'))
    .filter(function (chart) { return chart.querySelector('img.chart-image'); });
  if (!charts.length) return;

  var headings = Array.prototype.slice.call(article.querySelectorAll('h1, h2, h3, h4'));

  // a chart's section ends at the next heading, or at the end of the article
  var ends = charts.map(function (chart) {
    for (var i = 0; i < headings.length; i++) {
      if (chart.compareDocumentPosition(headings[i]) & Node.DOCUMENT_POSITION_FOLLOWING) return headings[i];
    }
    return null;
  });

  function srcOf(chart) {
    var img = chart.querySelector('img.chart-image');
    return img.currentSrc || img.src;
  }

  // modal with the full-size chart
  var modal = document.createElement('div');
  modal.id = 'chart-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  var modalImg = document.createElement('img');
  modal.appendChild(modalImg);
  document.body.appendChild(modal);

  function openModal(chart) {
    modalImg.src = srcOf(chart);
    modalImg.alt = chart.querySelector('img.chart-image').alt;
    modal.classList.add('visible');
  }
  function closeModal() {
    modal.classList.remove('visible');
  }
  modal.addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });
  charts.forEach(function (chart) {
    var img = chart.querySelector('img.chart-image');
    img.classList.add('zoomable');
    img.addEventListener('click', function () { openModal(chart); });
  });

  var dock = document.createElement('div');
  dock.id = 'chart-dock';
  var dockImg = document.createElement('img');
  dockImg.alt = '';
  dockImg.title = 'Vergrößern';
  var close = document.createElement('button');
  close.type = 'button';
  close.className = 'chart-dock-close';
  close.setAttribute('aria-label', 'Angedocktes Diagramm ausblenden');
  close.textContent = '×';
  dock.appendChild(dockImg);
  dock.appendChild(close);
  var grip = document.createElement('div');
  grip.className = 'chart-dock-grip';
  grip.title = 'Höhe anpassen';
  dock.appendChild(grip);
  document.body.appendChild(dock);

  var HEIGHT_KEY = 'chartDockHeight';
  var userHeight = null;
  try { userHeight = parseFloat(localStorage.getItem(HEIGHT_KEY)) || null; } catch (e) {}

  function clampHeight(h) {
    return Math.max(60, Math.min(h, window.innerHeight * 0.7));
  }
  function applyHeight() {
    if (userHeight) dock.style.setProperty('--dock-h', clampHeight(userHeight) + 'px');
  }
  applyHeight();

  var dragging = false;
  grip.addEventListener('pointerdown', function (e) {
    dragging = true;
    dock.classList.add('dragging');
    grip.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  grip.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    userHeight = clampHeight(e.clientY - dockImg.getBoundingClientRect().top);
    applyHeight();
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    dock.classList.remove('dragging');
    try { localStorage.setItem(HEIGHT_KEY, String(userHeight)); } catch (e) {}
    schedule();
  }
  grip.addEventListener('pointerup', endDrag);
  grip.addEventListener('pointercancel', endDrag);

  var current = null;
  var dismissed = null;

  function show(chart) {
    // closing is temporary: forget it as soon as the docked chart changes
    if (dismissed && chart !== dismissed) dismissed = null;
    if (chart && chart === dismissed) chart = null;
    if (chart === current) return;
    current = chart;
    if (chart) dockImg.src = srcOf(chart);
    dock.classList.toggle('visible', !!chart);
  }

  dockImg.addEventListener('click', function () {
    if (current) openModal(current);
  });

  function topOffset() {
    var bar = document.getElementById('sticky-title');
    if (bar && bar.classList.contains('visible')) return bar.getBoundingClientRect().bottom;
    var slim = document.querySelector('#header.header-slim');
    return slim ? slim.offsetHeight : 0;
  }

  // mirrors #chart-dock in single.css: --dock-h plus vertical padding
  function dockHeight(chart) {
    var maxH = userHeight ? clampHeight(userHeight)
      : window.innerHeight * (window.innerWidth <= 768 ? 0.25 : 0.3);
    var img = chart.querySelector('img.chart-image');
    var h = maxH;
    if (img.naturalWidth) {
      // image is also limited by the dock width (minus its 2rem side padding)
      var maxW = (dock.clientWidth || window.innerWidth) - 64;
      h = Math.min(maxH, img.naturalHeight, maxW * img.naturalHeight / img.naturalWidth);
    }
    return h + 22;
  }

  function update() {
    if (dragging) return;
    var articleRect = article.getBoundingClientRect();
    dock.style.left = articleRect.left + 'px';
    dock.style.width = articleRect.width + 'px';
    var top = topOffset();
    dock.style.top = top + 'px';
    var found = null;
    var foundEnd = null;
    for (var i = 0; i < charts.length; i++) {
      // dock once the chart's bottom reaches the dock's bottom edge, so the
      // following text continues right below the dock instead of under it
      if (charts[i].getBoundingClientRect().bottom > top + dockHeight(charts[i])) break;
      found = charts[i];
      foundEnd = ends[i];
    }
    if (found) {
      var endTop = foundEnd ? foundEnd.getBoundingClientRect().top
        : article.getBoundingClientRect().bottom;
      // release before the next heading slides under the dock
      if (endTop <= top + dockHeight(found)) found = null;
    }
    show(found);
  }

  close.addEventListener('click', function () {
    dismissed = current;
    current = null;
    dock.classList.remove('visible');
  });

  var ticking = false;
  function schedule() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      update();
    });
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', function () {
    applyHeight();
    schedule();
  });
  window.addEventListener('sticky-title-change', schedule);
  update();
})();
