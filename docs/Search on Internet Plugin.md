---
aliases: []
---

![[context_iframe.gif]]
See the plugin [on Github](https://github.com/HEmile/obsidian-search-on-internet).

## Search on Internet
Adds the option to search selected text on external websites, like Google and Wikipedia. You can add your own websites! 

![](https://raw.githubusercontent.com/HEmile/obsidian-search-on-internet/master/resources/modal_demo.gif)

It also adds the search options to the file context menu to search based on the title of a note:

![](https://raw.githubusercontent.com/HEmile/obsidian-search-on-internet/master/resources/demo.gif)

You can also right-click on an internal link to perform a search on that link:

![](https://raw.githubusercontent.com/HEmile/obsidian-search-on-internet/master/resources/internal_link.png)


### Settings
By default, the plugin comes with searches on Google and Wikipedia. 
You can add your own websites to search on in the settings. 

![](https://raw.githubusercontent.com/HEmile/obsidian-search-on-internet/master/resources/img.png)

For each website, fill in the following three fields:
- Name: The name of the search. This will be displayed in the search bar and the context menu.
- URL: The URL to open. `{{title}}` will be replaced by the current notes title. This is used as the 'query'.
- Tags (optional): A list of tags for notes to display the search option on. 
  In the example screenshot, this is used to only add the IMDB search on notes tagged with `#actor`, `#movie` or `#director` (in Dutch!)
  
It's recommended to assign the command: "Search on Internet: Perform search" to a hotkey:

![](https://raw.githubusercontent.com/HEmile/obsidian-search-on-internet/master/resources/hotkey.png)
  

### Credits
Settings code is mainly taken from the [Templater plugin](https://github.com/SilentVoid13/Templater) by [SilentVoid13](https://github.com/SilentVoid13)

Modal code is inspired by the [Citation plugin](https://github.com/hans/obsidian-citation-plugin/blob/master/src/modals.ts)

--- 
#plugin 
- hasTopic [[Semantic Obsidian]]
- author [[Emile van Krieken]]