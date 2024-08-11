export const defaults = [
  {
    regex: /standalone\/nest-forms-backend/,
    database: {
      host: "localhost",
      port: 5432,
      database: "forms",
      username: "forms",
      password: "password",
    },
  },
  {
    regex: /standalone\/marianum-strapi/,
    database: {
      host: "localhost",
      port: 54320,
      database: "strapi",
      username: "postgres",
      password: "postgres",
    },
  },
  {
    regex: /standalone\/city-foundation-strapi/,
    database: {
      host: "localhost",
      port: 54320,
      database: "strapi",
      username: "postgres",
      password: "postgres",
    },
  },
  // General strapi regex must be last to avoid matching previous strapi projects
  {
    regex: /standalone\/.*-strapi/,
    database: {
      host: "localhost",
      port: 5432,
      database: "strapi",
      username: "strapi",
      password: "password",
    },
  },
];
