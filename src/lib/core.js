// Shared imports for every screen: React, htm (the locked app's template syntax), and the shared Mahara modules.
import React from "react";
import htm from "htm";

export { React };
export const html = htm.bind(React.createElement);
export const { useState, useEffect, useRef, useMemo, useCallback } = React;
export { default as L } from "../../shared/logic.js";
export { default as B } from "../../shared/blueprints.js";
export { default as I } from "../../shared/i18n.js";
