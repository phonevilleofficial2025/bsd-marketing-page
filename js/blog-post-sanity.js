(function () {
  var params = new URLSearchParams(window.location.search);
  var slug = params.get('slug');

  var titleEl = document.getElementById('postTitle');
  var categoryEl = document.getElementById('postCategory');
  var metaEl = document.getElementById('postMeta');
  var imageEl = document.getElementById('postImage');
  var bodyEl = document.getElementById('postBody');

  function showNotFound(message) {
    titleEl.textContent = 'Post not found';
    bodyEl.innerHTML = '<p>' + message + '</p>';
  }

  if (!slug) {
    showNotFound('No post was specified.');
    return;
  }

  var query = '*[_type == "post" && slug.current == $slug][0]{' +
    'title, excerpt, category, mainImage, "authorName": author->name, readTime, publishedAt, body}';

  sanityQuery(query, { slug: slug }).then(function (post) {
    if (!post) {
      showNotFound('This post may have been removed or unpublished.');
      return;
    }

    var meta = CATEGORY_LABELS[post.category] || { label: post.category };

    document.title = post.title + ' | BSD International';
    var descriptionEl = document.getElementById('pageDescription');
    if (descriptionEl && post.excerpt) descriptionEl.setAttribute('content', post.excerpt);

    titleEl.textContent = post.title;
    categoryEl.textContent = meta.label || '';

    var metaParts = [post.authorName || 'BSD Editorial'];
    if (post.readTime) metaParts.push(post.readTime);
    metaEl.textContent = metaParts.join(' • ');

    var imgUrl = post.mainImage ? sanityImageUrl(post.mainImage, 1600) : null;
    if (imgUrl) {
      imageEl.src = imgUrl;
      imageEl.alt = post.title;
      imageEl.style.display = '';
    }

    bodyEl.innerHTML = renderPortableText(post.body);
  }).catch(function (err) {
    console.error('Failed to load post from Sanity', err);
    showNotFound('Could not load this post right now. Please try again later.');
  });
})();
