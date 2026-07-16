# CLAUDE.md - Portfolio App

The full project guide lives in **[AGENTS.md](./AGENTS.md)** (commands,
architecture, i18n, conventions, gotchas). Read it first. This file repeats the
one rule that is easiest to get wrong.

## Styling -  keep it DRY

`src/styles.css` (~1600 lines) already defines design tokens and utility classes
for almost everything. **Reuse them; do not hardcode.** Before adding any CSS
rule, check `src/styles.css` for an existing token or class.

- **Use tokens, not literals**: colors (`--color-primary-*`,
  `--color-success/warning/danger/info-*`), text
  (`--text-primary/secondary/tertiary/link/link-hover/...`), surfaces
  (`--surface-base/raised/overlay/sunken/hover/...`), borders
  (`--border-subtle/default/emphasis/focus/...`), depth (`--elevation-0..5`,
  `--shadow-*`), motion (`--motion-duration-fast`, `--motion-ease-out`). Never
  paste a raw hex, `rgba()`, box-shadow, or transition duration a token covers.
- **Reuse utility classes** instead of re-declaring: `.btn-primary/.btn-secondary/
  .btn-ghost`, `.input-field`, `.surface-*`, `.elevation-*`, `.glass-morphism`,
  `.liquid-glass*`, `.gradient-*`, `.interactive`, `.focus-ring`,
  `.text-success/warning/danger/info`.
- **Dark mode is automatic** when you use tokens (values are re-mapped under
  `[data-theme="dark"]`); hardcoded colors silently break dark mode.
- Collapse repeated declarations within a component by grouping selectors
  (`.a, .b { ...shared... }`) rather than copy-pasting blocks. One-off literals
  are acceptable only where no token fits (e.g. an on-black fullscreen overlay).
- Component `.css` files are scoped -  keep only component-specific layout there;
  promote anything reusable to `src/styles.css`.
