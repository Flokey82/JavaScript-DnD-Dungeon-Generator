// @ts-check

import {
    // Private Functions
    testEscapeHTML      as escapeHTML,
    testGetLog          as getLog,
    testGetResults      as getResults,
    testGetSuiteList    as getSuiteList,
    testGetSummary      as getSummary,
    testGetSummaryParts as getSummaryParts,
    testGetTestList     as getTestList,

    // Public Functions
    getOutput,
    getResultMessage,
    getSummaryLink,
    getTestNav,
} from '../output.js';

import { parseHtml } from '../../utility/element.js';

const noop = () => {};

/**
 * @param {import('../state.js').Utility} utility
 */
export default ({ assert, describe, it }) => {

    // -- Private Functions ----------------------------------------------------

    describe('escapeHTML()', () => {
        describe('given an HTML string', () => {
            it('returns a string with escaped HTML', () => {
                const html   = '<h1 class="logo">Sal\'s Soups &amp; Sandwiches</h1>';
                const expect = '&lt;h1 class=&quot;logo&quot;&gt;Sal&#x27;s Soups &amp;amp; Sandwiches&lt;&#x2F;h1&gt;';

                assert(escapeHTML(html)).equals(expect);
            });
        });
    });

    describe('getLog()', () => {
        describe('given no results', () => {
            it('returns an empty string', () => {
                assert(getLog([])).equals('');
            });
        });

        describe('given one success then one failure', () => {
            const results = [
                { isOk: true, msg: 'success' },
                { isOk: false, msg: 'failure' },
            ];

            it('contains only the failure', () => {
                const body  = parseHtml(getLog(results));
                const items = [ ...body.querySelectorAll('li') ];

                assert(items.length).equals(1);
                assert(items.pop()).hasAttributes({ 'data-unit-test': 'fail' });
            });

            describe('given the verbose flag', () => {
                it('contains the success and the failure', () => {
                    const body  = parseHtml(getLog(results, { verbose: true }));
                    const items = [ ...body.querySelectorAll('li') ];

                    assert(items.length).equals(2);

                    const [ item1, item2 ] = items;

                    assert(item1).hasAttributes({ 'data-unit-test': 'ok' });
                    assert(item1.textContent).equals('success');

                    assert(item2).hasAttributes({ 'data-unit-test': 'fail' });
                    assert(item2.textContent).equals('failure');
                });
            });
        });

        describe('given two successes then two failures', () => {
            const results = [
                { isOk: true, msg: 'yep' },
                { isOk: true, msg: 'you bet' },
                { isOk: false, msg: 'nope' },
                { isOk: false, msg: 'no way' },
            ];

            it('returns only the two failures', () => {
                const body  = parseHtml(getLog(results));
                const items = [ ...body.querySelectorAll('li') ];

                assert(items.length).equals(2);
                items.forEach((item) => {
                    assert(item).hasAttributes({ 'data-unit-test': 'fail' });
                });
            });

            describe('given the verbose flag', () => {
                it('returns the two success and the two failures', () => {
                    const body  = parseHtml(getLog(results, { verbose: true }));
                    const items = [ ...body.querySelectorAll('li') ];

                    assert(items.length).equals(4);
                    items.forEach((item, i) => {
                        const { isOk, msg } = results[i];
                        assert(item).hasAttributes({
                            'data-unit-test': isOk ? 'ok': 'fail',
                        });

                        assert(item.textContent).equals(msg);
                    });
                });
            });
        });
    });

    describe('getResults()', () => {
        describe('given one passing result', () => {
            let summary = {
                assertions: 1,
                errors    : 0,
                failures  : 0,
                results   : [ { isOk: true, msg: 'fake success result' } ],
            };

            let result = getResults(summary);

            it('returns one passing dot', () => {
                const body = parseHtml(getResults(summary));
                const dots = body.querySelectorAll('[data-dot="ok"]');

                assert(dots.length).equals(1);
            });

            it('includes a summary', () => {
                assert(result).stringIncludes('Checked for 1 mischievous kobold');
            });

            describe('given no options', () => {
                it('includes "All Tests"', () => {
                    assert(result).stringIncludes('All Tests');
                });

                it('excludes passing log entries', () => {
                    assert(result).stringExcludes('fake success result');
                });
            });

            describe('given the `verbose` option', () => {
                it('includes successful log entries', () => {
                    assert(getResults(summary, { verbose: true }))
                        .stringIncludes('fake success result');
                });
            });

            describe('given the `scope` option', () => {
                it('includes the test scope', () => {
                    assert(getResults(summary, { scope: '/test/tests.fake.js' }))
                        .stringIncludes('/test/tests.fake.js');
                });

                it('excludes "All Tests"', () => {
                    assert(getResults(summary, { scope: '/test/tests.fake.js' }))
                        .stringExcludes('All Tests');
                });
            });

            describe('given an `onSuccess` option', () => {
                it('calls `onSuccess` and return the success message', () => {
                    let successLog;

                    getResults(summary, { onSuccess: (msg) => { successLog = msg; }});

                    assert(successLog).equals('Zero mischievous kobolds found 👏');
                });
            });
        });

        describe('given multiple results', () => {
            let summary = {
                assertions: 2,
                errors    : 0,
                failures  : 0,
                results   : [
                    { isOk: true, msg: 'fake success result'    },
                    { isOk: true, msg: 'another success result' },
                ],
            };

            it('includes two passing dots', () => {
                const body = parseHtml(getResults(summary));
                const dots = body.querySelectorAll('[data-dot="ok"]');

                assert(dots.length).equals(2);
            });

            describe('given the `verbose` option', () => {
                it('includes all log entries', () => {
                    assert(getResults(summary, { verbose: true }))
                        .stringIncludes('fake success result')
                        .stringIncludes('another success result');
                });
            });
        });

        describe('given a failing result', () => {
            let summary = {
                assertions: 1,
                errors    : 0,
                failures  : 1,
                results   : [ { isOk: false, msg: 'fake failure' } ],
            };

            let result = getResults(summary);

            it('includes one failing dot', () => {
                const body = parseHtml(getResults(summary));
                const dots = body.querySelectorAll('[data-dot="fail"]');

                assert(dots.length).equals(1);
            });

            it('returns a log with the failure', () => {
                assert(result).stringIncludes('fake failure');
            });

            describe('given an `onError` option', () => {
                it('calls `onError` and returns the failure message', () => {
                    let errorLog;

                    getResults(summary, { onError: (msg) => { errorLog = msg; }});

                    assert(errorLog).equals('Encountered 1 ogre!');
                });
            });
        });

        describe('given a result containing an error', () => {
            let summary = {
                assertions: 1,
                errors    : 1,
                failures  : 0,
                results   : [ { isOk: false, msg: 'fake error' } ],
            };

            let result = getResults(summary);

            it('includes one failing dot', () => {
                const body = parseHtml(getResults(summary));
                const dots = body.querySelectorAll('[data-dot="fail"]');

                assert(dots.length).equals(1);
            });

            it('returns a log with the error', () => {
                assert(result).stringIncludes('fake error');
            });

            describe('given an `onError` option', () => {
                it('calls `onError` and returns the error message', () => {
                    let errorLog;

                    getResults(summary, { onError: (msg) => { errorLog = msg; }});

                    assert(errorLog).equals('Encountered 1 dragon!');
                });
            });
        });
    });

    describe('getSuiteList()', () => {
        describe('given an array of scopes', () => {
            const scopes = [ '/scope/one', '/scope/two' ];
            const links  = getSuiteList(scopes);

            it('returns an array with an item for each scope', () => {
                assert(links.length).equals(scopes.length);
            });

            it('returns an html link for each scope with "?scope=scope" as the link\'s href', () => {
                links.forEach((link, i) => {
                    assert(link).stringIncludes(`href="?scope=${scopes[i]}"`);
                });
            });
        });

        describe('given the `verbose` option', () => {
            const scopes = [ '/scope/one', '/scope/two' ];
            const links  = getSuiteList(scopes, { verbose: true });

            it('returns an html link with "&verbose=true" on each link', () => {
                links.forEach((link) => {
                    assert(link).stringIncludes('&verbose=true');
                });
            });
        });
    });

    describe('getSummary()', () => {
        const defaultSummary = {
            assertions: 0,
            errors    : 0,
            failures  : 0,
            results   : [],
        };

        it('returns a string', () => {
            assert(getSummary({ ...defaultSummary })).isString();
        });

        it('returns a span with the "ok" class', () => {
            const summaryDoc = parseHtml(getSummary({ ...defaultSummary }));
            assert(Boolean(summaryDoc.querySelector('span[class="ok"]'))).isTrue();
        });

        describe('given errors', () => {
            it('returns a span with the "fail" class', () => {
                const summaryDoc = parseHtml(getSummary({
                    ...defaultSummary,
                    errors: 1,
                }));

                assert(Boolean(summaryDoc.querySelector('span[class="fail"]'))).isTrue();
            });
        });

        describe('given failures', () => {
            it('returns a span with the "fail" class', () => {
                const summaryDoc = parseHtml(getSummary({ ...defaultSummary, failures: 1 }));
                assert(Boolean(summaryDoc.querySelector('span[class="fail"]'))).isTrue();
            });
        });
    });

    describe('getSummaryParts()', () => {
        const defaultSummary = {
            assertions: 0,
            errors    : 0,
            failures  : 0,
            results   : [],
        };

        it('returns an object with `assertionsText` and `checkedForText` string properties', () => {
            const result = getSummaryParts({ ...defaultSummary });

            assert(result).isObject();
            assert(result.assertionsText).isString();
            assert(result.checkedForText).isString();
        });

        describe('given no assertions', () => {
            const result = getSummaryParts({ ...defaultSummary });

            describe('`assertionsText`', () => {
                it('includes "0"', () => {
                    assert(result.checkedForText).stringIncludes('0');
                });
            });

            describe('`checkedForText`', () => {
                it('"kobolds" is plural', () => {
                    assert(result.assertionsText).stringIncludes('kobolds');
                });
            });
        });

        describe('given a single assertion', () => {
            const result = getSummaryParts({ ...defaultSummary, assertions: 1 });

            describe('`assertionsText`', () => {
                it('includes "1"', () => {
                    assert(result.checkedForText).stringIncludes('1');
                });
            });

            describe('`checkedForText`', () => {
                it('"kobold" is singular', () => {
                    assert(result.assertionsText)
                        .stringIncludes('kobold')
                        .stringExcludes('kobolds');
                });
            });
        });

        describe('given two assertions', () => {
            const result = getSummaryParts({ ...defaultSummary, assertions: 2 });

            describe('`assertionsText`', () => {
                it('includes "2"', () => {
                    assert(result.checkedForText).stringIncludes('2');
                });
            });

            describe('`checkedForText`', () => {
                it('"kobolds" is plural', () => {
                    assert(result.assertionsText).stringIncludes('kobolds');
                });
            });
        });

        describe('given no errors or failures', () => {
            it('excludes an `issuesText` property', () => {
                assert(getSummaryParts({ ...defaultSummary }).issuesText)
                    .isUndefined();
            });
        });

        describe('given failures', () => {
            it('returns an object with an `issuesText` string property', () => {
                const result = getSummaryParts({ ...defaultSummary, failures: 10 });
                assert(result.issuesText).isString();
            });

            describe('`issuesText`', () => {
                describe('given a single failure', () => {
                    it('includes "1 ogre"', () => {
                        assert(getSummaryParts({ ...defaultSummary, failures: 1 }).issuesText)
                            .stringIncludes('1 ogre')
                            .stringExcludes('ogres');
                    });
                });

                describe('given two failures', () => {
                    it('includes "2 ogres"', () => {
                        assert(getSummaryParts({ ...defaultSummary, failures: 2 }).issuesText)
                            .stringIncludes('2 ogres');
                    });
                });
            });
        });

        describe('given errors', () => {
            it('returns an object with an `issuesText` string property', () => {
                const result = getSummaryParts({
                    ...defaultSummary,
                    errors: 3,
                });

                assert(result.issuesText).isString();
            });

            describe('`issuesText`', () => {
                describe('given a single error', () => {
                    it('includes "1 dragon"', () => {
                        assert(getSummaryParts({
                            ...defaultSummary,
                            errors: 1,
                        }).issuesText)
                            .stringIncludes('1 dragon')
                            .stringExcludes('dragons');
                    });
                });

                describe('given two errors', () => {
                    it('includes "2 dragons"', () => {
                        assert(getSummaryParts({
                            ...defaultSummary,
                            errors: 2,
                        }).issuesText).stringIncludes('2 dragons');
                    });
                });
            });
        });

        describe('given two errors and two failures', () => {
            const result = getSummaryParts({
                ...defaultSummary,
                errors: 2,
                failures: 2,
            }).issuesText;

            describe('`issuesText`', () => {
                it('includes "2 ogres"', () => {
                    assert(result).stringIncludes('2 ogres');
                });

                it('includes "2 dragons"', () => {
                    assert(result).stringIncludes('2 dragons');
                });
            });
        });
    });

    describe('getTestList()', () => {
        it('returns an html list with an entry for each test in the suite', () => {
            const suite = { '/test/tests.fake-0.js': noop, '/test/tests.fake-1.js': noop };
            const doc   = parseHtml(getTestList(suite));

            doc.querySelectorAll('li').forEach((item, i) => {
                const testName = `/test/tests.fake-${i}.js`;

                assert(Boolean(item.querySelector(`a[href="?scope=${testName}"]`))).isTrue();
                assert(item.textContent).equals(testName);
            });
        });
    });

    // -- Public Functions -----------------------------------------------------

    describe('getOutput()', () => {
        const suite = { '/test/tests.fake.js': noop };
        const state = {
            getSummary: () => ({
                assertions: 1,
                errors    : 0,
                failures  : 0,
                results   : [ { isOk: true, msg: 'fake test result' } ],
            }),
            onError: noop,
            runUnits: noop,
        };

        it('returns test results', () => {
            assert(getOutput(suite, state)).stringIncludes('Checked for 1 mischievous kobold.');
        });

        describe('given a `scope` option of `list`', () => {
            it('returns a list of tests', () => {
                const doc = parseHtml(getOutput(suite, state, { scope: 'list' }));

                assert(Boolean(doc.querySelector('ul'))).isTrue();
                assert(Boolean(doc.querySelector('li'))).isTrue();
                assert(Boolean(doc.querySelector('a[href="?scope=/test/tests.fake.js"]'))).isTrue();
            });
        });

        describe('given a `scope` option for a specific test', () => {
            it('only calls `runUnits()` on the `scope` test path', () => {
                let scopesCalled = [];

                const scopedSuite = {
                    '/test/tests.fake.js' : noop,
                    '/test/tests.fake2.js': noop,
                };

                const scopedState = {
                    ...state,
                    runUnits: (path) => { scopesCalled.push(path); },
                };

                getOutput(scopedSuite, scopedState, { scope: '/test/tests.fake.js' });

                assert(scopesCalled.length).equals(1);
                assert(scopesCalled[0]).equals('/test/tests.fake.js');
            });
        });
    });

    describe('getResultMessage()', () => {
        describe('given an empty array', () => {
            it('returns an empty string', () => {
                assert(getResultMessage([])).equals('');
            });
        });

        describe('given a single entry', () => {
            it('returns the entry', () => {
                assert(getResultMessage([ {
                    msg  : 'just us chickens',
                    scope: 'describe()',
                } ])).equals('just us chickens');
            });
        });

        describe('given three entries', () => {
            const entries = getResultMessage([
                { msg: 'jimmy', scope: 'default()'  },
                { msg: 'joey',  scope: 'describe()' },
                { msg: 'sarah', scope: 'it()'       },
            ]);

            const lines = entries.split(`\n`);

            it('returns each entry on a new line', () => {
                assert(lines[0].trim()).equals('jimmy');
                assert(lines[1].trim()).equals('joey');
                assert(lines[2].trim()).equals('sarah');
            });

            it('indents each line with two spaces', () => {
                assert(lines[0]).stringExcludes(' ');
                assert(lines[1]).stringIncludes('  ');
                assert(lines[2]).stringIncludes('    ');
            });
        });
    });

    describe('getSummaryLink()', () => {
        const defaultSummary = {
            assertions: 0,
            errors    : 0,
            failures  : 0,
            results   : [],
        };

        it('returns a string', () => {
            assert(getSummaryLink({ ...defaultSummary })).isString();
        });

        it('returns a link to `./unit.html`', () => {
            const doc = parseHtml(getSummaryLink({ ...defaultSummary }));
            assert(Boolean(doc.querySelector('a[href="./unit.html"]'))).isTrue();
        });

        describe('given errors', () => {
            it('include a link with a `data-error` attribute', () => {
                const doc = parseHtml(getSummaryLink({
                    ...defaultSummary,
                    errors: 1,
                }));

                assert(Boolean(doc.querySelector('a[data-error="true"]'))).isTrue();
            });
        });

        describe('given failures', () => {
            it('includes a link with a `data-error` attribute', () => {
                const doc = parseHtml(getSummaryLink({ ...defaultSummary, failures: 1 }));
                assert(Boolean(doc.querySelector('a[data-error="true"]'))).isTrue();
            });
        });
    });

    describe('getTestNav()', () => {
        describe('given no options', () => {
            const navDoc = parseHtml(getTestNav({}));

            it('contains unit test links', () => {
                assert(navDoc.querySelector('a[href="./unit.html"]').textContent).equals('All');
                assert(navDoc.querySelector('a[href="./unit.html?scope=list"]').textContent).equals('Tests');
                assert(navDoc.querySelector('a[href="./unit.html?verbose=true"]').textContent).equals('Verbose');
            });

            it('marks the "All" link as active', () => {
                const link = navDoc.querySelector('a[href="./unit.html"]');

                assert(link.textContent).equals('All');
                assert(link).hasAttributes({ 'data-active': 'true' });
            });
        });

        describe('given a `scope` option', () => {
            const navDoc = parseHtml(getTestNav({ scope: 'fake' }));

            it('includes the scope on the verbose link', () => {
                const link = navDoc.querySelector('a[href="./unit.html?scope=fake&verbose=true"]');
                assert(link.textContent).equals('Verbose');
            });

            it('does not mark the "All" link as active', () => {
                const link = navDoc.querySelector('a[href="./unit.html"]');

                assert(link.textContent).equals('All');
                assert(link).excludesAttributes([ 'data-active' ]);
            });
        });

        describe('given a `scope` option of "list"', () => {
            it('marks the "Tests" link as active', () => {
                const doc  = parseHtml(getTestNav({ scope: 'list' }));
                const link = doc.querySelector('a[href="./unit.html?scope=list"]');

                assert(link.textContent).equals('Tests');
                assert(link).hasAttributes({ 'data-active': 'true' });
            });
        });

        describe('given a true `verbose` option', () => {
            const navDoc = parseHtml(getTestNav({ verbose: true }));

            it('contains verbose unit tests links', () => {
                assert(navDoc.querySelector('a[href="./unit.html?verbose=true"]').textContent).equals('All');
                assert(navDoc.querySelector('a[href="./unit.html?scope=list&verbose=true"]').textContent).equals('Tests');
                assert(navDoc.querySelector('a[href="./unit.html"]').textContent).equals('Verbose');
            });

            it('marks the "Verbose" link as active', () => {
                const link = navDoc.querySelector('a[href="./unit.html"]');

                assert(link.textContent).equals('Verbose');
                assert(link).hasAttributes({ 'data-active': 'true' });
            });
        });

        describe('given a `scope` and a true `verbose` options', () => {
            const doc = parseHtml(getTestNav({ scope: 'fake', verbose: true }));

            it('includes the scope on the verbose link', () => {
                const link = doc.querySelector('a[href="./unit.html?scope=fake"]');
                assert(link.textContent).equals('Verbose');
            });
        });
    });

};
