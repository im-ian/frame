import { createServer, type Server } from 'node:http'

export function startFixture(): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (req.url === '/set') {
        res.setHeader('Set-Cookie', 'frame_session=yes; Path=/')
        res.end('<title>set</title>set')
        return
      }

      const cookie = req.headers.cookie ?? ''
      res.end(
        `<title>${cookie.includes('frame_session=yes') ? 'HAS_COOKIE' : 'NO_COOKIE'}</title>`
      )
    })

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      resolve({ server, url: `http://127.0.0.1:${port}` })
    })
  })
}
