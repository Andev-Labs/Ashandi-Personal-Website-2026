# Customize the portfolio

Start with `content/site.json`. It uses ordinary JSON: double quotes, no comments,
and no trailing commas. Save the file while `npm run dev` is running, then refresh.
Validation errors name the field to fix. Keep English and Indonesian content in sync.

## Profile and metadata

`profile.name` updates the heading, footer, article bylines, book backs, metadata,
and generated favicon initials come from `profile.initials`. `profile.email`
updates both the contact address and mail links. No messages are sent by the site:
the hero action goes to Contact, and the contact button copies your email.

`profile.location` is the displayed city. `profile.timezone` is an IANA timezone,
such as `Asia/Jakarta`, `Europe/London`, or `America/New_York`. `timeLabel` is the
no-JavaScript fallback. Use `\n` in the slogan to add a line break.

Set `meta.url` to the full public URL with a trailing slash. A `SITE_URL`
environment variable takes priority for previews. Metadata and sitemap are built
from this URL. No analytics, server credentials, or contact backend are included.

## Portrait

The default is one photographic style, with light and dark sprite sheets.
`profile.portraitDark` optionally supplies the dark sprite; omit it to use the
same sprite for both themes. Ordinary image mode always uses `profile.portrait`.
For a normal portrait, put `me.webp` in `public/assets/images/` and set:

```json
"portrait": "/assets/images/me.webp",
"portraitMode": "image"
```

For the original gaze interaction, use `portraitMode: "sprite"` and a square
image with nine equally sized cells. Keep head position and scale aligned:

| Upper left | Up | Upper right |
| --- | --- | --- |
| Left | Center | Right |
| Lower left | Down | Lower right |

A 720×720 sheet gives each cell 240×240 pixels. The center is shown for reduced
motion, touch, and the static fallback. The photo is not clickable and no
alternate artwork styles are downloaded. Replace Dani's portrait before launch.

## Copy, projects, and notes

`copy.en` and `copy.id` contain the visible copy. Text is escaped by the builder;
write plain text, not HTML. Margin notes use `Heading\nExplanation`.

Projects are listed in array order. Each needs a unique kebab-case `slug`, title,
two descriptions `[English, Indonesian]`, role, year, companyId, sector, label (such as Fictional concept), a `contributions` list,
and a `body` array of paragraphs. The optional `image` points at a local
project illustration; otherwise the builder generates a simple fallback. The build creates `/work/<slug>/` automatically. Add or remove whole
objects to change the number of projects; use an empty array to omit project rows.

Articles also use unique slugs. Keep at least one article for the bookshelf.
`category` and `description` use `[English, Indonesian]`; the second value falls
back to English when omitted. `body` contains the English article paragraphs.
Set an optional `url` (`https://…`) for an article published elsewhere, such as
Medium: the shelf links straight to it, no local page is built, and `body` may
be omitted.
Article titles retain their authored language. Dates use `YYYY-MM-DD`, `readTime`
is a positive number of minutes, and `coverColor` is a six-digit hex value.
Use your own cover image under `public/assets/images/` and update `image`.

`socials` is a list of `{ "label": "…", "url": "https://…" }` objects.
Remove unwanted objects; an empty array is supported. `experienceUrl` controls
the About action and `writingUrl` controls the writing overview action.

## Visual customization

Base tokens and geometry are in `public/assets/folio/home.css`. The Style panel
lets you try the existing fonts and layout settings; its Save action stores
preferences **in that browser only**, not in the repository. To change defaults
for visitors, edit the defaults in `public/assets/folio/enhancements/customizer.js`
and the matching CSS tokens. Clear browser storage when checking new defaults.

Keep animation values in `public/assets/folio/enhancements/config.js`; do not add
a second transition to properties already owned by the panel's morph controller.
Read [motion guidelines](motion-guidelines.md) before changing timing or geometry.

## Before sharing your version

Replace the example email, `your-username` links, portrait, sample biography,
and project claims; set the real domain; keep license notices; run `npm run check`
and `npm test`. Preview narrow and wide screens, both languages and themes.

## Experience and expertise

`experience` contains companyId, role, period, location, and `[English, Indonesian]`
summary text. Optional `highlights` is a list of `[English, Indonesian]` bullet
pairs, and optional `stack` is a list of tool names shown as small tags.
`expertise` contains translated title and description arrays.
Both accept any number of entries, including an empty list. The demo timeline
is explicitly fictional. Replace it with your own employment history.

`meta.image` points at a local 1200×630 PNG/JPEG/WebP social image. After changing
your identity, replace this image or run `npm run screenshots` with the local
dev server running to regenerate the supplied social card and README previews.

## Inline company logos

Define each company once in `companies` with `name`, `url`, and a local `logo`.
Write `{company:apple}` or another company ID inside your English and Indonesian
copy to insert the original inline logo-and-name treatment. The builder escapes
text and inserts only known company tokens. Project and experience `companyId`
values use the same source. Logos should be monochrome dark SVGs; the existing
theme treatment inverts them on dark backgrounds. Keep ownership notices.
