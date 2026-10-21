export default [
	{name: 'button-installer', path: ['dist/runtime/actions.js'], import: '{ installButton }', limit: '2 KB'},
	{name: 'calendar-installer', path: ['dist/runtime/calendar.js'], import: '{ installCalendar }', limit: '9 KB'},
	{
		name: 'input-installer',
		path: ['dist/runtime/forms.js'],
		import: '{ installInput }',
		limit: '3 KB'
	},
	{
		name: 'combobox-installer',
		path: ['dist/runtime/selections.js'],
		import: '{ installCombobox }',
		limit: '6 KB'
	},
	{
		name: 'menu-installer',
		path: ['dist/runtime/overlays.js'],
		import: '{ installDropdownMenu }',
		limit: '5 KB'
	},
	{
		name: 'tabs-installer',
		path: ['dist/runtime/navigation.js'],
		import: '{ installTabs }',
		limit: '3 KB'
	}
]
