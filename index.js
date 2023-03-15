import { promises as fs } from "fs";
import fetch from "node-fetch";
import { file } from "tmp-promise";
import inquirer from "inquirer";
import { projects, envs } from "./defs.js";
import spawn from "await-spawn";

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

const cookiesRaw = await fs.readFile("cookies.txt", { encoding: "utf-8" });
const cookies = JSON.parse(cookiesRaw);

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
const buildId = runs.value.find((pipeline) => pipeline.result === "succeeded").id;
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
const strapiSqlArtifact = projectFolder.items.find(
    (item) => item.name.startsWith(`/${project.folder}/strapi`) && item.name.endsWith(".sql")
);

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

const { path: tempFilePath, cleanup } = await file({ prefix: 'db-', postfix: '.sql' });

await fetch(downloadUrl, {
    headers: {
        Cookie: cookieString,
    },
})
    .then((r) => r.arrayBuffer())
    .then((r) => fs.writeFile(tempFilePath, Buffer.from(r)));

const connectionString = `postgres://${project.db.username}:${project.db.password}@${project.db.host}:${project.db.port}/postgres`;

// https://stackoverflow.com/a/5408501
await spawn("psql", [`--dbname=${connectionString}`, "-c", `SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${project.db.database}' AND pid <> pg_backend_pid();`], { stdio: "inherit" });
await spawn("psql", [`--dbname=${connectionString}`, "-f", tempFilePath], { stdio: "inherit" });

cleanup();
