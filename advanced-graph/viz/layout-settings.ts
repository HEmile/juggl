import type {AdvancedGraphView} from './visualization';
import type {Layouts} from 'cytoscape';
import {
  CLASS_ACTIVE_FILE, CLASS_EXPANDED,
  DISCRETE_LAYOUT_ANIMATION_TIME,
  DISCRETE_SPACING_FACTOR,
  LAYOUT_ANIMATION_TIME,
} from '../constants';
import type {NodeSingular} from 'cytoscape';

export interface LayoutSettings {

    startLayout(view: AdvancedGraphView): Layouts;

}

export class ColaGlobalLayout implements LayoutSettings {
  startLayout(view: AdvancedGraphView): Layouts {
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

export class GridGlobalLayout implements LayoutSettings {
  startLayout(view: AdvancedGraphView): Layouts {
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
  startLayout(view: AdvancedGraphView): Layouts {
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
  startLayout(view: AdvancedGraphView): Layouts {
    console.log('asvasdfsdf');
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

export class AVSDFlocalLayout implements LayoutSettings {
  startLayout(view: AdvancedGraphView): Layouts {
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
  startLayout(view: AdvancedGraphView): Layouts {
    return view.viz.layout( {
      name: 'concentric',
      // @ts-ignore
      animate: 'end', // whether to show the layout as it's running (should this be end?
      animationDuration: DISCRETE_LAYOUT_ANIMATION_TIME,
      concentric: (n) =>{
        // @ts-ignore
        console.log(n.classes());
        // @ts-ignore
        console.log(n.hasClass(CLASS_ACTIVE_FILE));
        // @ts-ignore
        if (n.hasClass(CLASS_ACTIVE_FILE)) {
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
