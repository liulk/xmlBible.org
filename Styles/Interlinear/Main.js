window.onload = function() {
  const xmlns = 'xmlns="http://www.w3.org/1999/xhtml"';
  const words = document.getElementsByTagName('word');
  for (let i = 0; i < words.length; ++i) {
    const s = words[i].getElementsByTagName('strongs')[0];
    const sn = s.textContent;
    if (!sn) {
      continue;
    }

    const isHebrew = words[i].getElementsByTagName('hebrew').length > 0;
    const isGreek = words[i].getElementsByTagName('greek').length > 0;
    let hrefPrefix;
    if (isHebrew) {
      hrefPrefix = 'https://biblehub.com/hebrew';
    } else if (isGreek) {
      hrefPrefix = 'https://biblehub.com/greek';
    } else {
      continue;
    }
    s.innerHTML = `<a ${xmlns} href="${hrefPrefix}/${sn}.htm">${sn}</a>`;
  }
}
