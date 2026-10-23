// Commit-before-respond for database-backed repositories.
//
// Changing requests (anything except GET/HEAD/OPTIONS) run one at a time. When the
// route sends its JSON response, the repository first commits the queued changes;
// the client sees success only after PostgreSQL confirms. If the commit fails, the
// repository has already restored its last committed state and the client receives
// the translated error instead. Repositories without commit() (in-memory) are untouched.
export function persistMutations(repository) {
  if (typeof repository?.commit !== 'function') return (_request, _response, next) => next()

  let queue = Promise.resolve()

  return (request, response, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next()

    let release
    const turn = new Promise(resolve => { release = resolve })
    const previous = queue
    queue = queue.then(() => turn)

    previous.then(() => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        // A route that ended without sending JSON must not leave half-saved changes behind.
        if (repository.hasPendingChanges()) repository.rollback()
        release()
      }
      response.on('close', finish)

      const send = response.json.bind(response)
      response.json = body => {
        response.json = send
        repository.commit().then(
          () => send(body),
          error => response.status(error.status || 503).json({
            error: { code: error.code || 'DATABASE_UNAVAILABLE', message: error.message || 'The change could not be saved. Please try again' },
          }),
        ).catch(finish)
        return response
      }
      next()
    })
  }
}
