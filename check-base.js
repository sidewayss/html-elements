import {AUTO, STATES, StateBtn} from "./state-btn.js";

export class CheckBase extends StateBtn {
    static observedAttributes = [AUTO, STATES, ...StateBtn.observedAttributes];
    constructor(meta, subclass, states) {
        super(meta, subclass, ["Space"], states);
    }
    attributeChangedCallback(name, _, val) {
        switch (name) {
        case AUTO: case STATES: // AUTO is always on for check-xxx and CheckXxx pre-determines STATES
            throw new Error("CheckBox and CheckTri don't allow setting the auto or states attributes.");
        default:
            super.attributeChangedCallback(name, _, val);
        }
    }
    _init() {
        super._init();
    }
}