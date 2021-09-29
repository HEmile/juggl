---
aliases: [installation, install]
---

**Warning: The [[Neo4j Graph View Plugin]] is deprecated and no longer supported. You can still [manually install it from Github](https://github.com/HEmile/obsidian-neo4j-graph-view/releases/tag/0.2.5) if you need the [[Neo4j]] support.**

The general steps to install the plugin are as follows:
1. Make sure you have [[Python]] 3.6+ installed. See [[Installation of Neo4j Graph View Plugin#Install Python]].
2. Make sure you have [[Neo4j Desktop]] installed. See [[Installation of Neo4j Graph View Plugin#Install Neo4j Desktop]].
3. Create a new database in Neo4j desktop and start it. See [[Installation of Neo4j Graph View Plugin#Creating a Neo4j database]].
5. Install the Obsidian plugin from the Third-party plugins list. See [[Installation of Neo4j Graph View Plugin#Installing the Obsidian plugin]]
6. In the settings of the plugin, enter the password. Then run the restart command. See [[Installation of Neo4j Graph View Plugin#Configuring the Obsidian plugin]].

If you are still running into problems after thorougly following these steps, see the [[Installation of Neo4j Graph View Plugin#Troubleshooting]] section. 

The next goal of the plugin (see [[Roadmap]]) is to remove the [[Python]] installation. This should make installation much more accessible. If you are not very technical and the installation of Python is failing, you can wait until this dependency is removed. The goal is to have this done before mid-end January 2021. 

## 1. Install Python
Make sure you've installed [Python 3.6+](https://www.python.org/downloads/) as your system Python 3. If you think you might already have it, run `python3 -V` in the terminal, which should return the Python version.

Also make sure to add Python to PATH, especially on [[Windows]]! During the installation, enable the 'Add Python 3.x to PATH' to ensure this happens.

![](https://docs.python.org/3/_images/win_installer.png)

[[Linux]] might already have Python installed by default. If a version lower than 3.6 is installed, update Python. Run `python3 -V` in the terminal to find out what version you have installed. 

### Possible problems
For plugin versions under 0.2.5, the plugin doesn't work if Python's package manager "pip" is outdated. Please update to plugin version 0.2.5, as it updates pip for you. 

On [[Mac]], some people got `xcrun: error: invalid active developer path...  missing xcrun at...`: [Install xcrun)](https://apple.stackexchange.com/questions/254380/why-am-i-getting-an-invalid-active-developer-path-when-attempting-to-use-git-a) in terminal using `xcode-select --install` 

## 2. Install Neo4j Desktop
Download [Neo4j desktop](https://neo4j.com/download/). Neo4j wants you to fill a form before giving you the link. Save the Neo4j Desktop Activation Key they provide for later. 

![[Pasted image 20210112215108.png]]

One user reported the activation key doesn't appear. [According to the Neo4j developers](https://community.neo4j.com/t/installing-and-activation-key/6173), that doesn't actually matter and you can proceed without using a key, curiously. I haven't tried this, though. 

The download can take a while because it's a pretty big file and the servers aren't very quick. 

Installation of Neo4j desktop is pretty straightforward. You have to input the key Neo4j gave you after registration. There's an [installation video](https://www.youtube.com/watch?v=pPhJi9twN9Q&feature=emb_title) if you need more help. 


## 3. Creating a Neo4j database
In a Project in Neo4j Desktop, click "+ Add Database" under projects:
![[Pasted image 20201231174344.png|300]]

Then select "Create a Local Database". Next follows this screen: 

![[Pasted image 20201231174425.png|300]]

You have to set a password here. We're also going to use it in the plugin. Make sure not to choose a sensitive password here! [[Neo4j Graph View Plugin]] doesn't store passwords encrypted. 
You can choose any name. For the Neo4j version, I have tested on 4.2.0, but it should not matter much. 

It'll create your database! Then, click the "Start" button. Note that you have to start your database every time whenever your computer reboots: It needs to remain active while you use the plugin. 

### Possible problems
Every now and then, the Graph database fails to start.
- Sometimes, it just says it 'timed out'. Retrying it a few times may help.
- Port in use: It's unlikely the port is actually in use. Restart Neo4j desktop and try again. It's currently not possible to set a port different than the default port (request on [[Github]] if needed).
- "Could not change the password": This has been reported with a [[Windows]] user. See [this post](https://stackoverflow.com/questions/49342422/neo4j-database-failed-to-create-error-could-not-change-password) for possible guidance.

## 4. Installing the Obsidian plugin
Time to install the plugin! Since Neo4j Graph View is an old version of Juggl, you will have to download and install it manually. 

1. Download the plugin from [this link](https://github.com/HEmile/obsidian-neo4j-graph-view/releases/tag/0.2.5). 
1. Open the Obsidian settings, and go to Third-party plugins. Disable the "Safe mode" toggle, then click "Turn off safe mode" to confirm this. 
2. Now, more options appear. Click on the "open plugin folders" icon
3. In the resulting folder, create a new directory called `neo4j-graph-view`
4. Extract the downloaded file into this folder.
5. Close the current screen. In the Third-party plugins settings, enable Neo4j graph view with the slider. 
6. It should look like this:

![[Pasted image 20201231175530.png]]


## 5. Configuring the Obsidian plugin
We need to do one more thing before we can get playing with the plugin: Setting the password. 
1. Go to the [[Neo4j Graph View settings]], which has appeared under Plugin options in the [[Obsidian]] settings. 
2. In the password field, input the password you set during [[Installation of Neo4j Graph View Plugin#Creating a Neo4j database]].  ![[Pasted image 20201231180930.png]]
3. Close the settings view.
4. Run the Obsidian command: "Neo4j Graph View: Restart Neo4j stream". You can run a command by using ctrl/cmd + p. ![[Pasted image 20201231181003.png]]
5. The plugin is succesfully installed if the following notice appears in the top-right corner: ![[Pasted image 20201231181103.png|300]] (note: for some reason, it doesn't always appear even though the server did properly start...)

If a different notice appears, something went wrong. Let's try to figure out what!
## Troubleshooting
If a notice appears that doesn't say the Neo4j stream is online, something went wrong. Two simple notices are
- "Please provide a password in the Neo4j Graph View settings": This means your user credentials weren't accepted by the Neo4j database. Check if the password is set correctly during [[Installation of Neo4j Graph View Plugin#Configuring the Obsidian plugin]].
- "No connection to Neo4j database. Please start Neo4j Database in Neo4j Desktop": This means there's no connection to a Neo4j database on port 7687. Check Neo4j desktop if the database is online.

The third notice is scariest: "Error during initialization of the Neo4j stream. Check the console for crash report.". Here are some steps to help figure out how to resolve this:
1. Enable "Debug" mode in the Neo4j Graph View settings ![[Pasted image 20201231181917.png]]
2. Open the Developer Tools. This option is under the View menu. If the View menu doesn't show, the keyboard shortcut to open it is ctrl+shift+i on windows and option+cmd+i on mac.
3. Look at the error in the Console. 

If the error is related to `pip3`, or `smdc` not being found, there's likely something wrong with your Python installation. See [[Installation of Neo4j Graph View Plugin#Install Python]] for a bit of guidance. 
Otherwise, it's likely that there's some bug in the plugin in that it cannot handle something that's present in your vault. Since this version is not supported by me anymore, you will have to fork the plugin to fix this. There are plans to add Neo4j support to [[Juggl]] sometime through an external plugin.
You can also contact [[Emile van Krieken|me]] on Twitter, Github or [[Discord]] if you need help. 

--- 
#howto
- hasTopic [[Neo4j Graph View]]
- author [[Emile van Krieken]]