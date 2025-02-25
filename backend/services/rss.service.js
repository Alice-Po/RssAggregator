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
    cacheTime: 15 * 60 * 1000, // 15 minutes en millisecondes
    commonPaths: [
      '/articles/feed', // Pour Mediapart
      '/titres.rss', // Pour FranceTV Info
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
      '/rss/une.xml' // Pour Le Monde
    ]
  },
  dependencies: ['pod-resources', 'app'],
  async created() {
    // Initialiser le cache
    this.feedCache = new Map();
  },
  async started() {
    this.logger.info('Checking if Service container exists...');

    try {
      const podProviderUrl = 'http://localhost:3000';
      this.logger.info(`Using pod provider: ${podProviderUrl}`);

      // Utiliser le contexte par défaut pour l'utilisateur 'tara'
      const username = 'titi';
      const actorUri = urlJoin(podProviderUrl, username);
      const dataset = username;

      this.logger.info(`Actor URI: ${actorUri}`);

      // Le conteneur doit être dans l'espace de l'utilisateur
      const containerUri = urlJoin(podProviderUrl, username, 'data/as/service');
      this.logger.info(`Container URI: ${containerUri}`);

      // Récupérer la liste des feeds avec le contexte approprié
      const result = await this.broker.call(
        'pod-resources.list',
        {
          containerUri,
          actorUri
        },
        {
          meta: {
            webId: actorUri,
            dataset
          }
        }
      );

      this.logger.info('Container check result:', result);

      if (!result.ok) {
        this.logger.info('Creating Service container...');
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
      }

      // Lister et tester tous les feeds existants
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
        this.logger.info(`Found ${resources.length} RSS feeds in pod`);
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
      this.logger.error('Error while checking/creating container:', error);
    }
  },
  actions: {
    /**
     * Parse un flux RSS et retourne son contenu
     *
     * @param {Object} ctx - Contexte Moleculer
     * @param {Object} ctx.params.feed - Objet feed contenant l'URL du flux
     * @returns {Object} Données du flux RSS parsé
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
     * Trouve l'URL du flux RSS pour un site donné
     *
     * @param {Object} ctx - Contexte Moleculer
     * @param {string} ctx.params.url - URL du site à analyser
     * @returns {string} URL du flux RSS trouvé
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
     * Nettoie le XML pour corriger les erreurs courantes
     *
     * @param {string} xml - XML brut à nettoyer
     * @returns {string} XML nettoyé
     */
    cleanXML(xml) {
      try {
        // Supprimer les caractères invalides XML
        xml = xml.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

        // Corriger les attributs sans valeur (ex: disabled> -> disabled="">)
        xml = xml.replace(/(\s+[a-zA-Z-_]+)(>|\s+[a-zA-Z-_]+=)/g, '$1=""$2');

        // Corriger les tags non fermés
        xml = xml.replace(/<(img|br|hr|input|meta|link)([^>]*)(?<!\/)>/g, '<$1$2/>');

        // Corriger les entités HTML mal formées
        xml = xml.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;');

        return xml;
      } catch (error) {
        this.logger.warn('Error while cleaning XML:', error);
        return xml; // Retourner le XML original en cas d'erreur
      }
    },

    /**
     * Vérifie si une URL donnée est un flux RSS valide
     *
     * @param {string} url - URL à vérifier
     * @returns {Promise<boolean>} true si l'URL est un flux RSS valide, false sinon
     */
    async checkRssFeed(url) {
      try {
        const parser = new Parser({
          headers: {
            'User-Agent': this.settings.userAgent,
            Accept: 'application/rss+xml,application/xml,application/atom+xml,text/xml'
          }
        });

        await parser.parseURL(url);
        this.logger.info('Valid RSS feed found at:', url);
        return true;
      } catch (error) {
        this.logger.debug('URL is not a valid RSS feed:', url);
        return false;
      }
    },

    /**
     * Inspecte le HTML d'une page pour trouver les balises link RSS/Atom
     *
     * @param {string} url - URL de la page à inspecter
     * @returns {Promise<string|null>} URL du flux RSS si trouvé, null sinon
     */
    async htmlBaliseInspection(url) {
      try {
        // Récupérer le HTML de la page
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.settings.userAgent,
            Accept: 'text/html'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();

        // Extraire la section head
        const head = html.match(/<head[^>]*>[\s\S]*?<\/head>/i)?.[0] || '';

        // Patterns pour trouver les liens RSS (ajout du flag 'g' pour global)
        const rssPatterns = [
          /<link[^>]*rel=["']alternate["'][^>]*type=["']application\/rss\+xml["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
          /<link[^>]*type=["']application\/rss\+xml["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
          /<link[^>]*type=["']application\/atom\+xml["'][^>]*href=["']([^"']+)["'][^>]*>/gi
        ];

        // Tester chaque pattern
        for (const pattern of rssPatterns) {
          const matches = head.matchAll(pattern);
          for (const match of matches) {
            if (match && match[1]) {
              const feedUrl = new URL(match[1], url).href;
              this.logger.info('Found RSS link in HTML:', feedUrl);

              // Vérifier si c'est un flux RSS valide
              if (await this.checkRssFeed(feedUrl)) {
                return feedUrl;
              }
            }
          }
          // Réinitialiser lastIndex pour la prochaine utilisation
          pattern.lastIndex = 0;
        }

        return null;
      } catch (error) {
        this.logger.error('Error in HTML inspection:', error);
        return null;
      }
    },

    /**
     * Teste les chemins communs pour trouver un flux RSS
     *
     * @param {string} url - URL de base du site
     * @returns {Promise<string|null>} URL du flux RSS si trouvé, null sinon
     */
    async commonRssPathInspection(url) {
      try {
        const baseUrl = new URL(url);

        for (const path of this.settings.commonPaths) {
          try {
            const testUrl = new URL(path, baseUrl).href;
            this.logger.debug('Testing common path:', testUrl);

            if (await this.checkRssFeed(testUrl)) {
              this.logger.info('Found valid RSS feed at common path:', testUrl);
              return testUrl;
            }
          } catch (e) {
            // Continuer avec le prochain chemin
            continue;
          }
        }

        return null;
      } catch (error) {
        this.logger.error('Error in common path inspection:', error);
        return null;
      }
    },

    /**
     * Gère la création d'un nouveau flux RSS
     * Vérifie et corrige l'URL si nécessaire
     *
     * @param {Object} ctx - Contexte Moleculer
     * @param {Object} resource - Ressource à créer
     * @param {string} actorUri - URI de l'acteur
     */
    async onCreate(ctx, resource, actorUri) {
      try {
        let feedUrl = resource['apods:url'];
        let summary = '';

        // 1. Vérifier si l'URL est directement celle d'un flux RSS
        if (await this.checkRssFeed(feedUrl)) {
          summary = `Flux RSS valide : ${feedUrl}`;
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
          this.logger.info(`Recherche du flux RSS pour : ${feedUrl}`);
          const foundUrl = await this.actions.findRssFeed({ url: feedUrl });

          if (foundUrl !== feedUrl && (await this.checkRssFeed(foundUrl))) {
            // Flux RSS trouvé à une autre URL
            summary = `Flux RSS trouvé et validé : ${foundUrl}`;
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
            summary = `⚠️ Aucun flux RSS trouvé pour : ${feedUrl}`;
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
              'apods:feedUrl': resource['apods:feedUrl'] || feedUrl
            }
          }
        });
      } catch (error) {
        this.logger.error('Error in onCreate:', error);
        throw error;
      }
    },
    async onUpdate(ctx, resource, actorUri) {
      // Handle post-update actions
    },
    async onDelete(ctx, resource, actorUri) {
      // Handle post-delete actions
    }
  }
};
