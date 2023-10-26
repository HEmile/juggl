import {
  MetadataCache,
  Plugin, TFile, Vault, parseYaml, WorkspaceLeaf,
} from 'obsidian';
import {
  IJugglPluginSettings,
  JugglGraphSettingsTab,
  DefaultJugglSettings, LAYOUTS,
  genStyleGroups, emptyStyleGroup,
} from './settings';
import {Juggl} from './viz/visualization';
import {ImageServer} from './image-server';
import type {
  ICoreDataStore,
  IDataStore,
  IJugglStores,
  IJugglPlugin,
  IJuggl, IJugglSettings,
} from 'juggl-api';
import {OBSIDIAN_STORE_NAME, ObsidianStore} from './obsidian-store';
import cytoscape, {NodeSingular} from 'cytoscape';
import navigator from 'cytoscape-navigator';
import popper from 'cytoscape-popper';
import cola from 'cytoscape-cola';
import avsdf from 'cytoscape-avsdf';
import dagre from 'cytoscape-dagre';
import d3Force from 'cytoscape-d3-force';
import dblclick from 'cytoscape-dblclick';
import cxtmenu from 'cytoscape-cxtmenu';
import {addIcons} from './ui/icons';
import {STYLESHEET_PATH} from './viz/stylesheet';
import {JugglView} from './viz/juggl-view';
import {JugglNodesPane, JugglPane, JugglStylePane} from './pane/view';
import {JUGGL_NODES_VIEW_TYPE, JUGGL_STYLE_VIEW_TYPE, JUGGL_VIEW_TYPE} from './constants';
import {WorkspaceManager} from './viz/workspaces/workspace-manager';
import {VizId} from 'juggl-api';
import type {FSWatcher} from 'fs';
import {GlobalWarningModal} from './ui/settings/global-graph-modal';


// I got this from https://github.com/SilentVoid13/Templater/blob/master/src/fuzzy_suggester.ts

// const STATUS_OFFLINE = 'Neo4j stream offline';


export default class JugglPlugin extends Plugin implements IJugglPlugin {
    // Match around [[ and ]], and ensure content isn't a wikilnk closure
// This doesn't explicitly parse aliases.
    static CAT_DANGLING = 'dangling';

    settings: IJugglPluginSettings;
    path: string;
    // statusBar: HTMLElement;
    // neo4jStream: Neo4jStream;
    vault: Vault;
    metadata: MetadataCache
    coreStores: Record<string, ICoreDataStore> = {};
    stores: IDataStore[] = [];
    workspaceManager: WorkspaceManager;
    watcher: FSWatcher;
    ribbonIcon: HTMLElement;

    async onload(): Promise<void> {
      super.onload();
      console.log('Loading Juggl');
      navigator(cytoscape);
      cytoscape.use(popper);
      cytoscape.use(cola);
      cytoscape.use(dagre);
      cytoscape.use(avsdf);
      cytoscape.use(d3Force);
      cytoscape.use(dblclick);
      cytoscape.use(cxtmenu);

      addIcons();

      this.vault = this.app.vault;
      this.metadata = this.app.metadataCache;
      this.path = this.vault.getRoot().path;
      const obsidianStore = new ObsidianStore(this);
      this.addChild(obsidianStore);
      this.workspaceManager = new WorkspaceManager(this);
      this.addChild(this.workspaceManager);
      this.registerCoreStore(obsidianStore, OBSIDIAN_STORE_NAME);

      DefaultJugglSettings.globalStyleGroups = genStyleGroups(this);
      this.settings = Object.assign({}, DefaultJugglSettings, await this.loadData());
      this.settings.globalStyleGroups = this.settings.globalStyleGroups.map((g) =>
        Object.assign({}, emptyStyleGroup, g));
      this.settings.graphSettings = Object.assign({}, DefaultJugglSettings.graphSettings, this.settings.graphSettings);
      this.settings.embedSettings = Object.assign({}, DefaultJugglSettings.embedSettings, this.settings.embedSettings);


      this.addCommand({
        id: 'open-vis',
        name: 'Open local graph of note',
        callback: () => {
          const file = this.app.workspace.getActiveFile();
          const name = file.name;
          this.openLocalGraph(name);
        },
      });
      this.addCommand({
        id: 'open-vis-global',
        name: 'Open global graph',
        callback: () => {
          this.openGlobalGraph();
        },
      });

      this.addSettingTab(new JugglGraphSettingsTab(this.app, this));

      this.registerEvent(this.app.workspace.on('file-menu', (menu, file: TFile) => {
        if (!file) {
          return;
        }
        menu.addItem((item) => {
          item.setTitle('Open Juggl').setIcon('dot-network')
              .onClick((evt) => {
                if (file.extension === 'md') {
                  this.openLocalGraph(file.basename);
                } else {
                  this.openLocalGraph(file.name);
                }
              });
        });
      }));


      this.registerMarkdownCodeBlockProcessor('juggl', async (src, el, context) => {
        // timeout is needed to ensure the div is added to the window. The graph will only load if
        // it is attached. This will also prevent any annoying hickups while looading the graph.
        setTimeout(async () => {
          const parsed = parseYaml(src);
          try {
            const settings = Object.assign({}, this.settings.embedSettings, parsed);
            if (!(LAYOUTS.contains(settings.layout))) {
              throw new Error(`Invalid layout. Choose one from ${LAYOUTS}`);
            }
            const stores: IJugglStores = {
              dataStores: [this.coreStores[settings.coreStore] as IDataStore].concat(this.stores),
              coreStore: this.coreStores[settings.coreStore],
            };
            el.style.width = settings.width;
            el.style.height = settings.height;
            if (Object.keys(parsed).contains('local')) {
              this.addChild(new Juggl(el, this, stores, settings, [parsed.local]));
            } else if (Object.keys(parsed).contains('workspace')) {
              const graph = new Juggl(el, this, stores, settings, null);
              if (!this.workspaceManager.graphs.contains(parsed.workspace)) {
                throw new Error('Did not recognize workspace. Did you misspell its name?');
              }
              this.addChild(graph);
              await this.workspaceManager.loadGraph(parsed.workspace, graph);
            } else if (Object.keys(parsed).contains('oql')) {
              // @ts-ignore
              if ('obsidian-query-language' in this.app.plugins.plugins) {
                // @ts-ignore
                const searchResults: IFuseFile[] = await this.app.plugins.plugins['obsidian-query-language'].search(parsed.oql);
                settings.expandInitial = false;
                this.addChild(new Juggl(el, this, stores, settings, searchResults.map((file) => file.title)));
              } else {
                throw new Error('The Obsidian Query Language plugin isn\'t loaded, so cannot query using oql!');
              }
            } else {
              throw new Error('Invalid query. Specify either the local property or the workspace property.');
            }
          } catch (error) {
            // taken from https://github.com/jplattel/obsidian-query-language/blob/main/src/renderer.ts
            const errorElement = activeDocument.createElement('div');
            errorElement.addClass('juggl-error');
            errorElement.innerText = error.message;
            el.appendChild(errorElement);
          }
        }, 200);
      });
      const plugin = this;

      // Adapted from https://github.com/liamcain/obsidian-calendar-plugin/blob/master/src/main.ts
      this.registerView(JUGGL_NODES_VIEW_TYPE, (leaf: WorkspaceLeaf) => new JugglNodesPane(leaf, plugin));
      this.registerView(JUGGL_STYLE_VIEW_TYPE, (leaf: WorkspaceLeaf) => new JugglStylePane(leaf, plugin));
      const createNodesPane = function() {
        if (plugin.app.workspace.getLeavesOfType(JUGGL_NODES_VIEW_TYPE).length === 0) {
          const leaf = plugin.app.workspace.getRightLeaf(false);
          leaf.setViewState({type: JUGGL_NODES_VIEW_TYPE});
        }//
      };
      const createStylePane = function() {
        if (plugin.app.workspace.getLeavesOfType(JUGGL_STYLE_VIEW_TYPE).length === 0) {
          const leaf = plugin.app.workspace.getRightLeaf(false);
          leaf.setViewState({type: JUGGL_STYLE_VIEW_TYPE});
        }
      };
      this.app.workspace.onLayoutReady(createNodesPane);
      this.app.workspace.onLayoutReady(createStylePane);

      this.addCommand({
        id: 'show-nodes-pane',
        name: 'Open Nodes Pane',
        checkCallback: (checking: boolean) => {
          if (checking) {
            return (
              this.app.workspace.getLeavesOfType(JUGGL_NODES_VIEW_TYPE).length === 0
            );
          }
          createNodesPane();
        },
      });
      this.addCommand({
        id: 'show-style-pane',
        name: 'Open Style Pane',
        checkCallback: (checking: boolean) => {
          if (checking) {
            return (
              this.app.workspace.getLeavesOfType(JUGGL_STYLE_VIEW_TYPE).length === 0
            );
          }
          createStylePane();
        },
      });


      const sheetPath = STYLESHEET_PATH(this.vault);
      // @ts-ignore
      this.registerEvent(this.vault.on('raw', (file) => {
        // @ts-ignore
        if (file === sheetPath) {
          console.log(`Updating stylesheet from ${sheetPath}`);
          for (const view of this.activeGraphs()) {
            view.updateStylesheet().then();
          }
        }
      }));
      this.setGlobalIcon();
      this.addChild(new ImageServer(this));
    }

    public setGlobalIcon() {
      if (this.ribbonIcon) {
        this.ribbonIcon.detach();
      }
      if (this.settings.globalGraphRibbon) {
        this.ribbonIcon = this.addRibbonIcon('ag-concentric', 'Juggl global graph', () => {
          this.openGlobalGraph();
        });
      }
    }

    public async openFileFromNode(node: NodeSingular, newLeaf= false): Promise<TFile> {
      const id = VizId.fromNode(node);
      if (!(id.storeId === 'core')) {
        return null;
      }
      let file = this.app.metadataCache.getFirstLinkpathDest(id.id, '');
      if (file) {
        await this.openFile(file);
      } else {
        // create dangling file
        // todo: add default folder
        const filename = id.id + '.md';
        file = await this.vault.create(filename, '');
        await this.openFile(file);
      }
      return file;
    }

    public async openFile(file: TFile, newLeaf=false) {
      await this.app.workspace.getLeaf(newLeaf).openFile(file);
    }

    async openLocalGraph(name: string) {
      const leaf = this.app.workspace.splitActiveLeaf(this.settings.splitDirection);
      // const query = this.localNeighborhoodCypher(name);
      const neovisView = new JugglView(leaf, this.settings.graphSettings, this, [name]);
      await leaf.open(neovisView);
    }

    async openGlobalGraph() {
      const leaf = this.app.workspace.getLeaf(false);
      // const query = this.localNeighborhoodCypher(name);
      const names = this.app.vault.getFiles().map((f) => f.extension === 'md'? f.basename : f.name);
      if (names.length > 250) {
        const modal = new GlobalWarningModal(this.app, async () => {
          const neovisView = new JugglView(leaf, this.settings.globalGraphSettings, this, names);
          await leaf.open(neovisView);
          modal.close();
        });
        modal.open();
      } else {
        const neovisView = new JugglView(leaf, this.settings.globalGraphSettings, this, names);
        await leaf.open(neovisView);
      }
    }

    public activeGraphs(): IJuggl[] {
      // TODO: This is not a great method, no way to find back the inline graphs!
      return this.app.workspace
          .getLeavesOfType(JUGGL_VIEW_TYPE)
          .map((l) => (l.view as JugglView).juggl) as IJuggl[];
    }

    async onunload() {
      super.onunload();
      console.log('Unloading Juggl');
      this.app.workspace.detachLeavesOfType(JUGGL_NODES_VIEW_TYPE);
      this.app.workspace.detachLeavesOfType(JUGGL_STYLE_VIEW_TYPE);
      if (this.watcher) {
        this.watcher.close();
      }
    }

    public registerStore(store: IDataStore) {
      this.stores.push(store);
    }

    public removeStore(store: IDataStore): void {
      this.stores.remove(store);
    }

    public registerCoreStore(store: ICoreDataStore, name: string) {
      if (!(store.storeId() === 'core')) {
        throw new Error('Can only register IDataStores as core if their storeId is core');
      }
      this.coreStores[name] = store;
    }

    public createJuggl(el: HTMLElement, settings?: IJugglSettings, datastores?: IJugglStores, initialNodes?: string[]): IJuggl {
      // Public constructor for Juggl instances. Used for the API.
      if (!settings) {
        settings = Object.assign({}, DefaultJugglSettings.embedSettings);
        if (initialNodes) {
          settings.expandInitial = false;
        }
      }
      if (!datastores) {
        datastores = this.defaultStores();
      }
      return new Juggl(el, this, datastores, settings, initialNodes);
    }

    public defaultStores(): IJugglStores {
      return {
        dataStores: [this.coreStores[OBSIDIAN_STORE_NAME] as IDataStore].concat(this.stores),
        coreStore: this.coreStores[OBSIDIAN_STORE_NAME],
      };
    }
}
