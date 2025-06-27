import type { Application, Router } from "express";
import Http from "./collection/http";
import type Manager from "./collection/manager";

/**
 * Creates and mounts the SuperSave HTTP routes onto an existing Express application.
 *
 * @param app - The Express application instance.
 * @param manager - The SuperSave Manager instance containing the collections.
 * @param prefix - Optional URL prefix for all SuperSave routes (e.g., '/api'). Defaults to '/'.
 * @returns A Promise that resolves once the routes are created and mounted.
 */
export async function createExpressRoutes(
  app: Application,
  manager: Manager,
  prefix: string = "/",
): Promise<void> {
  try {
    const httpInstance = await Http.create(manager, prefix);
    const router = httpInstance.getRouter() as unknown as Router; // Cast to Express Router

    // Ensure prefix starts with a slash and doesn't end with one for consistency
    let consistentPrefix = prefix;
    if (!consistentPrefix.startsWith("/")) {
      consistentPrefix = `/${consistentPrefix}`;
    }
    if (consistentPrefix.endsWith("/") && consistentPrefix.length > 1) {
      consistentPrefix = consistentPrefix.slice(0, -1);
    }
    if (consistentPrefix === "/") {
      app.use(router);
    } else {
      app.use(consistentPrefix, router);
    }
  } catch (error) {
    console.error("Failed to create SuperSave Express routes:", error);
    // Optionally re-throw or handle as appropriate for your application
    throw new Error(
      `Supersave failed to initialize express routes: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
