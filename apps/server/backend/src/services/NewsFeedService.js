import { ApiError } from '../http/ApiError.js'

const searchableText = (post) => [
  post.title,
  post.excerpt,
  post.content,
  post.author_name,
  post.category_label,
  post.location_label,
].filter(Boolean).join(' ').toLocaleLowerCase()

const sortPosts = (a, b) => {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
  return Date.parse(b.published_at) - Date.parse(a.published_at)
}

export class NewsFeedService {
  constructor(repository) {
    this.repository = repository
  }

  getCategories() {
    const counts = new Map()
    for (const post of this.repository.findAll()) {
      const current = counts.get(post.category) ?? { value: post.category, label: post.category_label, count: 0 }
      current.count += 1
      counts.set(post.category, current)
    }
    return [...counts.values()].sort((a, b) => a.label.localeCompare(b.label))
  }

  list({ q, category, limit, offset }) {
    const needle = q.toLocaleLowerCase()
    const filtered = this.repository.findAll()
      .filter((post) => !category || post.category === category)
      .filter((post) => !needle || searchableText(post).includes(needle))
      .sort(sortPosts)

    return {
      data: filtered.slice(offset, offset + limit),
      meta: {
        total_count: filtered.length,
        featured_count: filtered.filter((post) => post.featured).length,
        categories: this.getCategories(),
        query: q,
        category,
        limit,
        offset,
        has_more: offset + limit < filtered.length,
        dataset_label: 'Demo week',
      },
    }
  }

  getById(postId) {
    const post = this.repository.findById(postId)
    if (!post) {
      throw new ApiError(404, 'POST_NOT_FOUND', 'News feed post was not found.')
    }
    return { data: post }
  }
}
