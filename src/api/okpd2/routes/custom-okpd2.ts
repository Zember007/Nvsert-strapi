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
  ],
};


