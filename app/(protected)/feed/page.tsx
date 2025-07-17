import { PostsFeed } from '@/components/posts/posts-feed'
import { PopularMatches } from '@/components/layout/popular-matches'

export default function FeedPage() {
  return (
    <div className="flex container mx-auto px-4 py-8">
      {/* Feed principal centrado */}
      <div className="flex-1 flex justify-center">
        <div className="max-w-lg w-full">
          <PostsFeed showCreatePost={true} />
        </div>
      </div>
      {/* Panel derecho pegado a la derecha solo en desktop */}
      <div className="hidden lg:flex w-80 flex-shrink-0 justify-end">
        <div className="w-full">
          <PopularMatches />
        </div>
      </div>
    </div>
  )
} 