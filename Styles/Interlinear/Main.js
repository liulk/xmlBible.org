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

// Builds dictionary menu of the form:
//
// <label dictionary="dictionary">
//   ${text}
//   <menu>
//     <li><a popup="popup" href="${links[i].url + text}">${links[i].html}</a></li>
//     <li>...</li>
//   </menu>
// </label>
function dictionaryLinks(text, links) {
  const menu = document.createElementNS(XHTML_NS, 'menu');
  for (const link of links) {
    const li = document.createElementNS(XHTML_NS, 'li');
    li.innerHTML =
      `<a popup="popup" href="${link.url + text}">${link.html}</a>`;
    menu.appendChild(li);
  }

  const label = document.createElementNS(XHTML_NS, 'label');
  label.setAttribute('dictionary', 'dictionary');
  label.innerHTML = text;
  label.appendChild(menu);
  return label;
}

function annotateLangLinks(word, tagName, links) {
  const langTags = word.getElementsByTagName(tagName);
  if (!langTags.length) {
    return false;
  }
  const langTag = langTags[0];
  const label = dictionaryLinks(langTag.textContent, links);
  langTag.innerHTML = '';
  langTag.appendChild(label);
  return true;
}

const HEBREW_DICT_LINKS = [
  {
    'url': 'https://www.pealim.com/search/?q=',
    'html': '<img src="../../Styles/Interlinear/Assets/pealim.png"></img>',
  }
];

const GREEK_DICT_LINKS = [
  {
    'url': 'https://logeion.uchicago.edu/',
    'html': '<img src="../../Styles/Interlinear/Assets/logeion.ico"></img>',
  }
];

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

    const isHebrew = annotateLangLinks(w, 'hebrew', HEBREW_DICT_LINKS);
    const isGreek = annotateLangLinks(w, 'greek', GREEK_DICT_LINKS);
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
    const snDef = entry?.strongs_def || '';
    sd.innerHTML =
      `<a xmlns="${XHTML_NS}" href="${hrefPrefix}/${sn}.htm">${snDef}</a>`;
    w.insertBefore(sd, strongs.nextSibling);

    const ed = document.createElement('english-definition');
    ed.appendChild(document.createTextNode(entry?.kjv_def || ''));
    w.insertBefore(ed, english.nextSibling);
  }
}

// Begin section to render verse preview from the words of a given
// language.  This is an experimental feature.
//
//   - By default, word ordering comes from the <word num="N"> that
//     the language tag belongs to.  The language tag may override the
//     ordering with its own "num" attribute by specifying a numerical
//     value "N" or an adjustment: "+n" to move forward, "-n" to move
//     backward, or just "-" to omit the word.
//
//   - Words with the text content '-' for the language will be
//     omitted.
//
//   - The "before" and "after" attributes of the language tag can be
//     used to add punctuation or commentary around this word.
//
//   - The "render" attribute overrides the text content of this
//     language and provides a render string.  The render string can
//     reference another word's text content, e.g. "And {N} said"
//     where the text content from the original word number "N" is
//     substituted for "{N}".  The reference can also be an offset,
//     e.g. "+n" for the nth word ahead, or "-n" for the nth word
//     behind.

function mapWordNumToLang(langs) {
  const a = new Array(langs.length + 1);
  let n = 1;
  for (const lang of langs) {
    const wordNum = lang.parentNode.getAttribute('num') || n;
    a[wordNum] = lang;
  }
  return a;
}

function getLangNum(lang) {
  const wordNum = parseInt(lang.parentNode.getAttribute('num'));
  if (!lang.hasAttribute('num')) {
    return wordNum;
  }
  const langNum = lang.getAttribute('num');
  if (langNum[0] === '+' || langNum[0] === '-') {
    return wordNum + parseInt(langNum);
  }
  return parseInt(langNum);
}

function sortLangs(langs) {
  return [...langs].filter((lang) => {
    const trimmed = lang.textContent.trim();
    return (
      lang.getAttribute('num') !== '-' &&
        trimmed != '-' &&
        trimmed != '－');
  }).map((lang) => {
    return {
      'langNum': getLangNum(lang),
      'lang': lang,
      'precedence': lang.hasAttribute('num') ? 0 : 1,
    };
  }).sort((a, b) => {
    if (a.langNum != b.langNum) {
      return a.langNum - b.langNum;
    }
    return a.precedence - b.precedence;
  }).map((s) => s.lang);
}

function renderLang(wordNumToLangMap, lang) {
  let render;

  if (!lang.hasAttribute('render')) {
    render = lang.textContent;
  } else {
    const thisNum = parseInt(lang.parentNode.getAttribute('num'));
    render = lang.getAttribute('render').replace(/\{[+\-]?\d+\}/g, (match) => {
      let inside = match.substring(1, match.length - 1);
      let thatNum = 0;
      if (inside[0] === '+' || inside[0] === '-') {
        thatNum = thisNum + parseInt(inside);
      } else {
        thatNum = parseInt(inside);
      }
      return wordNumToLangMap[thatNum]?.textContent || '';
    });
  }

  const before = lang.getAttribute('before') || '';
  const after = lang.getAttribute('after') || '';

  render = render.replace('&nbsp;', ' ');
  return before + render + after;
}

function renderVersePreview(verse, langTag, joiner) {
  const langs = verse.getElementsByTagName(langTag);
  const wordNumToLangMap = mapWordNumToLang(langs);
  const sorted = sortLangs(langs);
  const rendered = sorted.map((lang) => renderLang(wordNumToLangMap, lang));

  const e = document.createElement(langTag);
  e.textContent = rendered.join(joiner);
  return e;
}

// End section to render verse preview.

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
