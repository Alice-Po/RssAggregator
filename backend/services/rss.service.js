const { triple, namedNode, literal } = require('@rdfjs/data-model');
const { PodResourcesHandlerMixin } = require('@activitypods/app');
const CONFIG = require('../config/config');
const urlJoin = require('url-join');
const Parser = require('rss-parser');
const fetch = require('node-fetch');
const robotsParser = require('robots-parser');

module.exports = {
  name: 'rss',
  mixins: [PodResourcesHandlerMixin],
  settings: {
    type: 'as:Service',
    containerUri: '/data/as/service',
    userAgent: 'ActivityPods-RSS-Reader/1.0 (+https://activitypods.org/contact)',
    cacheTime: 15 * 60 * 1000, // 15 minutes in milliseconds
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

  async created() {
    this.logger.info('📡 RSS Service creation in progress...');
    this.feedCache = new Map();
    this.logger.info('💾 Cache initialized');
  },

  async started() {
    this.logger.info('🚀 Starting RSS Service...');
    try {
      const podProviderUrl = 'http://localhost:3000';
      this.logger.info(`🌐 Pod provider configured: ${podProviderUrl}`);

      const username = 'test';
      const actorUri = urlJoin(podProviderUrl, username);
      const dataset = username;
      this.logger.info(`👤 User: ${username}`);
      this.logger.info(`🔗 Actor URI: ${actorUri}`);

      const containerUri = urlJoin(podProviderUrl, username, 'data/as/service');
      this.logger.info(`📁 Container URI: ${containerUri}`);

      const result = await this.broker.call(
        'pod-resources.list',
        { containerUri, actorUri },
        { meta: { webId: actorUri, dataset } }
      );
      this.logger.info('📋 Container check result:', result);

      if (!result.ok) {
        this.logger.info('📂 Creating Service container...');
        await this.broker.call(
          'pod-resources.post',
          {
            containerUri: urlJoin(podProviderUrl, username, 'data'),
            resource: {
              '@context': 'https://www.w3.org/ns/activitystreams',
              '@type': 'ldp:Container',
              'apods:type': 'as:Service'
            },
            actorUri
          },
          {
            meta: {
              webId: actorUri,
              dataset
            }
          }
        );
        this.logger.info('✅ Container created successfully');
      }

      const feeds = await this.broker.call(
        'pod-resources.list',
        {
          containerUri,
          actorUri,
          filters: {
            type: 'Service'
          },
          dereferenceItems: true
        },
        {
          meta: {
            webId: actorUri,
            dataset
          }
        }
      );

      if (feeds.ok && feeds.body && feeds.body['ldp:contains']) {
        const resources = feeds.body['ldp:contains'];
        this.logger.info(`📊 Number of feeds found: ${resources.length}`);
        this.logger.info('Feeds found:', JSON.stringify(resources, null, 2));

        for (const feed of resources) {
          if (feed['apods:url']) {
            this.logger.info(`Processing feed: ${feed['apods:url']}`);
            await this.actions.parseFeed({ feed });
          } else {
            this.logger.warn(`Feed without URL found:`, feed);
          }
        }
      } else {
        this.logger.info('No RSS feeds found in pod');
        this.logger.info('Full response:', JSON.stringify(feeds, null, 2));
      }
    } catch (error) {
      this.logger.error('❌ Error during startup:', error);
    }
  },

  actions: {
    /**
     * Parses an RSS feed and returns its content
     *
     * @param {Object} ctx - Moleculer context
     * @param {Object} ctx.params.feed - Feed object containing the feed URL
     * @returns {Object} Parsed RSS feed data
     */
    async parseFeed(ctx) {
      const { feed } = ctx.params;
      let feedUrl = feed['apods:feedUrl'] || feed['apods:url'];

      try {
        // Vérifier si l'URL est valide et trouver la bonne URL si nécessaire
        if (!(await this.checkRssFeed(feedUrl))) {
          this.logger.info('URL is not a valid RSS feed, trying to find the correct feed URL');
          feedUrl = await this.actions.findRssFeed({ url: feedUrl });

          if (!(await this.checkRssFeed(feedUrl))) {
            throw new Error(`Could not find valid RSS feed for URL: ${feedUrl}`);
          }

          this.logger.info('Found valid RSS feed:', feedUrl);
        }

        // Configuration du parser avec notre User-Agent éthique
        const parser = new Parser({
          headers: {
            'User-Agent': this.settings.userAgent,
            Accept: 'application/rss+xml,application/xml,application/atom+xml,text/xml'
          },
          customFields: {
            item: [
              ['media:content', 'media:content'],
              ['media:thumbnail', 'media:thumbnail']
            ]
          }
        });

        // Vérifier le cache
        const cachedData = this.feedCache.get(feedUrl);
        if (cachedData && Date.now() - cachedData.timestamp < this.settings.cacheTime) {
          this.logger.info('Returning cached feed data');
          return cachedData.data;
        }

        this.logger.info(`Fetching RSS feed: ${feedUrl}`);
        const feedData = await parser.parseURL(feedUrl);

        // Mettre en cache
        this.feedCache.set(feedUrl, {
          timestamp: Date.now(),
          data: feedData
        });

        // Afficher les données parsées dans les logs
        this.logger.info('Feed parsed successfully:', {
          title: feedData.title,
          description: feedData.description,
          link: feedData.link,
          lastBuildDate: feedData.lastBuildDate,
          itemCount: feedData.items?.length || 0,
          latestItems: feedData.items?.slice(0, 3).map(item => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            creator: item.creator || item.author
          }))
        });

        return feedData;
      } catch (error) {
        this.logger.error('Error while parsing feed:', error);
        throw error;
      }
    },

    /**
     * Finds the RSS feed URL for a given website
     *
     * @param {Object} ctx - Moleculer context
     * @param {string} ctx.params.url - Website URL to analyze
     * @returns {string} Found RSS feed URL
     */
    async findRssFeed(ctx) {
      const { url } = ctx.params;

      try {
        // 1. Vérifier si l'URL est déjà un flux RSS
        if (await this.checkRssFeed(url)) {
          return url;
        }

        // 2. Inspecter les balises HTML pour trouver le flux RSS
        const rssUrl = await this.htmlBaliseInspection(url);
        if (rssUrl) {
          return rssUrl;
        }

        // 3. Essayer les chemins communs
        const commonRssUrl = await this.commonRssPathInspection(url);
        if (commonRssUrl) {
          return commonRssUrl;
        }

        // Si aucune méthode n'a fonctionné, retourner l'URL originale
        return url;
      } catch (error) {
        this.logger.error('Error while finding RSS feed:', error);
        return url;
      }
    }
  },

  methods: {
    /**
     * Checks if a URL is allowed to be accessed according to robots.txt rules
     * Fetches and parses robots.txt file to determine if the URL can be crawled
     *
     * @param {string} url - URL to check against robots.txt rules
     * @returns {Promise<boolean>} true if access is allowed or robots.txt is not found, false if explicitly forbidden
     */
    async checkRobotsRules(url) {
      this.logger.info(`🤖 Checking robots rules for: ${url}`);
      try {
        const robotsUrl = new URL('/robots.txt', url).href;
        this.logger.debug(`📎 Robots.txt URL: ${robotsUrl}`);

        const response = await fetch(robotsUrl);
        if (!response.ok) {
          this.logger.info('ℹ️ No robots.txt found');
          return true;
        }

        const robotsTxt = await response.text();
        this.logger.debug('📝 Robots.txt content retrieved');

        const robots = robotsParser(robotsUrl, robotsTxt);
        const isAllowed = robots.isAllowed(url, this.settings.userAgent);

        this.logger.info(`${isAllowed ? '✅' : '❌'} Access ${isAllowed ? 'allowed' : 'forbidden'} by robots.txt`);
        return isAllowed;
      } catch (error) {
        this.logger.warn('⚠️ Error checking robots.txt:', error);
        return true;
      }
    },

    /**
     * Checks if a given URL is a valid RSS feed
     * Attempts to parse the URL as an RSS feed using the configured parser
     *
     * @param {string} url - URL to check
     * @returns {Promise<boolean>} true if URL is a valid RSS feed, false otherwise
     */
    async checkRssFeed(url) {
      this.logger.info(`🔍 Checking RSS feed: ${url}`);

      try {
        const parser = new Parser({
          headers: {
            'User-Agent': this.settings.userAgent,
            Accept: 'application/rss+xml,application/xml,application/atom+xml,text/xml'
          }
        });

        this.logger.debug('⚙️ Parser configured, attempting to parse...');
        await parser.parseURL(url);

        this.logger.info('✅ Valid RSS feed found at:', url);
        return true;
      } catch (error) {
        this.logger.warn('❌ Invalid or inaccessible URL:', url);
        this.logger.debug('📝 Error details:', error.message);
        return false;
      }
    },

    /**
     * Inspects HTML page to find RSS/Atom link tags
     *
     * @param {string} url - URL of the page to inspect
     * @returns {Promise<string|null>} RSS feed URL if found, null otherwise
     */
    async htmlBaliseInspection(url) {
      this.logger.info(`🔎 Inspecting HTML from: ${url}`);
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.settings.userAgent,
            Accept: 'text/html'
          }
        });
        this.logger.debug(`📥 HTTP response status: ${response.status}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();
        this.logger.debug('📄 HTML retrieved, searching for RSS tags...');

        const head = html.match(/<head[^>]*>[\s\S]*?<\/head>/i)?.[0] || '';
        this.logger.debug('👀 HEAD section extracted, analyzing RSS links...');

        // Patterns pour trouver les liens RSS
        const rssPatterns = [
          /<link[^>]*rel=["']alternate["'][^>]*type=["']application\/rss\+xml["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
          /<link[^>]*type=["']application\/rss\+xml["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
          /<link[^>]*type=["']application\/atom\+xml["'][^>]*href=["']([^"']+)["'][^>]*>/gi
        ];

        for (const pattern of rssPatterns) {
          this.logger.debug('🔄 Testing new RSS pattern...');
          const matches = head.matchAll(pattern);
          for (const match of matches) {
            if (match && match[1]) {
              const feedUrl = new URL(match[1], url).href;
              this.logger.info('🎯 RSS link found:', feedUrl);

              if (await this.checkRssFeed(feedUrl)) {
                this.logger.info('✅ Valid RSS feed confirmed:', feedUrl);
                return feedUrl;
              }
            }
          }
          pattern.lastIndex = 0;
        }

        this.logger.info('❌ No valid RSS feed found in HTML');
        return null;
      } catch (error) {
        this.logger.error('💥 Error during HTML inspection:', error);
        return null;
      }
    },

    /**
     * Tests common paths to find RSS feed
     *
     * @param {string} url - Base website URL
     * @returns {Promise<string|null>} RSS feed URL if found, null otherwise
     */
    async commonRssPathInspection(url) {
      this.logger.info(`🔄 Testing common paths for: ${url}`);
      try {
        const baseUrl = new URL(url);

        for (const path of this.settings.commonPaths) {
          try {
            const fullUrl = new URL(path, baseUrl).href;
            this.logger.debug(`🔍 Testing path: ${fullUrl}`);

            if (await this.checkRssFeed(fullUrl)) {
              this.logger.info('✅ RSS feed found at:', fullUrl);
              return fullUrl;
            }
          } catch (error) {
            this.logger.debug(`❌ Invalid path: ${path}`, error.message);
          }
        }

        this.logger.info('❌ No common path resulted in a valid feed');
        return null;
      } catch (error) {
        this.logger.error('💥 Error during path inspection:', error);
        return null;
      }
    },

    /**
     * Handles creation of a new RSS feed
     * Checks and corrects URL if needed
     *
     * @param {Object} ctx - Moleculer context
     * @param {Object} resource - Resource to create
     * @param {string} actorUri - Actor URI
     */
    async onCreate(ctx, resource, actorUri) {
      try {
        let feedUrl = resource['apods:url'];
        let summary = '';

        // 1. Vérifier si l'URL est directement celle d'un flux RSS
        if (await this.checkRssFeed(feedUrl)) {
          summary = `Valid RSS feed: ${feedUrl}`;
          this.logger.info(summary);
          // Dans ce cas, l'URL du flux est la même que l'URL originale
          await this.actions.patch(
            {
              resourceUri: resource.id || resource['@id'],
              triplesToAdd: [
                triple(namedNode(resource.id || resource['@id']), namedNode('apods:feedUrl'), literal(feedUrl))
              ],
              actorUri
            },
            { parentCtx: ctx }
          );
        } else {
          // 2. Si ce n'est pas un flux RSS, essayer de trouver l'URL du flux
          this.logger.info(`Searching RSS feed for: ${feedUrl}`);
          const foundUrl = await this.actions.findRssFeed({ url: feedUrl });

          if (foundUrl !== feedUrl && (await this.checkRssFeed(foundUrl))) {
            // Flux RSS trouvé à une autre URL
            summary = `RSS feed found and validated: ${foundUrl}`;
            this.logger.info(summary);

            // Stocker l'URL du flux dans apods:feedUrl
            await this.actions.patch(
              {
                resourceUri: resource.id || resource['@id'],
                triplesToAdd: [
                  triple(namedNode(resource.id || resource['@id']), namedNode('apods:feedUrl'), literal(foundUrl))
                ],
                actorUri
              },
              { parentCtx: ctx }
            );
          } else {
            // Aucun flux RSS trouvé
            summary = `⚠️ No RSS feed found for: ${feedUrl}`;
            this.logger.warn(summary);
          }
        }

        // Mettre à jour le résumé de la ressource
        await this.actions.patch(
          {
            resourceUri: resource.id || resource['@id'],
            triplesToAdd: [
              triple(
                namedNode(resource.id || resource['@id']),
                namedNode('http://www.w3.org/ns/activitystreams#summary'),
                literal(summary)
              )
            ],
            actorUri
          },
          { parentCtx: ctx }
        );

        // Programmer la vérification périodique du flux
        await ctx.call('timer.set', {
          key: [resource.id, 'check'],
          time: new Date(),
          actionName: 'rss.parseFeed',
          params: {
            feed: {
              ...resource,
              'apods:feedUrl': resource['apods:feedUrl'] || foundUrl
            }
          }
        });
      } catch (error) {
        this.logger.error('Error in onCreate:', error);
        throw error;
      }
    }
  }
};
