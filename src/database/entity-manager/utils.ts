export function isEqual(object1: any, object2: any): boolean {
  const properties1 = Object.getOwnPropertyNames(object1);
  const properties2 = Object.getOwnPropertyNames(object2);

  if (properties1.length !== properties2.length) {
    return false;
  }

  for (let iter = properties1.length - 1; iter >= 0; iter -= 1) {
    const property = properties1[iter];

    if (object1[property] !== object2[property]) {
      return false;
    }
  }

  return true;
}
