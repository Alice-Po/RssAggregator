[![ActivityPods](https://badgen.net/badge/Powered%20by/ActivityPods/28CDFB)](https://activitypods.org)

# ActivityPods app boilerplate

See the documentation to find how to use this boilerplate:

https://docs.activitypods.org/tutorials/create-your-first-social-app/

## Commands

### For development

`make start` Starts the activitypods provider using a docker-compose file. This includes the activitypods backend and frontend server, the fuseki db, mailcatcher, redis, and arena.

`make stop` Stops and removes all containers for the activitypods provider.

`make config` Prints the config with the `.env`-file-provided environment variables filled.

`make logs-activitypods` Prints the activitypods provider logs.

`make attach-activitypods` Attaches to the [moleculer](https://moleculer.services/) repl of the activitypods backend.

### For production

`make build-prod` Builds the activitypods provider images for production. In addition to the dev images, this includes a traefik reverse proxy.

`make start-prod` Starts the activitypods provider containers for production.

`make stop-prod` Stops and removes running activitypods provider containers.

`make config-prod` Prints the config with the `.env`-file-provided environment variables filled.

`make attach-backend-prod` Attaches to the [moleculer](https://moleculer.services/) repl of the activitypods backend.

## Functionalities

### RSS Service for ActivityPods

#### How it should work

I submit a website url and the service find the RSS feed url and add it to your pod.

To find the rss url it :

1. Checks if the url provide is a valid rss feed url.
2. If not it search for a rss feed url in the html of the website.
3. If no rss feed url is found it uses a pattern to find the rss feed url.
4. If no rss feed url is found it returns an error.
   When a valid rss feed url is found it add it to the pod and the service return the pod id.

Then I should display the rss feed url content on the front end of the boiler-plate application with a link to the original content.

#### Here is the structure of the service :

```javascript
actions: {
    /**
     * Parses an RSS feed and returns its content
     *
     * @param {Object} ctx - Moleculer context
     * @param {Object} ctx.params.feed - Feed object containing the feed URL
     * @returns {Object} Parsed RSS feed data
     */
    async parseFeed(ctx) {
      // ...
    },

    /**
     * Finds the RSS feed URL for a given website
     *
     * @param {Object} ctx - Moleculer context
     * @param {string} ctx.params.url - Website URL to analyze
     * @returns {string} Found RSS feed URL
     */
    async findRssFeed(ctx) {
     //...
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
      //...
    },

    /**
     * Checks if a given URL is a valid RSS feed
     * Attempts to parse the URL as an RSS feed using the configured parser
     *
     * @param {string} url - URL to check
     * @returns {Promise<boolean>} true if URL is a valid RSS feed, false otherwise
     */
    async checkRssFeed(url) {

    },

    /**
     * Inspects HTML page to find RSS/Atom link tags
     *
     * @param {string} url - URL of the page to inspect
     * @returns {Promise<string|null>} RSS feed URL if found, null otherwise
     */
    async htmlBaliseInspection(url) {
      //...
    },

    /**
     * Tests common paths to find RSS feed
     *
     * @param {string} url - Base website URL
     * @returns {Promise<string|null>} RSS feed URL if found, null otherwise
     */
    async commonRssPathInspection(url) {
      //...
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
      //...
  }
  }
};
```

## Warning : the user is hardcoded in the service. It should be dynamic, but I didn't succeed to make it..

Be sur ton have a user with the name "test" in your pod provider.

```javascript
async started() {
this.logger.info('🚀 Démarrage du service RSS...');
try {
const podProviderUrl = 'http://localhost:3000';
this.logger.info(`🌐 Pod provider configuré: ${podProviderUrl}`);

      const username = 'test';

```

## Help with test implementation !

I just want to create this rss micro-service with TDD way, but I need help...
