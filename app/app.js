// @ts-check

import { getErrorMessage } from './utility/tools.js';
import { getFailureSummary, getSummaryLink } from './unit/output.js';
import { request } from './utility/xhr.js';
import { toss } from './utility/tools.js';
import { unitState } from './unit/state.js';
import run from './unit/run.js';
import suite from './unit/suite.js';

import { initController } from './controller/controller.js';

import { getFooter } from './ui/footer.js';

// -- Type Imports -------------------------------------------------------------

/** @typedef {import('./controller/controller.js').Sections} Sections */

// -- Types --------------------------------------------------------------------

/**
 * @typedef {object} HistoryEntryState
 *
 * @prop {string} path
 */

// -- Functions ----------------------------------------------------------------

/**
 * Logs an error.
 *
 * @param {Error} error
 */
function logError(error) {
    console.error(error);

    request('/api/log/error', {
        callback: (response) => response.error && console.error(response),
        data    : { error: getErrorMessage(error) },
        method  : 'POST',
    });
}


// -- Config -------------------------------------------------------------------

const sections = (/** @type {() => Sections} */ () => {
    let body    = document.body;
    let content = document.getElementById('content');
    let footer  = document.getElementById('footer');
    let knobs   = document.getElementById('knobs');
    let nav     = document.getElementById('nav');
    let overlay = document.getElementById('overlay');
    let toast   = document.getElementById('toast');
    let toolbar = document.getElementById('toolbar');

    if (!content) { toss('Cannot find content element'); }
    if (!footer)  { toss('Cannot find footer element'); }
    if (!knobs)   { toss('Cannot find knobs element'); }
    if (!nav)     { toss('Cannot find nav element'); }
    if (!overlay) { toss('Cannot find nav element'); }
    if (!toast)   { toss('Cannot find nav element'); }
    if (!toolbar) { toss('Cannot find toolbar element'); }

    return { body, content, footer, knobs, nav, overlay, toast, toolbar };
})();

// -- Tests --------------------------------------------------------------------

const testSummary     = run(unitState(), suite);
const testSummaryLink = getSummaryLink(testSummary);
const errorSummary    = getFailureSummary(testSummary);

if (errorSummary) {
    console.error(...errorSummary);
}

// -- Router Functions ---------------------------------------------------------

/**
 * Returns the current route
 *
 * @returns {string}
 */
function getPathname() {
    return window.location.pathname;
}

/**
 * Updates the app's URL path.
 *
 * @param {string} path
 */
function updatePath(path) {
    /** @type {HistoryEntryState} */
    let entry = { path };

    window.history.pushState(entry, '', path);
}



// -- Initialization -----------------------------------------------------------

const { render } = initController({
    getPathname,
    onError: logError,
    request,
    sections,
    updatePath,
});

// -- Router Listener ----------------------------------------------------------

window.addEventListener('popstate', (event) => {
    event.state && event.state.path && render(event.state.path);
});

// -- Initial Render -----------------------------------------------------------

sections.footer.innerHTML = getFooter(testSummaryLink);

render(getPathname());
