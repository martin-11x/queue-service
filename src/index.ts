import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import { Server, IncomingMessage, ServerResponse } from 'http';
import { env } from './env';

import { createQueue, setupQueueProcessor } from './queue';

interface AddJobQueryString {
  id: string;
  email: string;
}
enum MetricsTime {
  ONE_MONTH = 80640,
}

const run = async () => {
  const outreachQueue = createQueue('OutreachQueue');
  await setupQueueProcessor(`./workers/${outreachQueue.name}.js`);

  const server: FastifyInstance<Server, IncomingMessage, ServerResponse> =
    fastify();

  const serverAdapter = new FastifyAdapter();
  createBullBoard({
    queues: [new BullMQAdapter(outreachQueue)],
    // @ts-ignore
    serverAdapter,
  });
  serverAdapter.setBasePath('/ui');
  server.register(serverAdapter.registerPlugin(), {
    prefix: '/',
    basePath: '/',
  });

  server.get(
    '/add-job',
    (req: FastifyRequest<{ Querystring: AddJobQueryString }>, reply) => {
      outreachQueue.add(`OutreachQueue`, req.body);
      reply.send({
        ok: true,
      });
    }
  );

  await server.listen({ port: env.PORT, host: '0.0.0.0' });
  console.log(
    `https://${env.RAILWAY_STATIC_URL}/add-job?id=1&email=hello%40world.com`
  );
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
