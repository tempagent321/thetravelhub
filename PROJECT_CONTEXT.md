# The Travel Hub Project Context

## Live website

https://tempagent321.github.io/thetravelhub/

## Hosting

The website is hosted with GitHub Pages.

The source code is stored in a public GitHub repository.

## Development tools

The website is being developed using:

- Visual Studio Code
- GitHub Copilot
- Live Server
- Git
- GitHub Pages

## Technology

The website uses:

- HTML5
- CSS3
- Vanilla JavaScript

The public website is static. DPO payment requests are handled by a separate
Cloudflare Worker, with Cloudflare D1 used to record payment attempts and
rate-limit public requests. The site does not use:

- React
- Vue
- Angular
- Node.js

## Project structure

The expected project structure is:

thetravelhub/
├── .github/
│   └── copilot-instructions.md
├── PROJECT_CONTEXT.md
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── images/
└── documents/

## Completed work

Phase 1 is complete:

- Styling was moved from index.html to css/style.css.
- JavaScript was moved from index.html to js/script.js.
- The HTML file links to the external CSS file.
- The HTML file links to the external JavaScript file.
- The style and script files were cleaned of HTML tags.

Phase 2 is complete:

- Pilgrimage images were extracted from the PDF brochures.
- The images were placed in the images folder.
- The image folder was renamed from "Images for Website" to "images".
- The PDF brochures were placed in the documents folder.

## Current development phase

Phase 3 is currently in progress.

Phase 3 includes:

- Adding featured pilgrimage cards.
- Using pilgrimage images from the images folder.
- Linking the cards to the existing detailed packages.
- Adding responsive pilgrimage image galleries.
- Improving the visual design.
- Making the website resemble a modern travel-booking website.
- Preserving all existing package information and forms.

Some Phase 3 changes have been made locally but have not yet been pushed to
GitHub.

Copilot must inspect git status and git diff before making further changes.

## Existing pilgrimage sections

The detailed Rwanda-Uganda package is expected to use:

rwanda-package

The detailed Southern Cross package is expected to use:

italy-package

Featured card buttons should link to these existing sections.

Copilot must confirm that these IDs exist before relying on them.

## Existing JavaScript

The JavaScript file may already contain:

scrollToPackage(id)

Copilot must inspect js/script.js before creating another scrolling function.

If scrollToPackage(id) already works, Copilot must reuse it.

## Booking enquiry requirement

Booking and enquiry forms must continue using mailto links.

The required behavior is:

1. A visitor completes a form.
2. The website prepares an email.
3. The visitor's default email application opens.
4. The visitor sends the email.

Do not replace this with:

- Formspree
- EmailJS
- Netlify Forms
- Paid mailing services
- A database
- Server-side email processing

## Image requirements

All images must load through GitHub Pages.

HTML image paths must begin with:

images/

Example:

images/Sanctuary of Our Lady of Kibeho.jpg

Do not use local Windows paths.

Do not use C:\ paths.

Do not use file:/// paths.

Image filenames, capitalization and extensions must match the actual files
exactly.

## Payment status

The DPO Worker is in `cloudflare/worker.js`. The public website makes a
read-only request to its `/health` endpoint and only shows the DPO checkout
button if the Worker reports payments enabled and ready. Checkout remains
disabled by default. DPO provided production API and `payv3.php` checkout
details and service type 114407 (Travel and Tourism); the deployed Worker
confirmed that service-type setting.

The local Worker now uses the published package deposits (BWP 6,800 and
BWP 10,900), the provided `payv3.php` checkout path, and service type 114407.
Checkout remains explicitly disabled in code. The Worker implementation now
includes fixed-price token creation with DPO RedirectURL/BackURL, a static
customer return page that calls server-side verification, a pushPayments
callback that independently verifies token, amount, currency, and fraud result,
and D1-backed request throttling. Apply
`cloudflare/migrations/0001_payment_rate_limits.sql` to the payment D1 database
before enabling checkout. Register this callback with DPO:
`https://thetravelhub-dpo-api.tempagent321.workers.dev/api/payments/callback`.

The public checkout routes enforce allowed browser origins, package IDs and a
per-IP attempt limit; they never accept a browser-supplied amount or expose
credentials. The live token's environment, DPO callback registration, and the
live end-to-end test DPO requires still need confirmation. The deployed Worker
must be updated with this local implementation before any live testing.

Keep all DPO credentials in Cloudflare Worker secrets. Do not place API keys,
merchant credentials, passwords or private information inside `index.html` or
`js/script.js`. The public site's enquiry forms must continue to use their
existing `mailto:` workflow until live payments are explicitly enabled.

## Important development rules

- Preserve all existing pilgrimage details.
- Preserve existing prices and deposits.
- Preserve dates and itinerary information.
- Preserve mailto forms.
- Keep CSS in css/style.css.
- Keep JavaScript in js/script.js.
- Use relative image paths.
- Make all new sections responsive.
- Do not commit or push without permission.
- Inspect current files before changing them.
- Explain which files will be changed.
- Show a summary after making changes.

## Immediate next task

Review the local DPO implementation, then deploy the Worker with payments
disabled and apply its D1 migration. Confirm the health endpoint reports the
database and rate-limit table ready before publishing the static return page
and website updates. DPO must register the callback and arrange its required
controlled live test before checkout is enabled. Never deploy, publish,
commit, or push without the owner's approval.
