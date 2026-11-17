# Unit build standard

Version 1, 17 November 2026. Built on the Kidney and urinary health unit. Every later unit follows this.
The detailed question-writing guide is kept with the private build files; this file covers everything around it.

## What a finished unit contains

| Part | Standard |
|---|---|
| Notes pages | One page per presentation or decision area, covering the whole RACGP curriculum unit. About 10 to 16 pages for a large unit. |
| Flashcards | 15 to 45 per page. One fact per card, cloze format with a hint, linked to its notes section, with its source named. |
| Questions | 8 to 10 per page across the unit (about 110 to 130 for a large unit, 40 to 60 for a small one), of which roughly one in eight is a KFP. Every notes page has at least five. |
| Revised-notes PDFs | One per page, numbered in app order, in the private notes folder. |

## Sources

1. Read the primary source for every page before writing: Therapeutic Guidelines first, then AMH for drug facts, then the national body for the topic (Kidney Health Australia, RCH, PCFA, Healthy Male, AJGP reviews).
2. Record what was read, and when, in the private build notes (the `read` field of each reference). The app shows the citation only. If a gap affects what a page can claim, say so in the page text.
3. Log every fact taken from a source in the private build notes as it is read, in own words. No source text goes into the app or the public repository.
4. Where two sources give different numbers, the page gets a "Where the sources differ" table, and questions follow Therapeutic Guidelines unless stated.
5. No number in the notes comes from memory or judgement. If no source gives a figure, the page says so.
6. A question that rests on something not read in a source carries a verification note (`v`) shown to the user, or is not written.
7. Nothing is copied or adapted from any course, from the college's papers, or from any question bank. Every item is original and written from the primary sources.

## Notes page shape

- Plain English, short sentences, Australian spelling, no first person.
- Sections of bullets and tables. Tables are the preferred way to summarise comparisons. On a phone, column widths follow the amount of text; a table with three or more wordy columns scrolls sideways. Keep the first column a short label and cells to a sentence.
- An "In brief" box at the top: three to five lines a reader could act on (the `brief` list in the page file).
- One "take-home" line per major section.
- The teaching text states one rule. Comparisons between sources go in "Where the sources differ" at the end, not in the flow.
- Start a bullet with a short label and a colon where it helps scanning ("Metformin: ..."); the app sets the label in bold.
- Bullets of 30 words or fewer. A page of more than about 1,500 words is split.
- A final section, "How this is tested", listing the scenarios the questions use.
- Curriculum topics covered, then references with what was read.

## Questions

- Written to the question-writing guide: one decision per item, whole-patient stem of about 80 to 120 words with 3 to 5 medicines where an adult would have them, options in alphabetical order, per-option explanations that say when each wrong option would be right, a "what if" that flips the answer, and a one-line key.
- Positive stems only (no "least appropriate" or "except").
- The build flags any item whose correct option is the longest or the shortest. Reword until none is flagged.
- Write in families: the next rung, the other side of the rule, the age or comorbidity flipped.
- Check the unit for a repeated correct answer (for example "Refer to a urologist") and vary the wording or the mix.
- Each question links to one notes section and to the flashcards from that section.

## Flashcards

Written to the same house style as the Anki decks (the card-craft rubric in the anki-card-builder skill).

- One card, one idea. If answering needs two recalls, it is two cards.
- The answer is 1 to 4 words. A longer answer is a hidden list: split it, or make the count the point.
- Situation visible, answer hidden: "In [situation], the next step is ...". Use question form for diagnosis, next-step and yes-or-no rules.
- The visible text must allow only one answer, and must not give it away.
- No list inside a blank and no soft quantifiers.
- About 80% of cards carry an Extra line: the discriminator, the reason or the caveat, never a restatement of the answer. Lists belong here.
- Hints on about one card in five, three words at most, and only as a lens (answer type, or an either-or such as "raised or lowers").
- Contrast look-alikes on the card itself.
- The build prints a card report (answer length, Extra and hint rates) and flags any answer over four words.

## Build and release

1. Sources of truth are the private build folder: one JSON per notes page, one cards file and one questions file per unit. The build script writes the app's data files and validates every link.
2. Removing a question from the source file does not remove it from the app's data file. Delete it there too.
3. Bump the version in `app.js` and the cache name in `sw.js` on every release.
4. Test at phone width (390 px) in light and dark: every notes page opens, nothing scrolls sideways, a session runs, no console errors.
5. Regenerate the PDFs and refresh the private archive.
6. Commit, push, and confirm the live site shows the new version number.

## Final check before calling a unit done

- Every page lists its sources and its gaps.
- Every card and question resolves to a notes section.
- No length cues flagged; verification notes are few and each is justified.
- The numbers on the home screen match the counts in the build output.
