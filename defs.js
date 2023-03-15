export const projects = [
    {
        name: 'Bratislava',
        folder: 'bratislava-strapi',
        db: {
            port: '5432',
            host: 'localhost',
            database: 'strapi',
            username: 'strapi',
            password: 'password',
        },
    },
    {
        name: 'Mestska kniznica',
        folder: 'city-library-strapi',
        db: {
            port: '5432',
            host: 'localhost',
            database: 'strapi',
            username: 'strapi',
            password: 'password',
        },
    },
    {
        name: 'Marianum',
        folder: 'marianum-strapi',
        db: {
            port: '54320',
            host: 'localhost',
            database: 'strapi',
            username: 'postgres',
            password: 'postgres',
        },
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