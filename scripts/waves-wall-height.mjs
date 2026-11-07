const MODULE_ID = 'waves';

export function getWallHeightBounds(wall, change = {}) {
	const height = wall.getFlag(MODULE_ID, 'height') ?? wall._source?.flags?.rat?.height ?? {};
	const bottomPath = 'flags.waves.height.bottom';
	const topPath = 'flags.waves.height.top';
	const bottom = foundry.utils.hasProperty(change, bottomPath) ? foundry.utils.getProperty(change, bottomPath) : height.bottom;
	const top = foundry.utils.hasProperty(change, topPath) ? foundry.utils.getProperty(change, topPath) : height.top;
	return {
		bottom: bottom === '' || bottom == null ? -Infinity : Number(bottom),
		top: top === '' || top == null ? Infinity : Number(top),
	};
}

export async function syncWallHeightsFromLevels(scene = canvas.scene, { overwrite = false } = {}) {
	if (!game.user.isGM) throw new Error('Only a GM can update wall heights.');
	if (!scene) throw new Error('A Scene is required.');
	const updates = [];
	for (const wall of scene.walls) {
		if (!overwrite && wall.getFlag(MODULE_ID, 'height') != null) continue;
		const ranges = Array.from(wall.levels ?? []).map((id) => scene.levels.get(id)?.elevation).filter(Boolean);
		if (!ranges.length) continue;
		const bottom = Math.min(...ranges.map((range) => range.bottom));
		const top = Math.max(...ranges.map((range) => range.top));
		updates.push({
			_id: wall.id,
			'flags.waves.height': {
				bottom: Number.isFinite(bottom) ? bottom : null,
				top: Number.isFinite(top) ? top : null,
			},
		});
	}
	if (updates.length) await foundry.documents.modifyBatch([{ action: 'update', documentName: 'Wall', parent: scene, updates }]);
	return { scene, updated: updates.length, skipped: scene.walls.size - updates.length };
}

export function registerWallHeightHooks() {
	Hooks.on('preCreateWall', (wall) => {
		if (!game.user.isGM || wall.parent !== canvas.scene) return;
		const level = canvas.level;
		if (!level || wall.levels.size !== 1 || !wall.levels.has(level.id)) return;
		if (wall.getFlag(MODULE_ID, 'height') != null || wall._source?.flags?.rat?.height != null) return;
		if (game.settings.get(MODULE_ID, 'newWallHeightMode') === 'level') {
			wall.updateSource({
				'flags.waves.height': {
					bottom: Number.isFinite(level.elevation.bottom) ? level.elevation.bottom : null,
					top: Number.isFinite(level.elevation.top) ? level.elevation.top : null,
				},
				levels: [level.id],
			});
		} else wall.updateSource({ 'flags.waves.height': { bottom: null, top: null }, levels: [] });
	});
	const renderWallHeight = (app, html) => {
		const root = html;
		if (!root || root.querySelector('[name="flags.waves.height.bottom"]')) return;

		const height = app.document.getFlag(MODULE_ID, 'height') ?? app.document._source?.flags?.rat?.height ?? {};
		const fields = document.createElement('div');
		fields.classList.add('form-fields');
		const inputs = {};
		const palette = app.constructor.SETTING_KEY === 'wallPalette';
		const rows = [];
		for (const [key, label] of [
			['bottom', 'WAVES.Wall.Bottom'],
			['top', 'WAVES.Wall.Top'],
		]) {
			const fieldLabel = document.createElement('label');
			fieldLabel.textContent = game.i18n.localize(label);

			const input = document.createElement('input');
			input.type = 'number';
			input.name = 'flags.waves.height.' + key;
			input.step = '1';
			input.value = height[key] ?? '';
			inputs[key] = input;
			fields.append(fieldLabel, input);
			if (palette) rows.push(foundry.applications.fields.createFormGroup({ label: fieldLabel.textContent, input }));
		}

		const field = foundry.applications.fields.createFormGroup({
			label: game.i18n.localize('WAVES.Wall.Height'),
			hint: game.i18n.localize('WAVES.Wall.HeightHint'),
			input: fields,
		});
		let levels = root.querySelector('[name="levels"]');
		let levelGroup = levels?.closest('.form-group');
		if (palette) {
			if (!levels) {
				levels = foundry.applications.fields.createMultiSelectInput({
					name: 'levels', value: Array.from(app.document.levels ?? []),
					options: Array.from(app.document.parent.levels, level => ({ value: level.id, label: level.name })),
				});
				levelGroup = foundry.applications.fields.createFormGroup({
					label: game.i18n.localize('WAVES.Wall.Levels'), input: levels,
				});
			}
			const section = document.createElement('details');
			section.open = true;
			section.dataset.sync = 'details-waves-wall-height';
			const summary = document.createElement('summary');
			summary.textContent = 'WAVES';
			const fieldset = document.createElement('fieldset');
			const legend = document.createElement('legend');
			legend.textContent = 'WAVES';
			legend.dataset.action = 'closeDetails';
			const hint = document.createElement('p');
			hint.classList.add('hint');
			hint.textContent = game.i18n.localize('WAVES.Wall.PaletteHint');
			fieldset.append(legend, ...rows, levelGroup, hint);
			section.append(summary, fieldset);
			(root.querySelector('[data-application-part="body"]') ?? root.querySelector('.standard-form') ?? root).append(section);
			if (app.isSelect && app._multiFields?.has('levels')) app._setPlaceholder(levels);
		} else if (levelGroup) levelGroup.after(field);
		else (root.querySelector('[data-application-part="body"]') ?? root.querySelector('.standard-form') ?? root).prepend(field);
		if (app.isSelect && app.controlled?.length > 1) {
			for (const [key, input] of Object.entries(inputs)) {
				const values = app.controlled.map((wall) => getWallHeightBounds(wall)[key]);
				if (values.some((value) => value !== values[0])) app._setPlaceholder(input);
			}
		}
		if (!levels) return;

		const getSelected = () =>
			Array.isArray(levels.value) ? levels.value
			: levels.value ? [levels.value]
			: [];
		const getBound = (input) =>
			input.value === '' ?
				input === inputs.bottom ?
					-Infinity
				:	Infinity
			:	Number(input.value);
		const setBound = (input, value) => {
			const next = Number.isFinite(value) ? String(value) : '';
			if (input.value === next) return;
			input.value = next;
			input.dispatchEvent(new Event('input', { bubbles: true }));
			input.dispatchEvent(new Event('change', { bubbles: true }));
		};
		let syncing = false;
		let selected = new Set(getSelected());

		const syncLevelsFromHeight = () => {
			if (Object.values(inputs).some((input) => input.classList.contains('multiple-values'))) return;
			const bottom = getBound(inputs.bottom);
			const top = getBound(inputs.top);
			if (Number.isNaN(bottom) || Number.isNaN(top) || bottom >= top) return;
			const ids =
				bottom === -Infinity && top === Infinity ?
					[]
				:	Array.from(app.document.parent.levels)
						.filter((level) => level.visible && bottom < level.elevation.top && top > level.elevation.bottom)
						.map((level) => level.id);
			selected = new Set(ids);
			syncing = true;
			levels.value = ids;
			syncing = false;
		};

		const syncHeightFromLevels = () => {
			const ids = getSelected();
			const nextSelected = new Set(ids);
			if (!ids.length) {
				syncing = true;
				setBound(inputs.bottom, -Infinity);
				setBound(inputs.top, Infinity);
				syncing = false;
				selected = nextSelected;
				return;
			}

			const ranges = ids.map((id) => app.document.parent.levels.get(id)?.elevation).filter(Boolean);
			if (!ranges.length) return;
			let bottom = getBound(inputs.bottom);
			let top = getBound(inputs.top);
			const lower = Math.min(...ranges.map((range) => range.bottom));
			const upper = Math.max(...ranges.map((range) => range.top));
			const added = ranges.filter((range, index) => !selected.has(ids[index]));
			if (added.some((range) => range.top <= bottom)) bottom = lower;
			if (added.some((range) => range.bottom >= top)) top = upper;
			if (!ranges.some((range) => range.bottom <= bottom && bottom < range.top)) bottom = lower;
			if (!ranges.some((range) => range.bottom < top && top <= range.top)) top = upper;

			syncing = true;
			setBound(inputs.bottom, bottom);
			setBound(inputs.top, top);
			syncing = false;
			selected = nextSelected;
			syncLevelsFromHeight();
		};

		levels.addEventListener('change', () => {
			if (!syncing) syncHeightFromLevels();
		});
		for (const input of Object.values(inputs)) {
			input.addEventListener('change', () => {
				input.classList.remove('multiple-values');
				if (!syncing) syncLevelsFromHeight();
			});
		}
	};
	Hooks.on('renderWallConfig', renderWallHeight);
	Hooks.on('renderWallPalette', renderWallHeight);
	Hooks.on('preUpdateWall', (wall, change) => {
		const { bottom, top } = getWallHeightBounds(wall, change);
		if (Number.isNaN(bottom) || Number.isNaN(top) || bottom >= top) return;
		if (bottom === -Infinity && top === Infinity) {
			if (foundry.utils.hasProperty(change, 'flags.waves.height')) change.levels = [];
			return;
		}

		change.levels = Array.from(wall.parent.levels)
			.filter((level) => bottom < level.elevation.top && top > level.elevation.bottom)
			.map((level) => level.id);
	});
	Hooks.on('updateWall', (wall, change) => {
		if (wall.parent !== canvas.scene || !foundry.utils.hasProperty(change, 'flags.waves.height')) return;
		canvas.perception.update({ initializeLighting: true, refreshLighting: true, initializeVision: true, refreshVision: true });
	});
}
