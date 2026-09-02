## 14.367.2
* Prevent sampled visibility errors from zero-length wall segments.
* Add scoped Tile handling:
  * Treat Tiles with **Restrict Light** as horizontal blocking planes during height-aware illumination checks.
  * Use each Tile's configured elevation and Level assignments.
  * Invalidate cached illumination when Tiles are created, updated, or deleted.
  * Do not treat ordinary Tiles as sight blockers or add Tile thickness, WAVES height fields, or automatic Level reassignment.
* Refresh height-passable wall overlays cleanly during token movement and canvas transitions.

## 14.367.1.1
* Preserve hidden WAVES settings if Foundry mode is selected.

## 14.367.1
* Initial release for Foundry v14.367.
