export default {
  routes: [
    {
      method: 'GET',
      path: '/okpd2s/with-page',
      handler: 'okpd2.findWithPage',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/okpd2s/section/:section',
      handler: 'okpd2.findSection',
      config: {
        auth: false,
      },
    },
  ],
};


