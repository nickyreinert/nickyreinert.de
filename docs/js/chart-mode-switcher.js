(function () {
  var STORAGE_KEY = 'chartMode';
  var PLOTLY_SRC = 'https://cdn.plot.ly/plotly-2.35.2.min.js';

  var switcher = document.querySelector('.chart-mode-switcher');
  var buttons = switcher ? Array.prototype.slice.call(switcher.querySelectorAll('.chart-mode-btn')) : [];
  var chartContainers = Array.prototype.slice.call(document.querySelectorAll('.chart-interactive'));

  if (!chartContainers.length) return;

  var plotlyPromise = null;
  function loadPlotly() {
    if (!plotlyPromise) {
      plotlyPromise = new Promise(function (resolve, reject) {
        if (window.Plotly) {
          resolve();
          return;
        }
        var script = document.createElement('script');
        script.src = PLOTLY_SRC;
        script.onload = function () { resolve(); };
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    return plotlyPromise;
  }

  function renderInteractiveCharts() {
    loadPlotly().then(function () {
      chartContainers.forEach(function (container) {
        if (container.dataset.rendered) return;
        var url = container.getAttribute('data-chart-json');
        if (!url) return;
        fetch(url)
          .then(function (res) { return res.json(); })
          .then(function (figure) {
            Plotly.newPlot(container, figure.data, figure.layout, {
              responsive: true,
              displaylogo: false
            });
            container.dataset.rendered = 'true';
          })
          .catch(function (err) {
            container.textContent = 'Diagramm konnte nicht geladen werden.';
            console.error(err);
          });
      });
    });
  }

  function applyMode(mode) {
    document.body.classList.toggle('chart-mode-interactive', mode === 'interactive');
    buttons.forEach(function (btn) {
      var active = btn.getAttribute('data-chart-mode') === mode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (mode === 'interactive') {
      renderInteractiveCharts();
    }
  }

  var savedMode = null;
  try {
    savedMode = localStorage.getItem(STORAGE_KEY);
  } catch (e) {}

  applyMode(savedMode === 'interactive' ? 'interactive' : 'image');

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var mode = btn.getAttribute('data-chart-mode');
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch (e) {}
      applyMode(mode);
    });
  });
})();
