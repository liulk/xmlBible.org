#!/bin/bash
#
# Converts from the PostgreSQL dump to sqlite3 readable files *.sql
# and *.tsv for each table.
#
# Tested to work on the dump from https://bkbible.fhl.net/public/

diag() {
  echo -n "$1" >&2
}

readonly -a ANIMATION=('-' '\' '|' '/')

# Usage: convert db
convert() {
  local db="$1" out="${1##*/}"
  local i=0 line table _
  local IFS

  while IFS='' read -r line; do
    if [[ "${line}" = "SET "* ]]; then
      diag 'S'
      continue
    fi

    if [[ "${line}" = "CREATE INDEX "* ]]; then
      line="${line/ USING btree / }"
      diag '!'
      echo "${line}"
    fi

    if [[ "${line}" = "COPY "* ]]; then
      diag 'C*'
      read _ table _ <<<"${line}"
      while IFS='' read -r line; do
        if [[ "${line}" = "\\." ]]; then
          break
        fi
        diag $'\b'"${ANIMATION[i++ % 4]}"
        echo "${line//\"/\\\"}"
      done > "${table}.tsv"
      echo ".mode tabs"
      echo ".import ${table}.tsv ${table}"
      diag $'\b*'
      continue
    fi

    diag '+'
    echo "${line}"
  done < "${db}" > "${out}.sql"
  diag $'\n'
}

convert "$@"
