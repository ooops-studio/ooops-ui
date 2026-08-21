/**
 * @file Dependency cruiser configuration
 * Enforces acyclic dependency graph and import hygiene in the monorepo.
 *
 * Guidance:
 * - No circular dependencies
 * - Do not import other packages’ internals (use published exports only)
 * - Production code must not depend on devDependencies
 * - Keep tests and test helpers out of runtime code
 */

const path = require('node:path')
const repoRoot = __dirname
module.exports = {
	forbidden: [
		{name: 'no-cycles',     severity: 'error', from: {}, to: {circular: true}},
		{name: 'no-unresolved', severity: 'error', from: {}, to: {couldNotResolve: true}},

		// Don’t pull test helpers into runtime
		{name: 'no-test-helpers-in-src', severity: 'error',
			from: {path: '^packages/.*/src/'},
			to:   {path: '^packages/.*/(test|__tests__|testing)/'}
		},

		// Package direction is primitives -> adapters. Adapters may consume only
		// the public primitives entrypoint, never another adapter or its internals.
		{name: 'primitives-do-not-depend-on-adapters', severity: 'error',
			from: {path: '^packages/ui-primitives/src/'},
			to: {path: '^packages/ui-(?:svelte|astro)/src/'}
		},
		{name: 'adapters-do-not-cross', severity: 'error',
			from: {path: '^packages/ui-svelte/src/'},
			to: {path: '^packages/ui-astro/src/'}
		},
		{name: 'adapters-do-not-cross-reverse', severity: 'error',
			from: {path: '^packages/ui-astro/src/'},
			to: {path: '^packages/ui-svelte/src/'}
		},
		{name: 'no-primitives-internals', severity: 'error',
			from: {path: '^packages/ui-(?:svelte|astro)/src/'},
			to: {path: '^packages/ui-primitives/src/(?!index\\.ts$)'}
		},
		{name: 'core-ui-does-not-depend-on-editor-contracts', severity: 'error',
			from: {path: '^packages/(?:ui-primitives|ui-svelte|ui-astro|scene-core|scene-gpu|scene-astro)/src/'},
			to: {path: 'editor-contracts'}
		},
		{name: 'editor-manifests-do-not-import-ui-runtime', severity: 'error',
			from: {path: '^packages/ui-editor-manifests/src/'},
			to: {path: '^packages/(?:ui-primitives|ui-svelte|ui-astro|scene-core|scene-gpu|scene-astro)/src/'}
		},

		// Scene ownership is renderer-neutral core -> GPU runtime / Astro adapter.
		// The Astro adapter must not pull renderer implementation into projects.
		{name: 'scene-core-does-not-depend-on-adapters', severity: 'error',
			from: {path: '^packages/scene-core/src/'},
			to: {path: '^packages/scene-(?:gpu|astro)/src/'}
		},
		{name: 'scene-gpu-does-not-depend-on-astro', severity: 'error',
			from: {path: '^packages/scene-gpu/src/'},
			to: {path: '^packages/scene-astro/src/'}
		},
		{name: 'scene-astro-does-not-depend-on-gpu', severity: 'error',
			from: {path: '^packages/scene-astro/src/'},
			to: {path: '^packages/scene-gpu/src/'}
		},

		// Production code must not depend on devDeps
		{name: 'no-dev-deps-in-src', severity: 'error',
			from: {path: '^packages/.*/src/'},
			to:   {dependencyTypes: ['npm-dev']}
		}
	],
	options: {
		tsPreCompilationDeps: true,
		includeOnly: '^(packages)/',
		tsConfig: {fileName: path.join(repoRoot, 'tsconfig.base.json')},
		enhancedResolveOptions: {
			extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json']
		},
		doNotFollow: {path: 'node_modules'},
		exclude: {
			path: [
				'node_modules',
				'dist',
				'coverage',
				'.husky',
				'test',
				'(^|/)\\.' // only dot-directories, not file extensions
			]
		}
	}
}
