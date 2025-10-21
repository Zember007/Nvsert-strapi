export default {
    routes: [
      {
        method: 'GET',
        path: '/services/slug/:slug',
        handler: 'service.findBySlug',
        config: {
          auth: false,
        },
      },
    ],
  };
  