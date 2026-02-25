const XHTML_NS = 'http://www.w3.org/1999/xhtml';

function asciify(text) {
  return text.replaceAll(/\s+/g, ' ').replaceAll('‑', '-');
}

const HEBREW_REGEXPS = {
  // \p{Mn} is the "Combination Mark for Non-space" for the cantillation marks.
  'Art': /^ה\p{Mn}*/u,
  'Conj-w': /^ו\p{Mn}*/u,
  'Prep-b': /^ב\p{Mn}*/u,
  'Prep-k': /^כ\p{Mn}*/u,
  'Prep-l': /^ל\p{Mn}*/u,
  'Prep-m': /^מ\p{Mn}*/u,
};

function trimPunctuation(text) {
  return text.replaceAll(/\p{P}/ug, '');
}

function trimHebrew(text, pos) {
  pos = asciify(pos);
  if (pos.indexOf('|') < 0) {
    return text;
  }
  const prefixes = pos.split('|')[0].split(',');

  for (const prefix of prefixes) {
    const re = HEBREW_REGEXPS[prefix.trim()];
    if (re) {
      text = text.replace(re, '');
    }
  }
  return text;
}

// Builds dictionary menu of the form:
//
// <menu>
//   <li><a popup="popup" href="${links[i].url + text}">${links[i].html}</a></li>
//   <li>...</li>
// </menu>
function dictionaryLinks(mode, tagName, text, lemma, pos, links) {
  let key;
  switch (mode) {
  case 'trimmed':
    key = trimPunctuation(text);
    if (tagName === 'hebrew') {
      key = trimHebrew(key, pos);
    }
    break;

  case 'untrimmed':
    key = text;
    break;

  case 'lemma':
    key = lemma;
    break;
  }

  const menu = document.createElementNS(XHTML_NS, 'menu');
  for (const link of links) {
    const li = document.createElementNS(XHTML_NS, 'li');
    li.innerHTML =
      `<a popup="popup" href="${link.url + encodeURI(key)}">${link.html}</a>`;
    menu.appendChild(li);
  }
  return menu;
}

// Builds label as a mouse trap.
//
// <label dictionary="dictionary">
//   <${tagName}>${text}</${tagName}>
//   <menu><!-- to be created by dictionaryLinks() --></menu>
// </label>
function createLangLabel(tagName, text) {
  const lang = document.createElement(tagName);
  lang.textContent = text;

  const label = document.createElementNS(XHTML_NS, 'label');
  label.setAttribute('dictionary', 'dictionary');
  label.appendChild(lang);
  return label;
}

const HEBREW_DICT_LINKS = [
  {
    'url': 'https://www.pealim.com/search/?q=',
    'html': '<img src="../../Styles/Interlinear/Assets/pealim.png"></img>',
  },
  {
    'url': 'https://context.reverso.net/translation/hebrew-english/',
    'html': '<img src="../../Styles/Interlinear/Assets/reverso.ico"></img>',
  },
  {
    'url': 'https://en.wiktionary.org/wiki/Special:Search?go=1&amp;search=',
    'html': '<img src="../../Styles/Interlinear/Assets/wiktionary.ico"></img>',
  }
];

const GREEK_DICT_LINKS = [
  {
    'url': 'https://logeion.uchicago.edu/',
    'html': '<img src="../../Styles/Interlinear/Assets/logeion.ico"></img>',
  },
  {
    'url': 'https://en.wiktionary.org/wiki/Special:Search?go=1&amp;search=',
    'html': '<img src="../../Styles/Interlinear/Assets/wiktionary.ico"></img>',
  }
];

function annotateWord(word) {
  const pos = word.getElementsByTagName('pos')[0];

  const hebrew = word.getElementsByTagName('hebrew')[0];
  const greek = word.getElementsByTagName('greek')[0];
  const lang = hebrew || greek;
  if (!lang) {
    return;
  }

  const english = word.getElementsByTagName('english')[0];
  const strongs = word.getElementsByTagName('strongs')[0];
  const sn = strongs.textContent;

  let entry, links, prefix;
  if (hebrew && typeof strongsHebrewDictionary === 'object') {
    entry = strongsHebrewDictionary['H'+sn];
    links = HEBREW_DICT_LINKS;
    prefix = 'https://biblehub.com/hebrew';
  } else if (greek && typeof strongsGreekDictionary === 'object') {
    entry = strongsGreekDictionary['G'+sn];
    links = GREEK_DICT_LINKS;
    prefix = 'https://biblehub.com/greek';
  }

  const label = createLangLabel(lang?.tagName, lang?.textContent);
  label.appendChild(document.createElementNS(XHTML_NS, 'menu'));  // Dummy.

  label.addEventListener('mouseenter', (e) => {
    const mode = document.getElementById('optionLinkMode')?.value;
    const oldMenu = label.getElementsByTagName('menu')[0];
    const newMenu = dictionaryLinks(
      mode,
      lang?.tagName,
      lang?.textContent,
      entry?.lemma,
      pos?.textContent,
      links);
    label.replaceChild(newMenu, oldMenu);
  });

  word.replaceChild(label, lang);

  const snLinkHTML =
        `<a xmlns="${XHTML_NS}" href="${prefix}/${sn}.htm">${sn}</a>`;
  strongs.innerHTML = snLinkHTML;

  if (!entry) {
    return;
  }

  const sd = document.createElement('strongs-definition');
  const snDef = entry?.strongs_def || '';
  sd.innerHTML =
    `<a xmlns="${XHTML_NS}" href="${prefix}/${sn}.htm">${snDef}</a>`;
  word.insertBefore(sd, strongs.nextSibling);

  const ed = document.createElement('english-definition');
  ed.appendChild(document.createTextNode(entry?.kjv_def || ''));
  word.insertBefore(ed, english.nextSibling);
}

function addStrongsLinksAndDefinitions(words) {
  for (const word of words) {
    annotateWord(word);
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

  render = asciify(render);
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
