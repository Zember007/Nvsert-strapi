export default {
  rest: {
    defaultLimit: 25,
    // Keep global limits sane; large datasets should be served via dedicated custom endpoints.
    maxLimit: 5000,
    withCount: true,
    defaultPopulate: ['category', 'img', 'documents', 'content', 'content.image', 'cta', 'seo']
  },
};
