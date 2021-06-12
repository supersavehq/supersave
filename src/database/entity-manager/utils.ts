export function isEqual(obj1: Record<string, unknown>, obj2: Record<string, unknown>): boolean {
  const props1: string[] = Object.getOwnPropertyNames(obj1);
  const props2: string[] = Object.getOwnPropertyNames(obj2);

  if (props1.length !== props2.length) {
    return false;
  }

  for (let iter = props1.length - 1; iter >= 0; iter -= 1) {
    const prop: string = props1[iter];

    if (obj1[prop] !== obj2[prop]) {
      return false;
    }
  }

  return true;
}
