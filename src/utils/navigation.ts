export const isInternalRoute = (value: unknown): value is string => {
  const path = typeof value === 'string' ? value.trim() : ''
  return path.startsWith('/') && !path.startsWith('//')
}

export const removeExternalLinksFromHtml = (html: string): string => {
  const template = document.createElement('template')
  template.innerHTML = html

  template.content.querySelectorAll('a').forEach((link) => {
    const href = link.getAttribute('href') || ''
    if (isInternalRoute(href) || href.startsWith('#')) return
    link.removeAttribute('href')
    link.removeAttribute('target')
    link.removeAttribute('rel')
  })

  return template.innerHTML
}
