/**
 * Flattens nested objects into dot-notation keys
 * Example: { user: { name: "John" } } → { "user.name": "John" }
 */
export function flattenObject(obj: Record<string, any>, prefix = "") {
  return Object.keys(obj).reduce(
    (acc, k) => {
      const pre = prefix.length ? prefix + "." : "";

      if (typeof obj[k] === "object" && obj[k] !== null) {
        Object.assign(acc, flattenObject(obj[k], pre + k));
      } else {
        acc[pre + k] = obj[k];
      }

      return acc;
    },
    {} as Record<string, any>,
  );
}
