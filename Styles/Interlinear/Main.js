const XHTML_NS = 'http://www.w3.org/1999/xhtml';

function getLangTags(words) {
  const count = {};
  for (const w of words) {
    for (const child of w.children) {
      if (child.nodeType !== child.ELEMENT_NODE) {
        continue;
      }
      ++count[child.tagName];
    }
  }
  return count;
}

function addStrongsLinksAndDefinitions(words) {
  // Check if the dictionaries have been loaded sucessfully.
  const hasDict = (typeof strongsGreekDictionary === 'object' &&
                   typeof strongsHebrewDictionary === 'object');

  for (const w of words) {
    const strongs = w.getElementsByTagName('strongs')[0];
    const english = w.getElementsByTagName('english')[0];
    const sn = strongs.textContent;
    if (!sn) {
      continue;
    }

    const isHebrew = w.getElementsByTagName('hebrew').length > 0;
    const isGreek = w.getElementsByTagName('greek').length > 0;
    if (!isHebrew && !isGreek) {
      continue;
    }

    let hrefPrefix;
    if (isHebrew) {
      hrefPrefix = 'https://biblehub.com/hebrew';
    } else if (isGreek) {
      hrefPrefix = 'https://biblehub.com/greek';
    }
    const snLinkHTML =
          `<a xmlns="${XHTML_NS}" href="${hrefPrefix}/${sn}.htm">${sn}</a>`;
    strongs.innerHTML = snLinkHTML;

    if (!hasDict) {
      continue;
    }

    let entry;
    if (isHebrew) {
      entry = strongsHebrewDictionary["H"+sn];
    } else if (isGreek) {
      entry = strongsGreekDictionary["G"+sn];
    }

    const sd = document.createElement('strongs-definition');
    sd.innerHTML = `[${snLinkHTML}] `;
    sd.appendChild(document.createTextNode(entry?.strongs_def || ''));
    w.insertBefore(sd, strongs.nextSibling);

    const ed = document.createElement('english-definition');
    ed.appendChild(document.createTextNode(entry?.kjv_def || ''));
    w.insertBefore(ed, english.nextSibling);
  }
}

// renderVersePreview renders the language tags of the words into a
// verse.  This is very experimental.
//
//   - Word ordering can be manipulated via the "order" attribute.
//     The meaning is subject to change.
//
//   - Text content '-' will be omitted.
//
//   - TODO: add "before" and "after" text support for punctuation.
//
//   - TODO: "And-verb-subject" handling of Hebrew (or maybe using
//     render instruction?)
//
//   - TODO: render instruction, e.g. render="And {2} said,"
function renderVersePreview(verse, langTag, joiner) {
  const langWords = verse.getElementsByTagName(langTag);
  let ordered = [...langWords].filter((e) => {
    const trimmed = e.textContent.trim();
    const validOrder = !isNaN(parseInt(e.getAttribute('order') || '0'));
    return (
      validOrder &&
        trimmed != '-' &&
        trimmed != '－'
    );
  }).sort((a, b) => {
    const aorder = parseInt(a.getAttribute('order') || '0');
    const border = parseInt(b.getAttribute('order') || '0');
    return aorder - border;
  }).map((e) => e.textContent);

  const e = document.createElement(langTag);
  e.textContent = ordered.join(joiner);
  return e;
}

// The values are also the joiners for the language.
const PREVIEW_LANGS = {'english': ' ', 'chinese': ''};

window.addEventListener('load', (e) => {
  // Check if the navigation has been loaded successfully.
  if (typeof initializeNavigation === 'function') {
    initializeNavigation();
  }

  const verses = document.getElementsByTagName('verse');
  for (const verse of verses) {
    const words = verse.getElementsByTagName('word');
    if (!words.length) {
      continue;
    }

    const langTags = getLangTags(words);
    addStrongsLinksAndDefinitions(words);

    if (!langTags) {
      continue;
    }
    const preview = document.createElement('preview');
    for (const langTag in langTags) {
      if (langTag in PREVIEW_LANGS) {
        const lang = renderVersePreview(verse, langTag, PREVIEW_LANGS[langTag]);
        preview.appendChild(lang);
      }
    }
    verse.insertBefore(preview, words[0]);
  }
});

const loadScripts = () => {
  // The script paths are relative to the Interlinear XML files.
  const scripts = [
    '../../Styles/Interlinear/Navigation.js',
    '../../Strongs/greek/strongs-greek-dictionary.js',
    '../../Strongs/hebrew/strongs-hebrew-dictionary.js'
  ];
  for (const s of scripts) {
    const script = document.createElementNS(XHTML_NS, 'script');
    script.src = s;
    document.documentElement.appendChild(script);
  }
};

module = {};
loadScripts();
