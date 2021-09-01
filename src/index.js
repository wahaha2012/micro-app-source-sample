import { defineElement } from "./element";
import { patchElementPrototype } from "./patch";

patchElementPrototype();
const SimpleMicroApp = {
  start() {
    defineElement();
  },
};

export default SimpleMicroApp;
