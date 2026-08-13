const CLASS_NAME = 'iframe-guard-active'

export function enableIframeDragGuard() {
  document.body.classList.add(CLASS_NAME)
}

export function disableIframeDragGuard() {
  document.body.classList.remove(CLASS_NAME)
}
