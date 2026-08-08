import {render} from '@testing-library/svelte'
import {describe, expect, it} from 'vitest'

import Accordion from './Accordion.svelte'
import Checkbox from './Checkbox.svelte'
import Combobox from './Combobox.svelte'
import Dialog from './Dialog.svelte'
import DropdownMenu from './DropdownMenu.svelte'
import Field from './Field.svelte'
import Input from './Input.svelte'
import Modal from './Modal.svelte'
import MultiSelect from './MultiSelect.svelte'
import NumberInput from './NumberInput.svelte'
import Popover from './Popover.svelte'
import RadioGroup from './RadioGroup.svelte'
import SegmentedControl from './SegmentedControl.svelte'
import Select from './Select.svelte'
import Slider from './Slider.svelte'
import Switch from './Switch.svelte'
import Tabs from './Tabs.svelte'
import Textarea from './Textarea.svelte'
import Tooltip from './Tooltip.svelte'

describe('Svelte UI adapters', () => {
	it('renders a select with native form control and rich options', () => {
		const {container} = render(Select, {props: {id: 'status', name: 'status', label: 'Status', options: [{value: 'draft', label: 'Draft', description: 'Private'}]}})
		expect(container.querySelector('select[name="status"]')).not.toBeNull()
		expect(document.querySelector('[role="listbox"]')).not.toBeNull()
	})

	it('renders dialog, modal and popover semantics', () => {
		const dialog = render(Dialog, {props: {id: 'confirm', title: 'Confirm'}})
		const modal = render(Modal, {props: {id: 'modal', title: 'Details'}})
		render(Popover, {props: {id: 'popover', ariaLabel: 'Actions'}})
		expect(dialog.container.querySelector('dialog[aria-labelledby="confirm-title"]')).not.toBeNull()
		expect(modal.container.querySelector('dialog[aria-labelledby="modal-title"]')).not.toBeNull()
		expect(document.querySelector('[role="dialog"]')).not.toBeNull()
	})

	it('renders native form projections for field controls', () => {
		const input = render(Input, {props: {id: 'email', name: 'email', label: 'Email'}})
		const textarea = render(Textarea, {props: {id: 'bio', name: 'bio', label: 'Bio', showCount: true}})
		const checkbox = render(Checkbox, {props: {id: 'terms', name: 'terms', label: 'Terms'}})
		const radio = render(RadioGroup, {props: {id: 'plan', name: 'plan', options: [{value: 'free', label: 'Free'}]}})
		const segmented = render(SegmentedControl, {props: {id: 'view', name: 'view', options: [{value: 'grid', label: 'Grid'}]}})
		const number = render(NumberInput, {props: {id: 'count', name: 'count'}})
		render(Field, {props: {id: 'field', label: 'Field'}})
		expect(input.container.querySelector('input[name="email"]')).not.toBeNull()
		expect(textarea.container.querySelector('textarea[name="bio"]')).not.toBeNull()
		expect(checkbox.container.querySelector('input[type="checkbox"]')).not.toBeNull()
		expect(radio.container.querySelector('[role="radiogroup"]')).not.toBeNull()
		expect(segmented.container.querySelector('input[type="hidden"]')).not.toBeNull()
		expect(number.container.querySelector('input[type="number"]')).not.toBeNull()
	})

	it('renders collection, navigation and overlay semantics', () => {
		const combo = render(Combobox, {props: {id: 'country', options: [{value: 'gr', label: 'Greece'}]}})
		render(MultiSelect, {props: {id: 'tags', options: [{value: 'a', label: 'A'}]}})
		const menu = render(DropdownMenu, {props: {id: 'menu', items: [{id: 'edit', label: 'Edit'}]}})
		const tabs = render(Tabs, {props: {id: 'tabs', items: [{id: 'one', label: 'One', content: 'Panel'}]}})
		const accordion = render(Accordion, {props: {id: 'accordion', items: [{id: 'one', title: 'One', content: 'Panel'}]}})
		const slider = render(Slider, {props: {id: 'range', value: [20, 80]}})
		render(Switch, {props: {id: 'switch', label: 'Enabled'}})
		expect(combo.container.querySelector('[role="combobox"]')).not.toBeNull()
		expect(document.querySelector('[aria-multiselectable="true"]')).not.toBeNull()
		expect(menu.container.querySelector('[aria-haspopup="menu"]')).not.toBeNull()
		expect(tabs.container.querySelector('[role="tab"]')).not.toBeNull()
		expect(accordion.container.querySelector('[data-accordion-trigger]')).not.toBeNull()
		expect(slider.container.querySelectorAll('[role="slider"]')).toHaveLength(2)
		expect(Tooltip).toBeDefined()
	})
})
