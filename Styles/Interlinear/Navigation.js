// The file paths are relative to the other Interlinear XML files.
const bookChapters = {
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
  '22-Ruth': 8,
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

const makeBookSelectOnChange = (hierarchy, chapterSelect, goSubmit) => {
  const XHTML_NS = 'http://www.w3.org/1999/xhtml';

  const currParts = decodeURI(window.location.pathname).split('/').slice(-2);
  const currBook = currParts[0];
  const currChapter = currParts[1];

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
      if (book === currBook && chapter === currChapter) {
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

const initializeNavigation = () => {
  const XHTML_NS = 'http://www.w3.org/1999/xhtml';

  // First convert the interlinearXMLs to a hierarchy.
  let hierarchy = {};  // Maps from directory name to a list of files there.
  let xmls = [];

  for (const book in bookChapters) {
    hierarchy[book] = [];
    const numChapters = bookChapters[book];
    for (let i = 1; i <= numChapters; ++i) {
      const path = xmlPath(book, i);
      hierarchy[book].push(path);
      xmls.push(path);
    }
  }

  const currParts = decodeURI(window.location.pathname).split('/').slice(-2);
  const currBook = currParts[0];
  const currChapter = currParts[1];
  const currXML = `../${currBook}/${currChapter}`;
  const currPos = xmls.indexOf(currXML);

  const nav = document.createElementNS(XHTML_NS, 'nav');

  const aPrev = document.createElementNS(XHTML_NS, 'a');
  aPrev.id = 'prev';
  aPrev.title = 'Previous';
  aPrev.textContent = '🡄 ';
  if (currPos > 0) {
    aPrev.href = xmls[currPos - 1];
  }
  nav.appendChild(aPrev);

  const navForm = document.createElementNS(XHTML_NS, 'form');
  nav.appendChild(navForm);

  const aNext = document.createElementNS(XHTML_NS, 'a');
  aNext.id = 'next';
  aNext.title = 'Next';
  aNext.textContent = ' 🡆';
  if (currPos < xmls.length - 1) {
    aNext.href = xmls[currPos + 1];
  }
  nav.appendChild(aNext);

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

  for (const book in bookChapters) {
    const parts = book.split('-');
    let text = parts[1];

    const option = document.createElementNS(XHTML_NS, 'option');
    option.setAttribute('value', book);
    if (currBook == book) {
      text += ' •';
    }
    option.appendChild(document.createTextNode(text));
    bookSelect.appendChild(option);
  }

  const selectOnChange = makeBookSelectOnChange(
    hierarchy, chapterSelect, goSubmit);
  bookSelect.addEventListener('change', selectOnChange);
  bookSelect.value = currBook;
  bookSelect.dispatchEvent(new Event('change'));

  document.documentElement.insertBefore(
    nav, document.documentElement.firstChild);
};
