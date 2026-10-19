import { useCallback, useState } from 'react'
import { Inbox, Newspaper, RefreshCw, WifiOff } from 'lucide-react'
import { useTestUser } from '../../components/auth/test-auth.js'
import PageHeader, { StatusBadge } from '../../components/common/PageHeader.jsx'
import PageLayout from '../../components/common/PageLayout.jsx'
import SearchBar from '../../components/common/SearchBar.jsx'
import NewsFeedCard from '../../components/student/NewsFeedCard.jsx'
import NewsPostDialog from '../../components/student/NewsPostDialog.jsx'
import { useNewsFeed } from '../../hooks/useNewsFeed.js'
import { getNewsPost } from '../../services/newsFeed.js'
import AdminWorkspace from '../admin/AdminWorkspace.jsx'

function FeedMessage({ icon: Icon, title, message, action }) {
  return (
    <section className="grid min-h-72 place-items-center rounded-card bg-white p-8 text-center shadow-card">
      <div className="max-w-md">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cardBg text-primary" aria-hidden="true">
          <Icon className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-textPrimary">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-textSecondary">{message}</p>
        {action}
      </div>
    </section>
  )
}

function StudentNewsFeed({ user }) {
  const [draftQuery, setDraftQuery] = useState('')
  const [category, setCategory] = useState('')
  const [filters, setFilters] = useState({ q: '', category: '' })
  const { data, loading, error, refetch } = useNewsFeed(filters)
  const [selectedPostId, setSelectedPostId] = useState(null)
  const [postState, setPostState] = useState({ post: null, loading: false, error: null })

  const loadPost = useCallback(async (postId) => {
    setPostState({ post: null, loading: true, error: null })
    try {
      const response = await getNewsPost(postId)
      setPostState({ post: response.data, loading: false, error: null })
    } catch (requestError) {
      setPostState({ post: null, loading: false, error: requestError })
    }
  }, [])

  const openPost = (postId) => {
    setSelectedPostId(postId)
    loadPost(postId)
  }

  const closePost = useCallback(() => {
    setSelectedPostId(null)
    setPostState({ post: null, loading: false, error: null })
  }, [])

  const applyFilters = () => setFilters({ q: draftQuery.trim(), category })
  const changeCategory = (nextCategory) => {
    setCategory(nextCategory)
    setFilters({ q: draftQuery.trim(), category: nextCategory })
  }

  const categories = data?.meta?.categories ?? []
  const posts = data?.data ?? []

  return (
    <PageLayout role={user?.role ?? 'student'} user={user}>
      <PageHeader
        icon={Newspaper}
        title="News Feed"
        subtitle="Campus announcements, activities, and student organization updates."
      >
        {data?.meta?.dataset_label && <StatusBadge>{data.meta.dataset_label}</StatusBadge>}
      </PageHeader>

      <SearchBar
        query={draftQuery}
        onQueryChange={setDraftQuery}
        category={category}
        onCategoryChange={changeCategory}
        categories={categories}
        placeholder="Search news, events, organizations, or locations..."
        onAction={applyFilters}
      />

      {!loading && !error && data && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-textMuted">
          <p>{data.meta.total_count} {data.meta.total_count === 1 ? 'post' : 'posts'} found</p>
          {data.meta.featured_count > 0 && <p>{data.meta.featured_count} featured</p>}
        </div>
      )}

      {loading && !data && (
        <FeedMessage icon={RefreshCw} title="Loading news feed" message="Fetching the latest campus posts." />
      )}

      {!loading && error && (
        <FeedMessage
          icon={WifiOff}
          title="Unable to load the news feed"
          message={error.message}
          action={(
            <button
              type="button"
              onClick={refetch}
              className="mt-4 rounded-control bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Retry
            </button>
          )}
        />
      )}

      {!loading && !error && data && posts.length === 0 && (
        <FeedMessage
          icon={Inbox}
          title="No posts found"
          message="Try a different search phrase or category."
          action={(
            <button
              type="button"
              onClick={() => {
                setDraftQuery('')
                setCategory('')
                setFilters({ q: '', category: '' })
              }}
              className="mt-4 rounded-control bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Clear filters
            </button>
          )}
        />
      )}

      {!error && posts.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="News feed posts" aria-busy={loading}>
          {posts.map((post) => <NewsFeedCard key={post.post_id} post={post} onOpen={openPost} />)}
        </section>
      )}

      <NewsPostDialog
        open={Boolean(selectedPostId)}
        post={postState.post}
        loading={postState.loading}
        error={postState.error}
        onClose={closePost}
        onRetry={() => loadPost(selectedPostId)}
      />
    </PageLayout>
  )
}

export default function NewsFeed() {
  const user = useTestUser()

  if (user?.role === 'admin') {
    return <AdminWorkspace user={user} />
  }

  return <StudentNewsFeed user={user} />
}
