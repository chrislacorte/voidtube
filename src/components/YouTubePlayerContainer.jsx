import { memo, useCallback } from 'react'

/**
 * Outer wrapper stays in the React tree; YouTube replaces only the inner mount node.
 * Must never re-render after mount — otherwise React can remove the iframe.
 */
const YouTubePlayerContainer = memo(
  function YouTubePlayerContainer({ containerRef, className = 'absolute inset-0' }) {
    const setMountRef = useCallback(
      (node) => {
        containerRef(node)
      },
      [containerRef],
    )

    return (
      <div className={className} data-yt-shell>
        <div ref={setMountRef} className="h-full w-full" />
      </div>
    )
  },
  () => true,
)

export default YouTubePlayerContainer
