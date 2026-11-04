# Quiz Cheating Lab

An interactive classroom experiment for exploring answer similarity. Select a student, compare their answers with the modes of their visible neighbors, and compare that match count with a reference average.

## Open the lab

Open `index.html` in a modern browser. No installation, build step, account, or server is needed to use the lab.

## Try a variation

- When stuck, copy the mode
- Work independently
- When stuck, copy one student
- Most questions are known
- Leave the last questions blank
- Use your own answers

The custom-answer workbench supports 1–6 rows and 1–6 seats per row, with 1–200 questions per student. Enter one student per line, left to right and then front to back. Use lowercase a–d for correct choices, 1–4 for incorrect choices A–D, and 0 for blanks. Everyone must have the same quiz, question order, option order, and number of answers.

## How the comparison works

For each question, find the modes among the seats immediately to the student's left, right, and front. Ignore neighboring blanks; skip the question if all visible neighbors left it blank. Choosing any tied mode counts as one match.

Exclude the student and those visible neighbors from the reference group. Count each remaining student's matches against the same fixed set of neighbor modes, then average those counts. The displayed difference is the selected student's match count minus this reference average.

This is a descriptive comparison using the available classroom sample. The reference students may differ in ability or may have copied. The lab does not report a probability of copying or establish that a student cheated.

## Simulated examples

Known answers are always correct. On unknown questions, students may eliminate zero, one, or two wrong options before guessing from the remaining choices. In copying variations, students copy only on questions they cannot solve. The analysis uses final answers and seating only; it does not use the generator's knowledge labels or probabilities.

## Data

Answer comparison runs in the browser. The lab does not send entered answers to a server. Workbench drafts are stored in the current browser tab's session storage; use **Save results** to download an analysis.

## Publish with GitHub Pages

1. Create a repository named `quiz-cheating-lab` and upload this folder's contents to its root.
2. In **Settings → Pages**, choose **Deploy from a branch**.
3. Select **main** and **/(root)**, then save.
4. Open the website address shown by GitHub Pages when deployment finishes.

The standard project address is `https://YOUR-USERNAME.github.io/quiz-cheating-lab/`. All assets use relative paths, so the site also works under a repository subpath.

## Files

- `index.html`, `styles.css`, `app.js`: interface and interactions
- `engine.js`: example generation, validation, and analysis
- `sample-reference.js`: reference-group comparison
- `terms.js`: linked glossary

## References

- Eckerly, C. (2021). [Answer Similarity Analysis at the Group Level](https://pmc.ncbi.nlm.nih.gov/articles/PMC8361375/). *Applied Psychological Measurement, 45*(5), 299–314. Research background; this lab does not implement the paper's group-level test.
- Levitt, S. D., & Dubner, S. J. (2005). [Freakonomics](https://freakonomics.com/book/freakonomics/), Chapter 1. Inspiration for the classroom puzzle and the step-by-step examination of answer patterns.
