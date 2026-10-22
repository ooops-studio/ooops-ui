import {describe, expect, it} from 'vitest'

import {
	isRichTextHtml,
	plainTextToRichTextHtml,
	richTextHtmlToPlainText
} from '../src/lib/html.js'
import {sanitizeRichTextHtml} from '../src/lib/sanitize.js'

describe('rich text html helpers', () => {
	it('detects rich HTML and converts rich/plain text safely', () => {
		expect(isRichTextHtml('<p>Hello</p>')).toBe(true)
		expect(isRichTextHtml('Hello')).toBe(false)
		expect(richTextHtmlToPlainText('<p>Hello&nbsp;<strong>world</strong></p>')).toBe('Hello world')
		expect(plainTextToRichTextHtml('Line 1\nLine 2')).toBe('<p>Line 1<br>Line 2</p>')
		expect(plainTextToRichTextHtml('Use tags & "quotes"')).toBe('<p>Use tags &amp; &quot;quotes&quot;</p>')
		expect(plainTextToRichTextHtml('<p>Already rich</p>')).toBe('<p>Already rich</p>')
	})
})

describe('rich text sanitizer', () => {
	it('does not surface hidden noscript content after an implied ancestor close', () => {
		const input = '<p>Safe</p><div><noscript></div>' +
			'<a href="https://evil.test">Hidden link</a></noscript>'
		expect(sanitizeRichTextHtml(input)).toBe('<p>Safe</p>')
	})

	it.each([
		'<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
		'<meta http-equiv="refresh" content="0;url=data:text/html,malicious">',
		'<svg><animate attributeName="href" values="javascript:alert(1)"/></svg>'
	])('drops active metadata and animation payload %s', (payload) => {
		expect(sanitizeRichTextHtml('<p>Safe</p>' + payload)).toBe('<p>Safe</p>')
	})

	it('keeps expected formatting and strips unsafe markup', () => {
		expect(sanitizeRichTextHtml('<p>Hello <strong>world</strong><script>alert(1)</script></p>')).toBe(
			'<p>Hello <strong>world</strong></p>'
		)
		expect(sanitizeRichTextHtml('<a href="javascript:alert(1)">bad</a>')).toBe(
			'<a rel="noopener noreferrer nofollow" target="_blank">bad</a>'
		)
		const safeLink = sanitizeRichTextHtml('<a href="https://example.com">Example</a>')
		expect(safeLink).toContain('href="https://example.com"')
		expect(safeLink).toContain('target="_blank"')
		expect(safeLink).toContain('rel="noopener noreferrer nofollow"')
		expect(sanitizeRichTextHtml('')).toBeNull()
		expect(sanitizeRichTextHtml('<p></p>')).toBeNull()
	})
})
