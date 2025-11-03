# Tools for FHL.net

This directory contains the tools to convert the databases obtained
from FHL.net and merge them into the Interlinear XML files.

  * `pg2sqlite.sh` converts from the PostgreSQL dump to sqlite3 dumps.
  * `fhlunvtoxml.py` merges the dumps in sqlite3 to the Interlinear XML.

First obtain the PostgreSQL database dumps from
<https://bkbible.fhl.net/public/>:

  * fhlwhparsing.gz 新約parsing PostgreSQL dump檔
  * lparsing.gz 舊約parsing PostgreSQL dump檔

And obtain the CUV database (already in sqlite3) from "FTP 資料定期更
新區" <https://ftp.fhl.net/FHL/COBS/data/>:

  * `bible_little.zip`

Decompress the files:

```
gunzip fhlwhparsing.gz  # output: fhlwhparsing
gunzip lparsing.gz      # output: lparsing
unzip bible_little.zip  # output: bible_little.db
```

Perform the conversion:

```
mkdir fhlwhparsing.d && pushd fhlwhparsing.d && {
  ../pg2sqlite.sh ../fhlwhparsing
  sqlite3 fhlwhparsing.db '.read fhlwhparsing.sql' || true  # Safe to ignore errors.
} && popd

mkdir lparsing.d && pushd lparsing.d && {
  ../pg2sqlite.sh ../lparsing
  sqlite3 lparsing.db '.read lparsing.sql' || true  # Safe to ignore errors.
} && popd
```

Then merge the FHL databases into the Interlinear XML.  The script
assumes that the input files already exist at these locations:

  * `fhlwhparsing.d/fhlwhparsing.db` converted from PostgreSQL into
    sqlite3 above.
  * `lparsing.d/lparsing.db` converted from PostgreSQL into sqlite3
    above.
  * `bible_little.db` sqlite3 decompressed from `bible_little.zip`.
  * `../Interlinear` is the Interlinear XML directory in this repo.

See `--help` for options to override the input file paths.

Run this to perform the conversion:

```
./fhlunvtoxml.py --output-dir $TMPDIR/output
```

It currently takes about 30 minutes to finish the conversion, without any
effort to parallelize it.

If the conversion is interrupted, rerun the command to resume
conversion from the last completed chapter.  If an error is
encountered, the chapter will have `.error` appended to the filename.
Check for any errors.

If the conversion is successful, run `rsync -avP $TMPDIR/output
../Interlinear` to update the repository files.
