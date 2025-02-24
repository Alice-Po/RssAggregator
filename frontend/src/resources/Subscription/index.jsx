import SubscriptionCreate from './SubscriptionCreate';
import SubscriptionEdit from './SubscriptionEdit';
import SubscriptionList from './SubscriptionList';
import SubscriptionShow from './SubscriptionShow';
import RssFeedIcon from '@mui/icons-material/RssFeed';

export default {
  config: {
    list: SubscriptionList,
    show: SubscriptionShow,
    create: SubscriptionCreate,
    edit: SubscriptionEdit,
    icon: RssFeedIcon,
    recordRepresentation: 'apods:name',
    options: {
      label: 'Subscriptions'
    }
  },
  dataModel: {
    types: ['as:Service'],
    container: {
      'apods:Subscription': '/subscriptions'
    }
  },
  translations: {
    fr: {
      name: 'Abonnement |||| Abonnements',
      fields: {
        'apods:name': 'Nom',
        'apods:url': 'URL du flux',
        'apods:description': 'Description',
        'dc:created': "Date d'ajout"
      }
    },
    en: {
      name: 'Subscription |||| Subscriptions',
      fields: {
        'apods:name': 'Name',
        'apods:url': 'Feed URL',
        'apods:description': 'Description',
        'dc:created': 'Creation date'
      }
    }
  }
};
