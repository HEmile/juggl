import type {Layouts} from 'cytoscape';
import {
  CLASS_ACTIVE_NODE, CLASS_EXPANDED,
  DISCRETE_LAYOUT_ANIMATION_TIME,
  DISCRETE_SPACING_FACTOR,
  LAYOUT_ANIMATION_TIME,
} from '../constants';
import type {NodeSingular} from 'cytoscape';
import type {AdvancedGraph} from './visualization';
import type {AGLayouts, IAdvancedGraphSettings} from '../settings';

export interface LayoutSettings {

    startLayout(view: AdvancedGraph): Layouts;

}

export class ColaGlobalLayout implements LayoutSettings {
  startLayout(view: AdvancedGraph): Layouts {
    return view.viz.layout( {
      name: 'cola',
      // @ts-ignore
      animate: true, // whether to show the layout as it's running
      refresh: 2, // number of ticks per frame; higher is faster but more jerky
      maxSimulationTime: LAYOUT_ANIMATION_TIME, // max length in ms to run the layout
      ungrabifyWhileSimulating: false, // so you can't drag nodes during layout
      fit: false, // on every layout reposition of nodes, fit the viewport
      padding: 30, // padding around the simulation
      nodeDimensionsIncludeLabels: true, // whether labels should be included in determining the space used by a node
      // positioning options
      randomize: false, // use random node positions at beginning of layout
      avoidOverlap: true, // if true, prevents overlap of node bounding boxes
      handleDisconnected: true, // if true, avoids disconnected components from overlapping
      convergenceThreshold: 0.01, // when the alpha value (system energy) falls below this value, the layout stops
      nodeSpacing: function( node: NodeSingular ) {
        return 10;
      }, // extra spacing around nodes
    }).start();
  }
}

export class D3GlobalLayout implements LayoutSettings {
  startLayout(view: AdvancedGraph): Layouts {
    return view.viz.layout({
      name: 'd3-force',
      // @ts-ignore
      animate: 'end', // whether to show the layout as it's running; special 'end' value makes the layout animate like a discrete layout
      maxIterations: 0, // max iterations before the layout will bail out
      maxSimulationTime: LAYOUT_ANIMATION_TIME, // max length in ms to run the layout
      ungrabifyWhileSimulating: false, // so you can't drag nodes during layout
      fixedAfterDragging: false, // fixed node after dragging
      fit: false, // on every layout reposition of nodes, fit the viewport
      padding: 30, // padding around the simulation
      /** d3-force API**/
      alpha: 1, // sets the current alpha to the specified number in the range [0,1]
      alphaMin: 0.001, // sets the minimum alpha to the specified number in the range [0,1]
      alphaDecay: 1 - Math.pow(0.001, 1 / 300), // sets the alpha decay rate to the specified number in the range [0,1]
      alphaTarget: 0, // sets the current target alpha to the specified number in the range [0,1]
      velocityDecay: 0.4, // sets the velocity decay factor to the specified number in the range [0,1]
      collideRadius: (n) => {
        return 60;
      }, // sets the radius accessor to the specified number or function
      collideStrength: 0.9, // sets the force strength to the specified number in the range [0,1]
      collideIterations: 1, // sets the number of iterations per application to the specified number
      linkId: function id(d: any) {
        return d.id;
      }, // sets the node id accessor to the specified function
      linkDistance: 150, // sets the distance accessor to the specified number or function
      linkStrength: 0.7, // sets the strength accessor to the specified number or function. Could do something smart here
      linkIterations: 1, // sets the number of iterations per application to the specified number
      manyBodyStrength: -600,
      manyBodyDistanceMin: 5,
      xStrength: 0.1, // sets the strength accessor to the specified number or function
      xX: 0, // sets the x-coordinate accessor to the specified number or function
      yStrength: 0.1, // sets the strength accessor to the specified number or function
      yY: 0, // sets the y-coordinate accessor to the specified number or function
      radialStrength: 0.1,
      radialX: 0, // sets the x-coordinate of the circle center to the specified number
      radialY: 0, // sets the y-coordinate of the circle center to the specified number
      radialRadius: 10,
      // positioning optsions
      randomize: false, // use random node positions at beginning of layout
      // infinite layout options
      infinite: false, // overrides all other options for a forces-all-the-time mode
    }).start();
  }
}

export class GridGlobalLayout implements LayoutSettings {
  startLayout(view: AdvancedGraph): Layouts {
    return view.viz.layout( {
      name: 'grid',
      animate: true, // whether to show the layout as it's running (should this be end?
      animationDuration: DISCRETE_LAYOUT_ANIMATION_TIME,
      // animationEasing // Should probably add something here
      spacingFactor: DISCRETE_SPACING_FACTOR,
      fit: false, // on every layout reposition of nodes, fit the viewport
      padding: 30, // padding around the simulation
      nodeDimensionsIncludeLabels: true, // whether labels should be included in determining the space used by a node
      // positioning options
      avoidOverlap: true, // if true, prevents overlap of node bounding boxes
    }).start();
  }
}

export class DagreGlobalLayout implements LayoutSettings {
  startLayout(view: AdvancedGraph): Layouts {
    return view.viz.layout( {
      name: 'dagre',
      // @ts-ignore
      animate: true, // whether to show the layout as it's running (should this be end?
      animationDuration: DISCRETE_LAYOUT_ANIMATION_TIME,
      spacingFactor: DISCRETE_SPACING_FACTOR,
      // animationEasing // Should probably add something here
      fit: false, // on every layout reposition of nodes, fit the viewport
      padding: 30, // padding around the simulation
      nodeDimensionsIncludeLabels: true, // whether labels should be included in determining the space used by a node
      // positioning options
      avoidOverlap: true, // if true, prevents overlap of node bounding boxes
    }).start();
  }
}

export class AVSDFGlobalLayout implements LayoutSettings {
  startLayout(view: AdvancedGraph): Layouts {
    return view.viz.layout( {
      name: 'avsdf',
      // @ts-ignore
      animate: 'end', // whether to show the layout as it's running (should this be end?
      animationDuration: DISCRETE_LAYOUT_ANIMATION_TIME,
      // animationEasing // Should probably add something here
      fit: false, // on every layout reposition of nodes, fit the viewport
      padding: 30, // padding around the simulation
      nodeDimensionsIncludeLabels: true, // whether labels should be included in determining the space used by a node
      // positioning options
      avoidOverlap: true, // if true, prevents overlap of node bounding boxes
    }).start();
  }
}


export class ConcentricLayout implements LayoutSettings {
  startLayout(view: AdvancedGraph): Layouts {
    return view.viz.layout( {
      name: 'concentric',
      // @ts-ignore
      animate: 'end', // whether to show the layout as it's running (should this be end?
      animationDuration: DISCRETE_LAYOUT_ANIMATION_TIME,
      concentric: (n) =>{
        // @ts-ignore
        if (n.hasClass(CLASS_ACTIVE_NODE)) {
          return 1000;
        }
        // @ts-ignore
        if (n.hasClass(CLASS_EXPANDED)) {
          return 100;
        }
        return 1;
      },
      // animationEasing // Should probably add something here
      fit: false, // on every layout reposition of nodes, fit the viewport
      padding: 30, // padding around the simulation
      nodeDimensionsIncludeLabels: true, // whether labels should be included in determining the space used by a node
      // positioning options
      avoidOverlap: true, // if true, prevents overlap of node bounding boxes
    }).start();
  }
}


export const getLayoutSetting = function(layoutType: AGLayouts, settings?: IAdvancedGraphSettings) {
  switch (layoutType) {
    case 'circle': return new ConcentricLayout();
    case 'force-directed': if (settings && settings.fdgdLayout === 'd3-force') {
      return new D3GlobalLayout();
    } else {
      return new ColaGlobalLayout();
    }
    case 'hierarchy': return new DagreGlobalLayout();
    case 'grid': return new GridGlobalLayout();
    case 'cola': return new ColaGlobalLayout();
    case 'd3-force': return new D3GlobalLayout();
  }
};
