# Putting AKT and KFP Practice online

This folder is the whole app. There is no server, database or build step. Any static host will serve it.

## Fastest check: run it from your computer
Open `index.html` in Chrome, Edge or Firefox. Everything works except offline install.

## Option A: GitHub Pages (free)
1. Create a GitHub account and a new **public** repository, for example `akt-practice`.
2. On the repository page choose **Add file > Upload files**, drag in everything inside this folder (not the folder itself), and commit.
3. Go to **Settings > Pages**. Under "Build and deployment" choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute or two the site is live at `https://YOUR-USERNAME.github.io/akt-practice/`.

## Option B: Cloudflare Pages (free)
1. Create a Cloudflare account. Go to **Workers & Pages > Create > Pages > Upload assets**.
2. Name the project, drag in this folder, and deploy. You get an address ending in `.pages.dev`.

## Releasing an update
1. Replace the changed files (usually `data/units/<unit>.js`, `data/index.js`, `app.js`). The build script writes the data files.
2. Open `sw.js` and change the version in the line `const CACHE="akt-practice-3.0"` to a new value. This is what tells browsers that have the app installed to fetch the new files.
3. Upload. People get the update the next time they open the app while online.

Progress is keyed to question and card ids, so keep existing ids when editing content. New questions get new ids.

## What people need
Nothing. No account, no install. Progress saves in their own browser. The home screen shows a one-time tip about adding the page to the home screen (needed on Safari so progress is not cleared after a week away), and **More > Backup** exports or restores progress.

## Before you share the link
- The link is public. Anyone who has it can open the app and read all the content.
- Notes, flashcards and questions are original, written from the sources cited on each notes page (Therapeutic Guidelines, the Australian Medicines Handbook, Kidney Health Australia). Each notes page lists where those sources disagree.
- The content has not been formally peer reviewed. The About section in the app says so.

## Files
- `index.html`, `app.css`, `app.js`: the app.

- `vendor/fsrs.js`: the open-source FSRS scheduler (MIT licence).
- `sw.js`, `manifest.webmanifest`, icons: offline support and home-screen install.
