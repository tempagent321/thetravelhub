# The Travel Hub Website Instructions

## Project overview

This repository contains the public website for The Travel Hub, a travel
business promoting pilgrimage packages and other travel services.

The live website is hosted with GitHub Pages at:

https://tempagent321.github.io/thetravelhub/

The repository is:

https://github.com/tempagent321/thetravelhub

The website was originally built as one self-contained HTML file. Its CSS and
JavaScript have since been moved into separate files.

The current priority is improving the visual design while preserving all
existing pilgrimage details, booking forms, enquiry behavior and JavaScript
functionality.

## Technology

This is a static GitHub Pages website.

Use only:

- HTML5
- CSS3
- Vanilla JavaScript
- Relative asset paths
- GitHub Pages-compatible features

Do not introduce React, Vue, Angular, Node.js, npm packages, build tools,
server-side code or databases unless explicitly requested.

The website must continue working by opening `index.html` through VS Code Live
Server and after publishing to GitHub Pages.

## Current project structure

The expected structure is:

thetravelhub/
├── .github/
│   └── copilot-instructions.md
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── images/
├── documents/
│   ├── Rwanda-Uganda-Pilgrimage-with-Fr-Mabe-2026.pdf
│   └── Southern Cross Pilgrimage.pdf
└── PROJECT_CONTEXT.md

Do not move files or rename folders without explaining every affected path.

## File responsibilities

### index.html

Contains:

- Page structure and content
- Header and navigation
- Hero section
- Featured pilgrimage cards
- Detailed pilgrimage sections
- Itinerary information
- Prices and deposits
- Booking and enquiry forms
- Contact and footer content

Do not place CSS inside `<style>` elements.

Do not place JavaScript inside inline `<script>` elements unless there is a
strong reason and the change is explained.

### css/style.css

Contains all website styling.

Add new CSS to this file. Keep selectors organized into clearly labelled
sections.

Do not create duplicate selectors when an existing selector can be extended.

### js/script.js

Contains all website JavaScript.

Existing functionality includes or may include:

- Header resizing during scrolling
- Smooth scrolling
- Package navigation
- Accordion behavior
- Booking enquiry processing
- Generation of `mailto:` links

Do not remove or replace existing functions without checking every place where
the function is called.

### images/

Contains all locally hosted website images.

Reference images from `index.html` like this:

`images/example-image.jpg`

Reference images from `css/style.css` like this:

`../images/example-image.jpg`

Never use:

- `C:\...`
- `file:///...`
- Local computer paths
- Temporary browser blob URLs

Paths and filenames are case-sensitive on GitHub Pages.

### documents/

Contains the source pilgrimage brochures.

The brochures provide information and image references for:

1. Rwanda-Uganda Pilgrimage with Fr Mabe 2026
2. Southern Cross Pilgrimage

Do not invent pilgrimage dates, prices, inclusions, exclusions, destinations or
clergy names. Use the existing HTML and PDF brochures as the source of truth.

## Current development phase

Phase 1 is complete:

- CSS was moved to `css/style.css`.
- JavaScript was moved to `js/script.js`.
- `index.html` links to the separate CSS and JavaScript files.
- The external files were cleaned of `<style>` and `<script>` tags.

Phase 2 is complete:

- Images were extracted from the pilgrimage brochures.
- Images were added to the `images/` folder.
- The PDF brochures were placed in `documents/`.

Phase 3 is in progress:

- Add modern featured pilgrimage summary cards.
- Use real images from the `images/` folder.
- Link the cards to the existing detailed package sections.
- Add responsive pilgrimage image galleries.
- Improve the visual hierarchy.
- Preserve all existing itinerary and booking information.

Some Phase 3 changes may currently exist only on the local computer and may not
have been committed or pushed to GitHub yet. Always inspect the current files
and `git diff` before assuming what has been completed.

## Existing package targets

The detailed Rwanda-Uganda package section uses or is expected to use:

`id="rwanda-package"`

The detailed Southern Cross package section uses or is expected to use:

`id="italy-package"`

Featured pilgrimage buttons should navigate to these existing sections instead
of creating duplicate detailed sections.

Before relying on these IDs, confirm that they still exist in `index.html`.

## Existing JavaScript navigation

The project uses or may use a function called:

`scrollToPackage(id)`

Before creating a new scrolling function:

1. Inspect `js/script.js`.
2. Confirm whether `scrollToPackage(id)` already exists.
3. Reuse the existing function if it is suitable.
4. Do not create duplicate functions with the same purpose.

## Mailto requirement

The owner wants booking and enquiry forms to open the visitor's default email
application.

Do not replace the current `mailto:` workflow with:

- Formspree
- EmailJS
- Netlify Forms
- A database
- A paid mailing service
- A server-side form service

The `mailto:` behavior must remain unless the owner explicitly changes this
requirement.

When modifying a booking form, preserve:

- Existing form fields
- Recipient email address
- Subject generation
- Email body generation
- Validation
- Default-email-application behavior

## Payment integration

DPO payment integration is planned but is not yet complete.

Do not create fake DPO payment processing.

Do not expose or hard-code:

- API keys
- Company tokens
- Merchant credentials
- Passwords
- Private keys
- Webhook secrets

Until valid DPO account information and official integration requirements are
available, payment buttons should remain clearly marked placeholders or should
not be added.

Sensitive payment operations must not be implemented entirely in public
client-side JavaScript.

## Visual direction

The requested visual direction is inspired by modern travel-booking websites.

Use:

- A professional blue-and-white travel design
- Clear navigation
- Large, high-quality travel imagery
- Responsive tour cards
- Strong pricing hierarchy
- Clearly visible calls to action
- Generous spacing
- Accessible contrasts
- Responsive mobile layouts
- Consistent border radii
- Subtle shadows
- Clear package highlights
- Easy-to-scan itinerary sections

Do not copy Booking.com's logo, wording, proprietary assets, exact page layout
or branding. Create an original Travel Hub design inspired by common travel
booking interface patterns.

## Brand direction

Use the existing Travel Hub identity and logo.

The existing logo file is:

`images/travel-hub-logo.jpeg`

The favicon and social-sharing preview should eventually use the Travel Hub
logo or an appropriately cropped version of it.

Preserve the current brand colors where practical, while developing a polished
blue travel-booking interface.

## Available pilgrimage images

The `images/` folder includes images related to sites such as:

- Sanctuary of Our Lady of Kibeho
- Church of Our Lady of Sorrows in Kibeho
- Stations of the Cross in Kibeho
- Munyonyo Martyrs Shrine
- Namugongo Martyrs Shrine
- Rubaga Cathedral
- St Matia Mulumba Church
- St Peter's Basilica
- The Colosseum
- Basilica of St Francis in Assisi
- Porziuncola
- Sanctuary of the Holy House of Loreto
- Medjugorje
- Mount Krisevac
- Stari Most in Mostar
- Cathedral of the Assumption in Dubrovnik

Always list or inspect the actual filenames before writing an image path.

Do not guess capitalization, spelling, extension or apostrophe type.

## Image path rules

Before adding an image:

1. Inspect the exact filename in `images/`.
2. Use a relative URL.
3. Match case exactly.
4. Match the extension exactly.
5. Check for curly and straight apostrophes.
6. Add meaningful `alt` text.
7. Add `loading="lazy"` to images located below the initial viewport.
8. Confirm that the file is tracked by Git.

Example HTML:

```html
<img
    src="images/Sanctuary of Our Lady of Kibeho.jpg"
    alt="Sanctuary of Our Lady of Kibeho"
    loading="lazy"
>
Do not use ../images/ from index.html.

Use ../images/ only when referencing an image from css/style.css.

Accessibility requirements

For every change:

Use semantic HTML.
Keep heading levels in a logical order.
Add meaningful image alt text.
Make buttons keyboard accessible.
Use actual <button> elements for actions.
Use <a> elements for navigation.
Provide visible keyboard focus states.
Do not communicate information with color alone.
Avoid insufficient color contrast.
Preserve form labels.
Respect reduced-motion preferences where animation is added.
Responsive design requirements

Every new interface must be checked at approximately:

375px mobile width
768px tablet width
1024px laptop width
1440px desktop width

Avoid fixed widths that cause horizontal scrolling.

Prefer:

CSS Grid
Flexbox
max-width
min()
clamp()
Responsive media queries
Editing rules

Before making a change:

Read the complete relevant file.
Search for existing classes, IDs and JavaScript functions.
Check whether the requested behavior already exists.
Review git status.
Review git diff if changes are uncommitted.
Explain which files will change.

When making a change:

Make the smallest safe change.
Preserve existing content and behavior.
Do not rewrite the entire website unless explicitly requested.
Do not delete pilgrimage details merely to simplify the layout.
Do not duplicate package information unnecessarily.
Keep indentation consistent.
Keep CSS and JavaScript in their respective files.
Use comments only where comments improve navigation or maintenance.

After making a change:

Summarize exactly what changed.
Name every changed file.
Point out anything the owner must test.
Check for broken image paths.
Check for missing IDs.
Check for duplicate IDs.
Check the browser console for errors.
Check mobile responsiveness.
Review the mailto: booking flow.
Do not run git push without explicit permission.
Communication style

The owner is learning website development and requires precise instructions.

When suggesting manual changes:

State the exact filename.
State what code to search for.
State whether to insert before, after or replace it.
Provide complete replacement blocks.
Do not say only "add this somewhere."
Explain what the change does.
Avoid vague references such as "that section" when the exact selector, ID or heading can be named.
Warn before any destructive replacement.
Clearly distinguish required steps from optional improvements.

When using Agent mode and directly editing files:

Show a short plan first.
Inspect the relevant files.
Modify only the required files.
Display or summarize the resulting diff.
Wait for the owner to review before committing or pushing.
Git workflow

The website is hosted from GitHub Pages.

Before committing:

Shell
git status
git diff

After the owner has tested the site locally:

Shell
git add .
git commit -m "Describe the completed change"
git push origin main

Do not push automatically.

The images must be committed to the repository or they will work locally but not on the public website.