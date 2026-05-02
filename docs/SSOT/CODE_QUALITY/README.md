# Code quality and architecture (CODE_QUALITY)

Product requirements live in the **[SRS](../SRS/README.md)**. For SSOT-wide **document types**, **reading order**, and **precedence** when docs disagree, see the **[SSOT index](../README.md)**.

## Contents

| File | Purpose |
|------|---------|
| [layers-and-boundaries.md](layers-and-boundaries.md) | Dependency direction: Domain → Application → Infrastructure |
| [constraints.md](constraints.md) | Complexity limits, error handling, error boundaries |
| [api-internationalization.md](api-internationalization.md) | API locale resolution, i18n alignment with mobile, phased rollout |
| [testing.md](testing.md) | Testing expectations by layer |
| [tech-debt-log.md](tech-debt-log.md) | Technical debt register and `[PENDING REFACTOR]` items |

Any architectural change that conflicts with the SRS must be recorded under SRS §10 or in this tech-debt log.
