import {
	FileSystemAdapter,
	MarkdownView, normalizePath,
	Notice,
	Plugin, TAbstractFile, TFile,
	WorkspaceLeaf
} from 'obsidian';
import {SemanticMarkdownSettings, SemanticMarkdownSettingTab} from "./settings";
import { exec, ChildProcess } from 'child_process';
import {promisify} from "util";
import {PythonShell} from "python-shell";
import {NV_VIEW_TYPE, NeoVisView, MD_VIEW_TYPE} from "./visualization";


// I got this from https://github.com/SilentVoid13/Templater/blob/master/src/fuzzy_suggester.ts
const exec_promise = promisify(exec);

export default class SemanticMarkdownPlugin extends Plugin {
	settings: SemanticMarkdownSettings;
	stream_process: PythonShell;
	path: string;
	statusBar: HTMLElement;
	neovisView: NeoVisView;

	async onload() {
		if (this.app.vault.adapter instanceof FileSystemAdapter) {
			this.path = this.app.vault.adapter.getBasePath();
		}

		this.settings = (await this.loadData()) || new SemanticMarkdownSettings();
		this.statusBar = this.addStatusBarItem();
		this.statusBar.setText("Neo4j stream offline");

		this.registerView(NV_VIEW_TYPE, (leaf: WorkspaceLeaf) => this.neovisView=new NeoVisView(leaf, this.app.workspace.activeLeaf?.getDisplayText(), this))

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

		this.addSettingTab(new SemanticMarkdownSettingTab(this.app, this));

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

		// console.log(this.path);
		console.log('Initializing semantic markdown');
		try {
			// console.log(stdout);
			let {stdout, stderr} = await exec_promise("pip3 install --upgrade semantic-markdown-converter " +
				"--index-url https://test.pypi.org/simple/ " + // Use this for debugging
				"--no-warn-script-location " +
				"--user ", {timeout: 10000000});
			console.log(stderr);
			let options = {
				args: ['--input', this.path,  '--password', this.settings.password]
			};

			// @ts-ignore
			this.stream_process = PythonShell.runString("from smdc.stream import main;" +
				"main();", options, function(err, results) {
				if (err) throw err;
				console.log('finished');
				console.log(results);
			});
			let plugin = this;
			process.on("exit", function() {
				plugin.shutdown();
			})
			let statusbar = this.statusBar
			this.stream_process.on('message', function (message) {
				// received a message sent from the Python script (a simple "print" statement)
				console.log(message);
				if (message === 'Stream is active!') {
					new Notice("Neo4j stream online!");
					statusbar.setText("Neo4j stream online");
				}
			});
			this.stream_process.stdout.pipe(process.stdout);
			this.stream_process.stderr.pipe(process.stderr);

			new Notice("Initializing Neo4j stream.");
			this.statusBar.setText('Initializing Neo4j stream');
		}
		catch(error) {
			console.log("Error during initialization of semantic markdown: \n", error);
			new Notice("Error during initialization of the Neo4j stream. Check the console for crash report.");
		}
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

