import RssFeedCreate from './RssFeedCreate';
import RssFeedEdit from './RssFeedEdit';
import RssFeedList from './RssFeedList';
import RssFeedShow from './RssFeedShow';
import RssFeedIcon from '@mui/icons-material/RssFeed';

export default {
  config: {
    list: RssFeedList,
    show: RssFeedShow,
    create: RssFeedCreate,
    edit: RssFeedEdit,
    icon: RssFeedIcon
  },
  dataModel: {
    types: ['as:Service'],
    container: {
      'as:Service': '/data/as/service'
    },
    fields: {
      'as:url': {
        type: 'string'
      },
      'as:link': {
        type: 'string'
      }
    }
  },
  translations: {
    fr: {
      name: 'Flux RSS |||| Flux RSS',
      fields: {
        'as:url': 'URL du site',
        'as:link': 'URL du flux RSS',
        'dc:created': "Date d'ajout"
      }
    },
    en: {
      name: 'RSS Feed |||| RSS Feeds',
      fields: {
        'as:url': 'Website URL',
        'as:link': 'RSS Feed URL',
        'dc:created': 'Creation date'
      }
    }
  }
};
