import pluralize from "pluralize";
import type { ManagedCollection } from "../../types";

export const generatePath = (collection: ManagedCollection): string =>
  // eslint-disable-next-line implicit-arrow-linebreak
  `/${collection.namespace ? `${collection.namespace}/` : ""}${pluralize(collection.name)}`
    .toLowerCase()
    .replace(/\s/g, "-");
