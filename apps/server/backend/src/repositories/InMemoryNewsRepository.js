const clone = (value) => structuredClone(value)

export class InMemoryNewsRepository {
  constructor(seed) {
    this.posts = seed.map(clone)
  }

  findAll() {
    return this.posts.map(clone)
  }

  findById(postId) {
    const post = this.posts.find((item) => item.post_id === postId)
    return post ? clone(post) : null
  }
}
