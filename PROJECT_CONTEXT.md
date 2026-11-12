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

The website does not currently use:

- React
- Vue
- Angular
- Node.js
- A database
- A server-side application

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
read-only request to its `/health` endpoint to display availability; it does
not create payment requests or expose credentials. DPO has provided production
API and `payv3.php` checkout details. The latest service-type information
identifies 114407 as Travel and Tourism, and the deployed Worker health check
confirms that its service-type setting matches.

The local Worker now uses the published package deposits (BWP 6,800 and
BWP 10,900), the provided `payv3.php` checkout path, and service type 114407.
Checkout and verification are explicitly disabled in code. The Worker allows
CORS for the website's health check only; payment routes remain separately
protected. The verification logic sends the CompanyRef to DPO and checks the
returned reference, amount, and BWP currency before marking a transaction paid.
The deployed Worker's read-only health check currently reports
`status: disabled`, `paymentsEnabled: false`, configured CompanyToken/service
type/test key, and a connected database. The live token's environment, public
payment-request design, and DPO return/callback requirements still need review
before checkout is enabled.

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

The next task is to inspect the current uncommitted Phase 3 work.

Copilot must:

1. Read index.html.
2. Read css/style.css.
3. Read js/script.js.
4. List the actual filenames inside images.
5. Inspect git status.
6. Inspect git diff.
7. Check whether the featured pilgrimage cards were added correctly.
8. Check whether the image paths are correct.
9. Check whether the card buttons work.
10. Correct errors without deleting existing package details.
11. Avoid committing or pushing until permission is given.
