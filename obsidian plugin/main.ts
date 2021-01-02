import {
	FileSystemAdapter,
	MarkdownView, MenuItem, normalizePath,
	Notice,
	Plugin, Scope, TAbstractFile, TFile,
	WorkspaceLeaf
} from 'obsidian';
import {INeo4jViewSettings, Neo4jViewSettingTab, DefaultNeo4jViewSettings} from "./settings";
import {exec, ChildProcess, spawn} from 'child_process';
import {promisify} from "util";
import {PythonShell} from "python-shell";
import {NV_VIEW_TYPE, NeoVisView, MD_VIEW_TYPE, PROP_VAULT} from "./visualization";
// import 'express';
import {IncomingMessage, Server, ServerResponse} from "http";
import {Editor} from "codemirror";
import {start} from "repl";
import {Neo4jError} from "neo4j-driver";
import {IdType} from "vis-network";

// I got this from https://github.com/SilentVoid13/Templater/blob/master/src/fuzzy_suggester.ts
const exec_promise = promisify(exec);

const STATUS_OFFLINE = "Neo4j stream offline";

const DEVELOP_MODE = false;

export default class Neo4jViewPlugin extends Plugin {
	settings: INeo4jViewSettings;
	stream_process: PythonShell;
	path: string;
	statusBar: HTMLElement;
	neovisView: NeoVisView;
	imgServer: Server;

	async onload() {
		if (this.app.vault.adapter instanceof FileSystemAdapter) {
			this.path = this.app.vault.adapter.getBasePath();
		}

		this.settings = Object.assign(DefaultNeo4jViewSettings, await this.loadData());//(await this.loadData()) || DefaultNeo4jViewSettings;
		this.statusBar = this.addStatusBarItem();
		this.statusBar.setText(STATUS_OFFLINE);

		// this.registerView(NV_VIEW_TYPE, (leaf: WorkspaceLeaf) => this.neovisView=new NeoVisView(leaf, this.app.workspace.activeLeaf?.getDisplayText(), this))

		this.addCommand({
			id: 'restart-stream',
			name: 'Restart Neo4j stream',
			callback: () => {
				console.log('Restarting stream');
				this.restart();
			},
		});

		this.addCommand({
			id: 'stop-stream',
			name: 'Stop Neo4j stream',
			callback: () => {
				this.shutdown();
			},
		});

		// this.addCommand({
		// 	id: 'open-bloom-link',
		// 	name: 'Open note in Neo4j Bloom',
		// 	callback: () => {
		// 		if (!this.stream_process) {
		// 			new Notice("Cannot open in Neo4j Bloom as neo4j stream is not active.")
		// 		}
		// 		let active_view = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (active_view == null) {
		// 			return;
		// 		}
		// 		let name = active_view.getDisplayText();
		// 		// active_view.getState().
		//
		// 		console.log(encodeURI("neo4j://graphapps/neo4j-bloom?search=SMD_no_tags with name " + name));
		// 		open(encodeURI("neo4j://graphapps/neo4j-bloom?search=SMD_no_tags with name " + name));
		// 		// require("electron").shell.openExternal("www.google.com");
		// 	},
		// });

		this.addCommand({
			id: 'open-vis',
			name: 'Open local graph of note',
			callback: () => {
				let active_view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (active_view == null) {
					return;
				}
				let name = active_view.getDisplayText();
				this.openLocalGraph(name);
			},
		});

		this.addCommand({
			id: 'execute-query',
			name: 'Execute Cypher query',
			callback: () => {
				if (!this.stream_process) {
					new Notice("Cannot open local graph as neo4j stream is not active.")
					return;
				}
				this.executeQuery();
			},
		});

		this.addSettingTab(new Neo4jViewSettingTab(this.app, this));

		this.app.workspace.on("file-menu", ((menu, file: TFile) => {
			menu.addItem((item) =>{
				item.setTitle("Open Neo4j Graph View").setIcon("dot-network")
					.onClick(evt => {
						if (file.extension === "md") {
							this.openLocalGraph(file.basename);
						}
						else {
							this.openLocalGraph(file.name);
						}
				});
			})
		}));


		await this.initialize();
	}

	public getFileFromAbsolutePath(abs_path: string): TAbstractFile {
		const path = require('path');
		const relPath = path.relative(this.path, abs_path);
		return this.app.vault.getAbstractFileByPath(relPath);
	}

	public async openFile(file: TFile) {
		const md_leaves = this.app.workspace.getLeavesOfType(MD_VIEW_TYPE).concat(this.app.workspace.getLeavesOfType('image'));
		// this.app.workspace.iterateAllLeaves(leaf => console.log(leaf.view.getViewType()));
		if (md_leaves.length > 0) {
			await md_leaves[0].openFile(file);
		}
		else {
			await this.app.workspace.getLeaf(true).openFile(file);
		}
	}

	public async restart() {
		new Notice("Restarting Neo4j stream.");
		await this.shutdown();
		await this.initialize();
	}

	public async initialize() {
		console.log('Initializing Neo4j stream');
		try {
			let out = await exec_promise("pip3 install --upgrade pip " +
				"--user ", {timeout: 10000000});

			if (this.settings.debug) {
				console.log(out.stdout);
			}
			console.log(out.stderr);
			let {stdout, stderr} = await exec_promise("pip3 install --upgrade semantic-markdown-converter " +
				"--no-warn-script-location " +
				(DEVELOP_MODE ? "--index-url https://test.pypi.org/simple/ --extra-index-url https://pypi.org/simple " : "") +
				"--user ", {timeout: 10000000});
			if (this.settings.debug) {
				console.log(stdout);
			}
			console.log(stderr);
		}
		catch (e) {
			console.log("Error during updating semantic markdown: \n", e);
			new Notice("Error during updating semantic markdown. Check the console for crash report.");
		}
		let options = {
			args: ['--input', this.path,
				'--password', this.settings.password,
				'--typed_links_prefix', this.settings.typed_link_prefix,
				'--community', this.settings.community]
				.concat(this.settings.debug ? ["--debug"] : [])
				.concat(this.settings.convert_markdown ? ["--convert_markdown"] : [])
		};
		try {
			// @ts-ignore
			this.stream_process = PythonShell.runString("from smdc.stream import main;" +
				"main();", options, function(err, results) {
				if (err) throw err;
				console.log('Neo4j stream killed');
			});
			let plugin = this;
			process.on("exit", function() {
				plugin.shutdown();
			})
			let statusbar = this.statusBar;
			let settings = this.settings;
			this.stream_process.on('message', function (message) {
				// received a message sent from the Python script (a simple "print" statement)
				if (message === 'Stream is active!') {
					console.log(message);
					new Notice("Neo4j stream online!");
					statusbar.setText("Neo4j stream online");
				}
				else if (message === 'invalid user credentials') {
					console.log(message);
					new Notice('Please provide a password in the Neo4j Graph View settings');
					statusbar.setText(STATUS_OFFLINE);
				}
				else if (message === 'no connection to db') {
					console.log(message);
					new Notice("No connection to Neo4j database. Please start Neo4j Database in Neo4j Desktop");
					statusbar.setText(STATUS_OFFLINE);
				}
				else if (/^onSMD/.test(message)) {
					if (settings.debug) {console.log(message)}
					console.log("handling event");
					const parts = message.split("/");
					const leaves = plugin.app.workspace.getLeavesOfType(NV_VIEW_TYPE);
					const name = parts[1];
					leaves.forEach((leaf) =>{
						let view = leaf.view as NeoVisView;
						if (parts[0] === "onSMDModifyEvent") {
							if (view.expandedNodes.includes(name)) {
								view.updateWithCypher(plugin.localNeighborhoodCypher(name));
							}
							else {
								view.updateWithCypher(plugin.nodeCypher(name));
							}
						}
						else if (parts[0] === "onSMDMovedEvent") {
							let new_name = parts[2];
							if (view.expandedNodes.includes(name)) {
								view.updateWithCypher(plugin.localNeighborhoodCypher(new_name));
								view.expandedNodes.remove(name);
								view.expandedNodes.push(new_name);
							}
							else {
								view.updateWithCypher(plugin.nodeCypher(new_name));
							}
						}
						else if (parts[0] === "onSMDDeletedEvent") {
							// TODO: Maybe automatically update to dangling link by running an update query.
							view.deleteNode(parts[1]);
							// view.updateStyle();
						}
						else if (parts[0] === "onSMDRelDeletedEvent") {
							parts.slice(1).forEach((id: IdType) => {
								view.deleteEdge(id);
							})
						}
					});
				}
				else if (settings.debug) {
					console.log(message);
				}
			});

			new Notice("Initializing Neo4j stream.");
			this.statusBar.setText('Initializing Neo4j stream');
		}
		catch(error) {
			console.log("Error during initialization of semantic markdown: \n", error);
			new Notice("Error during initialization of the Neo4j stream. Check the console for crash report.");
		}
		this.httpServer();
	}

	async httpServer() {
		let path = require('path');
		let http = require('http');
		let fs = require('fs');

		let dir = path.join(this.path);

		let mime = {
			gif: 'image/gif',
			jpg: 'image/jpeg',
			png: 'image/png',
			svg: 'image/svg+xml',
		};
		let settings = this.settings;
		this.imgServer = http.createServer(function (req: IncomingMessage, res: ServerResponse) {

			let reqpath = req.url.toString().split('?')[0];
			if (req.method !== 'GET') {
				res.statusCode = 501;
				res.setHeader('Content-Type', 'text/plain');
				return res.end('Method not implemented');
			}
			let file = path.join(dir, decodeURI(reqpath.replace(/\/$/, '/index.html')));
			if (settings.debug) {
				console.log("entering query");
				console.log(req);
				console.log(file);
			}
			if (file.indexOf(dir + path.sep) !== 0) {
				res.statusCode = 403;
				res.setHeader('Content-Type', 'text/plain');
				return res.end('Forbidden');
			}
			// @ts-ignore
			let type = mime[path.extname(file).slice(1)];
			let s = fs.createReadStream(file);
			s.on('open', function () {
				res.setHeader('Content-Type', type);
				s.pipe(res);
			});
			s.on('error', function () {
				res.setHeader('Content-Type', 'text/plain');
				res.statusCode = 404;
				res.end('Not found');
			});
		});
		try {
			let port = this.settings.imgServerPort;
			this.imgServer.listen(port, function () {
				console.log('Image server listening on http://localhost:' + port + '/');
			});
		}
		catch (e){
			console.log(e);
			new Notice("Neo4j: Couldn't start image server, see console");
		}
	}

	openLocalGraph(name: string) {
		if (!this.stream_process) {
			new Notice("Cannot open local graph as neo4j stream is not active.")
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
			return "";
		}

		return cm.getRange({line: topLine || fromLineNum, ch: 0},
			{line: botLine || fromLineNum, ch: cm.getLine(botLine)?.length });
	}

	nodeCypher(label: string): string {
		return "MATCH (n) WHERE n.name=\"" + label +
			"\" AND n." + PROP_VAULT + "=\"" + this.app.vault.getName() +
			"\" RETURN n"
	}

	localNeighborhoodCypher(label:string): string {
		return "MATCH (n {name: \"" + label +
			"\", " + PROP_VAULT + ":\"" + this.app.vault.getName() +
			"\"}) OPTIONAL MATCH (n)-[r]-(m) RETURN n,r,m"
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
			}
			catch(e) {
				if (e instanceof Neo4jError) {
					new Notice("Invalid cypher query. Check console for more info.");
				}
				else {
					throw e;
				}
			}
		}
	}

	public async shutdown() {
		if(this.stream_process) {
			new Notice("Stopping Neo4j stream");
			this.stream_process.kill();
			this.statusBar.setText("Neo4j stream offline");
			this.stream_process = null;
			this.imgServer.close();
			this.imgServer = null;
		}
	}

	async onunload() {
		console.log('Unloading Neo4j Graph View plugin');
		await this.shutdown();
	}

}

