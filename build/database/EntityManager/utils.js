"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEqual = void 0;
function isEqual(obj1, obj2) {
    const props1 = Object.getOwnPropertyNames(obj1);
    const props2 = Object.getOwnPropertyNames(obj2);
    if (props1.length !== props2.length) {
        return false;
    }
    for (let iter = props1.length - 1; iter >= 0; iter -= 1) {
        const prop = props1[iter];
        if (obj1[prop] !== obj2[prop]) {
            return false;
        }
    }
    return true;
}
exports.isEqual = isEqual;
