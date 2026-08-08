export type Subscriber<State> = (state: Readonly<State>) => void

export const createControllerStore = <State extends object>(initialState: State) => {
	let state = {...initialState}
	const subscribers = new Set<Subscriber<State>>()

	return {
		getState: () => ({...state}),
		setState(next: Partial<State>) {
			state = {...state, ...next}
			for (const subscriber of subscribers) subscriber({...state})
			return {...state}
		},
		subscribe(subscriber: Subscriber<State>) {
			subscribers.add(subscriber)
			subscriber({...state})
			return () => subscribers.delete(subscriber)
		},
		clear: () => subscribers.clear()
	}
}
