import type {IAGMode, ICoreDataStore} from '../../interfaces';
import type {EventNames, EventObject, NodeSingular} from 'cytoscape';
import type {Juggl} from '../visualization';
import type {NodeCollection} from 'cytoscape';
import type {Menu} from 'obsidian';
import Toolbar from '../../ui/toolbar/Toolbar.svelte';
import {Component} from 'obsidian';
import {VizId} from '../../interfaces';
import {
  JUGGL_VIEW_TYPE,
  CLASS_ACTIVE_NODE,
  CLASS_CONNECTED_ACTIVE_NODE, CLASS_EXPANDED, CLASS_HARD_FILTERED,
  CLASS_INACTIVE_NODE, CLASS_PINNED, CLASS_PROTECTED,
  VIEWPORT_ANIMATION_TIME,
} from '../../constants';
import type {Core} from 'cytoscape';
import type {SvelteComponent} from 'svelte';
import {
  getLayoutSetting,
} from '../layout-settings';
import {icons, pathToSvg} from '../../ui/icons';
import {WorkspaceModal} from '../../ui/workspace-modal';


class EventRec {
  eventName: EventNames;
  selector: string;
  event: any;
}

export class WorkspaceMode extends Component implements IAGMode {
  view;
  viz: Core;
  events: EventRec[] = [];
  windowEvent: any;
  toolbar: SvelteComponent;
  recursionPreventer = false;
  menu: any;
  constructor(view: Juggl) {
    super();
    this.view = view;
  }

  onload() {
    if (this.view.vizReady) {
      this._onLoad();
    } else {
      this.registerEvent(this.view.on('vizReady', (viz) => {
        this._onLoad();
      }));
    }
  }

  _onLoad() {
    this.viz = this.view.viz;

    const mode = this;
    const view = this.view;
    const style = getComputedStyle(document.body);
    const selectColor = style.getPropertyValue('--text-selection');
    const backgroundColor = style.getPropertyValue('--background-secondary');
    const textColor = style.getPropertyValue('--text-normal');
    const font = style.getPropertyValue('--text');
    const plugin = this.view.plugin;
    // the default values of each option are outlined below:
    const defaults = {
      menuRadius: 70, // the outer radius (node center to the end of the menu) in pixels. It is added to the rendered size of the node. Can either be a number or function as in the example.
      selector: 'node', // elements matching this Cytoscape.js selector will trigger cxtmenus
      commands: (n: NodeSingular) => {
        const commands = [];
        const id = VizId.fromNode(n);
        if (id.storeId === 'core') {
          commands.push({
            content: pathToSvg(icons.ag_file),
            select: async function(ele: NodeSingular, event: Event) {
              // @ts-ignore
              await plugin.openFileFromNode(ele, event.originalEvent.metaKey);
            },
            enabled: true,
          });
        }

        commands.push(
            {
              content: pathToSvg(icons.ag_hide),
              select: function(ele: NodeSingular) {
                mode.removeNodes(ele);
              },
              enabled: true,
            },
            {
              content: pathToSvg(icons.ag_fit),
              select: function(ele: NodeSingular) {
                mode.updateActiveNode(ele, true);
              },
              enabled: true, // whether the command is selectable
            });
        if (n.hasClass(CLASS_PINNED)) {
          commands.push({
            content: pathToSvg(icons.ag_unlock),
            select: function(ele: NodeSingular) {
              mode.unpin(ele);
            },
            enabled: true, // whether the command is selectable
          });
        } else {
          commands.push({
            content: pathToSvg(icons.ag_lock),
            select: function(ele: NodeSingular) {
              mode.pin(ele);
            },
            enabled: true, // whether the command is selectable
          });
        }
        if (n.hasClass(CLASS_EXPANDED)) {
          commands.push({
            content: pathToSvg(icons.ag_collapse),
            select: function(ele: NodeSingular) {
              mode.removeNodes(ele);
            },
            enabled: true, // whether the command is selectable
          });
        } else {
          commands.push({
            content: pathToSvg(icons.ag_expand),
            select: function(ele: NodeSingular) {
              view.expand(ele);
            },
            enabled: true, // whether the command is selectable
          });
        }
        return commands;
      }, // function( ele ){ return [ /*...*/ ] }, // a function that returns commands or a promise of commands
      fillColor: `${backgroundColor}`, // the background colour of the menu
      activeFillColor: `${selectColor}`, // the colour used to indicate the selected command
      activePadding: 20, // additional size in pixels for the active command
      indicatorSize: 24, // the size in pixels of the pointer to the active command, will default to the node size if the node size is smaller than the indicator size,
      separatorWidth: 3, // the empty spacing in pixels between successive commands
      spotlightPadding: 0, // extra spacing in pixels between the element and the spotlight
      adaptativeNodeSpotlightRadius: true, // specify whether the spotlight radius should adapt to the node size
      // minSpotlightRadius: 12, // the minimum radius in pixels of the spotlight (ignored for the node if adaptativeNodeSpotlightRadius is enabled but still used for the edge & background)
      // maxSpotlightRadius: 28, // the maximum radius in pixels of the spotlight (ignored for the node if adaptativeNodeSpotlightRadius is enabled but still used for the edge & background)
      openMenuEvents: 'taphold', // space-separated cytoscape events that will open the menu; only `cxttapstart` and/or `taphold` work here
      itemColor: `${textColor}`, // the colour of text in the command's content
      itemTextShadowColor: 'transparent', // the text shadow colour of the command's content
      zIndex: 9999, // the z-index of the ui div
      atMouse: false, // draw menu at mouse position
      outsideMenuCancel: 15,
    };

    // @ts-ignore
    this.menu = this.viz.cxtmenu( defaults );

    this.registerCyEvent('tap', 'node', async (e: EventObject) => {
      if (!this.view.settings.openWithShift || e.originalEvent.shiftKey) {
        const file = await this.view.plugin.openFileFromNode(e.target, e.originalEvent.metaKey);
        if (file) {
          this.updateActiveNode(e.target, this.view.settings.autoZoom);
        }
      }
    });

    this.registerCyEvent('taphold', 'node', (e: EventObject) => {
      if (this.view.destroyHover) {
        this.view.destroyHover();
      }
    });

    this.registerCyEvent('dblclick', 'node', async (e: EventObject) => {
      await this.view.expand(e.target as NodeSingular);
    });

    this.registerCyEvent('tapselect tapunselect boxselect', null, (e: EventObject) => {
      this.view.trigger('selectChange');
    });

    // Register on file open event
    this.registerEvent(this.view.workspace.on('file-open', async (file) => {
      if (!this.view.settings.autoAddNodes) {
        return;
      }
      if (file && this.view.settings.autoAddNodes) {
        const name = file.basename;
        const id = new VizId(name, 'core');
        let followImmediate = true;
        if (this.viz.$id(id.toId()).length === 0) {
          const node = await this.view.datastores.coreStore.get(id);
          this.viz.startBatch();
          // Make sure it doesn't immediately get removed
          this.viz.add(node).addClass(CLASS_PROTECTED);
          const edges = await this.view.buildEdges(this.viz.$id(id.toId()));
          this.viz.add(edges);
          this.view.onGraphChanged(false, true);
          this.viz.endBatch();
          followImmediate = false;
        }
        const node = this.viz.$id(id.toId()) as NodeSingular;
        node.addClass(CLASS_PROTECTED);

        this.updateActiveNode(node, followImmediate && this.view.settings.autoZoom);
      }
    }));

    this.registerEvent(this.view.on('expand', (expanded) => {
      this.updateActiveNode(expanded, false);
    }));

    // TODO: What to do with this?
    this.registerEvent(this.view.on('elementsChange', () => {
      if (this.recursionPreventer) {
        return;
      }
      // Remove nodes that are not protected and not connected to expanded nodes
      this.viz.nodes()
          .difference(this.viz.nodes(`.${CLASS_PROTECTED}`))
          .filter((ele) => {
            // If none in the closed neighborhood are expanded.
            // Note that the closed neighborhood includes the current note.
            return ele.closedNeighborhood(`node.${CLASS_PROTECTED}`).length === 0;
          })
          .remove();
      this.updateActiveNode(this.viz.nodes(`.${CLASS_ACTIVE_NODE}`), false);
      this.recursionPreventer = true;
      this.view.onGraphChanged();
      this.recursionPreventer = false;
    }));

    this.windowEvent = async (evt: KeyboardEvent) => {
      if (!(document.activeElement === this.view.element)) {
        return;
      }
      if (evt.key === 'e') {
        await this.expandSelection();
      } else if (evt.key === 'h' || evt.key === 'Backspace') {
        this.removeSelection();
      } else if (evt.key === 'i') {
        this.invertSelection();
      } else if (evt.key === 'a') {
        this.selectAll();
      } else if (evt.key === 'n') {
        this.selectNeighboursOfSelected();
      } else if (evt.key === 'p') {
        this.pinSelection();
      } else if (evt.key === 'u') {
        this.unpinSelection();
      } else if (evt.key === 'c') {
        this.collapseSelection();
      } else if (evt.key === 'v') {
        this.view.fitView();
      } else if (evt.key === 'f') {
        this.view.fitView(this.viz.nodes(':selected'));
      }
    };
    // // Register keypress event
    // Note: Registered on window because it wouldn't fire on the div...
    document.on('keydown', '.cy-content', this.windowEvent, true);
  }

  registerCyEvent(name: EventNames, selector: string, callback: any) {
    this.events.push({eventName: name, selector: selector, event: callback});
    if (selector) {
      this.viz.on(name, selector, callback);
    } else {
      this.viz.on(name, callback);
    }
  }

  onunload(): void {
    for (const listener of this.events) {
      if (listener.selector) {
        this.viz.off(listener.eventName, listener.selector, listener.event);
      } else {
        this.viz.off(listener.eventName, listener.event);
      }
    }
    this.events = [];
    document.off('keydown', '.cy-content', this.windowEvent, true);
    this.toolbar.$destroy();
    this.menu.destroy();
  }

  getName(): string {
    return 'workspace';
  }

  fillMenu(menu: Menu, nodes: NodeCollection): void {
    if (nodes.length > 0) {
      menu.addItem((item) => {
        item.setTitle('Expand selection (E)').setIcon('ag-expand')
            .onClick(async (evt) => {
              await this.view.expand(nodes);
            });
      });
      menu.addItem((item) => {
        item.setTitle('Collapse selection (C)').setIcon('ag-collapse')
            .onClick((evt) =>{
              this.collapse(nodes);
            });
      });
      menu.addItem((item) => {
        item.setTitle('Hide selection (H)').setIcon('ag-hide')
            .onClick((evt) => {
              this.removeNodes(nodes);
            });
      });
      menu.addItem((item) =>{
        item.setTitle('Select all (A)').setIcon('ag-select-all')
            .onClick((evt) => {
              this.selectAll();
            });
      });
      menu.addItem((item) => {
        item.setTitle('Invert selection (I)').setIcon('ag-select-inverse')
            .onClick((evt) => {
              this.invertSelection();
            });
      });
    }
    if (nodes.length > 0) {
      menu.addItem((item) => {
        item.setTitle('Select neighbors (N)').setIcon('ag-select-neighbors')
            .onClick((evt) => {
              this.selectNeighbourhood(nodes);
            });
      });
      const pinned = this.view.getPinned();
      if (nodes.difference(pinned).length > 0) {
        menu.addItem((item) => {
          item.setTitle('Pin selection (P)').setIcon('ag-lock')
              .onClick((evt) => {
                this.pin(nodes);
              });
        });
      }
      if (nodes.intersect(pinned).length > 0) {
        menu.addItem((item) => {
          item.setTitle('Unpin selection (U)').setIcon('ag-unlock')
              .onClick((evt) => {
                this.unpin(nodes);
              });
        });
      }
    }
  }

  createToolbar(element: Element) {
    this.toolbar = new Toolbar({
      target: element,
      props: {
        viz: this.viz,
        filterValue: this.view.settings.filter,
        expandClick: this.expandSelection.bind(this),
        fdgdClick: () => this.view.setLayout(getLayoutSetting('force-directed', this.view.settings)),
        concentricClick: () => this.view.setLayout(getLayoutSetting('circle')),
        gridClick: () => this.view.setLayout(getLayoutSetting('grid')),
        hierarchyClick: () => this.view.setLayout(getLayoutSetting('hierarchy')),
        collapseClick: this.collapseSelection.bind(this),
        hideClick: this.removeSelection.bind(this),
        selectAllClick: this.selectAll.bind(this),
        selectInvertClick: this.invertSelection.bind(this),
        selectNeighborClick: this.selectNeighboursOfSelected.bind(this),
        lockClick: this.pinSelection.bind(this),
        unlockClick: this.unpinSelection.bind(this),
        fitClick: this.view.fitView.bind(this.view),
        localModeClick: () => this.view.setMode('local'),
        filterInput: (handler: InputEvent) => {
          // @ts-ignore
          this.view.searchFilter(handler.target.value);
          this.view.restartLayout();
        },
        saveClick: () => {
          new WorkspaceModal(this.view.plugin.app, this.view.plugin.workspaceManager, this.view).open();
        },
        workspace: this.view.plugin.app.workspace,
      },
    });
    this.view.on('selectChange', this.toolbar.onSelect.bind(this.toolbar));
    this.view.on('vizReady', (viz) => {
      this.toolbar.$set({viz: viz});
      this.toolbar.onSelect.bind(this.toolbar)();//
    });
  }

  updateActiveNode(node: NodeCollection, followImmediate: boolean) {
    this.viz.elements()
        .removeClass([CLASS_CONNECTED_ACTIVE_NODE, CLASS_ACTIVE_NODE, CLASS_INACTIVE_NODE])
        .difference(node.closedNeighborhood())
        .addClass(CLASS_INACTIVE_NODE);
    node.addClass(CLASS_ACTIVE_NODE);
    const neighbourhood = node.connectedEdges()
        .addClass(CLASS_CONNECTED_ACTIVE_NODE)
        .connectedNodes()
        .addClass(CLASS_CONNECTED_ACTIVE_NODE)
        .union(node);
    if (followImmediate) {
      this.viz.animate({
        fit: {
          eles: neighbourhood,
          padding: 0,
        },
        duration: VIEWPORT_ANIMATION_TIME,
        queue: false,
      });
    }
    this.viz.one('tap', (e) => {
      e.cy.elements().removeClass([CLASS_CONNECTED_ACTIVE_NODE, CLASS_ACTIVE_NODE, CLASS_INACTIVE_NODE]);
    });
  }

  async expandSelection() {
    await this.view.expand(this.viz.nodes(':selected'));
  }

  collapse(nodes: NodeCollection) {
    const selectedProtected = nodes.filter(`:selected`)
        .removeClass([CLASS_PROTECTED, CLASS_EXPANDED]);
    selectedProtected.openNeighborhood()
        .nodes()
        .filter((ele) => {
          // If none in the closed neighborhood are protected that aren't also selected
          // (their PROTECTED flag has been removed)
          return ele.closedNeighborhood(`node.${CLASS_PROTECTED}`).length === 0;
        })
        .remove();
    // can this cause race conditions with on elementsChange?
    this.recursionPreventer = true;
    this.view.onGraphChanged(true, true);
    this.recursionPreventer = false;
  }
  collapseSelection() {
    this.collapse(this.viz.nodes(':selected'));
  }
  removeNodes(nodes: NodeCollection) {
    nodes.addClass(CLASS_HARD_FILTERED);
    this.view.onGraphChanged(true, true);
    this.view.trigger('hide', nodes);
    this.view.trigger('selectChange');
  }
  removeSelection() {
    this.removeNodes(this.viz.nodes(':selected'));
  }

  selectAll() {
    this.viz.nodes().select();
    this.view.trigger('selectChange');
  }

  invertSelection() {
    this.viz.$(':selected')
        .unselect()
        .absoluteComplement()
        .select();
    this.view.trigger('selectChange');
  }

  selectNeighboursOfSelected() {
    this.selectNeighbourhood(this.viz.nodes(':selected'));
  }
  selectNeighbourhood(nodes: NodeCollection) {
    // TODO: This keeps self-loops selected.
    this.viz.nodes(':selected')
        .unselect();
    nodes.openNeighborhood()
        .select();
    this.view.trigger('selectChange');
  }

  unpin(nodes: NodeCollection) {
    const unlocked = nodes
        .unlock()
        .removeClass(CLASS_PINNED);
    this.view.restartLayout();
    this.view.trigger('unpin', unlocked);
  }

  unpinSelection() {
    this.unpin(this.viz.nodes(':selected'));
  }

  pin(nodes: NodeCollection) {
    const locked = nodes
        .lock()
        .addClass(CLASS_PINNED);
    this.view.restartLayout();
    this.view.trigger('pin', locked);
  }

  pinSelection() {
    this.pin(this.viz.nodes(':selected'));
  }
}
