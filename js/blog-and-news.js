var tabs = document.querySelectorAll('.topic-tabs .tab');

tabs.forEach(function (tab) {
  tab.addEventListener('click', function () {
    tabs.forEach(function (t) { t.classList.remove('tab-active'); });
    tab.classList.add('tab-active');

    var filter = tab.dataset.filter;

    // Featured "Editor's Pick" card sits outside the Latest Posts grid,
    // so it's just shown/hidden directly rather than re-rendered.
    var featured = document.querySelector('.featured-card');
    if (featured) {
      var show = filter === 'all' || featured.dataset.category === filter;
      featured.style.display = show ? '' : 'none';
    }

    // Latest Posts grid is data-driven (posts-data.js) — switching tabs
    // re-filters it and resets pagination back to the first page.
    if (typeof setFilter === 'function') {
      setFilter(filter);
    }
  });
});
