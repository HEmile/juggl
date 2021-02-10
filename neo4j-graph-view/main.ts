import {
  FileSystemAdapter,
  MarkdownView, MetadataCache, parseFrontMatterTags,
  Plugin, ReferenceCache, TFile, Vault,
} from 'obsidian';
import {
  IAdvancedGraphSettings,
  AdvancedGraphSettingTab,
  DefaultAdvancedGraphSettings} from './settings';
import {AdvancedGraphView, AG_VIEW_TYPE, MD_VIEW_TYPE} from './viz/visualization';
import type {Editor} from 'codemirror';
import {ImageServer} from './image-server';
import type {IDataStore, ITypedLink, ITypedLinkProperties} from './interfaces';
import {OBSIDIAN_STORE_NAME, ObsidianStore} from './obsidian-store';
import cytoscape from 'cytoscape';
// import coseBilkent from 'cytoscape-cose-bilkent';
import navigator from 'cytoscape-navigator';
import popper from 'cytoscape-popper';
import cola from 'cytoscape-cola';
import avsdf from 'cytoscape-avsdf';
import dagre from 'cytoscape-dagre';
import dblclick from 'cytoscape-dblclick';
import {addIcons} from './ui/icons';
import {STYLESHEET_PATH} from './viz/stylesheet';


// I got this from https://github.com/SilentVoid13/Templater/blob/master/src/fuzzy_suggester.ts

// const STATUS_OFFLINE = 'Neo4j stream offline';


export default class AdvancedGraphPlugin extends Plugin {
    // Match around [[ and ]], and ensure content isn't a wikilnk closure
// This doesn't explicitly parse aliases.
    static wikilinkRegex = '\\[\\[([^\\]\\r\\n]+?)\\]\\]';//
    static CAT_DANGLING = 'dangling';
    static nameRegex = '[^\\W\\d]\\w*';

    settings: IAdvancedGraphSettings;
    path: string;
    // statusBar: HTMLElement;
    agView: AdvancedGraphView;//
    // neo4jStream: Neo4jStream;
    vault: Vault;
    metadata: MetadataCache
    coreStores: Record<string, IDataStore> = {};
    stores: IDataStore[] = [];

    async onload(): Promise<void> {
      super.onload();
      console.log('Loading advanced graph view plugin');
      navigator(cytoscape);
      // cytoscape.use(coseBilkent);
      cytoscape.use(popper);
      cytoscape.use(cola);
      cytoscape.use(dagre);
      cytoscape.use(avsdf);
      cytoscape.use(dblclick);

      addIcons();

      this.vault = this.app.vault;
      this.metadata = this.app.metadataCache;
      this.path = this.vault.getRoot().path;
      const obsidianStore = new ObsidianStore(this);
      this.addChild(obsidianStore);
      this.registerCoreStore(obsidianStore, OBSIDIAN_STORE_NAME);

      this.settings = Object.assign(DefaultAdvancedGraphSettings, await this.loadData());

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

      this.addSettingTab(new AdvancedGraphSettingTab(this.app, this));

      this.registerEvent(this.app.workspace.on('file-menu', (menu, file: TFile) => {
        menu.addItem((item) => {
          item.setTitle('Open Advanced Graph View').setIcon('dot-network')
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
      console.log(path);

      // If this doesn't work nicely,
      // The Obsidian-way is this.registerEvent( this.app.vault.on("raw", {} );
      // But that'll fire on every file change.
      require('original-fs').watch(path,
          async (curr:any, prev:any) => {
            console.log('Updating graph stylesheet');
            for (const view of this.activeViews()) {
              const style = await view.createStylesheet();
              view.viz.style(style);
            }
          });
    }

    public async openFile(file: TFile) {
      const mdLeaves = this.app.workspace.getLeavesOfType(MD_VIEW_TYPE).concat(this.app.workspace.getLeavesOfType('image'));
      // this.app.workspace.iterateAllLeaves(leaf => console.log(leaf.view.getViewType()));
      if (mdLeaves.length > 0) {
        await mdLeaves[0].openFile(file);//
      } else {
        await this.app.workspace.getLeaf(true).openFile(file);
      }
    }

    async openLocalGraph(name: string) {
      const leaf = this.app.workspace.splitActiveLeaf(this.settings.splitDirection);
      // const query = this.localNeighborhoodCypher(name);
      const neovisView = new AdvancedGraphView(leaf, this, name, [this.coreStores[this.settings.coreStore]].concat(this.stores));
      await leaf.open(neovisView);
    }

    getLinesOffsetToGoal(start: number, goal: string, step = 1, cm: Editor): number {
      // Code taken from https://github.com/mrjackphil/obsidian-text-expand/blob/0.6.4/main.ts
      const lineCount = cm.lineCount();
      let offset = 0;

      while (!isNaN(start + offset) && start + offset < lineCount && start + offset >= 0) {
        const result = goal === cm.getLine(start + offset);
        if (result) {
          return offset;
        }
        offset += step;
      }

      return start;
    }

    getContentBetweenLines(fromLineNum: number, startLine: string, endLine: string, cm: Editor) {
      // Code taken from https://github.com/mrjackphil/obsidian-text-expand/blob/0.6.4/main.ts
      const topOffset = this.getLinesOffsetToGoal(fromLineNum, startLine, -1, cm);
      const botOffset = this.getLinesOffsetToGoal(fromLineNum, endLine, 1, cm);

      const topLine = fromLineNum + topOffset + 1;
      const botLine = fromLineNum + botOffset - 1;

      if (!(cm.getLine(topLine - 1) === startLine && cm.getLine(botLine + 1) === endLine)) {
        return '';
      }

      return cm.getRange({line: topLine || fromLineNum, ch: 0},
          {line: botLine || fromLineNum, ch: cm.getLine(botLine)?.length});
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
        if (!(file.parent.name === '/' || file.parent.name === '')) {
          classes.push(`folder-${file.parent.name
              .replace(' ', '_')}`);
        } else {
          classes.push('root');
        }
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
          }
          if (cache?.tags) {
            classes.push(...this._parseTags(cache.tags.map((t) => t.tag)));
          }
        } else {
          classes.push('file');
        }
        return classes;
      }
      return [AdvancedGraphPlugin.CAT_DANGLING];
    }

    regexEscape(str: string) {
      return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    public parseTypedLink(link: ReferenceCache, line: string): ITypedLink {
    // TODO: This is something specific I use, but shouldn't keep being in this repo.
      const regexPublishedIn = new RegExp(
          `^${this.regexEscape(this.settings.typedLinkPrefix)} (publishedIn) (\\d\\d\\d\\d) (${AdvancedGraphPlugin.wikilinkRegex},? *)+$`);
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
          `^${this.regexEscape(this.settings.typedLinkPrefix)} (${AdvancedGraphPlugin.nameRegex}) (${AdvancedGraphPlugin.wikilinkRegex},? *)+$`);
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

    public activeViews(): AdvancedGraphView[] {
      return this.app.workspace
          .getLeavesOfType(AG_VIEW_TYPE)
          .map((l) => l.view as AdvancedGraphView);
    }

    async onunload() {
      super.onunload();
      console.log('Unloading Neo4j Graph View plugin');
    }

    public registerStore(store: IDataStore) {
      this.stores.push(store);
    }

    public registerCoreStore(store: IDataStore, name: string) {
      if (!(store.storeId() === 'core')) {
        throw new Error('Can only register IDataStores as core if their storeId is core');
      }
      this.coreStores[name] = store;
    }
}
