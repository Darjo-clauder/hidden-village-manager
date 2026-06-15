const MAX_NEWS = 20

// Circular news array — newest at front
export const newsItems = []

export function addNewsItem(text) {
  newsItems.unshift(text)
  if (newsItems.length > MAX_NEWS) newsItems.length = MAX_NEWS
  renderTicker()
}

export function renderTicker() {
  const el = document.getElementById('news-ticker-text')
  if (!el) return
  if (!newsItems.length) return

  const content = newsItems.join('   ·   ')
  el.textContent = content

  // Restart the animation by removing and re-adding it
  el.style.animation = 'none'
  el.offsetWidth // force reflow
  el.style.animation = ''
}
