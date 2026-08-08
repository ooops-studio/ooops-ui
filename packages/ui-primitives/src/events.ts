export const UI_EVENTS = {
	accordionChange: 'ooops:accordion-change',
	checkboxChange: 'ooops:checkbox-change',
	comboboxChange: 'ooops:combobox-change',
	selectChange: 'ooops:select-change',
	multiSelectChange: 'ooops:multi-select-change',
	numberInputChange: 'ooops:number-input-change',
	radioChange: 'ooops:radio-change',
	segmentedChange: 'ooops:segmented-change',
	sliderChange: 'ooops:slider-change',
	switchChange: 'ooops:switch-change',
	tabsChange: 'ooops:tabs-change',
	menuSelect: 'ooops:menu-select',
	dialogConfirm: 'ooops:dialog-confirm',
	dialogClose: 'ooops:dialog-close',
	modalClose: 'ooops:modal-close',
	popoverClose: 'ooops:popover-close'
} as const

export type UiEventName = (typeof UI_EVENTS)[keyof typeof UI_EVENTS]
