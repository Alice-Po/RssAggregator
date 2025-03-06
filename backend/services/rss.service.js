const { PodResourcesHandlerMixin } = require('@activitypods/app');
const { triple, namedNode, literal } = require('@rdfjs/data-model');
const Parser = require('rss-parser');
const fetch = require('node-fetch');

// Définition des URIs complets
const AS = 'https://www.w3.org/ns/activitystreams#';

module.exports = {
  name: 'rss',
  mixins: [PodResourcesHandlerMixin],

  settings: {
    type: 'Service',
    containerUri: '/data/as/service',
    userAgent: 'ActivityPods-RSS-Reader/1.0 (+https://activitypods.org/contact)',
    commonPaths: [
      '/articles/feed', // For Mediapart
      '/titres.rss', // For FranceTV Info
      '/feed',
      '/rss',
      '/atom',
      '/feed.xml',
      '/rss.xml',
      '/atom.xml',
      '/feed/rss',
      '/blog/feed',
      '/blog/rss',
      '/rss/feed',
      '/index.xml',
      '/rss/une.xml' // For Le Monde
    ]
  },

  async started() {
    this.logger.info('🚀 RSS Service starting...');

    try {
      const podProviderUrl = process.env.POD_PROVIDER_URL || 'http://localhost:3000';
      const username = 'test';
      const actorUri = `${podProviderUrl}/${username}`;
      const dataset = username;

      this.logger.info('📝 Configuration:', { podProviderUrl, username, actorUri });
      this.logger.info('📝 Starting maintenance service...');

      // Récupérer toutes les ressources de type Service
      const result = await this.broker.call(
        'pod-resources.list',
        {
          containerUri: `${actorUri}/data/as/service`,
          filters: {
            type: this.settings.type
          },
          actorUri
        },
        {
          meta: {
            webId: actorUri,
            dataset,
            host: new URL(podProviderUrl).host
          }
        }
      );

      if (result.ok && result.body && result.body['ldp:contains']) {
        const resources = result.body['ldp:contains'];
        this.logger.info(`📚 Found ${resources.length} RSS feeds in pod`);

        // // Traiter chaque ressource
        // for (const resource of resources) {
        //   // Gérer la migration des anciens prédicats vers les nouveaux
        //   const sourceUrl = resource['as:url'] || resource['apods:url'];
        //   const feedUrl = resource['as:link'] || resource['apods:feedUrl'];

        //   this.logger.info(`🔄 Processing existing feed: ${sourceUrl}`);
        //   try {
        //     await this.onCreate(
        //       {
        //         meta: {
        //           webId: actorUri,
        //           dataset,
        //           host: new URL(podProviderUrl).host
        //         }
        //       },
        //       {
        //         ...resource,
        //         'as:url': sourceUrl,
        //         'as:link': feedUrl
        //       },
        //       actorUri
        //     );
        //   } catch (error) {
        //     this.logger.error(`❌ Error processing feed ${sourceUrl}:`, error);
        //   }
        // }
      } else {
        this.logger.info(' No RSS feeds found in pod');
      }
    } catch (error) {
      this.logger.error('❌ Error during service initialization:', error);
    }
  },

  methods: {
    // Cette méthode est automatiquement convertie en handler d'activité Create
    async onCreate(ctx, resource, actorUri) {
      this.logger.info('🎯onCreate:  New RSS feed creation detected');
      this.logger.info('📦onCreate:  Resource:', JSON.stringify(resource, null, 2));

      try {
        let feedUrl = resource[`as:url`];
        this.logger.info(`🔍 Processing new RSS URL: ${feedUrl}`);

        // 1. Vérifier si c'est déjà un flux RSS
        if (await this.checkRssFeed(feedUrl)) {
          this.logger.info('✅ onCreate:  URL is already a valid RSS feed');
        } else {
          // 2. Chercher l'URL du flux RSS
          this.logger.info('✅ onCreate:  URL is NOT already a valid RSS feed');
          this.logger.info('🔎 onCreate:  Searching for RSS feed URL entering in findRssFeed function');
          feedUrl = await this.findRssFeed(feedUrl);

          if (await this.checkRssFeed(feedUrl)) {
            this.logger.info('✅ onCreate:  Found valid RSS feed:', feedUrl);
          } else {
            this.logger.warn('❌ onCreate:  No valid RSS feed found');
          }
        }

        // Sauvegarder l'URL du flux
        const patchResult = await this.actions.patch(
          {
            resourceUri: resource.id || resource['@id'],
            triplesToAdd: [triple(namedNode(resource.id || resource['@id']), namedNode(`${AS}link`), literal(feedUrl))],
            actorUri
          },
          { parentCtx: ctx }
        );
        this.logger.info('💾 onCreate:  Feed URL saved successfully');
        this.logger.info('📦 onCreate:  Patch result:', JSON.stringify(patchResult, null, 2));

        // Retourner la réponse au format attendu par React-Admin
        return {
          data: {
            ...patchResult?.data,
            id: resource.id || resource['@id'],
            [`${AS}url`]: resource[`${AS}url`],
            [`${AS}link`]: feedUrl,
            type: 'Service'
          }
        };
      } catch (error) {
        this.logger.error('❌ Error processing RSS feed:', error);
        throw error;
      }
    },

    // Méthode utilitaire pour vérifier un flux RSS
    async checkRssFeed(url) {
      this.logger.info(`🔍 checkRssFeed:  Checking RSS feed: ${url}`);
      try {
        const parser = new Parser({
          headers: { 'User-Agent': this.settings.userAgent }
        });
        await parser.parseURL(url);
        this.logger.info('✅ checkRssFeed:  Valid RSS feed found');
        return true;
      } catch (error) {
        this.logger.debug('❌ checkRssFeed:  Not a valid RSS feed:', error.message);
        return false;
      }
    },

    // Méthode utilitaire pour trouver l'URL du flux RSS
    async findRssFeed(url) {
      this.logger.info(`🔎 findRssFeed:  Looking for RSS feed at: ${url}`);
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': this.settings.userAgent }
        });
        const html = await response.text();

        //TODO : chercher les balises RSS dans le HTML et consulter le fichier robots.txt

        const feedUrl = await this.commonRssPathInspection(url);
        if (feedUrl) {
          this.logger.info('✅ findRssFeed:  Found RSS feed URL:', feedUrl);
          return feedUrl;
        }
      } catch (error) {
        this.logger.error('❌ findRssFeed:  Error finding RSS feed:', error);
        return url;
      }
    },
    /**
     * Tests common paths to find RSS feed
     *
     * @param {string} url - Base website URL
     * @returns {Promise<string|null>} RSS feed URL if found, null otherwise
     */
    async commonRssPathInspection(url) {
      this.logger.info(`🔄 commonRssPathInspection: Testing common paths for: ${url}`);
      try {
        const baseUrl = new URL(url);

        for (const path of this.settings.commonPaths) {
          try {
            const fullUrl = new URL(path, baseUrl).href;
            this.logger.debug(`🔍 commonRssPathInspection: Testing path: ${fullUrl}`);

            if (await this.checkRssFeed(fullUrl)) {
              this.logger.info('✅ commonRssPathInspection: RSS feed found at:', fullUrl);
              return fullUrl;
            }
          } catch (error) {
            this.logger.debug(`❌ commonRssPathInspection: Invalid path: ${path}`, error.message);
          }
        }

        this.logger.info('❌ commonRssPathInspection: No common path resulted in a valid feed');
        return null;
      } catch (error) {
        this.logger.error('💥 commonRssPathInspection: Error during path inspection:', error);
        return null;
      }
    }
  }
};
