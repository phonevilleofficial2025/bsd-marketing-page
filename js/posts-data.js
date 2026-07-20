var POSTS = [
  {
    title: "Securing Genuine Samsung Devices in the Philippines",
    excerpt: "Gray-market imports carry one constant risk: zero warranty coverage. Here's how to buy with confidence.",
    category: "buying-guides",
    label: "Buying Guides",
    badge: "Buying Guide",
    author: "BSD Editorial",
    readTime: "8 Min Read",
    gradient: "post-gradient-1",
    url: "blog/buying-guides/post-1.html"
  }
];

var PAGE_SIZE = 6;
var currentFilter = 'all';
var visibleCount = PAGE_SIZE;

function buildPostCardHTML(post) {
  return '<article class="post-card reveal" data-category="' + post.category + '">' +
    '<a class="post-image ' + post.gradient + '" href="' + post.url + '">' +
      '<span class="post-badge">' + post.badge + '</span>' +
    '</a>' +
    '<div class="post-body">' +
      '<p class="post-eyebrow">' + post.label + '</p>' +
      '<h3><a href="' + post.url + '">' + post.title + '</a></h3>' +
      '<p class="post-excerpt">' + post.excerpt + '</p>' +
      '<span class="post-divider"></span>' +
      '<div class="post-meta">' +
        '<span>' + post.author + '</span>' +
        '<span class="dot">&bull;</span>' +
        '<span>' + post.readTime + '</span>' +
      '</div>' +
    '</div>' +
  '</article>';
}

function getFilteredPosts() {
  return currentFilter === 'all'
    ? POSTS
    : POSTS.filter(function (post) { return post.category === currentFilter; });
}

function renderVisiblePosts() {
  var grid = document.getElementById('postsGrid');
  var loadMoreBtn = document.getElementById('loadMoreBtn');
  if (!grid) return;

  var filtered = getFilteredPosts();
  var toShow = filtered.slice(0, visibleCount);

  grid.innerHTML = toShow.map(buildPostCardHTML).join('');

  if (loadMoreBtn) {
    loadMoreBtn.style.display = filtered.length > visibleCount ? '' : 'none';
  }

  // Re-hook the scroll fade-in for cards just added to the DOM —
  // the page-load observer only ever saw the elements present at load time.
  requestAnimationFrame(function () {
    grid.querySelectorAll('.reveal').forEach(function (el) {
      el.classList.add('is-visible');
    });
  });
}

function setFilter(filter) {
  currentFilter = filter;
  visibleCount = PAGE_SIZE;
  renderVisiblePosts();
}

function loadMorePosts() {
  visibleCount += PAGE_SIZE;
  renderVisiblePosts();
}

renderVisiblePosts();
