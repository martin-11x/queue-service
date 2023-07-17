import { ConnectionOptions, Queue, QueueScheduler, Worker } from 'bullmq';

import { env } from './env';

const connection: ConnectionOptions = {
  host: env.REDISHOST,
  port: env.REDISPORT,
  username: env.REDISUSER,
  password: env.REDISPASSWORD,
};
enum MetricsTime {
  ONE_MONTH = 80640,
}

export const createQueue = (name: string) => new Queue(name, { connection });

export const setupQueueProcessor = async (queueName: string) => {
  const queueScheduler = new QueueScheduler(queueName, {
    connection,
  });
  await queueScheduler.waitUntilReady();

  new Worker(
    'OutreachQueue',
    async (job) => {
      console.log(JSON.stringify(job.data, null, 4));
      await fetch(`https://app.11x.ai/api/hasura/actions/processSequenceStep`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: { arg: { leadId: job.data.leadId } } }),
      });

      return { name: job.name, id: job.id, status: 'completed' };
    },
    {
      connection,
    }
  );
};
