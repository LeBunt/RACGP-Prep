# Unit build standard

Version 2, 18 November 2026. Built on the Kidney and urinary health and Respiratory health units. Every later unit follows this.
The detailed question-writing guide is kept with the private build files; this file covers everything around it.

## What a finished unit contains

| Part | Standard |
|---|---|
| Notes pages | One page per presentation or decision area, covering the whole RACGP curriculum unit. The page count and each page's word budget follow the unit's scope map (high-yield lines only; briefs/notes.md section 1). |
| Flashcards | Per the page's card budget from the scope map, written to briefs/cards.md (one fact per card, cloze format, a lens hint on about one card in five, linked to its notes section, with its source named). |
| Questions | 5 to 7 per page, one of them a KFP. Every notes page has at least five. |
| Coverage table | Every topic in the RACGP curriculum unit (6th and 7th editions) and every topic for the unit in the public exam reports, mapped to a page or given a written reason for leaving it out. |
| Revised-notes PDFs | One per page, numbered in app order, in the private notes folder. |

## Sources

1. Read the primary source for every page before writing: Therapeutic Guidelines first, then AMH for drug facts, then the national body for the topic (Kidney Health Australia, RCH, PCFA, Healthy Male, AJGP reviews).
2. Record what was read, and when, in the private build notes (the `read` field of each reference). The app shows the citation only. If a gap affects what a page can claim, say so in the page text.
3. Log every fact taken from a source in the private build notes as it is read, in own words. No source text goes into the app or the public repository.
4. Where two sources give different numbers, the page gets a "Where the sources differ" table. Teaching text and questions follow whichever source is more recent, and the page says which. Therapeutic Guidelines is the default when dates are similar.
5. No number in the notes comes from memory or judgement. If no source gives a figure, the page says so.
6. A question that rests on something not read in a source is not written.
7. Nothing is copied or adapted from any course, from the college's papers, or from any question bank. Every item is original and written from the primary sources.

## Notes page shape

The notes-page standard is briefs/notes.md in the private build files: scope and length, page structure, writing rules, tables, "Where the sources differ", red flags and doses, references, "How this is tested", phone layout, the checker checklist and the script checks. Follow it in full.

## Questions

- 5 to 7 questions per notes page, exactly one of them a KFP; every page has at least five (briefs/questions.md section 15).
- Each question links to one notes section and to the flashcards from that section, and rests only on what the unit's source log records.
- The question standard is briefs/questions.md in the private build files: how items are built, stems, lead-ins, options, distractors, difficulty, KFP format, explanations, unit balance, the file format, the checker checklist and the script checks. Follow it in full.

## Flashcards

The card standard is briefs/cards.md in the private build files: what earns a card, the cloze rules, the measured house style (answers of 1 to 4 words, Extra on about 80%, a lens hint on about one card in five), the checker checklist and the script checks. Follow it in full.

## Build and release

1. Sources of truth are the private build folder: one JSON per notes page, one cards file and one questions file per unit. The build script writes the app's data files and validates every link.
2. Removing a question from the source file does not remove it from the app's data file. Delete it there too.
3. Bump the version in `app.js` and the cache name in `sw.js` on every release.
4. Test at phone width (390 px) in light and dark: every notes page opens, nothing scrolls sideways, a session runs, no console errors.
5. Regenerate the PDFs and refresh the private archive.
6. Commit, push, and confirm the live site shows the new version number.

## Final check before calling a unit done

- The coverage table has no gap without a written reason.
- A reader who did not write the unit has checked every question and card against the source log.
- Every number in a card or answer key appears on its notes page, or the exception has been looked at.

- Every page lists its sources and its gaps.
- Every card and question resolves to a notes section.
- No length cues flagged; verification notes are few and each is justified.
- The numbers on the home screen match the counts in the build output.
