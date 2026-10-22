import sanitizeHtml from 'sanitize-html'

const allowedTags = [
	'p',
	'br',
	'strong',
	'b',
	'em',
	'i',
	'u',
	's',
	'a',
	'ul',
	'ol',
	'li',
	'blockquote',
	'code',
	'pre',
	'h1',
	'h2',
	'h3',
	'h4',
	'hr'
]

const allowedAttributes = {
	a: ['href', 'target', 'rel'],
	'*': ['class']
}

export const sanitizeRichTextHtml = (html: string | null | undefined): string | null => {
	const value = (html || '').trim()
	if (!value) return null
	const sanitized = sanitizeHtml(value, {
		allowedTags,
		allowedAttributes,
		allowedSchemes: ['http', 'https', 'mailto', 'tel'],
		allowProtocolRelative: false,
		disallowedTagsMode: 'discard',
		enforceHtmlBoundary: true,
		parseStyleAttributes: false,
		transformTags: {
			a: sanitizeHtml.simpleTransform('a', {
				rel: 'noopener noreferrer nofollow',
				target: '_blank'
			})
		}
	}).trim()
	return sanitized && sanitized !== '<p></p>' ? sanitized : null
}
