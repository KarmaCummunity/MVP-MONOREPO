# Locales (i18n)

Translations are split by **namespace** for easier maintenance:

```
locales/
  en/           # English
    common.json
    donations.json
    auth.json
    ...
  he/           # Hebrew
    common.json
    donations.json
    auth.json
    ...
```

- Each file = one namespace (e.g. `t('donations:categories.money.title')`).
- Add new keys to the relevant namespace file.
- Add a new namespace: create `en/{name}.json` and `he/{name}.json`, then register in `app/i18n.ts`.
