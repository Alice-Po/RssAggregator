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
    icon: RssFeedIcon,
    recordRepresentation: 'apods:name'
  },
  dataModel: {
    types: ['as:Service'],
    container: {
      'as:Service': '/data/as/service'
    },
    fields: {
      'apods:url': {
        type: 'string'
      },
      'apods:feedUrl': {
        type: 'string'
      }
    }
  },
  translations: {
    fr: {
      name: 'Flux RSS |||| Flux RSS',
      fields: {
        'apods:url': 'URL du site',
        'apods:feedUrl': 'URL du flux RSS',
        'dc:created': "Date d'ajout"
      }
    },
    en: {
      name: 'RSS Feed |||| RSS Feeds',
      fields: {
        'apods:url': 'Website URL',
        'apods:feedUrl': 'RSS Feed URL',
        'dc:created': 'Creation date'
      }
    }
  }
};
