import {
	FileSystemAdapter,
	MarkdownView, normalizePath,
	Notice,
	Plugin, Scope, TAbstractFile, TFile,
	WorkspaceLeaf
} from 'obsidian';
import {INeo4jViewSettings, Neo4jViewSettingTab, DefaultNeo4jViewSettings} from "./settings";
import {exec, ChildProcess, spawn} from 'child_process';
import {promisify} from "util";
import {PythonShell} from "python-shell";
import {NV_VIEW_TYPE, NeoVisView, MD_VIEW_TYPE} from "./visualization";
// import 'express';
import {IncomingMessage, ServerResponse} from "http";

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
				if (!this.stream_process) {
					new Notice("Cannot open in Neo4j Bloom as neo4j stream is not active.")
				}
				let active_view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (active_view == null) {
					return;
				}
				let name = active_view.getDisplayText();

				const leaf = this.app.workspace.splitActiveLeaf(this.settings.splitDirection);
				const neovisView = new NeoVisView(leaf, name, this);
				leaf.open(neovisView);
			},
		});

		this.addSettingTab(new Neo4jViewSettingTab(this.app, this));


		await this.initialize();
	}

	public getFileFromAbsolutePath(abs_path: string): TAbstractFile {
		const path = require('path');
		const relPath = path.relative(this.path, abs_path);
		return this.app.vault.getAbstractFileByPath(relPath);
	}

	public async openFile(file: TFile) {
		const md_leaves = this.app.workspace.getLeavesOfType(MD_VIEW_TYPE);
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
			let {stdout, stderr} = await exec_promise("pip3 install --upgrade semantic-markdown-converter " +
				"--no-warn-script-location " +
				(DEVELOP_MODE ? "--index-url https://test.pypi.org/simple/ " : "") +
				"--user ", {timeout: 10000000});
			if (this.settings.debug) {
				console.log(stdout);
			}
			console.log(stderr);
			let options = {
				args: ['--input', this.path,
					'--password', this.settings.password,
					'--typed_links_prefix', this.settings.typed_link_prefix,
					'--community', this.settings.community]
					.concat(this.settings.debug ? ["--debug"] : [])
			};

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
			const _debug = this.settings.debug;
			this.stream_process.on('message', function (message) {
				// received a message sent from the Python script (a simple "print" statement)
				if (message === 'Stream is active!') {
					console.log(message);
					new Notice("Neo4j stream online!");
					statusbar.setText("Neo4j stream online");
				}
				else if (message == 'invalid user credentials') {
					console.log(message);
					new Notice('Please provide a password in the Neo4j Graph View settings');
					statusbar.setText(STATUS_OFFLINE);
				}
				else if (message == 'no connection to db') {
					console.log(message);
					new Notice("No connection to Neo4j database. Please start Neo4j Database in Neo4j Desktop");
					statusbar.setText(STATUS_OFFLINE);
				}
				else if (_debug) {
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

		let server = http.createServer(function (req: IncomingMessage, res: ServerResponse) {
			console.log("entering query");
			console.log(req);
			let reqpath = req.url.toString().split('?')[0];
			if (req.method !== 'GET') {
				res.statusCode = 501;
				res.setHeader('Content-Type', 'text/plain');
				return res.end('Method not implemented');
			}
			let file = path.join(dir, decodeURI(reqpath.replace(/\/$/, '/index.html')));
			console.log(file);
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
		let port = this.settings.imgServerPort;
		server.listen(port, function () {
			console.log('Listening on http://localhost:' + port + '/');
		});
	}

	public async shutdown() {
		if(this.stream_process) {
			new Notice("Stopping Neo4j stream");
			this.stream_process.kill();
			this.statusBar.setText("Neo4j stream offline");
			this.stream_process = null;
		}
	}

	async onunload() {
		console.log('unloading plugin');
		await this.shutdown();
	}

}

