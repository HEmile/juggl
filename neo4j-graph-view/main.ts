import {
  MarkdownView,
  Notice,
  Plugin, TAbstractFile, TFile,
} from 'obsidian';
import {
  INeo4jViewSettings,
  Neo4jViewSettingTab,
  DefaultNeo4jViewSettings} from './settings';
import {NeoVisView, MD_VIEW_TYPE, PROP_VAULT} from './visualization';
import {IncomingMessage, Server, ServerResponse} from 'http';
import {Editor} from 'codemirror';
import {Neo4jError} from 'neo4j-driver';
import {Neo4jStream} from './stream';
// import cytoscape from 'cytoscape';


// I got this from https://github.com/SilentVoid13/Templater/blob/master/src/fuzzy_suggester.ts

const STATUS_OFFLINE = 'Neo4j stream offline';

export default class Neo4jViewPlugin extends Plugin {
    settings: INeo4jViewSettings;
    path: string;
    statusBar: HTMLElement;
    neovisView: NeoVisView;
    neo4jStream: Neo4jStream;

    async onload(): Promise<void> {
      super.onload();
      console.log('Loading Neo4j graph view plugin');
      this.path = this.app.vault.getRoot().path;

      this.settings = Object.assign(DefaultNeo4jViewSettings, await this.loadData());// (await this.loadData()) || DefaultNeo4jViewSettings;
      this.statusBar = this.addStatusBarItem();
      this.statusBar.setText(STATUS_OFFLINE);
      this.neo4jStream = new Neo4jStream(this);
      this.addChild(this.neo4jStream);

      // this.registerView(NV_VIEW_TYPE, (leaf: WorkspaceLeaf) => this.neovisView=new NeoVisView(leaf, this.app.workspace.activeLeaf?.getDisplayText(), this))

      this.addCommand({
        id: 'restart-stream',
        name: 'Restart Neo4j stream',
        callback: () => {
          console.log('Restarting stream');
          this.neo4jStream.restart();
        },
      });

      this.addCommand({
        id: 'stop-stream',
        name: 'Stop Neo4j stream',
        callback: () => {
          this.neo4jStream.shutdown();
        },
      });

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

      this.addCommand({
        id: 'execute-query',
        name: 'Execute Cypher query',
        callback: () => {
          if (!this.neo4jStream) {
            new Notice('Cannot open local graph as neo4j stream is not active.');
            return;
          }
          this.executeQuery();
        },
      });

      this.addSettingTab(new Neo4jViewSettingTab(this.app, this));

      this.registerEvent(this.app.workspace.on('file-menu', (menu, file: TFile) => {
        menu.addItem((item) => {
          item.setTitle('Open Neo4j Graph View').setIcon('dot-network')
              .onClick((evt) => {
                if (file.extension === 'md') {
                  this.openLocalGraph(file.basename);
                } else {
                  this.openLocalGraph(file.name);
                }
              });
        });
      }));
    }

    public getFileFromAbsolutePath(absPath: string): TAbstractFile {
      const path = require('path');
      const relPath = path.relative(this.path, absPath);
      return this.app.vault.getAbstractFileByPath(relPath);
    }

    public async openFile(file: TFile) {
      const mdLeaves = this.app.workspace.getLeavesOfType(MD_VIEW_TYPE).concat(this.app.workspace.getLeavesOfType('image'));
      // this.app.workspace.iterateAllLeaves(leaf => console.log(leaf.view.getViewType()));
      if (mdLeaves.length > 0) {
        await mdLeaves[0].openFile(file);
      } else {
        await this.app.workspace.getLeaf(true).openFile(file);
      }
    }


    openLocalGraph(name: string) {
      if (!this.neo4jStream) {
        new Notice('Cannot open local graph as neo4j stream is not active.');
        return;
      }

      const leaf = this.app.workspace.splitActiveLeaf(this.settings.splitDirection);
      const query = this.localNeighborhoodCypher(name);
      const neovisView = new NeoVisView(leaf, query, this);
      leaf.open(neovisView);
      neovisView.expandedNodes.push(name);
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

    nodeCypher(label: string): string {
      return 'MATCH (n) WHERE n.name="' + label +
            '" AND n.' + PROP_VAULT + '="' + this.app.vault.getName() +
            '" RETURN n';
    }

    localNeighborhoodCypher(label:string): string {
      return 'MATCH (n {name: "' + label +
            '", ' + PROP_VAULT + ':"' + this.app.vault.getName() +
            '"}) OPTIONAL MATCH (n)-[r]-(m) RETURN n,r,m';
    }

    executeQuery() {
      // Code taken from https://github.com/mrjackphil/obsidian-text-expand/blob/0.6.4/main.ts
      const currentView = this.app.workspace.activeLeaf.view;

      if (!(currentView instanceof MarkdownView)) {
        return;
      }

      const cmDoc = currentView.sourceMode.cmEditor;
      const curNum = cmDoc.getCursor().line;
      const query = this.getContentBetweenLines(curNum, '```cypher', '```', cmDoc);
      if (query.length > 0) {
        const leaf = this.app.workspace.splitActiveLeaf(this.settings.splitDirection);
        try {
          const neovisView = new NeoVisView(leaf, query, this);
          leaf.open(neovisView);
        } catch (e) {
          if (e instanceof Neo4jError) {
            new Notice('Invalid cypher query. Check console for more info.');
          } else {
            throw e;
          }
        }
      }
    }

    async onunload() {
      super.onunload();
      console.log('Unloading Neo4j Graph View plugin');
    }
}
