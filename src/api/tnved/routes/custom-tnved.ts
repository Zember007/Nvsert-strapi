export default {
  routes: [
    {
      method: 'GET',
      path: '/tnveds/with-page',
      handler: 'tnved.findWithPage',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/tnveds/chapter/:chapter',
      handler: 'tnved.findChapter',
      config: {
        auth: false,
      },
    },
    // alias in case the frontend keeps calling it "section"
    {
      method: 'GET',
      path: '/tnveds/section/:section',
      handler: 'tnved.findChapter',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/tnveds/code/:code',
      handler: 'tnved.findByCode',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/tnveds/search',
      handler: 'tnved.search',
      config: {
        auth: false,
      },
    },
  ],
};

