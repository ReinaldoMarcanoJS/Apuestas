import { PostsFeed } from '@/components/posts/posts-feed'
import { PopularMatches } from '@/components/layout/popular-matches'

export default function FeedPage() {
  return (
    <div className="flex flex-col lg:flex-row w-full max-w-7xl mx-auto sm:px-4 py-4 sm:py-8">
      {/* Feed principal centrado */}
      <div className="flex-1 flex justify-center w-full">
        <div className="w-full max-w-lg">
          <PostsFeed showCreatePost={true} />
        </div>
      </div>
      {/* Panel derecho pegado a la derecha solo en desktop */}
      <div className="hidden lg:flex w-80 flex-shrink-0 justify-end mt-6 lg:mt-0">
        <div className="w-full">
          <PopularMatches />
        </div>
      </div>
    </div>
  )
} 