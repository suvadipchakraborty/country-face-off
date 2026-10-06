# Country Face-Off

A global data battleground comparing the progress of nations over the last 30 years, using the World Bank API.

- Zero-build: vanilla HTML, CSS, ES6 JS; Chart.js via CDN
- Metrics: GDP per capita, life expectancy, internet usage (1990-2023)
- PWA: installable, service worker caches the app shell (World Bank data is always fetched live)
- Share: Web Share API on the verdict banner (falls back to clipboard)

## Deploy
Push this folder to GitHub and connect the repo to Cloudflare Pages. Leave the build command empty and set the output directory to `/`.

`preview.png` (1200x630) is used for the Open Graph image. Replace it with a screenshot of your own if you like.

Data: World Bank Open Data.
