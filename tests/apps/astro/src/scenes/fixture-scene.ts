import {defineInteractiveScene} from '@ooopsstudio/scene-core'

export const fixtureScene = defineInteractiveScene<{color?: string}>({
	manifest: {
		schemaVersion: 2,
		id: 'fixture-scene',
		label: 'Fixture scene',
		category: 'test',
		owner: '@ooopsstudio/scene-core',
		insertable: true,
		internals: 'locked',
		adapters: {
			astro: '@ooopsstudio/scene-astro/InteractiveScene.astro',
			runtime: '@ooopsstudio/scene-core'
		},
		backend: 'canvas2d',
		controls: [{
			id: 'color',
			label: 'Color',
			schema: {kind: 'string'},
			default: '#16a085',
			editable: true,
			control: 'color'
		}],
		assets: [],
		inputs: ['pointer', 'time', 'viewport'],
		quality: {default: 'auto', allowed: ['low', 'auto', 'high']},
		fallbacks: {
			poster: 'public/fixture-scene.png',
			description: 'A color field responds to pointer interaction.',
			reducedMotion: 'poster',
			contextLoss: 'poster'
		}
	},
	create: () => {
		let context: CanvasRenderingContext2D | null = null
		let host: HTMLElement | null = null
		let color = '#16a085'
		let pointerX = 0
		const paint = () => {
			if (!context) return
			const {width, height} = context.canvas
			context.fillStyle = color
			context.fillRect(0, 0, width, height)
			context.fillStyle = '#ff6f61'
			context.beginPath()
			context.arc(
				width * (0.5 + pointerX * 0.25),
				height * 0.5,
				Math.max(12, width * 0.08),
				0,
				Math.PI * 2
			)
			context.fill()
		}
		return {
			mount(sceneContext, config) {
				host = sceneContext.host
				context = sceneContext.canvas.getContext('2d')
				color = config.color ?? color
				host.dataset.fixtureMounts = String(Number(host.dataset.fixtureMounts ?? 0) + 1)
				sceneContext.setBackend('canvas2d')
				paint()
			},
			update(config) { color = config.color ?? color; paint() },
			resize: paint,
			frame: paint,
			pointer(input) {
				pointerX = input.normalizedX
				if (host) {
					host.dataset.fixturePointers = String(Number(host.dataset.fixturePointers ?? 0) + 1)
				}
				paint()
			},
			dispose() {
				if (host) {
					host.dataset.fixtureDisposals = String(Number(host.dataset.fixtureDisposals ?? 0) + 1)
				}
				context = null
			}
		}
	}
})
