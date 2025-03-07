import React, { useState, useEffect } from 'react';
import { useCollection } from '@semapps/activitypub-components';
import { Card, CardContent, Typography } from '@mui/material';

const ArticlesFeed = () => {
  console.log('🚀 ArticlesFeed - Composant rendu');

  const { items: services, loading: servicesLoading, error: servicesError } = useCollection('Service');

  console.log('📊 État actuel:', {
    servicesLoading,
    servicesError,
    servicesCount: services?.length,
    services
  });

  const [articles, setArticles] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  useEffect(() => {
    console.log('🔄 useEffect déclenché', {
      hasServices: Boolean(services),
      servicesCount: services?.length
    });
    if (services && services.length > 0) {
      // Les services contiennent déjà les URLs RSS dans as:link
      console.log(
        'Services RSS trouvés:',
        services.map(s => s['as:link'])
      );

      // Le service backend s'occupe de parser ces URLs et de retourner les articles
      // via la méthode getAllArticles que nous avons déjà implémentée
    }
  }, [services]);

  if (servicesLoading || loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!services?.length) return <div>Aucun flux RSS configuré</div>;
  if (!articles) return null;

  return (
    <div style={{ margin: '1em' }}>
      <Typography variant="h4" gutterBottom>
        Flux d'articles
      </Typography>
      {articles.map(article => (
        <Card key={article.guid || article.link} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6">{article.title}</Typography>
            <Typography color="textSecondary" gutterBottom>
              Source: {article.feedSource?.title}
            </Typography>
            <Typography variant="body2">{article.content || article.contentSnippet}</Typography>
            <Typography variant="caption">Publié le : {new Date(article.pubDate).toLocaleString()}</Typography>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ArticlesFeed;
