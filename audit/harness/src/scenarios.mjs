import { captureProfiles, defaultState, pages, viewports } from "./config.mjs";
import { allStates, buildPairwiseStates, stateKey } from "./pairwise.mjs";

function selectedPages(selection) {
  if (selection === "all") return Object.keys(pages);
  if (!pages[selection]) throw new Error(`unknown page: ${selection}`);
  return [selection];
}

function scenarioId({ suite, page, viewport, state, index }) {
  return [suite, String(index).padStart(4, "0"), page, viewport.name, stateKey(state)].join("__");
}

export function buildScenarios({ suite, pageSelection }) {
  const pageNames = selectedPages(pageSelection);
  const scenarios = [];

  if (suite === "smoke" || suite === "routes") {
    const references = [viewports.compact, viewports.expanded];
    pageNames.forEach((page) => {
      references.forEach((viewport) => {
        scenarios.push({ page, viewport, state: defaultState, profile: captureProfiles[suite] });
      });
    });
  } else if (suite === "states") {
    const references = [viewports.compact, viewports.expanded];
    pageNames.forEach((page) => {
      references.forEach((viewport) => {
        allStates().forEach((state) => {
          scenarios.push({ page, viewport, state, profile: captureProfiles.states });
        });
      });
    });
  } else if (suite === "visual") {
    const pairwise = buildPairwiseStates();
    pageNames.forEach((page) => {
      viewports.visual.forEach((viewport) => {
        pairwise.forEach((state) => {
          scenarios.push({ page, viewport, state, profile: captureProfiles.visual });
        });
      });
    });
  } else {
    throw new Error(`unknown suite: ${suite}`);
  }

  return scenarios.map((scenario, index) => ({
    ...scenario,
    suite,
    index,
    id: scenarioId({ ...scenario, suite, index }),
  }));
}

export function scenarioCounts() {
  const pairwiseCount = buildPairwiseStates().length;
  return {
    smokePerPage: 2,
    routesAllPages: Object.keys(pages).length * 2,
    statesPerPage: allStates().length * 2,
    visualPerPage: pairwiseCount * viewports.visual.length,
    fullStates: allStates().length,
    pairwiseStates: pairwiseCount,
    visualViewports: viewports.visual.length,
  };
}
