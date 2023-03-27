import { promises as fs } from "fs";
import fetch from "node-fetch";
import { file } from "tmp-promise";
import inquirer from "inquirer";
import { envs, projects } from "./defs.js";
import spawn from "await-spawn";
import { getCookies } from "./cookies-storage.js";

export default async () => {
    const cookies = await getCookies();
    if (!cookies) {
        throw new Error("No credentials saved. Authenticate first.");
    }

    const { project, env } = await inquirer
        .prompt([
            {
                type: "list",
                name: "project",
                message: "Project?",
                choices: projects,
            },
            {
                type: "list",
                name: "env",
                message: "Env?",
                choices: envs,
            },
        ])
        .then((answers) => {
            const project = projects.find((p) => p.name === answers.project);
            const env = envs.find((p) => p.name === answers.env);

            return { project, env };
        });

    const db = await inquirer.prompt([
        {
            type: "input",
            name: "host",
            message: "Host?",
            default: project.defaultDb.host,
        },
        {
            type: "number",
            name: "port",
            message: "Port?",
            default: project.defaultDb.port,
        },
        {
            type: "input",
            name: "database",
            message: "Database?",
            default: project.defaultDb.database,
        },
        {
            type: "input",
            name: "username",
            message: "Username?",
            default: project.defaultDb.username,
        },
        {
            type: "input",
            name: "password",
            message: "Password?",
            default: project.defaultDb.password,
        },
    ]);

    const cookieString = cookies
        .filter((cookie) => cookie.domain === "dev.azure.com" || cookie.domain === ".dev.azure.com")
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");

    const azureFetch = (path, data) =>
        fetch(`https://dev.azure.com/bratislava-innovation/${path}`, {
            headers: {
                Cookie: cookieString,
                "Content-Type": "application/json",
            },
            ...(data ?? {}),
        }).then((r) => r.json());

    const runs = await azureFetch("/Inovacie/_apis/pipelines/28/runs?api-version=7.0");
    const { buildId } = await inquirer.prompt([
        {
            type: "list",
            name: "buildId",
            message: "Run?",
            choices: [
                ...runs.value
                    .filter((pipeline) => pipeline.result === "succeeded")
                    .map((run) => ({
                        name: `${run.createdDate.substr(0, 16).replace("T", " ")} UTC`,
                        value: run.id,
                    })),
                new inquirer.Separator(),
            ],
        },
    ]);

    const artifacts = await azureFetch(`/Inovacie/_apis/build/builds/${buildId}/artifacts?api-version=4.1`);
    const artifactId = artifacts.value.find((artifact) => artifact.name === env.folder).id;

    const sourcePage = {
        url: `https://dev.azure.com/bratislava-innovation/Inovacie/_build/results?buildId=${buildId}&view=artifacts&pathAsName=false&type=publishedArtifacts`,
        routeId: "ms.vss-build-web.ci-results-hub-route",
        routeValues: {
            project: "Inovacie",
            viewname: "build-results",
            controller: "ContributedPage",
            action: "Execute",
            serviceHost: "6d4cd124-ebc3-45f5-924e-4a68cb54ad17 (bratislava-innovation)",
        },
    };

    const foldersList = (
        await azureFetch(
            "/_apis/Contribution/HierarchyQuery/project/cd48730b-de28-4c92-bf34-1bfd119be2a4?api-version=5.0-preview.1",
            {
                body: JSON.stringify({
                    contributionIds: ["ms.vss-build-web.run-artifacts-data-provider"],
                    dataProviderContext: {
                        properties: {
                            artifactId: artifactId,
                            buildId: buildId,
                            sourcePage: sourcePage,
                        },
                    },
                }),
                method: "POST",
            }
        )
    ).dataProviders["ms.vss-build-web.run-artifacts-data-provider"].items;

    const projectFolder = foldersList.find((folder) => folder.name === `/${project.folder}`);
    const strapiSqlArtifact = projectFolder.items.find((item) => {
        const withoutFolder = item.name.replace(`/${project.folder}/`, "");
        return project.fileRegex.test(withoutFolder);
    });

    const downloadUrl = (
        await azureFetch(
            "/_apis/Contribution/HierarchyQuery/project/cd48730b-de28-4c92-bf34-1bfd119be2a4?api-version=5.0-preview.1",
            {
                body: JSON.stringify({
                    contributionIds: ["ms.vss-build-web.run-artifacts-download-data-provider"],
                    dataProviderContext: {
                        properties: {
                            artifactId: artifactId,
                            buildId: buildId,
                            compressDownload: false,
                            path: strapiSqlArtifact.sourcePath,
                            saveAbsolutePath: true,
                            sourcePage: sourcePage,
                        },
                    },
                }),
                method: "POST",
            }
        )
    ).dataProviders["ms.vss-build-web.run-artifacts-download-data-provider"].downloadUrl;

    console.log(`Downloading file "${strapiSqlArtifact.name}".`);

    const { path: tempFilePath, cleanup } = await file({ prefix: "db-", postfix: ".sql" });

    await fetch(downloadUrl, {
        headers: {
            Cookie: cookieString,
        },
    })
        .then((r) => r.arrayBuffer())
        .then((r) => fs.writeFile(tempFilePath, Buffer.from(r)));

    console.log(`File downloaded to "${tempFilePath}".`);

    const connectionString = `postgres://${db.username}:${db.password}@${db.host}:${db.port}/postgres`;

    // https://stackoverflow.com/a/5408501
    console.log(`Terminating existing connections to database "${db.database}".`);
    await spawn(
        "psql",
        [
            `--dbname=${connectionString}`,
            "-c",
            `SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${db.database}' AND pid <> pg_backend_pid();`,
        ],
        { stdio: "inherit" }
    );

    console.log(`Restoring SQL dump.`);
    await spawn("psql", [`--dbname=${connectionString}`, "-f", tempFilePath], { stdio: "inherit" });

    await cleanup();
    console.log(`File "${tempFilePath}" deleted.`);
};
