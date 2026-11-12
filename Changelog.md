## 14.370.1
* Fix blocking Tile mesh initialization and quadtree cleanup, and resolve competing light and darkness at target samples using Darkness restrictions for negative-source rays.
* Keep ambient-light Level resolution independent of the viewed Level and prevent suppressed darkness sources from suppressing other lights.
* Support Foundry VTT 14.370.
* Add a collapsible WAVES section to the Wall Tools palette with Wall Bottom, Wall Top, and Levels, including single-Level scenes and mixed selected heights.
* Allow elevated lights to shine past lower walls and update lighting immediately after wall height edits.
* Check ambient and token illumination across Levels, including light sources without rendered objects, and expose `waves.isHeightAwareIlluminated()` for Tokens and TokenDocuments.
* Add Sampled 3D and 3D Corner-to-corner cover modes, with optional intervening token cover in both modes.
* Support cover and peeking checks for tokens on other Levels even when those tokens are not rendered on the client.
* Prevent corner cover checks from looking through walls or surfaces within the attacker's space, and include eligible peeking positions.
* Respect hidden tokens and apply Proximity/Reverse Proximity window thresholds and attenuation to sight, light, and darkness rays.
* Fix stale visibility results after changes to scene geometry, token status, or WAVES settings.
* Fix compatibility warnings when clearing token eye overrides and visibility errors caused by zero-length walls.
* Respect Tiles with **Restrict Light**, using their elevation, Level assignments, and opaque areas to block light.
* Prevent height-passable wall overlays from flashing during movement and Level transitions.
* Improve cover ray displays and issue reports to help diagnose visibility problems.

## 14.367.1.1
* Preserve hidden WAVES settings if Foundry mode is selected.

## 14.367.1
* Initial release for Foundry v14.367.
