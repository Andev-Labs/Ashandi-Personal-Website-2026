# Deployment

The build produces an ordinary static site in `dist/`. Never publish the repository
root: only `dist/` is intended for hosting. There are no environment secrets.

## GitHub Pages

1. Create your repository using **Use this template**.
2. In **Settings → Pages**, choose **GitHub Actions** as the source.
3. In **Settings → Secrets and variables → Actions → Variables**, create
   `ENABLE_PAGES` with the value `true`.
4. Run **Actions → Deploy preview → Run workflow** on `main`.

The included workflow uses GitHub's Pages metadata to set `SITE_URL`, so project
paths such as `/my-portfolio/` work. It builds and validates before uploading.
Subsequent pushes to `main` trigger deployment. Quality checks also run on PRs.
Forks do not deploy until the new owner enables the variable.

If deployment is skipped, check `ENABLE_PAGES`. If the environment blocks a run,
review repository Pages/environment rules. If Actions is disabled, enable it in
repository Settings. For a custom domain, configure it through Pages Settings;
do not point the original author's domain to your fork.

The template's public preview is separate from the original author's live site.
It has no `CNAME`, Cloudflare account ID, or production deployment credential.

Reference: [GitHub's custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Other static hosts

Use Node 22+, build command `npm run build`, and output directory `dist`.
Set `SITE_URL` in the host's build environment, or edit `meta.url` in the content
file. Include the trailing slash and any path prefix. `npm ci` installs only
development tooling; production rendering does not need those packages.

If uploading files manually, run the build locally and upload the contents of
`dist/`. Configure the host to serve `404.html` for unknown routes with HTTP 404.
Use HTTPS. Configure security headers through your host if needed; this starter
does not include provider-specific deployment commands or account identifiers.

## Local preview

`npm run dev` watches content, templates, and assets and rebuilds on save into
the ignored `.preview/` folder, so production builds do not interrupt it; refresh
the browser to see changes. `npm run preview` builds once and serves that output.
Set `PORT` to use another port. The server listens on `127.0.0.1` by default.
The development command also restarts automatically when imported build scripts change. A validation failure prints the
field to fix; save valid JSON to rebuild again.
