var SANITY_PROJECT_ID = 'mdug7yhz';
var SANITY_DATASET = 'production';
var SANITY_API_VERSION = '2024-01-01';

var CATEGORY_LABELS = {
  'buying-guides': { label: 'Buying Guides', badge: 'Buying Guide' },
  'product-news': { label: 'Product News', badge: 'Product News' },
  'promotions': { label: 'Promotions', badge: 'Promotion' },
  'store-updates': { label: 'Store Updates', badge: 'Store Update' }
};

function sanityQuery(query, params) {
  var base = 'https://' + SANITY_PROJECT_ID + '.apicdn.sanity.io/v' + SANITY_API_VERSION +
    '/data/query/' + SANITY_DATASET;
  var url = base + '?query=' + encodeURIComponent(query);

  if (params) {
    Object.keys(params).forEach(function (key) {
      url += '&$' + key + '=' + encodeURIComponent(JSON.stringify(params[key]));
    });
  }

  return fetch(url).then(function (res) {
    if (!res.ok) {
      throw new Error('Sanity query failed with status ' + res.status);
    }
    return res.json();
  }).then(function (data) {
    return data.result;
  });
}

function sanityImageUrl(source, width) {
  if (!source || !source.asset || !source.asset._ref) return null;

  // Asset refs look like: image-<id>-<width>x<height>-<format>
  var parts = source.asset._ref.split('-');
  var id = parts[1];
  var dimensions = parts[2];
  var format = parts[3];

  var url = 'https://cdn.sanity.io/images/' + SANITY_PROJECT_ID + '/' + SANITY_DATASET +
    '/' + id + '-' + dimensions + '.' + format;

  return width ? url + '?w=' + width : url;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function renderPortableTextSpan(span, markDefs) {
  var text = escapeHtml(span.text);

  (span.marks || []).forEach(function (mark) {
    if (mark === 'strong') {
      text = '<strong>' + text + '</strong>';
    } else if (mark === 'em') {
      text = '<em>' + text + '</em>';
    } else {
      var def = (markDefs || []).filter(function (d) { return d._key === mark; })[0];
      if (def && def._type === 'link' && def.href) {
        text = '<a href="' + escapeHtml(def.href) + '" target="_blank" rel="noopener">' + text + '</a>';
      }
    }
  });

  return text;
}

function renderPortableTextBlock(block) {
  if (block._type === 'image') {
    var url = sanityImageUrl(block, 1600);
    return url ? '<img src="' + url + '" alt="">' : '';
  }

  if (block._type !== 'block') return '';

  var innerHtml = (block.children || []).map(function (span) {
    return renderPortableTextSpan(span, block.markDefs);
  }).join('');

  if (block.listItem === 'bullet') {
    return '<li>' + innerHtml + '</li>';
  }

  switch (block.style) {
    case 'h2': return '<h2>' + innerHtml + '</h2>';
    case 'h3': return '<h3>' + innerHtml + '</h3>';
    case 'h4': return '<h3>' + innerHtml + '</h3>';
    case 'blockquote': return '<blockquote><p>' + innerHtml + '</p></blockquote>';
    default: return '<p>' + innerHtml + '</p>';
  }
}

function renderPortableText(blocks) {
  if (!Array.isArray(blocks)) return '';

  var html = '';
  var inList = false;

  blocks.forEach(function (block) {
    var isBullet = block._type === 'block' && block.listItem === 'bullet';

    if (isBullet && !inList) { html += '<ul>'; inList = true; }
    if (!isBullet && inList) { html += '</ul>'; inList = false; }

    html += renderPortableTextBlock(block);
  });

  if (inList) html += '</ul>';

  return html;
}
