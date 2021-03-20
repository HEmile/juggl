import {
  FileSystemAdapter,
  MarkdownView, MetadataCache, parseFrontMatterStringArray, parseFrontMatterTags,
  Plugin, ReferenceCache, TFile, Vault,
} from 'obsidian';
import {
  IJugglPluginSettings,
  JugglGraphSettingsTab,
  DefaultJugglSettings, LAYOUTS,
  genStyleGroups, emptyStyleGroup,
} from './settings';
import {Juggl, MD_VIEW_TYPE} from './viz/visualization';
import {ImageServer} from './image-server';
import type {ICoreDataStore, IDataStore, IFuseFile, IJugglStores, ITypedLink, ITypedLinkProperties} from './interfaces';
import {OBSIDIAN_STORE_NAME, ObsidianStore} from './obsidian-store';
import cytoscape, {NodeSingular} from 'cytoscape';
// import coseBilkent from 'cytoscape-cose-bilkent';
import navigator from 'cytoscape-navigator';
import popper from 'cytoscape-popper';
import cola from 'cytoscape-cola';
import avsdf from 'cytoscape-avsdf';
import dagre from 'cytoscape-dagre';
import d3Force from 'cytoscape-d3-force';
import dblclick from 'cytoscape-dblclick';
import cxtmenu from '../../cytoscape.js-cxtmenu/cytoscape-cxtmenu';
import {addIcons} from './ui/icons';
import {STYLESHEET_PATH} from './viz/stylesheet';
import {JugglView} from './viz/juggl-view';
import {JugglNodesPane, JugglPane, JugglStylePane} from './pane/view';
import YAML from 'yaml';
import {JUGGL_NODES_VIEW_TYPE, JUGGL_STYLE_VIEW_TYPE, JUGGL_VIEW_TYPE} from './constants';
import {WorkspaceManager} from './viz/workspaces/workspace-manager';
import {VizId} from './interfaces';
import type {FSWatcher} from 'fs';
import {GlobalWarningModal} from './ui/settings/global-graph-modal';


// I got this from https://github.com/SilentVoid13/Templater/blob/master/src/fuzzy_suggester.ts

// const STATUS_OFFLINE = 'Neo4j stream offline';


export default class JugglPlugin extends Plugin {
    // Match around [[ and ]], and ensure content isn't a wikilnk closure
// This doesn't explicitly parse aliases.
    static wikilinkRegex = '\\[\\[([^\\]\\r\\n]+?)\\]\\]';//
    static CAT_DANGLING = 'dangling';
    static nameRegex = '[^\\W\\d]\\w*';

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

    async onload(): Promise<void> {
      super.onload();
      console.log('Loading Juggl');
      navigator(cytoscape);
      // cytoscape.use(coseBilkent);
      cytoscape.use(popper);
      cytoscape.use(cola);
      cytoscape.use(dagre);
      cytoscape.use(avsdf);
      cytoscape.use(d3Force);
      cytoscape.use(dblclick);
      // @ts-ignore
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

      // this.statusBar = this.addStatusBarItem();
      // this.statusBar.setText(STATUS_OFFLINE);
      // this.neo4jStream = new Neo4jStream(this);
      // this.addChild(this.neo4jStream);
      this.addChild(new ImageServer(this));

      // this.registerView(NV_VIEW_TYPE, (leaf: WorkspaceLeaf) => this.neovisView=new NeoVisView(leaf, this.app.workspace.activeLeaf?.getDisplayText(), this))

      // this.addCommand({
      //   id: 'restart-stream',
      //   name: 'Restart Neo4j stream',
      //   callback: () => {
      //     console.log('Restarting stream');
      //     this.neo4jStream.restart();
      //   },
      // });
      // this.addCommand({
      //   id: 'stop-stream',
      //   name: 'Stop Neo4j stream',
      //   callback: () => {
      //     this.neo4jStream.shutdown();
      //   },
      // });

      // this.addCommand({
      //   id: 'open-bloom-link',
      //   name: 'Open note in Neo4j Bloom',
      //   callback: () => {
      //       if (!this.stream_process) {
      //           new Notice("Cannot open in Neo4j Bloom as neo4j stream is not active.")
      //       }
      //       let active_view = this.app.workspace.getActiveViewOfType(MarkdownView);
      //       if (active_view == null) {
      //           return;
      //       }
      //       let name = active_view.getDisplayText();
      //       // active_view.getState().
      //
      //       console.log(encodeURI("neo4j://graphapps/neo4j-bloom?search=SMD_no_tags with name " + name));
      //       open(encodeURI("neo4j://graphapps/neo4j-bloom?search=SMD_no_tags with name " + name));
      //       // require("electron").shell.openExternal("www.google.com");
      //   },
      // });

      this.addCommand({
        id: 'open-vis',
        name: 'Open local graph of note',
        callback: () => {
          const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
          if (activeView == null) {
            return;
          }
          const name = activeView.getDisplayText();
          this.openLocalGraph(name);
        },
      });
      this.addCommand( {
        id: 'open-vis-global',
        name: 'Open global graph',
        callback: () => {
          this.openGlobalGraph();
        },
      });

      // this.addCommand({
      //   id: 'execute-query',
      //   name: 'Execute Cypher query',
      //   callback: () => {
      //     if (!this.neo4jStream) {
      //       new Notice('Cannot open local graph as neo4j stream is not active.');
      //       return;
      //     }
      //     this.executeQuery();
      //   },
      // });

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
      const path = (this.vault.adapter as FileSystemAdapter).getFullPath(STYLESHEET_PATH);


      this.registerMarkdownCodeBlockProcessor('juggl', async (src, el, context) => {
        // timeout is needed to ensure the div is added to the window. The graph will only load if
        // it is attached. This will also prevent any annoying hickups while looading the graph.
        setTimeout(async () => {
          const parsed = YAML.parse(src);
          try {
            const settings = Object.assign({}, this.settings.embedSettings, parsed);
            if (!(LAYOUTS.contains(settings.layout))) {
              throw `Invalid layout. Choose one from ${LAYOUTS}`;
            }
            const stores:IJugglStores = {
              dataStores: [this.coreStores[settings.coreStore] as IDataStore].concat(this.stores),
              coreStore: this.coreStores[settings.coreStore]};
            el.style.width = settings.width;
            el.style.height = settings.height;
            if (Object.keys(parsed).contains('local')) {
              this.addChild(new Juggl(el, this, stores, settings, [parsed.local]));
            } else if (Object.keys(parsed).contains('workspace')) {
              const graph = new Juggl(el, this, stores, settings, null);
              if (!this.workspaceManager.graphs.contains(parsed.workspace)) {
                throw 'Did not recognize workspace. Did you misspell its name?';
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
                throw 'The Obsidian Query Language plugin isn\'t loaded, so cannot query using oql!';
              }
            } else {
              throw 'Invalid query. Specify either the local property or the workspace property.';
            }
          } catch (error) {
          // taken from https://github.com/jplattel/obsidian-query-language/blob/main/src/renderer.ts
            const errorElement = document.createElement('div');
            errorElement.addClass('juggl-error');
            errorElement.innerText = error;
            el.appendChild(errorElement);
          }
        }, 200);
      });
      const plugin = this;
      const createPanes = async function() {
        if (plugin.app.workspace.getLeavesOfType(JUGGL_NODES_VIEW_TYPE).length === 0) {
          const leaf = plugin.app.workspace.getRightLeaf(false);
          const view = new JugglNodesPane(leaf, plugin);
          await leaf.open(view);
          await leaf.setViewState({type: JUGGL_NODES_VIEW_TYPE});
        }//
        if (plugin.app.workspace.getLeavesOfType(JUGGL_STYLE_VIEW_TYPE).length === 0) {
          const leaf = plugin.app.workspace.getRightLeaf(false);
          const view = new JugglStylePane(leaf, plugin);
          await leaf.open(view);
          await leaf.setViewState({type: JUGGL_STYLE_VIEW_TYPE});
        }// // this.app.workspace.createLeafInParent(this.app.workspace.rightSplit, 0 );
      };
      if (this.app.workspace.layoutReady) {
        await createPanes();
      } else {
        this.registerEvent(this.app.workspace.on('layout-ready', async () => {
          await createPanes();
        }));
      }

      this.addRibbonIcon('ag-concentric', 'Juggl global graph', () => {
        this.openGlobalGraph();
      });

      // If this doesn't work nicely,
      // The Obsidian-way is this.registerEvent( this.app.vault.on("raw", {} );
      // But that'll fire on every file change.
      try {
        const fs = require('original-fs');
        if (fs.existsSync(path)) {
          this.watcher = require('original-fs').watch(path,
              async (curr: any, prev: any) => {
                console.log(`Updating stylesheet from ${path}`);
                for (const view of this.activeGraphs()) {
                  await view.updateStylesheet();
                }
              });
        }
      } catch (e) {
        console.log('Cannot watch stylesheet. This is probably because we are on mobile');
        console.log(e);
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
      const mdLeaves = this.app.workspace.getLeavesOfType(MD_VIEW_TYPE).concat(this.app.workspace.getLeavesOfType('image'));
      // this.app.workspace.iterateAllLeaves(leaf => console.log(leaf.view.getViewType()));
      if (!newLeaf && mdLeaves.length > 0) {
        await mdLeaves[0].openFile(file);//
      } else {
        await this.app.workspace.getLeaf(newLeaf).openFile(file);
      }
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
      console.log(names.length);
      if (names.length > 250) {
        const modal = new GlobalWarningModal(this.app, async () => {
          const neovisView = new JugglView(leaf, this.settings.globalgraphSettings, this, names);
          await leaf.open(neovisView);
          modal.close();
        });
        modal.open();
      } else {
        const neovisView = new JugglView(leaf, this.settings.globalgraphSettings, this, names);
        await leaf.open(neovisView);
      }
    }
    // nodeCypher(label: string): string {
    //   return 'MATCH (n) WHERE n.name="' + label +
    //         '" AND n.' + PROP_VAULT + '="' + this.app.vault.getName() +
    //         '" RETURN n';
    // }
    //
    // localNeighborhoodCypher(label:string): string {
    //   return 'MATCH (n {name: "' + label +
    //         '", ' + PROP_VAULT + ':"' + this.app.vault.getName() +
    //         '"}) OPTIONAL MATCH (n)-[r]-(m) RETURN n,r,m';
    // }

    _parseTags(tags: string[]): string[] {
      return [].concat(...tags
          .map((tag) => {
            tag = tag.slice(1);
            const hSplit = tag.split('/');
            const tags = [];
            for (const i in hSplit) {
              const hTag = hSplit.slice(0, parseInt(i) + 1).join('-');
              tags.push(`tag-${hTag}`);
            }
            return tags;
          }));
    }

    public getClasses(file: TFile): string[] {
      if (file) {
        const classes = [];
        if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'tiff'].contains(file.extension)) {
          classes.push('image');
        } else if (['mp3', 'webm', 'wav', 'm4a', 'ogg', '3gp', 'flac'].contains(file.extension)) {
          classes.push('audio');
        } else if (['mp4', 'webm', 'ogv'].contains(file.extension)) {
          classes.push('video');
        } else if (file.extension === 'pdf') {
          classes.push('pdf');
        }
        // This is replaced by the 'path' data attribute.
        // if (!(file.parent.name === '/' || file.parent.name === '')) {
        //   classes.push(`folder-${file.parent.name
        //       .replace(' ', '_')}`);
        // } else {
        //   classes.push('root');
        // }
        if (file.extension === 'md') {
          classes.push('note');
          const cache = this.app.metadataCache.getFileCache(file);
          if (cache?.frontmatter) {
            if ('image' in cache.frontmatter) {
              classes.push('image');
            }
            if ('tags' in cache.frontmatter) {
              classes.push(...this._parseTags(parseFrontMatterTags(cache.frontmatter)));
            }
            if ('cssclass' in cache.frontmatter) {
              classes.push(...parseFrontMatterStringArray(cache.frontmatter, 'cssclass'));
            }
          }
          if (cache?.tags) {
            classes.push(...this._parseTags(cache.tags.map((t) => t.tag)));
          }
        } else {
          classes.push('file');
        }
        return classes;
      }
      return [JugglPlugin.CAT_DANGLING];
    }

    regexEscape(str: string) {
      return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    public parseTypedLink(link: ReferenceCache, line: string): ITypedLink {
    // TODO: This is something specific I use, but shouldn't keep being in this repo.
      const regexPublishedIn = new RegExp(
          `^${this.regexEscape(this.settings.typedLinkPrefix)} (publishedIn) (\\d\\d\\d\\d) (${JugglPlugin.wikilinkRegex},? *)+$`);
      const matchPI = regexPublishedIn.exec(line);
      if (!(matchPI === null)) {
        return {
          class: 'type-publishedIn',
          isInline: false,
          properties: {
            year: matchPI[2],
            context: '',
            type: 'publishedIn',
          } as ITypedLinkProperties,
        } as ITypedLink;
      }

      // Intuition: Start with the typed link prefix. Then a neo4j name (nameRegex).
      // Then one or more of the wikilink group: wikilink regex separated by optional comma and multiple spaces
      const regex = new RegExp(
          `^${this.regexEscape(this.settings.typedLinkPrefix)} (${JugglPlugin.nameRegex}) (${JugglPlugin.wikilinkRegex},? *)+$`);
      const match = regex.exec(line);
      if (!(match === null)) {
        return {
          class: `type-${match[1]}`,
          isInline: false,
          properties: {
            type: match[1],
          },
        } as ITypedLink;
      }
      return null;
    }

    // executeQuery() {
    //   // Code taken from https://github.com/mrjackphil/obsidian-text-expand/blob/0.6.4/main.ts
    //   const currentView = this.app.workspace.activeLeaf.view;
    //
    //   if (!(currentView instanceof MarkdownView)) {
    //     return;
    //   }
    //
    //   const cmDoc = currentView.sourceMode.cmEditor;
    //   const curNum = cmDoc.getCursor().line;
    //   const query = this.getContentBetweenLines(curNum, '```cypher', '```', cmDoc);
    //   if (query.length > 0) {
    //     const leaf = this.app.workspace.splitActiveLeaf(this.settings.splitDirection);
    //     try {
    //       // TODO: Pass query.
    //       // const neovisView = new NeoVisView((leaf, this, name, [new ObsidianStore(this)]);
    //       // leaf.open(neovisView);
    //     } catch (e) {
    //       if (e instanceof Neo4jError) {
    //         new Notice('Invalid cypher query. Check console for more info.');
    //       } else {
    //         throw e;
    //       }
    //     }
    //   }
    // }

    public activeGraphs(): Juggl[] {
      // TODO: This is not a great method, no way to find back the inline graphs!
      return this.app.workspace
          .getLeavesOfType(JUGGL_VIEW_TYPE)
          .map((l) => (l.view as JugglView).juggl);
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

    public registerCoreStore(store: ICoreDataStore, name: string) {
      if (!(store.storeId() === 'core')) {
        throw new Error('Can only register IDataStores as core if their storeId is core');
      }
      this.coreStores[name] = store;
    }
}
