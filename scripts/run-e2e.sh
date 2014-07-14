#!/usr/bin/env bash

die() {
  echo $@ 1>&2
  exit 1
}

for x in tests/e2e/*_test.js ; do
  node $x || die "$x failed"
  echo "Ran $x successfully"
done
