export const projects = [
    {
        name: 'Bratislava',
        folder: 'bratislava-strapi',
        defaultDb: {
            port: '5432',
            host: 'localhost',
            database: 'strapi',
            username: 'strapi',
            password: 'password',
        },
        fileRegex: /^strapi-\d{4}-\d{2}-\d{2}\.sql$/
    },
    {
        name: 'Mestska kniznica',
        folder: 'city-library-strapi',
        defaultDb: {
            port: '5432',
            host: 'localhost',
            database: 'strapi',
            username: 'strapi',
            password: 'password',
        },
        fileRegex: /^strapi-\d{4}-\d{2}-\d{2}\.sql$/
    },
    {
        name: 'Marianum',
        folder: 'marianum-strapi',
        defaultDb: {
            port: '54320',
            host: 'localhost',
            database: 'strapi',
            username: 'postgres',
            password: 'postgres',
        },
        fileRegex: /^strapi-\d{4}-\d{2}-\d{2}\.sql$/
    },
]

export const envs = [
    {
        name: "prod",
        folder: 'Productionstandalone.Backup.Backup',
    },
    {
        name: "stg",
        folder: 'Stagingstandalone.Backup.Backup',
    },
    {
        name: "dev",
        folder: 'Devstandalone.Backup.Backup',
    },
]
