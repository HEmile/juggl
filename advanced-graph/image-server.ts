import type {IncomingMessage, Server, ServerResponse} from 'http';
import {Component, FileSystemAdapter, Notice, TFile} from 'obsidian';
import type {IAGPluginSettings} from './settings';
import type AdvancedGraphPlugin from './main';

export class ImageServer extends Component {
    settings: IAGPluginSettings;
    plugin: AdvancedGraphPlugin;
    imgServer: Server;

    constructor(plugin: AdvancedGraphPlugin) {
      super();
      this.settings = plugin.settings;
      this.plugin = plugin;
      this.imgServer = null;
    }

    public async onload() {
      super.onload();
      const path = require('path');
      const http = require('http');
      const fs = require('fs');

      const dir = path.join(this.plugin.path);

      const mime = {
        gif: 'image/gif',
        jpg: 'image/jpeg',
        png: 'image/png',
        svg: 'image/svg+xml',
      };
      const settings = this.settings;
      const vault = this.plugin.app.vault;
      this.imgServer = http.createServer(function(req: IncomingMessage, res: ServerResponse) {
        const reqpath = req.url.toString().split('?')[0];
        if (req.method !== 'GET') {
          res.statusCode = 501;
          res.setHeader('Content-Type', 'text/plain');
          return res.end('Method not implemented');
        }
        let file = path.join(dir, decodeURI(reqpath.replace(/\/$/, '/index.html')));
        file = (vault.adapter as FileSystemAdapter).getFullPath(file);
        // console.log(vault.getResourcePath(nFile as TFile));
        if (settings.debug) {
          console.log('entering server query');
          console.log(req);
          console.log(file);
        }
        // if (file.indexOf(dir + path.sep) !== 0) {
        //   res.statusCode = 403;
        //   res.setHeader('Content-Type', 'text/plain');
        //   return res.end('Forbidden');
        // }
        // @ts-ignore
        const type = mime[path.extname(file).slice(1)];
        console.log(file);
        const s = fs.createReadStream(file);
        s.on('open', function() {
          console.log('Here2');
          res.setHeader('Content-Type', type);
          res.setHeader('Access-Control-Allow-Origin', '*');
          s.pipe(res);
        });
        s.on('error', function() {
          console.log('Here3');
          res.setHeader('Content-Type', 'text/plain');
          res.statusCode = 404;
          res.end('Not found');
        });
      });
      try {
        const port = this.settings.imgServerPort;
        this.imgServer.listen(port, function() {
          console.log('Image server listening on http://localhost:' + port + '/');
        });
      } catch (e) {
        console.log(e);
        new Notice('Neo4j: Couldn\'t start image server, see console');
      }
    }

    public async onunload() {
      super.onunload();
      this.imgServer.close();
      this.imgServer = null;
    }
}
