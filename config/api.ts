export default {
  rest: {
    defaultLimit: 25,
    maxLimit: 200000,
    withCount: true,
    defaultPopulate: ['category', 'img', 'documents', 'content', 'content.image', 'cta', 'seo']
  },
};
