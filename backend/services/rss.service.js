const { triple, namedNode, literal } = require('@rdfjs/data-model');
const { PodResourcesHandlerMixin } = require('@activitypods/app');
const CONFIG = require('../config/config');
const urlJoin = require('url-join');
const Parser = require('rss-parser');

module.exports = {
  name: 'rss-feeds',
  mixins: [PodResourcesHandlerMixin],
  settings: {
    type: 'as:Service',
    containerUri: '/data/as/service'
  },
  dependencies: ['pod-resources', 'app'],
  async started() {
    this.logger.info('Checking if Service container exists...');

    try {
      const podProviderUrl = 'http://localhost:3000';
      this.logger.info(`Using pod provider: ${podProviderUrl}`);

      // Test Le Monde RSS feed
      await this.testLeMondeFeed();

      const containerUri = urlJoin(podProviderUrl, 'data/as/service');
      const actorUri = urlJoin(podProviderUrl, 'test');

      this.logger.info(`Container URI: ${containerUri}`);
      this.logger.info(`Actor URI: ${actorUri}`);

      const result = await this.broker.call('pod-resources.list', {
        containerUri,
        actorUri
      });

      this.logger.info('Container check result:', result);

      if (!result.ok) {
        this.logger.info('Creating Service container...');
        await this.broker.call('pod-resources.post', {
          containerUri: urlJoin(podProviderUrl, 'data'),
          resource: {
            '@context': 'https://www.w3.org/ns/activitystreams',
            '@type': 'ldp:Container',
            'apods:type': 'as:Service'
          },
          actorUri
        });
      }
    } catch (error) {
      this.logger.error('Error while checking/creating container:', error);
    }
  },
  actions: {
    async checkFeed(ctx) {
      const { feed } = ctx.params;
      this.logger.info(`Checking RSS feed: ${feed['apods:url']}`);

      try {
        const parser = new Parser();
        const feedData = await parser.parseURL(feed['apods:url']);

        this.logger.info('Feed title:', feedData.title);
        this.logger.info('Feed description:', feedData.description);

        // Log the first 3 items
        feedData.items.slice(0, 3).forEach((item, index) => {
          this.logger.info(`\nItem ${index + 1}:`);
          this.logger.info('Title:', item.title);
          this.logger.info('Link:', item.link);
          this.logger.info('Date:', item.pubDate);
        });
      } catch (error) {
        this.logger.error('Error parsing feed:', error);
      }
    }
  },
  methods: {
    async testLeMondeFeed() {
      this.logger.info('Testing Le Monde RSS feed...');

      try {
        const parser = new Parser();
        // Le Monde RSS feed URL
        const feedUrl = 'https://www.lemonde.fr/rss/une.xml';

        this.logger.info('Fetching feed from:', feedUrl);
        const feed = await parser.parseURL(feedUrl);

        this.logger.info('\n=== Le Monde RSS Feed ===');
        this.logger.info('Title:', feed.title);
        this.logger.info('Description:', feed.description);
        this.logger.info('\nLatest articles:');

        // Display the first 5 articles
        feed.items.slice(0, 5).forEach((item, index) => {
          this.logger.info(`\nArticle ${index + 1}:`);
          this.logger.info('Title:', item.title);
          this.logger.info('Link:', item.link);
          this.logger.info('Published:', item.pubDate);
          this.logger.info('---');
        });
      } catch (error) {
        this.logger.error('Error testing Le Monde feed:', error);
      }
    },
    async onCreate(ctx, resource, actorUri) {
      await this.actions.patch(
        {
          resourceUri: resource.id || resource['@id'],
          triplesToAdd: [
            triple(
              namedNode(resource.id || resource['@id']),
              namedNode('http://www.w3.org/ns/activitystreams#summary'),
              literal(`RSS Feed: ${resource['apods:url']}`)
            )
          ],
          actorUri
        },
        { parentCtx: ctx }
      );

      await ctx.call('timer.set', {
        key: [resource.id, 'check'],
        time: new Date(),
        actionName: 'rss-feeds.checkFeed',
        params: { feed: resource }
      });
    },
    async onUpdate(ctx, resource, actorUri) {
      // Handle post-update actions
    },
    async onDelete(ctx, resource, actorUri) {
      // Handle post-delete actions
    }
  }
};
