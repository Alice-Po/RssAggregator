const dataServers = {
  pod: {
    pod: true,
    authServer: true,
    default: true,
    baseUrl: null, // Calculated from the token
    sparqlEndpoint: null,
    void: false,
    containers: {
      pod: {
        'vcard:Individual': ['/vcard/individual'],
        'as:Event': ['/as/event'],
        'as:Service': ['/as/service']
      }
    },
    uploadsContainer: '/semapps/file'
  }
};

export default dataServers;
