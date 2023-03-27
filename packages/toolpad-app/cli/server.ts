import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import invariant from 'invariant';

async function main() {
  const { default: chalk } = await import('chalk');

  const dir = process.env.TOOLPAD_DIR;
  const dev = process.env.TOOLPAD_DEV === 'true';
  const hostname = 'localhost';
  const port = Number(process.env.TOOLPAD_PORT);

  // when using middleware `hostname` and `port` must be provided below
  const app = next({ dir, dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = createServer(async (req, res) => {
    try {
      invariant(req.url, 'request must have a url');
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  await new Promise<void>((resolve, reject) => {
    server
      .once('error', (err) => {
        reject(err);
      })
      .listen(port, () => {
        resolve();
      });
  });

  // eslint-disable-next-line no-console
  console.log(`> Toolpad ready on ${chalk.green(`http://${hostname}:${port}`)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});