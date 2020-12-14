import {App, FileSystemAdapter, Modal, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';
import {SemanticMarkdownSettings, SemanticMarkdownSettingTab} from "./settings";
import { exec, ChildProcess } from 'child_process';
import {promisify} from "util";
import {PythonShell} from "python-shell";

// I got this from https://github.com/SilentVoid13/Templater/blob/master/src/fuzzy_suggester.ts
const exec_promise = promisify(exec);

export default class SemanticMarkdownPlugin extends Plugin {
	public settings: SemanticMarkdownSettings;
	public stream_process: PythonShell;
	public path: string;
	public statusBar: HTMLElement;

	async onload() {
		if (this.app.vault.adapter instanceof FileSystemAdapter) {
			this.path = this.app.vault.adapter.getBasePath();
		}

		this.settings = (await this.loadData()) || new SemanticMarkdownSettings();
		this.statusBar = this.addStatusBarItem();
		this.statusBar.setText("Neo4j stream offline");

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

		this.addSettingTab(new SemanticMarkdownSettingTab(this.app, this));

		await this.initialize();
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
			// TODO: Use normal pypi instead of testpypi!
			let {stdout, stderr} = await exec_promise("pip3 install --upgrade semantic-markdown-converter " +
				"--index-url https://test.pypi.org/simple/ --user ", {timeout: 10000000});
			console.log(stdout);
			console.log(stderr);
			let options = {
				args: ['--input', this.path,  '--password', this.settings.password, '--debug']
			};
			// console.log(options);

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

