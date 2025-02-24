const { triple, namedNode, literal } = require('@rdfjs/data-model');
const { PodResourcesHandlerMixin } = require('@activitypods/app');
const CONFIG = require('../config/config');
const urlJoin = require('url-join');

module.exports = {
  name: 'subscriptions',
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
      const { subscription } = ctx.params;
      this.logger.info(`Checking RSS feed: ${subscription['apods:url']}`);
    }
  },
  methods: {
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
        actionName: 'subscriptions.checkFeed',
        params: { subscription: resource }
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
