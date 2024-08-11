# @bratislava/ristor

@bratislava/ristor is a command-line tool for downloading and restoring PostgreSQL database dumps from Bratislava.sk Minio storage.

## Installation

To install ristor globally, run:

```bash
npm install -g @bratislava/ristor
```

## Usage

After installation, you can run the tool using the `ristor` command:

```bash
ristor
```

The tool will guide you through the following steps:

1. Enter the Minio sharable download URL for the SQL dump file.
2. Provide database connection details (host, port, database name, username, and password).

The tool will then:

1. Download the SQL dump file.
2. Terminate existing connections to the specified database.
3. Restore the SQL dump to the specified database.
4. Clean up the temporary files.

## Requirements

- PostgreSQL client (`psql` command should be available in your system PATH)

## Configuration

The tool uses default database configurations based on the project path in the Minio URL. You can modify these defaults in the `defaults.js` file.

## License

This project is licensed under the European Union Public Licence (EUPL) version 1.2 or later. See the [LICENSE](LICENSE) file for details.
