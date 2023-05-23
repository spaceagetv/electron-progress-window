/**
 * Add a timeout to a promise
 * @param promise - Promise to add timeout to
 * @param timeout - Timeout in milliseconds
 * @param timeoutMessage - Message to throw if timeout is reached
 * @returns Promise that will reject with timeoutMessage if timeout is reached
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  timeoutMessage: string
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id)
      reject(new Error(timeoutMessage))
    }, timeout)
  })
  return Promise.race([promise, timeoutPromise])
}
