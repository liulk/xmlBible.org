#!/usr/bin/env python3

'''Imports the fhl.net sqlite3 unv tables to xmlBible.org Interlinear XML.'''

import argparse
import collections
import contextlib
import dataclasses
import glob
import io
import logging
import os
import re
import sqlite3
import sys
import unicodedata

from typing import Dict, List, Optional, Set, Tuple


def Parser() -> argparse.ArgumentParser:
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument(
      '--lparsing', metavar='DB', default='lparsing.d/lparsing.db',
      help='The lparsing (Hebrew) database in sqlite3, e.g. lparsing.db')
  parser.add_argument(
      '--fhlwhparsing', metavar='DB', default='fhlwhparsing.d/fhlwhparsing.db',
      help='The fhlwhparsing (Greek) database in sqlite3, e.g. fhlwhparsing.db')
  parser.add_argument(
      '--unv', metavar='DB', default='bible_little.db',
      help='The unv database in sqlite3, e.g. bible_little.db')
  parser.add_argument(
      '--interlinear-xml-dir', metavar='DIR', default='../Interlinear',
      help='The directory containing xmlBible.org Interlinear XML files.')
  parser.add_argument(
      '--output-dir', metavar='DIR', required=True,
      help='The output directory of the processed XML files.  '
      'Existing files are skipped.  Files getting fatal errors are '
      'renamed with an .error suffix.  Running again will resume after the '
      'last successful file.')
  return parser


PARSER = Parser()


@dataclasses.dataclass
class Context:
  """Opens and closes the required sqlite3 connections."""

  lparsing: Optional[sqlite3.Connection]
  fhlwhparsing: Optional[sqlite3.Connection]
  unv: Optional[sqlite3.Connection]

  def close(self):
    for db in self.lparsing, self.fhlwhparsing, self.unv:
      if db:
        db.close()

  @staticmethod
  def _uri_readonly(dbname):
    return f'file:{dbname}?mode=ro'

  @classmethod
  def connect(cls, args: argparse.Namespace):
    ctx = cls(None, None, None)
    try:
      ctx.lparsing = sqlite3.connect(
        cls._uri_readonly(args.lparsing), uri=True)
      ctx.fhlwhparsing = sqlite3.connect(
        cls._uri_readonly(args.fhlwhparsing), uri=True)
      ctx.unv = sqlite3.connect(
        cls._uri_readonly(args.unv), uri=True)
      complete_ctx, ctx = ctx, None
      return complete_ctx
    finally:
      if ctx:
        ctx.close()


def Main():
  args = PARSER.parse_args()

  xmls = glob.glob(os.path.join(args.interlinear_xml_dir, '*/*.xml'))
  if len(xmls) != 1189:
    logging.error(
        'The --interlinear_xml_dir does not have the expected number of files: '
        'got %d, want %d: %s',
        len(xmls), 1189, args.output)
    return 1

  xmls.sort()

  with contextlib.closing(Context.connect(args)) as ctx:
    for in_xml in xmls:
      stem = os.path.relpath(in_xml, args.interlinear_xml_dir)
      out_xml = os.path.join(args.output_dir, stem)
      if os.path.exists(out_xml):
        logging.warning('Skipping already exists: %s', out_xml)
        continue

      logging.info('Processing: %s', stem)
      dirname = os.path.dirname(out_xml)
      if not os.path.isdir(dirname):
        os.makedirs(dirname)

      try:
        out_file = open(out_xml, 'x')
      except FileExistsError:
        logging.warning('Skipping already created: %s', out_xml)
        continue

      with open(in_xml) as in_file, out_file:
        try:
          Process(ctx, out_file, in_file)
        except:
          os.rename(out_xml, out_xml + '.error')
          raise


# Maps from the book id attribute in the Interlinear XML to the 'engs'
# key used by the unv table in fhl.net sqlite3.  In lparsing and
# fhwhparsing (but not unv), the engs key has padded trailing
# whitespaces to 8 characters.
BOOKS = (
  '',           # 0
  'Gen',        # 1
  'Ex',         # 2
  'Lev',        # 3
  'Num',        # 4
  'Deut',       # 5
  'Josh',       # 6
  'Judg',       # 7
  'Ruth',       # 8
  '1 Sam',      # 9
  '2 Sam',      # 10
  '1 Kin',      # 11
  '2 Kin',      # 12
  '1 Chr',      # 13
  '2 Chr',      # 14
  'Ezra',       # 15
  'Neh',        # 16
  'Esth',       # 17
  'Job',        # 18
  'Ps',         # 19
  'Prov',       # 20
  'Eccl',       # 21
  'Song',       # 22
  'Is',         # 23
  'Jer',        # 24
  'Lam',        # 25
  'Ezek',       # 26
  'Dan',        # 27
  'Hos',        # 28
  'Joel',       # 29
  'Amos',       # 30
  'Obad',       # 31
  'Jon',        # 32
  'Mic',        # 33
  'Nah',        # 34
  'Hab',        # 35
  'Zeph',       # 36
  'Hag',        # 37
  'Zech',       # 38
  'Mal',        # 39
  'Matt',       # 40
  'Mark',       # 41
  'Luke',       # 42
  'John',       # 43
  'Acts',       # 44
  'Rom',        # 45
  '1 Cor',      # 46
  '2 Cor',      # 47
  'Gal',        # 48
  'Eph',        # 49
  'Phil',       # 50
  'Col',        # 51
  '1 Thess',    # 52
  '2 Thess',    # 53
  '1 Tim',      # 54
  '2 Tim',      # 55
  'Titus',      # 56
  'Philem',     # 57
  'Heb',        # 58
  'James',      # 59
  '1 Pet',      # 60
  '2 Pet',      # 61
  '1 John',     # 62
  '2 John',     # 63
  '3 John',     # 64
  'Jude',       # 65
  'Rev',        # 66
)


# Some database notes:
#
#   - In all of the fhl tables: engs is the book key, chap is the
#     chapter number, sec is the verse number.
#
#   - lparsing.engs and fhlwhparsing.engs are padded with space to 8
#     characters, but unv.engs is not padded.
#
#   - lparsing.wid and fhlwhparsing.wid are the word number in the
#     original text, which should be the same as the Interlinear word
#     number; except wid = 0 is the whole verse.
#
#   - lparsing.exp and fhlwhparsing.exp are the abbreviated Chinese
#     definition of the word.
#
#   - For Strong's numbers, fhlwhparsing.osn should be used instead of
#     fhlwhparsing.sn (lparsing has no osn; just use lparsing.sn).
#
#   - All Strong's numbers keys in fhl databases are zero padded to 5
#     digits, e.g. lparsing.sn, fhlwhparsing.sn, fhlwhparsing.osn,
#     hfhl.hsnum, gfhl.gsnum.
#
#   - The (sn, exp) in lparsing or (osn, exp) in fhlwhparsing may
#     differ for each word occurrence.

# Notes about unv.txt:
#
#     - '<WH00000>' / '<WG00000>' is the Hebrew / Greek Strong's
#       number of the preceding text segment.  There can be multiple
#       Strong's numbers per text segment.
#
#     - '<WAH00000>' / '<WAG00000>' and '<WTH00000>' / '<WTG00000>'
#       are not Strong's numbers, but point to special Hebrew / Greek
#       annotations in fhl databases.
#
#     - '{<WH00000>}' / '{<WG00000>}' is the Strong's number for a
#       word that is not translated in Chinese.
#
#     - The words may be out of order relative to the wid.
UNV_RE = re.compile(r'(.*?)((<.*?>)+)|([^<>]+)$')
UNV_NO_TRANS_RE = re.compile(r'{<.*?>}')
DIGITS_RE = re.compile(r'(\d+)')


def LettersOnly(s: str) -> str:
  """Returns a string containing only letters from s."""
  return ''.join(c for c in s if unicodedata.category(c).startswith('L'))


def DigitsOnly(s: str) -> str:
  """Returns a string containing only digits from s."""
  return ''.join(c for c in s if c.isdigit())


# Since the word numbering can go out of sync between Interlinear XML
# and fhl databases, the FIFO allows us to consume the text or definition
# in the order they occur, falling back to the last one if completely
# exhausted.

OMISSION = '－'


def CleanUpNoTrans(unv_txt: str) -> str:
  """Cleans up words with no translation."""
  return UNV_NO_TRANS_RE.sub('', unv_txt)


def CleanUpTrailing(unv_txt: str) -> str:
  """Cleans up trailing text.

  Example:
    '運行<WH07363><WTH8764>在<WH05921>水<WH04325>面<WH06440>上。' becomes
    '運行<WH07363><WTH8764>在<WH05921>水<WH04325>面上。<WH06440>'
  """
  matches = list(UNV_RE.finditer(unv_txt))
  if len(matches) < 2:
    return unv_txt
  trail_txt = matches[-1].group(4)
  if not trail_txt:
    return unv_txt  # No trailing text.
  prior_word = matches[-2].group(1)
  prior_word_at = matches[-2].span()[0]
  prior_word_sn_tags = matches[-2].group(2)
  return unv_txt[:prior_word_at] + prior_word + trail_txt + prior_word_sn_tags


def CleanUp(unv_txt: str) -> str:
  unv_txt = CleanUpNoTrans(unv_txt)
  unv_txt = CleanUpTrailing(unv_txt)
  return unv_txt


def StrongsToUNV(unv_txt: str) -> Dict[int, str]:
  """Builds a map from Strong's number in int to the unv text."""
  d = {}
  prev_sn_tags = ''
  for txt, sn_tags, _, _ in UNV_RE.findall(unv_txt):
    if not txt:
      continue
    for sn in DIGITS_RE.findall(sn_tags):
      sn = int(sn, 10)
      d[sn] = LettersOnly(txt)
  return d


def StrongsToFIFO(unv_txt: str) -> Dict[int, List[str]]:
  """Like StrongsToUNV, but keeps ordering for multiple occurrences."""
  d = collections.defaultdict(list)
  for txt, sn_tags, _, _ in UNV_RE.findall(unv_txt):
    if not txt:
      continue
    for sn in DIGITS_RE.findall(sn_tags):
      sn = int(sn, 10)
      d[sn].append(LettersOnly(txt))
  return d


def StrongsToExp(words_exp: List[Tuple[int, str, str, str]]) -> Dict[int, str]:
  """Builds a map from Strong's number to the parsing exp."""
  d = {}
  for wid, osn, sn, exp in words_exp:
    for n in DIGITS_RE.findall(f'{osn} {sn}'):
      d[int(n, 10)] = exp
  return d


def StrongsToExpFIFO(words_exp: List[Tuple[int, str, str, str]]) -> Dict[
    int, List[str]]:
  """Like StrongsToExp, but keeps ordering for multiple occurrences."""
  d = collections.defaultdict(list)
  for wid, osn, sn, exp in words_exp:
    osn, sn = osn.strip(), sn.strip()
    if osn:
      try:
        d[int(osn, 10)].append(exp)
      except ValueError:
        logging.exception('osn is not an integer: %s', osn)
    if sn and sn != osn:
      try:
        d[int(sn, 10)].append(exp)
      except ValueError:
        logging.exception('sn is not an integer: %s', sn)
  return d


RE_BOOK = re.compile(r'<book name="(.*?)" id="(.*?)" testament="(.*?)">')
RE_CHAPTER = re.compile(r'<chapter num="(.*?)">')
RE_VERSE = re.compile(r'<verse num="(.*?)">')
RE_WORD = re.compile(r'<word num="(.*?)">')
RE_STRONGS = re.compile(r'<strongs>(.*?)</strongs>')

# Also <chinese unaudited="unaudited">
RE_CHINESE = re.compile(r'<chinese.*?>.*</chinese>')
UNAUDITED = ' unaudited="unaudited"'

CHINESE_DEFINITION = '<chinese-definition>'
WORD_END = '</word>'
VERSE_END = '</verse>'


def Process(ctx: Context, out_file: io.TextIOBase, in_file: io.TextIOBase):
  """Combines the fhl databases in ctx and the Interlinear XML.

  From the in_xml, each <word> will be appended two more keys:

    - <chinese unaudited="unaudited"> will contain the corresponding
      text from the unv table for the word.

    - <chinese-definition> will lookup the 'exp' column of that word from
      either ctx.lparsing (for Hebrew) or ctx.fhlwhparsing (for Greek).

  The input XML will be processed as text, rather than parsed as XML.
  This is to keep the formatting intact.

  If <chinese> already exists for a word and has been audited (where
  the unaudited="unaudited" attribute has been removed), the audited
  version will be preserved.  The <chinese-definition> is always
  updated from the database.

  Args:
    ctx: The fhl databases.
    out_file: The output file object.
    in_file: The input file object.

  """
  book_id = 0
  book_testament = ''
  chapter_num = 0
  verse_num = 0
  word_num = 0
  strongs_num = 0
  is_audited = False

  # States updated per verse.
  words_exp = []  # List[Tuple[wid: int, osn: str, sn: str, exp: str]]
  words_fifo = {}
  sn_exp = {}
  strongs_fifo_map = {}
  strongs_unv_map = {}

  for line in in_file:
    if line.startswith('<?xml'):
      out_file.write(line)
      continue

    m = RE_BOOK.search(line)
    if m:
      book_id = int(m.group(2))
      book_testament = m.group(3)
      out_file.write(line)
      continue

    m = RE_CHAPTER.search(line)
    if m:
      chapter_num = int(m.group(1))
      out_file.write(line)
      continue

    m = RE_VERSE.search(line)
    if m:
      verse_num = int(m.group(1))
      if not book_id or not book_testament or not chapter_num or not verse_num:
        logging.error(
            'verse found with one of the following missing: '
            'book_id = %r, book_testament = %r, chapter_num = %r, '
            'verse_num = %r',
            book_id, book_testament, chapter_num, verse_num)
        out_file.write(line)
        continue

      table = ''
      engs = f'{BOOKS[book_id]:<8}'

      if book_testament == 'old':
        table = 'lparsing'
        with contextlib.closing(ctx.lparsing.execute(
            'SELECT wid, sn, sn, exp FROM lparsing WHERE '
            '  engs = ? AND chap = ? AND sec = ? '
            'ORDER BY wid', (
                engs,
                chapter_num,
                verse_num,
            ))) as cur:
          words_exp = cur.fetchall()
      elif book_testament == 'new':
        table = 'fhlwhparsing'
        with contextlib.closing(ctx.fhlwhparsing.execute(
            'SELECT wid, osn, sn, exp FROM fhlwhparsing WHERE '
            '  engs = ? AND chap = ? AND sec = ? '
            'ORDER BY wid', (
                engs,
                chapter_num,
                verse_num,
            ))) as cur:
          words_exp = cur.fetchall()
      else:
        logging.error('book_testament = %r not supported', book_testament)

      if not words_exp:
        logging.error(
          '%s missing data for book %d (engs %r), chapter %d, verse %d',
          table, book_id, engs, chapter_num, verse_num)
      else:
        words_fifo = StrongsToExpFIFO(words_exp)
        sn_exp = StrongsToExp(words_exp)

      with contextlib.closing(ctx.unv.execute(
          'SELECT txt FROM unv WHERE '
          '  engs = ? AND chap = ? AND sec = ? '
          'ORDER BY id', (
              BOOKS[book_id],
              chapter_num,
              verse_num,
          ))) as cur:
        unv_txts = cur.fetchone()
        if not unv_txts:
          logging.error(
            'unv.txt missing data for book %d, chapter %d, verse %d',
            book_id, chapter_num, verse_num)
        else:
          unv_txt = CleanUp(unv_txts[0])
          strongs_fifo_map = StrongsToFIFO(unv_txt)
          strongs_unv_map = StrongsToUNV(unv_txt)

      out_file.write(line)
      continue

    if VERSE_END in line:
      verse_num = 0
      word_num = 0
      strongs_num = 0
      is_audited = False

      words_exp = []
      words_fifo = {}
      sn_exp = {}
      strongs_fifo_map = {}
      strongs_unv_map = {}

      out_file.write(line)
      continue

    m = RE_WORD.search(line)
    if m:
      word_num = int(m.group(1))
      out_file.write(line)
      continue

    m = RE_STRONGS.search(line)
    if m:
      strongs_num = int(m.group(1) or '0')
      out_file.write(line)
      continue

    m = RE_CHINESE.search(line)
    if m:
      if UNAUDITED not in line:
        is_audited = True
        out_file.write(line)
        continue
      else:
        continue  # Refresh unaudited words from the database.

    if CHINESE_DEFINITION in line:
      continue  # Always refresh from the database.

    if WORD_END in line:
      loc = 'book %d, chapter %d, verse %d, word %d' % (
        book_id, chapter_num, verse_num, word_num)
      if not word_num:
        logging.error('word number missing for %s', loc)
        out_file.write(line)
        continue

      if not is_audited:
        # The audited version is already written above.
        chinese = OMISSION
        if not strongs_unv_map or not strongs_fifo_map:
          logging.error('uni.txt data missing for %s', loc)
        elif not strongs_num:
          pass  # Already warned above.
        else:
          chinese = strongs_unv_map.get(strongs_num)
          if strongs_fifo_map[strongs_num]:
            chinese = strongs_fifo_map[strongs_num].pop(0)
          if not chinese:
            logging.warning(
              'uni.txt missing strongs_num %d at %s', strongs_num, loc)
            chinese = strongs_unv_map.get(strongs_num, OMISSION)
        out_file.write(
          '\t\t\t\t<chinese unaudited="unaudited">'
          f'{chinese}'
          '</chinese>\n')

      chinese_definition = OMISSION

      word_exp = ()
      if not words_exp:
        logging.error('parsing data missing for %s', loc)
      elif word_num >= len(words_exp):
        logging.error(
          'word data too short: got %d, word %d', len(words_exp), word_num)
      elif words_exp[word_num][0] != word_num:
        logging.error('word data has gaps: %r', words_exp)
      else:
        word_exp = words_exp[word_num]

      if word_exp:
        chinese_definition = word_exp[3]
        strongs_key = f'{strongs_num:05d}'
        if not strongs_num:
          logging.warning('no strongs number at %s', loc)
        elif strongs_key not in (word_exp[1], word_exp[2]):
          logging.warn(
            'strongs number got %r (%r), want %r at %s',
            word_exp[1], word_exp[2], strongs_key, loc)
          chinese_definition = sn_exp.get(strongs_num, chinese_definition)
          if words_fifo[strongs_num]:
            chinese_definition = words_fifo[strongs_num].pop(0)
      else:
        chinese_definition = sn_exp.get(strongs_num, OMISSION)

      out_file.write(
          '\t\t\t\t<chinese-definition>'
          f'{chinese_definition}'
          '</chinese-definition>\n')

      out_file.write(line)
      continue

    # Passthrough any other lines not recognized.
    out_file.write(line)


if __name__ == '__main__':
  sys.exit(Main())
