#!/usr/bin/env node
import inquirer from "inquirer";
import { defaults } from "./defaults.js";
import spawn from "await-spawn";
import { file } from "tmp-promise";
import { promises as fs } from "fs";

function extractProjectPath(url) {
  if (!url) return null;

  try {
    const base64Token = url.split("/download-shared-object/")[1];
    if (!base64Token) {
      throw new Error("Invalid download URL format");
    }

    const decodedUrl = Buffer.from(base64Token, "base64").toString();
    const parsedUrl = new URL(decodedUrl);

    if (!parsedUrl.pathname.includes("/db-backups/")) {
      throw new Error("Invalid download URL format");
    }

    const relevantPath = parsedUrl.pathname.split("/db-backups/")[1];
    if (!relevantPath) {
      throw new Error("Invalid download URL format");
    }

    const pathSegments = relevantPath.split("/");
    if (pathSegments.length < 3) {
      throw new Error("Invalid download URL format");
    }

    return `${pathSegments[1]}/${pathSegments[2]}`;
  } catch (error) {
    throw new Error("Invalid download URL format");
  }
}

async function main() {
  const { downloadUrl } = await inquirer.prompt([
    {
      type: "input",
      name: "downloadUrl",
      message: "Enter the Minio sharable download URL:",
      validate: (input) => {
        if (
          !input.startsWith(
            "https://console.s3.bratislava.sk/api/v1/download-shared-object/"
          )
        ) {
          return "Invalid URL format.";
        }
        try {
          extractProjectPath(input);
          return true;
        } catch (error) {
          return error.message;
        }
      },
    },
  ]);

  const projectPath = extractProjectPath(downloadUrl);
  const projectPathDefaults = projectPath
    ? defaults.find((d) => projectPath.match(d.regex))
    : null;
  const defaultValues = projectPathDefaults?.database ?? {
    host: "localhost",
    port: 5432,
    database: "db",
    username: "postgres",
    password: "password",
  };

  const db = await inquirer.prompt([
    {
      type: "input",
      name: "host",
      message: "Host?",
      default: defaultValues.host,
    },
    {
      type: "number",
      name: "port",
      message: "Port?",
      default: defaultValues.port,
    },
    {
      type: "input",
      name: "database",
      message: "Database?",
      default: defaultValues.database,
    },
    {
      type: "input",
      name: "username",
      message: "Username?",
      default: defaultValues.username,
    },
    {
      type: "input",
      name: "password",
      message: "Password?",
      default: defaultValues.password,
    },
  ]);

  console.log(`Downloading file.`);
  const { path: tempFilePath, cleanup } = await file({
    prefix: "db-",
    postfix: ".sql",
  });

  try {
    await fetch(downloadUrl)
      .then((r) => r.arrayBuffer())
      .then((r) => fs.writeFile(tempFilePath, Buffer.from(r)));
    console.log(`File downloaded to "${tempFilePath}".`);

    const connectionString = `postgres://${db.username}:${db.password}@${db.host}:${db.port}/postgres`;

    console.log(
      `Terminating existing connections to database "${db.database}".`
    );
    // https://stackoverflow.com/a/5408501
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
    await spawn("psql", [`--dbname=${connectionString}`, "-f", tempFilePath], {
      stdio: "inherit",
    });
  } finally {
    await cleanup();
    console.log(`File "${tempFilePath}" deleted.`);
  }
}

main().catch((error) => {
  console.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});
