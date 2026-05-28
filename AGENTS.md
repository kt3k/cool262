## Dev lifecycle

- When changes are made, execute linter and formatter and check errors
- Use `deno fmt` as the formatter (config in `deno.json`); run it from the repo
  root so its excludes apply. Do not hand-format around it.

## Git operations

- Commit messages should follow conventional commits
- PR title also follows conventional commmits
- When opened a new PR, open that URL in browser
- When merging PR, use squash and commit and summarize the contents at merge
  time
