const { ServiceBroker } = require('moleculer');
const RssService = require('../../../services/rss.service');

describe('RSS Service', () => {
  let broker;

  beforeAll(async () => {
    console.log('🚀 Starting RSS tests...');

    broker = new ServiceBroker({
      logger: {
        type: 'Console',
        options: {
          level: 'debug', // To see all logs
          formatter: 'simple'
        }
      }
    });

    console.log('📦 Creating RSS service...');
    broker.createService(RssService);

    console.log('🔄 Starting broker...');
    await broker.start();
    console.log('✅ Broker started');
  });

  afterAll(async () => {
    console.log('🛑 Stopping broker...');
    await broker.stop();
    console.log('✅ Broker stopped');
  });

  test('checkRssFeed should return true for a valid RSS feed', async () => {
    console.log('🧪 Testing checkRssFeed...');
    const url = 'https://www.lemonde.fr/rss/une.xml';

    console.log(`📡 Checking URL: ${url}`);
    const result = await broker.call('rss.checkRssFeed', { url });

    console.log(`📝 Result: ${result}`);
    expect(result).toBe(true);
  });
});
