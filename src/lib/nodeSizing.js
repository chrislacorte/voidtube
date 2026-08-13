export function getNodeSize(node) {
  if (node.type === 'video') {
    return {
      width: node.width ?? node.style?.width ?? node.data?.width ?? 420,
      height: node.height ?? node.style?.height ?? node.data?.height ?? 360,
    }
  }
  if (node.type === 'checkpoint') return { width: 260, height: 180 }
  if (node.type === 'essay') return { width: 360, height: 220 }
  if (node.type === 'transcript') return { width: 340, height: 240 }
  return { width: node.style?.width ?? 280, height: node.style?.height ?? 180 }
}
