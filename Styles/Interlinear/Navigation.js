// XHTML_NS should already be defined in Main.js

// The file paths are relative to the other Interlinear XML files.
const BOOK_CHAPTERS = {
  '01-Genesis': 50,
  '02-Exodus': 40,
  '03-Leviticus': 27,
  '04-Numbers': 36,
  '05-Deuteronomy': 34,
  '06-Joshua': 24,
  '07-Judges': 21,
  '08-Ruth': 4,
  '09-1 Samuel': 31,
  '10-2 Samuel': 24,
  '11-1 Kings': 22,
  '12-2 Kings': 25,
  '13-1 Chronicles': 29,
  '14-2 Chronicles': 36,
  '15-Ezra': 10,
  '16-Nehemiah': 13,
  '17-Esther': 10,
  '18-Job': 42,
  '19-Psalms': 150,
  '20-Proverbs': 31,
  '21-Ecclesiastes': 12,
  '22-Song of Solomon': 8,
  '23-Isaiah': 66,
  '24-Jeremiah': 52,
  '25-Lamentations': 5,
  '26-Ezekiel': 48,
  '27-Daniel': 12,
  '28-Hosea': 14,
  '29-Joel': 3,
  '30-Amos': 9,
  '31-Obadiah': 1,
  '32-Jonah': 4,
  '33-Micah': 7,
  '34-Nahum': 3,
  '35-Habakkuk': 3,
  '36-Zephaniah': 3,
  '37-Haggai': 2,
  '38-Zechariah': 14,
  '39-Malachi': 4,
  '40-Matthew': 28,
  '41-Mark': 16,
  '42-Luke': 24,
  '43-John': 21,
  '44-Acts': 28,
  '45-Romans': 16,
  '46-1 Corinthians': 16,
  '47-2 Corinthians': 13,
  '48-Galatians': 6,
  '49-Ephesians': 6,
  '50-Philippians': 4,
  '51-Colossians': 4,
  '52-1 Thessalonians': 5,
  '53-2 Thessalonians': 3,
  '54-1 Timothy': 6,
  '55-2 Timothy': 4,
  '56-Titus': 3,
  '57-Philemon': 1,
  '58-Hebrews': 13,
  '59-James': 5,
  '60-1 Peter': 5,
  '61-2 Peter': 3,
  '62-1 John': 5,
  '63-2 John': 1,
  '64-3 John': 1,
  '65-Jude': 1,
  '66-Revelation': 22
};

// The file paths are relative to the other Interlinear XML files.
const xmlPath = (book, chapterNum) => {
  const nnn = chapterNum.toString().padStart(3, '0');
  return `../${book}/chapter-${nnn}.xml`;
}

const getCurr = () => {
  const parts = decodeURI(window.location.pathname).split('/').slice(-2);
  return {'book': parts[0], 'chapter': parts[1]};
}

const CURR = getCurr();

// Greek Uppercase.

const createNavigationGreekUppercase = () => {
  const sheet = new CSSStyleSheet();
  const ruleIndex = sheet.insertRule('greek {}', sheet.rules.length);
  const rule = sheet.cssRules[ruleIndex];
  document.adoptedStyleSheets.push(sheet);

  const label = document.createElementNS(XHTML_NS, "label");
  label.id = 'optionGreekUpper';
  label.textContent = '⍺➜Α';
  label.title = 'Show Greek in Uppercase.';
  label.setAttribute('testament', 'new');

  const check = document.createElementNS(XHTML_NS, "input");
  check.type = "checkbox";
  check.addEventListener('change', function(ev) {
    rule.style.fontVariant = this.checked ? 'small-caps' : '';
  })

  label.appendChild(check);
  return label;
}

// Link Denormalization (default is to normalize dictionary links).

const createNavigationLinkDenorm = () => {
  const label = document.createElementNS(XHTML_NS, "label");
  label.id = 'optionLinkDenorm';
  label.innerHTML = '<s>(:</s>🔗<s>ולְ)</s>';
  label.title = 'Do not normalize dictionary links.';
  label.setAttribute('testament', 'old');

  const check = document.createElementNS(XHTML_NS, "input");
  check.type = "checkbox";

  label.appendChild(check);
  return label;
}

const makeBookSelectOnChange = (hierarchy, chapterSelect, goSubmit) => {
  return (e) => {
    // Remove all chapters.
    chapterSelect.textContent = '';

    const book = e.target.value;
    let num = 1;
    let currXML;

    for (const xml of hierarchy[book]) {
      const option = document.createElementNS(XHTML_NS, 'option');
      option.setAttribute('value', xml);

      const parts = xml.split('/').slice(-2);
      const chapter = parts[1];
      let text = num;
      if (book === CURR.book && chapter === CURR.chapter) {
        text = text + ' •';
        currXML = xml;
      }
      option.appendChild(document.createTextNode(text));
      chapterSelect.appendChild(option);
      num += 1;
    }

    if (typeof currXML === 'string') {
      chapterSelect.value = currXML;
    }
    chapterSelect.onchange = (e) => {
      goSubmit.setAttribute('formaction', chapterSelect.value);
    };
    chapterSelect.dispatchEvent(new Event('change'));
  };
};

const populateNavigationForm = (hierarchy, navForm) => {
  if (window.location.hostname !== "") {
    navForm.innerHTML = '<a href="/" title="Go to home" class="home">⛪️</a> ';
  }

  const bookSelect = document.createElementNS(XHTML_NS, 'select');
  navForm.appendChild(bookSelect);

  navForm.appendChild(document.createTextNode(' ❯ '));

  const chapterSelect = document.createElementNS(XHTML_NS, 'select');
  navForm.appendChild(chapterSelect);

  navForm.appendChild(document.createTextNode(' ❯ '));

  const goSubmit = document.createElementNS(XHTML_NS, 'input');
  goSubmit.setAttribute('type', 'submit');
  goSubmit.setAttribute('value', '🔎');
  navForm.appendChild(goSubmit);

  for (const book in BOOK_CHAPTERS) {
    const parts = book.split('-');
    let text = parts[1];

    const option = document.createElementNS(XHTML_NS, 'option');
    option.setAttribute('value', book);
    if (CURR.book === book) {
      text += ' •';
    }
    option.appendChild(document.createTextNode(text));
    bookSelect.appendChild(option);
  }

  const selectOnChange = makeBookSelectOnChange(
    hierarchy, chapterSelect, goSubmit);
  bookSelect.addEventListener('change', selectOnChange);
  bookSelect.value = CURR.book;
  bookSelect.dispatchEvent(new Event('change'));
}

// Modified from: https://www.reshot.com/free-svg-icons/chevron-arrow/
const LEFT_ARROW = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="1 1 22 22"><path d="M15.293 7.293 10.586 12l4.707 4.707 1.414-1.414L13.414 12l3.293-3.293-1.414-1.414z"/><path d="m12.707 8.707-1.414-1.414L6.586 12l4.707 4.707 1.414-1.414L9.414 12l3.293-3.293z"/></svg>';
const RIGHT_ARROW = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="1 1 22 22"><path d="M8.707 7.293 7.293 8.707 10.586 12l-3.293 3.293 1.414 1.414L13.414 12 8.707 7.293z"/><path d="M11.293 8.707 14.586 12l-3.293 3.293 1.414 1.414L17.414 12l-4.707-4.707-1.414 1.414z"/></svg>';

const initializeNavigation = () => {
  // First convert the interlinearXMLs to a hierarchy.
  let hierarchy = {};  // Maps from directory name to a list of files there.
  let xmls = [];

  for (const book in BOOK_CHAPTERS) {
    hierarchy[book] = [];
    const numChapters = BOOK_CHAPTERS[book];
    for (let i = 1; i <= numChapters; ++i) {
      const path = xmlPath(book, i);
      hierarchy[book].push(path);
      xmls.push(path);
    }
  }

  const currXML = `../${CURR.book}/${CURR.chapter}`;
  const currPos = xmls.indexOf(currXML);

  const nav = document.createElementNS(XHTML_NS, 'nav');

  const aPrev = document.createElementNS(XHTML_NS, 'a');
  aPrev.id = 'prev';
  aPrev.title = 'Previous';
  aPrev.innerHTML = LEFT_ARROW;
  if (currPos > 0) {
    aPrev.href = xmls[currPos - 1];
  }
  nav.appendChild(aPrev);

  const navForm = document.createElementNS(XHTML_NS, 'form');
  nav.appendChild(navForm);

  const aNext = document.createElementNS(XHTML_NS, 'a');
  aNext.id = 'next';
  aNext.title = 'Next';
  aNext.innerHTML = RIGHT_ARROW;
  if (currPos < xmls.length - 1) {
    aNext.href = xmls[currPos + 1];
  }
  nav.appendChild(aNext);

  nav.appendChild(createNavigationGreekUppercase());
  nav.appendChild(createNavigationLinkDenorm());

  populateNavigationForm(hierarchy, navForm);

  document.documentElement.insertBefore(
    nav, document.documentElement.firstChild);
};
