#!/bin/bash

set -eo pipefail

echo "Starting..."

check () {
  if ! [ -x "$(command -v $1)" ]; then
    echo "Error: $1 is not installed." >&2
    exit 1
  fi
}
check npm
check node
check openssl

npm install > /dev/null 2>&1
node server.js $@ | ./node_modules/.bin/bunyan -o short
