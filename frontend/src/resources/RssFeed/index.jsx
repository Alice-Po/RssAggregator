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
    recordRepresentation: 'apods:name',
    options: {
      label: 'RSS Feeds'
    }
  },
  dataModel: {
    types: ['as:Service'],
    container: {
      'as:Service': '/data/as/service'
    }
  },
  translations: {
    fr: {
      name: 'Flux RSS |||| Flux RSS',
      fields: {
        'apods:name': 'Nom',
        'apods:url': 'URL du flux',
        'apods:description': 'Description',
        'dc:created': "Date d'ajout"
      }
    },
    en: {
      name: 'RSS Feed |||| RSS Feeds',
      fields: {
        'apods:name': 'Name',
        'apods:url': 'Feed URL',
        'apods:description': 'Description',
        'dc:created': 'Creation date'
      }
    }
  }
};
