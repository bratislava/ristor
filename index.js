import inquirer from "inquirer";
import { defaults } from "./defaults.js";
import spawn from "await-spawn";
import { file } from "tmp-promise";
import { promises as fs } from "fs";

async function main() {
  const { downloadUrl } = await inquirer.prompt([
    {
      type: "input",
      name: "downloadUrl",
      message: "Enter the Minio sharable download URL:",
      validate: (input) => {
        const parsedUrl = new URL(input);
        const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
        return (
          (input.startsWith("https://s3.bratislava.sk/db-backups/") &&
            pathSegments.length >= 4 &&
            parsedUrl.pathname.endsWith(".sql")) ||
          "Invalid URL format."
        );
      },
    },
  ]);

  const parsedUrl = new URL(downloadUrl);
  const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
  const projectPath = pathSegments.slice(2, 4).join("/");

  const defaultValues = defaults.find((d) => projectPath.match(d.regex))
    .database ?? {
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

  const filename = pathSegments[pathSegments.length - 1];
  console.log(`Downloading file ${filename}.`);
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
      `Terminating existing connections to database "${db.database}".`,
    );
    // https://stackoverflow.com/a/5408501
    await spawn(
      "psql",
      [
        `--dbname=${connectionString}`,
        "-c",
        `SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${db.database}' AND pid <> pg_backend_pid();`,
      ],
      { stdio: "inherit" },
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
