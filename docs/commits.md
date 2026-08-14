# Commit Convention

Every commit must use Conventional Commits:

```text
type(scope): imperative summary
```

`scope` is optional. Use a lowercase, hyphenated scope when it makes the affected area clearer, for example `worker`, `database`, `source-policy`, or `application-flow`.

## Types

| Type | Use for |
| --- | --- |
| `feat` | A new user-visible capability |
| `fix` | A defect correction |
| `docs` | Documentation only |
| `style` | Formatting or presentation with no behavior change |
| `refactor` | Internal code restructuring with unchanged behavior |
| `perf` | A measurable performance improvement |
| `test` | Adding or correcting tests |
| `build` | Dependencies, build tooling, or packaging |
| `ci` | Continuous-integration or deployment configuration |
| `chore` | Routine maintenance that fits no other type |
| `revert` | Reverting a prior commit |

Use an imperative, lowercase summary without a trailing period. Keep the header at 100 characters or fewer.

```text
feat(worker): add authorized source registry
fix(database): preserve application attempt receipt
docs: define source review process
build: add commit message validation
revert: feat(worker): add authorized source registry
```

For a breaking change, append `!` after the type or scope and explain it in the commit body:

```text
feat(api)!: replace application status endpoint

BREAKING CHANGE: clients must use /api/application-attempts.
```

The local `commit-msg` hook validates every commit. Validate a message manually with:

```bash
printf 'feat(worker): add source registry\n' | npm run commitlint
```
