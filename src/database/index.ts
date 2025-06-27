import type { Debugger } from "debug";
import Debug from "debug";
import type { EntityManager } from "./entity-manager";
import dbInitializer from "./entity-manager";

const debug: Debugger = Debug("supersave:db");

export default async (connection: string): Promise<EntityManager> => {
  debug("Got connection string", connection);

  if (connection.substring(0, 9) === "sqlite://") {
    const file: string = connection.substring(9);
    debug("Found sqlite connection string, using file", file);
    return dbInitializer("sqlite", { file });
  }

  if (connection.substring(0, 8) === "mysql://") {
    return dbInitializer("mysql", { connection });
  }

  throw new Error("Unrecognized connection string.");
};
