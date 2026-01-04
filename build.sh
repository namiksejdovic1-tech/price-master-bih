#!/usr/bin/env bash
set -o errexit
npm install
npx playwright install chromium
