/**
 * Check if x matches y according to matching rules:
 * 1. Empty vs non-empty → fail
 * 2. Type mismatch → fail
 * 3. Non-object types: value not equal → fail
 * 4. Object: x contains all keys of y, recursively match each value
 * 5. Array: same length, recursively match each element
 *
 * @param x - The value to check
 * @param y - The pattern/value to match against
 * @returns true if x matches y, false otherwise
 */
export function isMatch(x: unknown, y: unknown): boolean {
    // Rule 1: Empty vs non-empty
    const xIsEmpty = x === null || x === undefined || x === "" || (Array.isArray(x) && x.length === 0);
    const yIsEmpty = y === null || y === undefined || y === "" || (Array.isArray(y) && y.length === 0);
    if (xIsEmpty !== yIsEmpty) {
        return false;
    }

    // Both empty
    if (xIsEmpty && yIsEmpty) {
        return true;
    }

    // Rule 2: Type mismatch
    const xType = Array.isArray(x) ? "array" : typeof x;
    const yType = Array.isArray(y) ? "array" : typeof y;
    if (xType !== yType) {
        return false;
    }

    // Rule 3: Non-object types (primitive comparison)
    if (xType !== "object" && xType !== "array") {
        return x === y;
    }

    // Rule 4: Object type - x must contain all keys of y, recursively match
    if (xType === "object" && yType === "object") {
        const xObj = x as Record<string, unknown>;
        const yObj = y as Record<string, unknown>;
        const yKeys = Object.keys(yObj);
        if (yKeys.some((key) => !(key in xObj))) {
            return false;
        }
        return yKeys.every((key) => isMatch(xObj[key], yObj[key]));
    }

    // Rule 5: Array type - same length, recursively match each element
    if (xType === "array" && yType === "array") {
        const xArr = x as unknown[];
        const yArr = y as unknown[];
        if (xArr.length !== yArr.length) {
            return false;
        }
        return xArr.every((item, index) => isMatch(item, yArr[index]));
    }

    return false;
}