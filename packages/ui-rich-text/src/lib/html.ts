const htmlTagPattern = /<\/?[a-z][\s\S]*>/i

export const isRichTextHtml = (value: string | null | undefined): boolean =>
	typeof value === 'string' && htmlTagPattern.test(value)

export const richTextHtmlToPlainText = (value: string | null | undefined): string => {
	if (!value) return ''
	if (typeof document !== 'undefined') {
		const holder = document.createElement('div')
		holder.innerHTML = value
		return (holder.textContent || '').replace(/\s+/g, ' ').trim()
	}
	return value
		.replace(/<br\s*\/?>/gi, ' ')
		.replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, ' ')
		.trim()
}

export const plainTextToRichTextHtml = (value: string | null | undefined): string => {
	const text = (value || '').trim()
	if (!text) return ''
	if (isRichTextHtml(text)) return text
	return `<p>${text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
		.replace(/\n{2,}/g, '</p><p>')
		.replace(/\n/g, '<br>')}</p>`
}
