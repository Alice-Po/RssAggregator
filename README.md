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

## Make stop don't stop all containers

I want to stop only the rss service and not all containers.

````bash
alice@maggie:~/projets/aggregator$ make start
docker compose -f docker-compose-dev.yml  --env-file .env --env-file .env.local up -d
[+] Running 5/6
 ✔ Container aggregator-fuseki-1                 Started                                                                                                                                                         1.5s
 ✔ Container aggregator-mailcatcher-1            Running                                                                                                                                                         0.0s
 ✔ Container aggregator-redis-1                  Started                                                                                                                                                         1.2s
 ✔ Container aggregator-activitypods-backend-1   Running                                                                                                                                                         0.0s
 ⠴ Container aggregator-arena-1                  Starting                                                                                                                                                        1.5s
 ✔ Container aggregator-activitypods-frontend-1  Running                                                                                                                                                         0.0s
Error response from daemon: driver failed programming external connectivity on endpoint aggregator-arena-1 (7ce8bf6d6b43254b241611029d7a40838e20b75431f7e58123f99441a81e8e2c): Bind for 0.0.0.0:4567 failed: port is already allocated
make: *** [Makefile:10 : start] Erreur 1
alice@maggie:~/projets/aggregator$ make stop
docker compose -f docker-compose-dev.yml  --env-file .env --env-file .env.local kill
[+] Killing 5/5
 ✔ Container aggregator-activitypods-frontend-1  Killed                                                                                                                                         0.9s
 ✔ Container aggregator-mailcatcher-1            Killed                                                                                                                                         1.2s
 ✔ Container aggregator-activitypods-backend-1   Killed                                                                                                                                         0.6s
 ✔ Container aggregator-fuseki-1                 Killed                                                                                                                                         1.2s
 ✔ Container aggregator-redis-1                  Killed                                                                                                                                         1.0s
docker compose -f docker-compose-dev.yml  --env-file .env --env-file .env.local rm -fv
Going to remove aggregator-activitypods-frontend-1, aggregator-activitypods-backend-1, aggregator-arena-1, aggregator-fuseki-1, aggregator-redis-1, aggregator-mailcatcher-1
[+] Removing 6/0
 ✔ Container aggregator-mailcatcher-1            Removed                                                                                                                                        0.1s
 ✔ Container aggregator-arena-1                  Removed                                                                                                                                        0.1s
 ✔ Container aggregator-activitypods-frontend-1  Removed                                                                                                                                        0.1s
 ✔ Container aggregator-fuseki-1                 Removed                                                                                                                                        0.1s
 ✔ Container aggregator-redis-1                  Removed                                                                                                                                        0.1s
 ✔ Container aggregator-activitypods-backend-1   Removed                                                                                                                                        0.1s
alice@maggie:~/projets/aggregator$ docker ps
CONTAINER ID   IMAGE                  COMMAND                  CREATED        STATUS         PORTS                                       NAMES
730c6dae8c8b   activitypods/arena     "/sbin/tini -- npm s…"   8 days ago     Up 6 minutes   0.0.0.0:4567->4567/tcp, :::4567->4567/tcp   arena
4e2aa9bf4396   activitypods/backend   "docker-entrypoint.s…"   9 days ago     Up 6 minutes                                               app-boilerplate-1-activitypods-backend-1
3aeeaa5cb9ac   a608e48bb0ae           "docker-entrypoint.s…"   3 months ago   Up 6 minutes                                               activitypod-boilerplate-activitypods-backend-1
alice@maggie:~/projets/aggregator$ docker kill 4e2aa9bf4396 3aeeaa5cb9ac 730c6dae8c8
4e2aa9bf4396
3aeeaa5cb9ac
730c6dae8c8
alice@maggie:~/projets/aggregator$ make start
docker compose -f docker-compose-dev.yml  --env-file .env --env-file .env.local up -d
[+] Running 6/6
 ✔ Container aggregator-redis-1                  Started                                                                                                                                        1.9s
 ✔ Container aggregator-fuseki-1                 Started                                                                                                                                        1.9s
 ✔ Container aggregator-mailcatcher-1            Started                                                                                                                                        1.9s
 ✔ Container aggregator-arena-1                  Started                                                                                                                                        3.3s
 ✔ Container aggregator-activitypods-backend-1   Started                                                                                                                                        2.4s
 ✔ Container aggregator-activitypods-frontend-1  Started                                                                                                                                        4.2s
alice@maggie:~/projets/aggregator$ ^C```
````

## To delete test data

```bash
PREFIX as: <https://www.w3.org/ns/activitystreams#>
PREFIX apods: <http://localhost:3000/.well-known/context.jsonld#>
PREFIX dc: <http://purl.org/dc/terms/>

DELETE
WHERE {
  ?service a as:Service .
  ?service ?predicate ?object .
}
```
