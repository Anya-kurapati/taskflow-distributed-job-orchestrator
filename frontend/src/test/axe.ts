import axe from 'axe-core';

/**
 * Runs axe-core accessibility checks against rendered DOM and returns a
 * readable summary of violations (empty when there are none).
 *
 * jsdom has no layout or canvas, so checks that need them (colour contrast,
 * target size) can't run here and are disabled; they're covered by design
 * review and browser tooling instead.
 */
export async function findA11yViolations(container: Element = document.body): Promise<string[]> {
  const results = await axe.run(container, {
    // Only violations are reported, so skip computing passes/incomplete (much faster).
    resultTypes: ['violations'],
    rules: {
      'color-contrast': { enabled: false },
      'target-size': { enabled: false },
    },
  });
  return results.violations.flatMap((violation) =>
    violation.nodes.map(
      (node) => `${violation.id} (${violation.impact ?? 'n/a'}): ${violation.help} → ${node.html}`,
    ),
  );
}
